import {
  ApplicationSettingManager,
  type ApplicationSettings
} from '../../src/app/ApplicationSettingManager'

/**
 * Gives a test fresh settings in memory: an empty localStorage stub and a new
 * settings manager, with the given values applied for the session only.
 *
 * @param values - Settings the test needs
 * @returns The settings manager
 */
export function useTestSettings(values: Partial<ApplicationSettings> = {}) {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear()
    }
  })
  ApplicationSettingManager.resetInstanceForTesting()
  const settings = ApplicationSettingManager.instance
  settings.apply(values, { persist: false })
  return settings
}
