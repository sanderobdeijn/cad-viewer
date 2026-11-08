import { ApplicationSettingManager } from '../app/ApplicationSettingManager'
import { EditorSessionAccessoryMountSkippedError } from '../editor/command/EditorCommand'
import {
  EDITOR_DRAW_STYLE_SESSION_PROVIDER_ID,
  type EditorDrawStyleSessionHost,
  type EditorSessionAccessory,
  type EditorSessionAccessoryOptions
} from '../editor/command/EditorSessionAccessory'
import {
  type ApplicationDrawStyleKind,
  applicationDrawStyleKindForCommand
} from '../util/ApplicationCommandUtil'
import {
  EDITOR_SHORTCUT_TOOLBAR_PROVIDER_ID,
  type UIShortCutToolbar
} from './UIShortCutToolbar'

/**
 * Kind of drawing session served by the draw-style session accessory.
 *
 * @see {@link ApplicationDrawStyleKind}
 */
export type UIDrawStyleKind = ApplicationDrawStyleKind

/** Input for {@link uiResolveDrawStyleKind}. */
export interface UIResolveDrawStyleKindInput {
  /** Kind of the running draw command, if any. */
  commandKind?: UIDrawStyleKind
  /** True when a measurement overlay is selected. */
  measurementSelected?: boolean
}

/**
 * Session kind for the draw-style accessory: an active draw command wins,
 * otherwise a selected measurement keeps the controls available.
 *
 * @param input - Active command kind and overlay selection flags.
 * @returns `'measure'`, or `undefined` when the accessory should hide.
 */
export function uiResolveDrawStyleKind(
  input: UIResolveDrawStyleKindInput
): UIDrawStyleKind | undefined {
  if (input.commandKind) return input.commandKind
  if (input.measurementSelected) return 'measure'
  return undefined
}

/**
 * Whether the draw-style session accessory should be shown for the given session.
 *
 * The accessory is only needed when the host ribbon is turned off;
 * cad-viewer already exposes color / lineweight / font-size on the ribbon.
 * Shells without a ribbon should set `isShowRibbon` to `false`
 * with `{ persist: false }` instead of a separate host flag.
 *
 * @param kind - Active drawing or selection session, or `undefined` when none.
 * @param showRibbon - Whether the host ribbon is visible.
 * @returns `true` when the session accessory should be displayed.
 */
export function uiShouldShowDrawStyleToolbar(
  kind: UIDrawStyleKind | undefined,
  showRibbon: boolean = ApplicationSettingManager.instance.isShowRibbon
): boolean {
  return kind != null && !showRibbon
}

/**
 * Assigns `command.sessionAccessory` so trigger mounts the view's draw-style controls.
 *
 * Sets the host session kind from the command's global name so color / font-size
 * sync and apply target the measure store while the command runs.
 * Desktop mounts are suppressed when the ribbon already exposes the same UI, or
 * when the shortcut toolbar is visible (it owns the desktop draw-style slot).
 * Phone/pad mounts target the session-panel accessory host (resolved even before
 * the panel opens so `trigger` can attach controls on the first row).
 *
 * @param command - Command that should expose color / font-size session UI.
 */
export function uiBindDrawStyleSessionAccessory(command: {
  /** Global command name used to resolve the draw-style kind. */
  globalName?: string
  /** Session accessory slot assigned by this binder. */
  sessionAccessory: EditorSessionAccessory | null
}): void {
  /** Inner accessory created from the view host while mounted. */
  let inner: EditorSessionAccessory | null = null

  command.sessionAccessory = {
    id: 'draw-style',
    /**
     * Resolves the view host, applies session kind, and mounts controls.
     *
     * @param options - Host element, slot type, and owning view.
     * @throws {EditorSessionAccessoryMountSkippedError} When there is no host,
     *   desktop ribbon already covers the same UI, or the shortcut toolbar
     *   owns the desktop slot.
     */
    mount(options: EditorSessionAccessoryOptions) {
      const host = options.view.sessionProviders.get<EditorDrawStyleSessionHost>(
        EDITOR_DRAW_STYLE_SESSION_PROVIDER_ID
      )
      if (!host) {
        throw new EditorSessionAccessoryMountSkippedError()
      }

      const kind = applicationDrawStyleKindForCommand(command.globalName)
      host.setActiveKind(kind)

      if (options.type === 'desktop') {
        const shortcut = options.view.sessionProviders.get<UIShortCutToolbar>(
          EDITOR_SHORTCUT_TOOLBAR_PROVIDER_ID
        )
        // Shortcut binder mounts draw-style on desktop; skip top-center chrome.
        if (shortcut?.isVisible) {
          throw new EditorSessionAccessoryMountSkippedError()
        }
        if (!uiShouldShowDrawStyleToolbar(kind)) {
          throw new EditorSessionAccessoryMountSkippedError()
        }
      }

      inner = host.createSessionAccessory()
      inner.mount(options)
    },
    /** Unmounts the inner host accessory created during {@link mount}. */
    unmount() {
      inner?.unmount()
      inner = null
    }
  }
}
