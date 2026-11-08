import { AcApSettingManager } from '../app/AcApSettingManager'
import { AcEdCommand } from '../editor'
import { toggleBlackWhiteBackgroundColor } from '../editor/global/AcEdUiColor'

/**
 * Command for switching the drawing background between white and black.
 */
export class AcApSwitchBgCmd extends AcEdCommand {
  /**
   * Executes the command to switch the drawing background between white and black.
   */
  async execute() {
    const settings = AcApSettingManager.instance
    settings.set(
      'modelBackgroundColor',
      toggleBlackWhiteBackgroundColor(settings.get('modelBackgroundColor'))
    )
  }
}
