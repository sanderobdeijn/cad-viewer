import type { EditorCommand } from '../editor/command/EditorCommand'
import type { EditorCommandStack } from '../editor/command/EditorCommandStack'
import type { ThreeRendererView2d } from '../view'

/**
 * Registers a built-in system command with resolved aliases.
 *
 * @param cmdGlobalName - Global (English) command name.
 * @param cmdLocalName - Localized command name.
 * @param cmd - Command instance to register.
 */
export type ApplicationSystemCommandRegistrar = (
  cmdGlobalName: string,
  cmdLocalName: string,
  cmd: EditorCommand
) => void

/** Context for one-time draw-style session accessory installation per view. */
export interface ApplicationDrawStyleSessionInstallContext {
  /** View that receives the draw-style controls host. */
  view: ThreeRendererView2d
  /** Command stack used to resolve the active draw command kind. */
  commandManager: EditorCommandStack
}

export {
  applicationGetDrawStyleSessionAccessory,
  applicationInstallDrawStyleSessionAccessory
} from './ApplicationInstallDrawStyleSessionAccessory'
