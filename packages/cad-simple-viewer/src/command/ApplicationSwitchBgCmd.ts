import { ApplicationSettingManager } from '../app/ApplicationSettingManager'
import { EditorCommand } from '../editor'
import { toggleBlackWhiteBackgroundColor } from '../editor/global/EditorUiColor'

/**
 * Command for switching the drawing background between white and black.
 */
export class ApplicationSwitchBgCmd extends EditorCommand {
  /**
   * Executes the command to switch the drawing background between white and black.
   */
  async execute() {
    const settings = ApplicationSettingManager.instance
    settings.set(
      'modelBackgroundColor',
      toggleBlackWhiteBackgroundColor(settings.get('modelBackgroundColor'))
    )
  }
}
