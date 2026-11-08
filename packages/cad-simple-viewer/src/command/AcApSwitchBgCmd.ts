import { AcApContext } from '../app'
import { AcApSettingManager } from '../app/AcApSettingManager'
import { AcEdCommand } from '../editor'
import {
  layoutBackgroundSetting,
  toggleBlackWhiteBackgroundColor
} from '../editor/global/AcEdUiColor'
import { AcTrView2d } from '../view/AcTrView2d'

/**
 * Command for switching the drawing background between white and black.
 *
 * Toggles the model space background in model space, or the paper space
 * background in the active paper-space layout.
 */
export class AcApSwitchBgCmd extends AcEdCommand {
  /**
   * Executes the command to switch the drawing background between white and black.
   *
   * @param context - The application context containing the view
   */
  async execute(context: AcApContext) {
    const view = context.view as AcTrView2d
    const isModelSpace = view.activeLayoutBtrId === view.modelSpaceBtrId
    const key = layoutBackgroundSetting(isModelSpace)
    const settings = AcApSettingManager.instance
    settings.set(key, toggleBlackWhiteBackgroundColor(settings.get(key)))
  }
}
