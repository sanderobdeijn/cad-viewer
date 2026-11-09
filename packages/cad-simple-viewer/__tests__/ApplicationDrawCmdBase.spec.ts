import type { ApplicationContext } from '../src/app/ApplicationContext'
import {
  ApplicationMeasureDrawCmd,
  withMeasureInput
} from '../src/command/measure/ApplicationMeasureDrawCmd'
import { EditorOpenMode } from '../src/editor/view/EditorOpenMode'

jest.mock('../src/app/ApplicationSettingManager', () => ({
  ApplicationSettingManager: {
    instance: {
      isShowRibbon: false,
      events: {
        modified: {
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        }
      }
    }
  }
}))

class MeasureDrawStub extends ApplicationMeasureDrawCmd {
  async execute(): Promise<void> {
    return
  }
}

describe('ApplicationMeasureDrawCmd', () => {

  it('runs the body in selection mode with a crosshair cursor', async () => {
    const withCursor = jest.fn(async (_type, fn: () => Promise<void>) => {
      await fn()
    })
    const withMode = jest.fn(async (_mode, fn: () => Promise<void>) => {
      await fn()
    })
    const context = {
      view: {
        withMode,
        editor: { withCursor }
      }
    } as unknown as ApplicationContext
    const body = jest.fn()
    await withMeasureInput(context, body)
    expect(withMode).toHaveBeenCalledWith(0, expect.any(Function))
    expect(withCursor).toHaveBeenCalledWith(0, body)
    expect(body).toHaveBeenCalledTimes(1)
  })
})
