jest.mock('../src/app', () => ({}))

jest.mock('../src/editor', () => {
  class AcEdCommand {}

  return {
    AcEdCommand
  }
})

import { AcApSwitchBgCmd } from '../src/command/AcApSwitchBgCmd'
import { useTestSettings } from './helpers/settings'

describe('AcApSwitchBgCmd', () => {
  it('toggles the background between black and white', async () => {
    const settings = useTestSettings({ modelBackgroundColor: 0x000000 })

    await new AcApSwitchBgCmd().execute()
    expect(settings.get('modelBackgroundColor')).toBe(0xffffff)
    await new AcApSwitchBgCmd().execute()
    expect(settings.get('modelBackgroundColor')).toBe(0x000000)
  })
})
