import { ApplicationContext } from '../../app'
import { EditorCommand, EditorOpenMode } from '../../editor'
import { resolveSelectedIds } from '../../service'

/**
 * Command to delete selected objects from the drawing.
 */
export class ApplicationEraseCmd extends EditorCommand {
  constructor() {
    super()
    this.mode = EditorOpenMode.Write
  }

  async execute(context: ApplicationContext) {
    const selectionSet = context.view.selectionSet
    const ids = await resolveSelectedIds(context, 'erase')
    if (!ids) return

    context.doc.entityService.eraseItems(ids)
    selectionSet.clear()
  }
}
