jest.mock('../src/app', () => ({}))

jest.mock('../src/editor', () => {
  class AcEdCommand {}

  return {
    AcEdCommand
  }
})

import { AcApSwitchBgCmd } from '../src/command/AcApSwitchBgCmd'
import { useTestSettings } from './helpers/settings'

const run = (activeLayoutBtrId: string) =>
  new AcApSwitchBgCmd().execute({
    view: { activeLayoutBtrId, modelSpaceBtrId: 'model' }
  } as never)

describe('AcApSwitchBgCmd', () => {
  it('toggles the model space background between black and white', async () => {
    const settings = useTestSettings({ modelBackgroundColor: 0x000000 })

    await run('model')
    expect(settings.get('modelBackgroundColor')).toBe(0xffffff)
    await run('model')
    expect(settings.get('modelBackgroundColor')).toBe(0x000000)
  })

  it('toggles the paper space background in a layout', async () => {
    const settings = useTestSettings({ paperBackgroundColor: 0xffffff })

    await run('layout')
    expect(settings.get('paperBackgroundColor')).toBe(0x000000)
    expect(settings.get('modelBackgroundColor')).toBe(0x000000)
  })
})
