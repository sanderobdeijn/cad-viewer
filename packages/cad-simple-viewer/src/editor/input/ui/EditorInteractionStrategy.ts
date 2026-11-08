import { editorIsMobileOrPadUi } from '../../global/EditorUiLayout'
import { EditorViewMode } from '../../view/EditorViewMode'
import type { EditorPromptBoxOptions } from '../prompt/EditorPromptBoxOptions'
import type { EditorPromptBoxResult } from '../prompt/EditorPromptBoxResult'

/**
 * Box-prompt operations the {@link EditorInteractionStrategy} can choose
 * between. Implemented by {@link EditorInputManager}.
 */
export interface EditorBoxPromptHost {
  /** Desktop: two chained point prompts with a live overlay. */
  acquireTwoPointBox(
    options: EditorPromptBoxOptions
  ): Promise<EditorPromptBoxResult>
  /**
   * Phone/pad: long-press + drag (touch) or click-drag / two clicks (mouse).
   */
  acquireHoldDragBox(
    options: EditorPromptBoxOptions
  ): Promise<EditorPromptBoxResult>
}

/**
 * Layout-level point-prompt chrome. Mouse-click vs touch long-press still
 * lives in {@link EditorFloatingInput} (pointer type, not layout). Loupe vs
 * simulated-mouse HUD is {@link editorTouchPickStrategy}.
 */
export interface EditorPointPromptPolicy {
  /** Plus marks after each confirmed pick in a multi-point command. */
  readonly showsConfirmedPointMarks: boolean
  /** Bottom session panel instead of the desktop command line. */
  readonly usesSessionChrome: boolean
  /**
   * Swallow canvas `contextmenu` during a prompt (touch long-press) instead
   * of treating it as right-click Enter.
   */
  readonly swallowsPromptContextMenu: boolean
  /**
   * Allow cursor-adjacent DYNMODE floating input. Still gated by the
   * **DYNMODE** sysvar.
   */
  readonly showsCursorDynamicInput: boolean
  /**
   * Layout supports a magnifier HUD for touch precise capture (grip drag,
   * or loupe touch-pick strategy). Simulated-mouse picks use a crosshair
   * instead — see {@link editorTouchPickStrategy}.
   */
  readonly showsSnapLoupeOnTouchPick: boolean
}

const DESKTOP_POINT_POLICY: EditorPointPromptPolicy = {
  showsConfirmedPointMarks: false,
  usesSessionChrome: false,
  swallowsPromptContextMenu: false,
  showsCursorDynamicInput: true,
  showsSnapLoupeOnTouchPick: false
}

const MOBILE_POINT_POLICY: EditorPointPromptPolicy = {
  showsConfirmedPointMarks: true,
  usesSessionChrome: true,
  swallowsPromptContextMenu: true,
  showsCursorDynamicInput: false,
  showsSnapLoupeOnTouchPick: true
}

/**
 * Desktop vs phone/pad pointer rules for idle selection, box prompts, and
 * point-prompt chrome.
 *
 * Three independent axes:
 * - **Layout** (this strategy): session chrome, confirmed-point marks, whether
 *   `contextmenu` is Enter, and whether a snap loupe is available.
 * - **Pointer type** (`EditorFloatingInput`): mouse click-to-commit vs touch
 *   long-press / short-tap. A pad with a mouse still clicks; a desktop with
 *   a touch screen still long-presses.
 * - **Touch pick HUD** (`editorTouchPickStrategy`): loupe-at-finger vs
 *   simulated-mouse crosshair above the finger
 *   (`ApplicationSettings.useSimulatedMouseOnTouch`).
 *
 * Callers resolve the active strategy via {@link editorInteractionStrategy}
 * instead of branching on {@link editorIsMobileOrPadUi} at each call site.
 */
export interface EditorInteractionStrategy {
  /**
   * Whether idle long-press box-select is allowed in this view mode.
   * Touch drag before the timer still pans.
   */
  canIdleTouchBox(mode: EditorViewMode): boolean
  /** Acquires a rectangular box using this layout's pointer model. */
  acquireBox(
    host: EditorBoxPromptHost,
    options: EditorPromptBoxOptions
  ): Promise<EditorPromptBoxResult>
  /** Point-prompt chrome and defaults for this layout. */
  readonly point: EditorPointPromptPolicy
}

/** Mouse-first: box prompts are two clicks; idle touch box only in selection. */
export class EditorDesktopInteractionStrategy implements EditorInteractionStrategy {
  readonly point = DESKTOP_POINT_POLICY

  canIdleTouchBox(mode: EditorViewMode): boolean {
    return mode === EditorViewMode.SELECTION
  }

  acquireBox(
    host: EditorBoxPromptHost,
    options: EditorPromptBoxOptions
  ): Promise<EditorPromptBoxResult> {
    return host.acquireTwoPointBox(options)
  }
}

/**
 * Touch-first: idle long-press box also works while panning (Select / Pan
 * hidden). Box prompts are hold-drag, with mouse click-drag / two-click
 * still available on pad-width windows and tablets with a pointer.
 */
export class EditorMobileInteractionStrategy implements EditorInteractionStrategy {
  readonly point = MOBILE_POINT_POLICY

  canIdleTouchBox(mode: EditorViewMode): boolean {
    return mode === EditorViewMode.SELECTION || mode === EditorViewMode.PAN
  }

  acquireBox(
    host: EditorBoxPromptHost,
    options: EditorPromptBoxOptions
  ): Promise<EditorPromptBoxResult> {
    return host.acquireHoldDragBox(options)
  }
}

const desktopStrategy = new EditorDesktopInteractionStrategy()
const mobileStrategy = new EditorMobileInteractionStrategy()

/**
 * Active nav/box/point interaction strategy for the current UI layout.
 *
 * Re-evaluated each call so a resize between desktop and pad picks up the
 * new rules without swapping listeners.
 */
export function editorInteractionStrategy(): EditorInteractionStrategy {
  return editorIsMobileOrPadUi() ? mobileStrategy : desktopStrategy
}
