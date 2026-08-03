/** Supported locales in the offline HTML viewer. */
export type AcExHtmlLocale = 'en'

/**
 * All locales accepted by the offline viewer, in display order.
 * The language button cycles through this list; add a locale here plus a
 * {@link LOCALE_BADGES} entry and a `MESSAGES` tree to support it.
 */
export const ACEX_HTML_LOCALES: AcExHtmlLocale[] = ['en']

/** Short button badge per locale (shown on the language toolbar button). */
const LOCALE_BADGES: Record<AcExHtmlLocale, string> = {
  en: 'EN'
}

/**
 * `localStorage` key used to persist the user's language choice
 * across reloads of exported HTML files.
 */
export const ACEX_HTML_LOCALE_STORAGE_KEY = 'mlcad-html-locale'

/**
 * Dot-separated message keys resolved by {@link AcExHtmlI18n.t}.
 * Must exist in the internal `MESSAGES` tree for each {@link AcExHtmlLocale}.
 */
export type AcExHtmlMessageKey =
  | 'toolbar.viewerTools'
  | 'toolbar.zoomExtents'
  | 'toolbar.measureDistance'
  | 'toolbar.measureAngle'
  | 'toolbar.measureArc'
  | 'toolbar.measureArea'
  | 'toolbar.measureCoordinate'
  | 'toolbar.clearMeasurements'
  | 'toolbar.settings'
  | 'toolbar.layers'
  | 'toolbar.language'
  | 'toolbar.languageSwitch'
  | 'toolbar.collapse'
  | 'toolbar.expand'
  | 'settings.toolbar'
  | 'settings.measureColor'
  | 'settings.ortho'
  | 'settings.polar'
  | 'settings.polarAngles'
  | 'layers.title'
  | 'layers.close'
  | 'layers.showAll'
  | 'layers.hideAll'
  | 'layers.zoomTo'
  | 'status.ready'
  | 'status.measureDistanceHint'
  | 'status.measureAngleHint'
  | 'status.measureArcHint'
  | 'status.measureAreaHint'
  | 'status.measureCoordinateHint'
  | 'status.distance'
  | 'status.coordinates'
  | 'status.angle'
  | 'status.arcLength'
  | 'status.area'
  | 'status.lengthTotal'
  | 'status.areaTotal'
  | 'status.zoomLayer'
  | 'status.loadFailed'
  | 'status.noLayout'

/**
 * Nested string table used for locale message lookup.
 * @internal
 */
interface AcExMessageTree {
  [key: string]: string | AcExMessageTree
}

const MESSAGES: Record<AcExHtmlLocale, AcExMessageTree> = {
  en: {
    toolbar: {
      viewerTools: 'Viewer tools',
      zoomExtents: 'Zoom extents',
      measureDistance: 'Measure distance',
      measureAngle: 'Measure angle',
      measureArc: 'Measure arc length',
      measureArea: 'Measure area',
      measureCoordinate: 'Measure coordinates',
      clearMeasurements: 'Clear measurements',
      settings: 'Measure settings',
      layers: 'Layers',
      language: 'Language',
      languageSwitch: 'Switch language',
      collapse: 'Collapse toolbar',
      expand: 'Expand toolbar'
    },
    settings: {
      toolbar: 'Measure settings',
      measureColor: 'Measure color',
      ortho: 'Toggle orthogonal mode',
      polar: 'Polar tracking angles',
      polarAngles: 'Polar tracking angles'
    },
    layers: {
      title: 'Layers',
      close: 'Close layers',
      showAll: 'Show all',
      hideAll: 'Hide all',
      zoomTo: 'Zoom to {name}'
    },
    status: {
      ready: 'Ready',
      measureDistanceHint:
        'Click two points to measure distance (object snap enabled).',
      measureAngleHint:
        'Click vertex, then two points on each arm (object snap enabled).',
      measureArcHint:
        'Click arc start, a point on the arc, then arc end (object snap enabled).',
      measureAreaHint:
        'Click polygon vertices; click near the first point or press Enter to finish.',
      measureCoordinateHint:
        'Click a point to read its X/Y coordinates (object snap enabled).',
      distance: 'Distance: {value}',
      coordinates: 'X: {x}  Y: {y}',
      angle: 'Angle: {value}',
      arcLength: 'Arc length: {value}',
      area: 'Area: {value}',
      lengthTotal: 'Length total: {value}',
      areaTotal: 'Area total: {value}',
      zoomLayer: 'Zoom: {name}',
      loadFailed: 'Failed to load drawing: {error}',
      noLayout: 'No layout data in snapshot.'
    }
  }
}

/**
 * Type guard for {@link AcExHtmlLocale}.
 *
 * @param value - Arbitrary string to test.
 * @returns `true` when `value` is one of {@link ACEX_HTML_LOCALES}.
 */
export function isAcExHtmlLocale(value: string): value is AcExHtmlLocale {
  return (ACEX_HTML_LOCALES as readonly string[]).includes(value)
}

/**
 * Normalizes a BCP 47 or short locale tag to a supported {@link AcExHtmlLocale}.
 *
 * @param value - Locale string from snapshot meta, `<html lang>`, or `navigator.language`.
 * @returns a supported locale, or `null` when unrecognized.
 */
export function resolveAcExHtmlLocale(
  value?: string | null
): AcExHtmlLocale | null {
  if (value == null || value === '') return null
  const normalized = value.toLowerCase().replace('_', '-')
  for (const locale of ACEX_HTML_LOCALES) {
    if (normalized === locale || normalized.startsWith(`${locale}-`)) {
      return locale
    }
  }
  return null
}

/**
 * Detects locale from the browser's language preferences.
 * Returns the first preferred language that maps to a supported locale;
 * defaults to `'en'`.
 */
export function detectBrowserAcExHtmlLocale(): AcExHtmlLocale {
  if (typeof navigator === 'undefined') return 'en'

  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language
  ].filter(Boolean)

  for (const candidate of candidates) {
    const resolved = resolveAcExHtmlLocale(candidate)
    if (resolved) return resolved
  }

  return 'en'
}

/**
 * Chooses the initial locale for the offline viewer using, in order:
 * persisted user choice in `localStorage`, then {@link detectBrowserAcExHtmlLocale}.
 *
 * @returns Resolved locale, defaulting to `'en'`.
 */
export function detectAcExHtmlLocale(): AcExHtmlLocale {
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(ACEX_HTML_LOCALE_STORAGE_KEY)
      const fromStorage = resolveAcExHtmlLocale(stored)
      if (fromStorage) return fromStorage
    } catch {
      /* private mode */
    }
  }

  return detectBrowserAcExHtmlLocale()
}

function lookupMessage(tree: AcExMessageTree, key: string): string | undefined {
  const parts = key.split('.')
  let node: string | AcExMessageTree | undefined = tree
  for (const part of parts) {
    if (node == null || typeof node === 'string') return undefined
    node = node[part]
  }
  return typeof node === 'string' ? node : undefined
}

/**
 * Replaces `{name}` placeholders in a message template.
 *
 * @param template - Localized string possibly containing `{param}` tokens.
 * @param params - Values substituted by token name; missing keys are left unchanged.
 * @returns Interpolated user-visible string.
 */
export function formatAcExHtmlMessage(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name]
    return value != null ? String(value) : `{${name}}`
  })
}

/**
 * Lightweight i18n helper for the exported HTML viewer shell.
 * Updates elements marked with `data-i18n-text` / `data-i18n-attr` and persists locale choice.
 */
export class AcExHtmlI18n {
  private _locale: AcExHtmlLocale
  private _onChange: (() => void) | null = null

  /**
   * @param initialLocale - Starting locale; defaults to {@link detectAcExHtmlLocale} when omitted.
   */
  constructor(initialLocale?: AcExHtmlLocale) {
    this._locale = initialLocale ?? detectAcExHtmlLocale()
  }

  /** Active locale used for {@link AcExHtmlI18n.t}. */
  get locale(): AcExHtmlLocale {
    return this._locale
  }

  /** Short badge text shown on the language toolbar button (e.g. `EN`, `中`, `CS`). */
  get localeBadge(): string {
    return LOCALE_BADGES[this._locale]
  }

  /**
   * Registers a callback invoked after {@link AcExHtmlI18n.setLocale} or
   * {@link AcExHtmlI18n.toggleLocale} updates the UI.
   *
   * @param handler - Listener, or `null` to clear.
   */
  setOnChange(handler: (() => void) | null): void {
    this._onChange = handler
  }

  /**
   * Resolves and formats a message for the active locale, falling back to English.
   *
   * @param key - Dot-separated message key.
   * @param params - Optional placeholder values for `{name}` tokens.
   */
  t(key: AcExHtmlMessageKey, params?: Record<string, string | number>): string {
    const template =
      lookupMessage(MESSAGES[this._locale], key) ??
      lookupMessage(MESSAGES.en, key) ??
      key
    return formatAcExHtmlMessage(template, params)
  }

  /**
   * Advances to the next locale in {@link ACEX_HTML_LOCALES} (wrapping around),
   * persists the choice, and refreshes the DOM. Drives the language button,
   * which cycles through all supported locales on each click.
   *
   * @returns The locale after switching.
   */
  toggleLocale(): AcExHtmlLocale {
    const index = ACEX_HTML_LOCALES.indexOf(this._locale)
    const next = ACEX_HTML_LOCALES[(index + 1) % ACEX_HTML_LOCALES.length]
    this.setLocale(next)
    return next
  }

  /**
   * Sets the active locale, updates `<html lang>`, storage, and bound DOM nodes.
   *
   * @param locale - Target locale.
   */
  setLocale(locale: AcExHtmlLocale): void {
    if (this._locale === locale) return
    this._locale = locale
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(ACEX_HTML_LOCALE_STORAGE_KEY, locale)
      }
    } catch {
      /* private mode */
    }
    this.applyToDocument()
    this._onChange?.()
  }

  /**
   * Applies translated text to elements under `root` (or the full document).
   * Only updates leaf nodes with `data-i18n-text` to avoid clobbering icon markup.
   *
   * @param root - Subtree to scan; defaults to `document` when omitted.
   */
  applyToDocument(root?: ParentNode): void {
    if (typeof document === 'undefined') return
    const scope = root ?? document
    document.documentElement.lang = this._locale

    // Only leaf text targets — never set textContent on containers or icon buttons.
    scope.querySelectorAll<HTMLElement>('[data-i18n-text]').forEach(el => {
      const key = el.dataset.i18nKey as AcExHtmlMessageKey | undefined
      if (!key) return
      el.textContent = this.t(key)
    })

    scope.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach(el => {
      const key = el.dataset.i18nKey as AcExHtmlMessageKey | undefined
      const attrs = el.dataset.i18nAttr?.split(/\s+/) ?? []
      if (!key || attrs.length === 0) return
      const text = this.t(key)
      for (const attr of attrs) {
        el.setAttribute(attr, text)
      }
    })

    const badge = document.getElementById('mlcad-lang-badge')
    if (badge) badge.textContent = this.localeBadge

    const langBtn = document.getElementById('mlcad-lang-btn')
    if (langBtn) {
      langBtn.setAttribute('title', this.t('toolbar.languageSwitch'))
      langBtn.setAttribute('aria-label', this.t('toolbar.languageSwitch'))
    }
  }
}
