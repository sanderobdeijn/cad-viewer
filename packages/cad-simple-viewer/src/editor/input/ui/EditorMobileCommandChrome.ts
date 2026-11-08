import {
  APPLICATION_DOCS_PATH_MAGNIFIER,
  applicationDocsUrl
} from '../../../app/ApplicationDocsUrl'
import { ApplicationI18n } from '../../../i18n/ApplicationI18n'
import {
  type UIMobileSessionMetricTexts,
  UIMobileSessionPanel,
  type UIMobileSessionPanelLabels
} from '../../../ui/UIMobileSessionPanel'
import {
  editorIsMobileUiLayout,
  editorSubscribeUiLayout
} from '../../global/EditorUiLayout'
import { editorInteractionStrategy } from './EditorInteractionStrategy'
import type { EditorMobileSessionMetrics } from './EditorMobileSessionMetrics'

/** Keyword chip shown on the mobile session panel. */
export interface EditorMobileKeywordChip {
  /** Text shown on the chip. */
  displayName: string
  /** Canonical keyword token passed to {@link EditorMobileCommandChromeCallbacks.onKeyword}. */
  globalName: string
  /** When false the chip is visible but not tappable. */
  enabled: boolean
}

/** Formatted metric strings ready to display. */
export type EditorMobileMetricTexts = UIMobileSessionMetricTexts

/**
 * Callbacks for the mobile command chrome.
 *
 * For point / actions sessions, `onConfirm` is empty-Enter / `allowNone`
 * (panel ✓). Typed coordinate commit is a separate future path (numeric
 * keypad) and must not use `onConfirm`.
 *
 * For string sessions (`showStringInput`), `onConfirm` commits the typed
 * value from {@link EditorMobileCommandChrome.getStringValue}.
 */
export interface EditorMobileCommandChromeCallbacks {
  /** Panel ✓ — empty Enter / None, or commit string input. */
  onConfirm: () => void
  /** Panel × — Escape. */
  onCancel: () => void
  /** Keyword chip tap. */
  onKeyword: (globalName: string) => void
}

/** Session content pushed into {@link EditorMobileCommandChrome.show}. */
export interface EditorMobileCommandChromeState {
  /** Prompt text (without `[keywords]`). */
  prompt: string
  /** Visible keyword chips. */
  keywords: EditorMobileKeywordChip[]
  /** Enables the ✓ button (maps to empty Enter). Ignored when string input is shown. */
  allowNone: boolean
  /** When false, the metric row is hidden (typed-only numeric prompts). */
  showMetrics: boolean
  /** Replace the metric row with a text field for {@link EditorInputManager.getString}. */
  showStringInput?: boolean
  /** Initial value for the string field. */
  stringValue?: string
  /** Placeholder for the string field. */
  stringPlaceholder?: string
}

/**
 * Phone/pad replacement for the desktop command line and Dynamic Input.
 *
 * Thin editor-facing wrapper around {@link UIMobileSessionPanel}.
 */
export class EditorMobileCommandChrome {
  private readonly panel: UIMobileSessionPanel
  private localeUnsub?: () => void

  /**
   * @param host - View container that receives the overlay (and CSS variables).
   */
  constructor(host: HTMLElement) {
    this.panel = new UIMobileSessionPanel({
      host,
      isPhoneLayout: editorIsMobileUiLayout,
      subscribeLayout: editorSubscribeUiLayout,
      helpDocsUrl: () => applicationDocsUrl(APPLICATION_DOCS_PATH_MAGNIFIER),
      labels: () => chromeLabels()
    })
    ApplicationI18n.events.localeChanged.addEventListener(this.boundRelabel)
    this.localeUnsub = () => {
      ApplicationI18n.events.localeChanged.removeEventListener(this.boundRelabel)
    }
  }

  private readonly boundRelabel = () => this.panel.refreshLabels()

  /** Whether the chrome is currently shown. */
  get isOpen(): boolean {
    return this.panel.isOpen
  }

  /**
   * Shows the chrome for an input session. No-op on desktop layouts.
   *
   * @param state - Prompt, keywords, and metric visibility for the session.
   * @param callbacks - Confirm / cancel / keyword handlers.
   */
  show(
    state: EditorMobileCommandChromeState,
    callbacks: EditorMobileCommandChromeCallbacks
  ): void {
    if (!editorInteractionStrategy().point.usesSessionChrome) {
      this.hide()
      return
    }
    this.panel.show(
      {
        prompt: state.prompt,
        allowNone: state.allowNone,
        showMetrics: state.showMetrics,
        showStringInput: state.showStringInput,
        stringValue: state.stringValue,
        stringPlaceholder: state.stringPlaceholder,
        keywords: state.keywords.map(kw => ({
          displayName: kw.displayName,
          id: kw.globalName,
          enabled: kw.enabled
        }))
      },
      {
        onConfirm: callbacks.onConfirm,
        onCancel: callbacks.onCancel,
        onKeyword: callbacks.onKeyword
      }
    )
  }

  /**
   * Updates prompt / keywords / ✓ without tearing down the session.
   *
   * @param partial - Fields to update; omitted fields keep their current values.
   */
  update(partial: Partial<EditorMobileCommandChromeState>): void {
    this.panel.update({
      prompt: partial.prompt,
      allowNone: partial.allowNone,
      showMetrics: partial.showMetrics,
      showStringInput: partial.showStringInput,
      stringValue: partial.stringValue,
      stringPlaceholder: partial.stringPlaceholder,
      keywords: partial.keywords?.map(kw => ({
        displayName: kw.displayName,
        id: kw.globalName,
        enabled: kw.enabled
      }))
    })
  }

  /**
   * Pushes live metric values. Phase 1 displays them read-only; the metric
   * buttons stay disabled as a hook for the numeric keypad.
   *
   * @param metrics - Live numeric metrics including base-point state.
   * @param texts - Formatted strings for display.
   */
  setMetrics(metrics: EditorMobileSessionMetrics, texts: EditorMobileMetricTexts) {
    this.panel.setMetrics(metrics.hasBasePoint, texts)
  }

  /** Current session string field value. */
  getStringValue(): string {
    return this.panel.getStringValue()
  }

  /** Focuses the session string field when string input mode is active. */
  focusStringInput(): void {
    this.panel.focusStringInput()
  }

  /** Hides the chrome and clears session callbacks. */
  hide(): void {
    this.panel.hide()
  }

  /** Removes DOM and locale listeners. */
  dispose(): void {
    this.localeUnsub?.()
    this.panel.dispose()
  }

  /** Mount slot for custom session accessories (left of the help icon). */
  get accessoryHost(): HTMLElement {
    return this.panel.accessoryHost
  }

  /** Shows the mobile accessory row (custom content slot + help). */
  prepareAccessory(): void {
    this.panel.prepareAccessory()
  }

  /**
   * Clears custom session accessory content without removing the help icon.
   * The row stays visible while the panel is open.
   */
  clearAccessory(): void {
    this.panel.clearAccessory()
  }
}

function chromeLabels(): UIMobileSessionPanelLabels {
  const t = (key: string) => ApplicationI18n.t(key)
  return {
    length: t('main.mobileCommand.length'),
    angle: t('main.mobileCommand.angle'),
    dx: t('main.mobileCommand.dx'),
    dy: t('main.mobileCommand.dy'),
    x: t('main.mobileCommand.x'),
    y: t('main.mobileCommand.y'),
    confirm: t('main.mobileCommand.confirm'),
    cancel: t('main.mobileCommand.cancel'),
    help: t('main.mobileCommand.help'),
    back: t('main.mobileCommand.back'),
    collapse: t('main.mobileCommand.collapse'),
    expand: t('main.mobileCommand.expand')
  }
}
