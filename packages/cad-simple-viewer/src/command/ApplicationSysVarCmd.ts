import { ApplicationContext, ApplicationDocManager } from '../app'
import {
  APPLICATION_SETTING_COMMANDS,
  ApplicationSettingManager,
  type ApplicationSettings
} from '../app/ApplicationSettingManager'
import {
  EditorCommand,
  EditorPromptStatus,
  EditorPromptStringOptions
} from '../editor'
import { ApplicationI18n } from '../i18n'

/**
 * Reads typed text as a value of the same type as the current setting.
 *
 * @param text - The typed value
 * @param current - The current value, which gives the type
 * @returns The value, or undefined when the text cannot be read as that type
 */
export function parseSettingValue(
  text: string,
  current: unknown
): ApplicationSettings[keyof ApplicationSettings] | undefined {
  const value = text.trim()
  if (typeof current === 'number') {
    const number = Number(value)
    return value !== '' && Number.isFinite(number) ? number : undefined
  }
  if (typeof current === 'boolean') {
    const lower = value.toLowerCase()
    if (['1', 'true', 'on', 'yes'].includes(lower)) return true
    if (['0', 'false', 'off', 'no'].includes(lower)) return false
    return undefined
  }
  return value
}

/** Reads a colour theme typed as `dark` / `light` or as `0` / `1`. */
function parseColorTheme(text: string) {
  const value = text.trim().toLowerCase()
  if (value === 'dark' || value === '0') return 'dark'
  if (value === 'light' || value === '1') return 'light'
  return undefined
}

/**
 * Command for changing one setting from the command line. Each setting is
 * registered under the name of the system variable it replaces, such as
 * `PDMODE`, and all of them share this command.
 */
export class ApplicationSysVarCmd extends EditorCommand {
  /**
   * Prompts for a new value of the setting named by this command.
   *
   * @param _context - The application context
   */
  async execute(_context: ApplicationContext) {
    const key =
      APPLICATION_SETTING_COMMANDS[
        this.globalName.toUpperCase() as keyof typeof APPLICATION_SETTING_COMMANDS
      ]
    if (!key) return
    const settings = ApplicationSettingManager.instance
    const currentValue = settings.get(key)
    const basePrompt = ApplicationI18n.t('jig.sysvar.prompt').trim()
    const prompt = new EditorPromptStringOptions(basePrompt)
    if (currentValue != null) {
      prompt.defaultValue = String(currentValue)
      prompt.useDefaultValue = true
    }
    const result = await ApplicationDocManager.instance.editor.getString(prompt)
    if (result.status !== EditorPromptStatus.OK || !result.stringResult) return
    const value =
      key === 'colorTheme'
        ? parseColorTheme(result.stringResult)
        : parseSettingValue(result.stringResult, currentValue)
    if (value !== undefined) {
      settings.set(key, value as never)
    }
  }
}
