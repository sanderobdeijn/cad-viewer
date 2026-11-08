import { ApplicationSettingManager } from '../../app/ApplicationSettingManager'
import { editorInteractionStrategy } from './ui/EditorInteractionStrategy'

/**
 * Returns whether cursor dynamic input should be active.
 *
 * Phone and pad UIs always return `false`: floating input next to the cursor is
 * not usable on touch devices, regardless of **DYNMODE**. This includes
 * landscape / wide tablets, not only the phone breakpoint.
 *
 * @returns `true` when the dynamic input setting (**DYNMODE**) is non-zero and the layout allows cursor
 *   dynamic input ({@link EditorPointPromptPolicy.showsCursorDynamicInput}).
 */
export function editorIsDynamicInputEnabled(): boolean {
  if (!editorInteractionStrategy().point.showsCursorDynamicInput) return false
  return Number(ApplicationSettingManager.instance.get('dynamicInputMode')) !== 0
}
