jest.mock('../src/app', () => ({}))

jest.mock('../src/editor', () => {
  class EditorCommand {}

  return {
    EditorCommand
  }
})

import { ApplicationSwitchBgCmd } from '../src/command/ApplicationSwitchBgCmd'
import { useTestSettings } from './helpers/settings'

describe('ApplicationSwitchBgCmd', () => {
  it('toggles the background between black and white', async () => {
    const settings = useTestSettings({ modelBackgroundColor: 0x000000 })

    await new ApplicationSwitchBgCmd().execute()
    expect(settings.get('modelBackgroundColor')).toBe(0xffffff)
    await new ApplicationSwitchBgCmd().execute()
    expect(settings.get('modelBackgroundColor')).toBe(0x000000)
  })
})
