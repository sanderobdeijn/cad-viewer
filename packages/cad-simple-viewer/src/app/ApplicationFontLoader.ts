import type { FontInfo } from '@mlightcad/mtext-renderer'
import { ThreeRendererFontLoader } from '@mlightcad/three-renderer'

import { EditorFontNotLoadedInfo, eventBus } from '../editor'

/** Font metadata from the mtext-renderer font repository. */
export type ApplicationFontInfo = FontInfo

/** Per-load font breakdown for OPENPROF / diagnostics. */
export interface ApplicationFontLoadStats {
  fontCount: number
  criticalFonts: string[]
  deferredFonts: string[]
  metaMs: number
  criticalLoadMs: number
  /**
   * Mesh/deferred load duration. `null` while a fire-and-forget deferred mesh
   * load is still in flight (see {@link ApplicationFontLoader.deferMeshFonts}); later
   * {@link getLastFontLoadStats} calls see the filled-in value.
   */
  deferredLoadMs: number | null
  deferred: boolean
  totalMs: number
}

let lastFontLoadStats: ApplicationFontLoadStats | null = null

/** Returns timing from the most recent {@link ApplicationFontLoader.load} call. */
export function getLastFontLoadStats(): ApplicationFontLoadStats | null {
  return lastFontLoadStats ? { ...lastFontLoadStats } : null
}

function isMeshFontInfo(info: ApplicationFontInfo): boolean {
  const type = String(info.type ?? '').toLowerCase()
  if (type === 'mesh' || type === 'ttf' || type === 'otf' || type === 'woff') {
    return true
  }
  const file = String(info.file ?? '').toLowerCase()
  return (
    file.endsWith('.ttf') ||
    file.endsWith('.otf') ||
    file.endsWith('.woff') ||
    file.endsWith('.woff2')
  )
}

/**
 * Viewer-side font loader for explicit loads (default fonts, missing-font UI).
 *
 * Drawing open does not collect or await fonts. Text entities
 * load faces on demand via {@link FontManager.lazyFontLoading}. This class is
 * still used for {@link ApplicationDocManager.loadFonts} /
 * {@link ApplicationDocManager.loadDefaultFonts}.
 *
 * Mesh/TTF/WOFF fonts (e.g. `simsun.woff`) are expensive to re-parse from
 * IndexedDB. When {@link deferMeshFonts} is true and a load mixes SHX with
 * mesh fonts, SHX is awaited first and mesh continues in the background.
 * Mesh-only loads always await so callers like
 * {@link ApplicationFontUtil.ensureDrawingFontLoaded} see a ready face.
 *
 * @example
 * ```typescript
 * const fontLoader = new ApplicationFontLoader();
 * await fontLoader.load(['Arial', 'SimSun']);
 * ```
 */
export class ApplicationFontLoader {
  /** Font loader in mtext-renderer */
  private _loader: ThreeRendererFontLoader

  /**
   * When true (default), mixed SHX+mesh {@link load} calls await only SHX;
   * mesh fonts continue in the background. Mesh-only loads still await.
   */
  deferMeshFonts = true

  /** Serialize overlapping loads (init defaults vs UI loads) to avoid double-parse. */
  private _loadChain: Promise<unknown> = Promise.resolve()

  /**
   * Creates a new font loader instance.
   */
  constructor() {
    this._loader = new ThreeRendererFontLoader()
  }

  /**
   * Underlying mtext-renderer loader. Share with {@link FontManager.setFontLoader}
   * so catalog fetches populate one cache for both drawing and UI.
   */
  get fontLoader(): ThreeRendererFontLoader {
    return this._loader
  }

  /**
   * Base URL to load fonts
   */
  get baseUrl() {
    return this._loader.baseUrl
  }
  set baseUrl(value: string) {
    this._loader.baseUrl = value
  }

  /**
   * Available fonts already fetched into the underlying loader cache.
   */
  get avaiableFonts(): ApplicationFontInfo[] {
    return this._loader.avaiableFonts
  }

  /**
   * Fetches available font metadata from the font repository.
   */
  async getAvaiableFonts(): Promise<ApplicationFontInfo[]> {
    return await this._loader.getAvailableFonts()
  }

  /**
   * Loads the given font names. With {@link deferMeshFonts}, mixed SHX+mesh
   * loads await SHX first; mesh-only loads always await.
   */
  async load(fontNames: string[]) {
    const run = () => this.loadInternal(fontNames)
    const result = this._loadChain.then(run, run)
    this._loadChain = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }

  private async loadInternal(fontNames: string[]) {
    const totalStartedAt = performance.now()
    let loadStatus: Awaited<ReturnType<ThreeRendererFontLoader['load']>> = []
    const criticalFonts: string[] = []
    const deferredFonts: string[] = []
    let metaMs = 0
    let criticalLoadMs = 0
    let deferredLoadMs: number | null = 0
    const metaStartedAt = performance.now()
    const available = await this._loader.getAvailableFonts()
    metaMs = performance.now() - metaStartedAt

    const byName = new Map<string, ApplicationFontInfo>()
    for (const info of available) {
      for (const name of info.name) {
        byName.set(name.toLowerCase(), info)
      }
    }

    for (const raw of fontNames) {
      const key = raw.toLowerCase()
      const info = byName.get(key)
      if (this.deferMeshFonts && info && isMeshFontInfo(info)) {
        deferredFonts.push(raw)
      } else {
        criticalFonts.push(raw)
      }
    }

    // Defer mesh only when SHX/critical fonts are also requested; otherwise
    // callers that await a single mesh face would return before it is ready.
    const shouldDeferMesh =
      this.deferMeshFonts &&
      deferredFonts.length > 0 &&
      criticalFonts.length > 0

    const criticalStartedAt = performance.now()
    loadStatus =
      criticalFonts.length > 0 ? await this._loader.load(criticalFonts) : []
    criticalLoadMs = performance.now() - criticalStartedAt

    if (deferredFonts.length > 0 && !shouldDeferMesh) {
      const deferredStartedAt = performance.now()
      const deferredStatus = await this._loader.load(deferredFonts)
      deferredLoadMs = performance.now() - deferredStartedAt
      loadStatus = [...loadStatus, ...deferredStatus]
    } else if (shouldDeferMesh) {
      // Still in flight when load() resolves; null until the callback fills it in.
      deferredLoadMs = null
    }

    const stats: ApplicationFontLoadStats = {
      fontCount: fontNames.length,
      criticalFonts: [...criticalFonts],
      deferredFonts: [...deferredFonts],
      metaMs,
      criticalLoadMs,
      deferredLoadMs,
      deferred: shouldDeferMesh,
      totalMs: performance.now() - totalStartedAt
    }
    lastFontLoadStats = stats

    if (shouldDeferMesh && deferredFonts.length > 0) {
      // Do not block mixed loads on opentype.parse of large CJK mesh fonts.
      const deferredStartedAt = performance.now()
      void this._loader.load(deferredFonts).then(
        status => {
          if (lastFontLoadStats === stats) {
            stats.deferredLoadMs = performance.now() - deferredStartedAt
          }
          this.emitPartialFailures(status)
        },
        error => {
          if (lastFontLoadStats === stats) {
            stats.deferredLoadMs = performance.now() - deferredStartedAt
          }
          logDeferredFontError(error)
        }
      )
    }

    this.emitPartialFailures(loadStatus)
  }

  private emitPartialFailures(
    loadStatus: Awaited<ReturnType<ThreeRendererFontLoader['load']>>
  ) {
    const fontsNotFound: string[] = []
    const fontsNotLoaded: EditorFontNotLoadedInfo[] = []
    loadStatus.forEach(item => {
      if (item.status === 'NotFound') {
        fontsNotFound.push(item.fontName)
      } else if (item.status === 'FailedToLoad') {
        fontsNotLoaded.push({
          fontName: item.fontName,
          url: item.url
        })
      }
    })
    if (fontsNotFound.length > 0) {
      eventBus.emit('fonts-not-found', {
        fonts: fontsNotFound
      })
    }
    if (fontsNotLoaded.length > 0) {
      eventBus.emit('fonts-not-loaded', {
        fonts: fontsNotLoaded
      })
    }
  }
}

function logDeferredFontError(error: unknown) {
  console.warn(
    '[ApplicationFontLoader] Deferred mesh font load failed; text may use SHX fallbacks.',
    error
  )
}
