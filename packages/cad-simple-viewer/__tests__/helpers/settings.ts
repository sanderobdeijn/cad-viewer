import {
  AcApSettingManager,
  type AcApSettings
} from '../../src/app/AcApSettingManager'

/**
 * Gives a test fresh settings in memory: an empty localStorage stub and a new
 * settings manager, with the given values applied for the session only.
 *
 * @param values - Settings the test needs
 * @returns The settings manager
 */
export function useTestSettings(values: Partial<AcApSettings> = {}) {
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
  AcApSettingManager.resetInstanceForTesting()
  const settings = AcApSettingManager.instance
  settings.apply(values, { persist: false })
  return settings
}
