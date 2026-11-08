import { EditorCommand } from '../editor/command/EditorCommand'
import { uiBindDrawStyleSessionAccessory } from '../ui/UIDrawStyle'

/**
 * Shared base for measure draw commands that expose color / font-size
 * session accessories while prompting.
 */
export abstract class ApplicationDrawStyleDrawCmd extends EditorCommand {
  constructor() {
    super()
    uiBindDrawStyleSessionAccessory(this)
  }
}
