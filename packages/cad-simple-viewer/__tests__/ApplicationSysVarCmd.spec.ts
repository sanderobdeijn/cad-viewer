jest.mock('../src/app', () => ({}))

jest.mock('../src/editor', () => {
  class EditorCommand {}

  return {
    EditorCommand,
    EditorPromptStatus: { OK: 'OK' },
    EditorPromptStringOptions: class {}
  }
})

jest.mock('../src/i18n', () => ({
  ApplicationI18n: { t: (key: string) => key }
}))

import { APPLICATION_SETTING_COMMANDS } from '../src/app/ApplicationSettingManager'
import { parseSettingValue } from '../src/command/ApplicationSysVarCmd'
import { useTestSettings } from './helpers/settings'

describe('setting commands', () => {
  it('names a setting that exists for every command', () => {
    const settings = useTestSettings()
    for (const key of Object.values(APPLICATION_SETTING_COMMANDS)) {
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
