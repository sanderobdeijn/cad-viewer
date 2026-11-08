import { AcApSettingManager } from '../../app/AcApSettingManager'
import { acedInteractionStrategy } from './ui/AcEdInteractionStrategy'

/**
 * Returns whether cursor dynamic input should be active.
 *
 * Phone and pad UIs always return `false`: floating input next to the cursor is
 * not usable on touch devices, regardless of **DYNMODE**. This includes
 * landscape / wide tablets, not only the phone breakpoint.
 *
 * @returns `true` when the dynamic input setting (**DYNMODE**) is non-zero and the layout allows cursor
 *   dynamic input ({@link AcEdPointPromptPolicy.showsCursorDynamicInput}).
 */
export function acedIsDynamicInputEnabled(): boolean {
  if (!acedInteractionStrategy().point.showsCursorDynamicInput) return false
  return Number(AcApSettingManager.instance.get('dynamicInputMode')) !== 0
}
