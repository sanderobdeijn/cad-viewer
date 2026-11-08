/**
 * Widget mounted while a command is prompting, or while a selection-driven
 * session UI is active. Desktop layouts show accessories at the top center of
 * the canvas; phone/pad layouts show them at the top of the bottom session panel.
 *
 * Kept as a types-only module so the command layer does not import chrome DOM.
 */

import type { EditorBaseView } from '../view/EditorBaseView'
import type { EditorCommand } from './EditorCommand'

/** Desktop top-center slot vs mobile session panel. */
export type EditorSessionAccessorySlot = 'desktop' | 'mobile'

/** Arguments passed to {@link EditorSessionAccessory.mount}. */
export interface EditorSessionAccessoryOptions {
  /** Mount row for the accessory controls. */
  host: HTMLElement
  /** Which chrome slot owns {@link host}. */
  type: EditorSessionAccessorySlot
  /** View that owns the chrome / session accessory host. */
  view: EditorBaseView
}

/**
 * Mount target resolved by the view for the current layout / mobile prompt state.
 */
export interface EditorSessionAccessoryHostInfo {
  /** DOM row that receives accessory controls. */
  host: HTMLElement
  /** Which chrome slot owns {@link host}. */
  type: EditorSessionAccessorySlot
}

/**
 * Registry id for the draw-style session provider on a view.
 *
 * @see {@link EditorDrawStyleSessionHost}
 * @see {@link EditorSessionProviderRegistry}
 */
export const EDITOR_DRAW_STYLE_SESSION_PROVIDER_ID = 'draw-style'

/**
 * Draw-style controls provider registered under
 * {@link EDITOR_DRAW_STYLE_SESSION_PROVIDER_ID}.
 *
 * Long-lived owner of color / font-size controls; mints mountable session
 * accessories via {@link createSessionAccessory}.
 */
export interface EditorDrawStyleSessionHost {
  /**
   * Updates the active measure session before controls mount.
   *
   * @param kind - `'measure'`, or `undefined` when inactive.
   */
  setActiveKind(kind: 'measure' | undefined): void
  /** Builds the session accessory that reparents draw-style controls. */
  createSessionAccessory(): EditorSessionAccessory
}

/**
 * Session UI widget with a stable id and mount/unmount lifecycle.
 */
export interface EditorSessionAccessory {
  /** Stable id so a re-show can replace rather than stack. */
  id: string
  /**
   * Called when the accessory slot is shown.
   *
   * @param options - Host element, slot type, and owning view.
   */
  mount(options: EditorSessionAccessoryOptions): void
  /** Called on hide or when a different accessory replaces this one. */
  unmount(): void
}

/**
 * Payload for session-accessory mount / unmount editor events.
 */
export interface EditorSessionAccessoryEventArgs {
  /** Command that owns the accessory, or `null` for selection-driven mounts. */
  command: EditorCommand | null
  /** Accessory being mounted or unmounted. */
  accessory: EditorSessionAccessory
  /** Mount options; present on mount events and usually on unmount. */
  options?: EditorSessionAccessoryOptions
  /** Whether this lifecycle is driven by a command or by selection. */
  source: 'command' | 'selection'
}
