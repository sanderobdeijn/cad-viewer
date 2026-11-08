import { ApplicationContext } from '../app/ApplicationContext'
import { EditorCommand } from '../editor'
import { UIAboutDialog } from '../ui/UIAboutDialog'

/**
 * Command that opens the mlightcad About dialog.
 *
 * Registered as the system command `about`.
 *
 * Imports `ApplicationContext` / `UIAboutDialog` via direct module paths (not the
 * `../app` barrel) to avoid a circular dependency with {@link ApplicationDocManager}.
 */
export class ApplicationAboutCmd extends EditorCommand {
  /**
   * Shows the About dialog on the current view host (or `document.body`).
   *
   * @param context - Application context providing the view host
   */
  async execute(context: ApplicationContext) {
    const host = context.view?.container ?? document.body
    await UIAboutDialog.open(host)
  }
}
