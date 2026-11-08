/** @jest-environment jsdom */

import { EDITOR_TOUCH_POINT_LONG_PRESS_MS } from '../src/editor/input/ui/EditorTouchPointTiming'
import { UIDialog } from '../src/ui/UIDialog'
import {
  uiLocalIsoDate,
  uiShouldShowTouchPointTutorialFromPrefs,
  UITouchPointTutorial
} from '../src/ui/touch-point-tutorial'

describe('UITouchPointTutorial', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.getElementById(UIDialog.styleId)?.remove()
    document.getElementById('ml-ui-touch-point-tutorial-styles')?.remove()
  })

  it('shows the demo animation and dismiss controls', async () => {
    const writePrefs = jest.fn()
    void UITouchPointTutorial.maybeShow({
      longPressMs: EDITOR_TOUCH_POINT_LONG_PRESS_MS,
      labels: {
        title: 'Title',
        description: 'Description',
        snoozeToday: 'Snooze',
        hideForever: 'Hide',
        ok: 'OK'
      },
      shouldShow: () => true,
      readPrefs: () => ({ hideForever: false, snoozeDate: null }),
      writePrefs
    })

    expect(document.querySelector('.ml-touch-tutorial-demo')).not.toBeNull()
    const ok = document.querySelector(
      '.ml-ui-touch-point-tutorial-ok'
    ) as HTMLButtonElement
    ok.click()
    await Promise.resolve()
    expect(writePrefs).toHaveBeenCalled()
    expect(document.querySelector('.ml-ui-dialog-backdrop')).toBeNull()
  })

  it('respects hide and snooze preferences', () => {
    expect(
      uiShouldShowTouchPointTutorialFromPrefs(() => true, {
        hideForever: false,
        snoozeDate: null
      })
    ).toBe(true)
    expect(
      uiShouldShowTouchPointTutorialFromPrefs(() => true, {
        hideForever: true,
        snoozeDate: null
      })
    ).toBe(false)
    expect(
      uiShouldShowTouchPointTutorialFromPrefs(() => true, {
        hideForever: false,
        snoozeDate: uiLocalIsoDate()
      })
    ).toBe(false)
    expect(
      uiShouldShowTouchPointTutorialFromPrefs(() => false, {
        hideForever: false,
        snoozeDate: null
      })
    ).toBe(false)
  })
})
