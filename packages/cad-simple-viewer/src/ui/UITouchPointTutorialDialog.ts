import { ApplicationSettingManager } from '../app/ApplicationSettingManager'
import { editorIsMobileOrPadUi } from '../editor/global/EditorUiLayout'
import { resolveUiTheme } from '../editor/global/EditorUiTheme'
import { EDITOR_TOUCH_POINT_LONG_PRESS_MS } from '../editor/input/ui/EditorTouchPointTiming'
import { ApplicationI18n } from '../i18n/ApplicationI18n'
import {
  uiShouldShowTouchPointTutorialFromPrefs,
  UITouchPointTutorial
} from './touch-point-tutorial'

/**
 * Whether the mobile precise point-pick tutorial should be shown.
 */
export function uiShouldShowTouchPointTutorial(): boolean {
  const settings = ApplicationSettingManager.instance
  return uiShouldShowTouchPointTutorialFromPrefs(
    editorIsMobileOrPadUi,
    {
      hideForever: settings.get('hideTouchPointTutorial'),
      snoozeDate: settings.get('touchPointTutorialSnoozeDate')
    }
  )
}

/**
 * Live-viewer adapter for {@link UITouchPointTutorial} backed by
 * {@link ApplicationSettings} and {@link ApplicationI18n}.
 */
export class UITouchPointTutorialDialog {
  /**
   * Opens the tutorial when {@link uiShouldShowTouchPointTutorial} is true.
   *
   * @param host - Backdrop host; defaults to `document.body`.
   */
  static maybeShow(host: HTMLElement = document.body): Promise<void> {
    return UITouchPointTutorial.maybeShow({
      host,
      theme: resolveUiTheme(host),
      longPressMs: EDITOR_TOUCH_POINT_LONG_PRESS_MS,
      labels: {
        title: ApplicationI18n.t('main.touchPointTutorial.title'),
        description: ApplicationI18n.t('main.touchPointTutorial.description'),
        snoozeToday: ApplicationI18n.t('main.touchPointTutorial.snoozeToday'),
        hideForever: ApplicationI18n.t('main.touchPointTutorial.hideForever'),
        ok: ApplicationI18n.t('main.touchPointTutorial.ok')
      },
      shouldShow: uiShouldShowTouchPointTutorial,
      readPrefs: () => ({
        hideForever: ApplicationSettingManager.instance.get('hideTouchPointTutorial'),
        snoozeDate: ApplicationSettingManager.instance.get(
          'touchPointTutorialSnoozeDate'
        )
      }),
      writePrefs: prefs => {
        const settings = ApplicationSettingManager.instance
        settings.set('hideTouchPointTutorial', prefs.hideForever)
        settings.set('touchPointTutorialSnoozeDate', prefs.snoozeDate)
      }
    })
  }
}

export {
  uiLocalIsoDate,
  uiShouldShowTouchPointTutorialFromPrefs,
  UITouchPointTutorial,
  type UITouchPointTutorialConfig,
  type UITouchPointTutorialLabels,
  type UITouchPointTutorialPrefs
} from './touch-point-tutorial'
