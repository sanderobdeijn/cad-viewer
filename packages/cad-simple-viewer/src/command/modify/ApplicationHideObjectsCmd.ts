import { ApplicationContext, ApplicationDocManager, hideObjects } from '../../app'
import {
  EditorCommand,
  EditorPromptSelectionOptions,
  EditorPromptStatus
} from '../../editor'
import { ApplicationI18n } from '../../i18n'

/**
 * Command to temporarily suppress display of selected objects.
 */
export class ApplicationHideObjectsCmd extends EditorCommand {
  async execute(context: ApplicationContext) {
    const selectionSet = context.view.selectionSet
    let objectIds = selectionSet.count > 0 ? selectionSet.ids : []

    if (objectIds.length === 0) {
      const options = new EditorPromptSelectionOptions(
        ApplicationI18n.sysCmdPrompt('hideobjects')
      )
      const selectionResult =
        await ApplicationDocManager.instance.editor.getSelection(options)
      if (
        selectionResult.status !== EditorPromptStatus.OK ||
        !selectionResult.value ||
        selectionResult.value.count === 0
      ) {
        return
      }
      objectIds = selectionResult.value.ids
    }

    const count = hideObjects(context, objectIds)
    if (count > 0) {
      this.showMessage(
        `${count} ${ApplicationI18n.t('jig.hideobjects.hidden')}`,
        'success'
      )
    }
  }
}
