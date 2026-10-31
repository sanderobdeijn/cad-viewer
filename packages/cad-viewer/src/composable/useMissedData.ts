import {
  AcApDocManager,
  AcApSettingManager,
  AcApXrefManager,
  eventBus
} from '@mlightcad/cad-simple-viewer'
import { reactive } from 'vue'

/**
 * Missed Data Composable
 *
 * Tracks fonts and unresolved xrefs that the current drawing
 * references but that are missing. State is shared module-wide so every caller
 * sees the same reactive maps (status-bar warning, Resources palette).
 */

/**
 * One unresolved external reference reported by the viewer.
 */
export interface MissedXrefInfo {
  name: string
  pathName: string
  isOverlay: boolean
}

/**
 * Loaded overlay state keyed by xref block name.
 */
export interface XrefOverlayState {
  overlayId: string
  visible: boolean
  /** File name of the loaded source. */
  sourceName: string
}

/**
 * Reactive state returned by {@link useMissedData}.
 */
export interface UseMissedDataReturn {
  fonts: Map<string, string>
  /** Unresolved xrefs from the active drawing */
  xrefs: MissedXrefInfo[]
  /** Overlay load state per xref block name */
  xrefOverlays: Map<string, XrefOverlayState>
}

const fontMapping = reactive(new Map<string, string>())
const xrefList = reactive<MissedXrefInfo[]>([])
const xrefOverlays = reactive(new Map<string, XrefOverlayState>())

let initialized = false

function readMissedXrefs(missedData: {
  fonts: Record<string, number>
  xrefs?: MissedXrefInfo[]
}): MissedXrefInfo[] {
  return missedData.xrefs ?? []
}

function syncFromCurrentView(): void {
  try {
    const view = AcApDocManager.instance?.curView
    if (!view) return

    const missedData = view.missedData as {
      fonts: Record<string, number>
      xrefs?: MissedXrefInfo[]
    }
    const storedFontMapping = AcApSettingManager.instance.fontMapping

    fontMapping.clear()
    for (const missedFont of Object.keys(missedData.fonts ?? {})) {
      fontMapping.set(missedFont, storedFontMapping[missedFont] ?? '')
    }

    const nextXrefs = readMissedXrefs(missedData)
    xrefList.splice(0, xrefList.length, ...nextXrefs)

    // Drop overlay UI state for xrefs that no longer exist and have no session.
    // XATTACH / toolbar sessions live in AcApXrefManager even when not "missed".
    const names = new Set(nextXrefs.map(x => x.name))
    for (const name of [...xrefOverlays.keys()]) {
      if (names.has(name)) continue
      if (AcApXrefManager.instance.getSessionByBlockName(name)) continue
      xrefOverlays.delete(name)
    }

    // Mirror manager sessions into reactive UI state (XATTACH + palette resolve).
    for (const session of AcApXrefManager.instance.sessions) {
      xrefOverlays.set(session.blockName, {
        overlayId: session.overlayId,
        visible: session.visible,
        sourceName: session.sourcePath
      })
    }
  } catch {
    // Viewer may not be fully initialized yet; keep previous state.
  }
}

function ensureInitialized(): void {
  if (initialized) return
  initialized = true

  AcApDocManager.instance.events.documentActivated.addEventListener(() => {
    xrefOverlays.clear()
    fontMapping.clear()
    syncFromCurrentView()
    // Refresh notification center (font-missed) for the newly active document.
    eventBus.emit('missed-data-changed', {})
  })

  eventBus.on('font-not-found', () => {
    syncFromCurrentView()
  })

  eventBus.on('missed-data-changed', () => {
    syncFromCurrentView()
  })

  syncFromCurrentView()
}

/**
 * Access shared reactive state for missing fonts and xrefs.
 */
export function useMissedData(): UseMissedDataReturn {
  ensureInitialized()

  return {
    fonts: fontMapping,
    xrefs: xrefList,
    xrefOverlays
  }
}
