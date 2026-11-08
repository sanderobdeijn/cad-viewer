jest.mock('../src/app', () => ({}))

jest.mock('../src/editor', () => {
  class AcEdCommand {}

  return {
    AcEdCommand,
    AcEdPromptStatus: { OK: 'OK' },
    AcEdPromptStringOptions: class {}
  }
})

jest.mock('../src/i18n', () => ({
  AcApI18n: { t: (key: string) => key }
}))

import { ACAP_SETTING_COMMANDS } from '../src/app/AcApSettingManager'
import { parseSettingValue } from '../src/command/AcApSysVarCmd'
import { useTestSettings } from './helpers/settings'

describe('setting commands', () => {
  it('names a setting that exists for every command', () => {
    const settings = useTestSettings()
    for (const key of Object.values(ACAP_SETTING_COMMANDS)) {
      expect(settings.get(key)).not.toBeUndefined()
    }
  })

  it('reads typed values as the type of the current value', () => {
    expect(parseSettingValue(' 34 ', 0)).toBe(34)
    expect(parseSettingValue('abc', 0)).toBeUndefined()
    expect(parseSettingValue('', 0)).toBeUndefined()
    expect(parseSettingValue('on', false)).toBe(true)
    expect(parseSettingValue('0', true)).toBe(false)
    expect(parseSettingValue('maybe', true)).toBeUndefined()
    expect(parseSettingValue(' 30;60 ', '')).toBe('30;60')
  })
})
