import { ApplicationSettingManager } from '../../app/ApplicationSettingManager'

/**
 * Returns whether cursor dynamic input should be active.
 *
 * @returns `true` when the dynamic input setting (**DYNMODE**) is non-zero.
 */
export function editorIsDynamicInputEnabled(): boolean {
  return Number(ApplicationSettingManager.instance.get('dynamicInputMode')) !== 0
}
