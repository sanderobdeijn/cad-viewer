import { ApplicationContext, unisolateObjects } from '../../app'
import { EditorCommand } from '../../editor'
import { ApplicationI18n } from '../../i18n'

/**
 * Command to redisplay all objects temporarily hidden by HIDEOBJECTS.
 *
 * Matches AutoCAD UNISOLATEOBJECTS, the companion to {@link ApplicationHideObjectsCmd}.
 */
export class ApplicationUnisolateObjectsCmd extends EditorCommand {
  /**
   * Restores session-hidden objects to their database visibility state.
   */
  async execute(context: ApplicationContext) {
    const count = unisolateObjects(context)
    if (count > 0) {
      this.showMessage(
        `${count} ${ApplicationI18n.t('jig.hideobjects.restored')}`,
        'success'
      )
      return
    }

    this.showMessage(ApplicationI18n.t('jig.hideobjects.nothingToRestore'), 'info')
  }
}
