import type { ApplicationContext } from '../app/ApplicationContext'
import type { EditorCorsorType } from '../editor/input/EditorCursorManager'
import type { EditorViewMode } from '../editor/view/EditorBaseView'

/**
 * {@link EditorViewMode.SELECTION}. Numeric so this module stays loadable in
 * Node Jest (the enum lives on the DOM-heavy `EditorBaseView` module).
 */
const SELECTION_MODE = 0 as EditorViewMode

/**
 * {@link EditorCorsorType.Crosshair}. Same Jest constraint as
 * {@link SELECTION_MODE}.
 */
const CROSSHAIR_CURSOR = 0 as EditorCorsorType

/**
 * Selection mode + crosshair used by measure-draw commands.
 */
export async function withDrawOverlayInput(
  context: ApplicationContext,
  fn: () => Promise<void>
): Promise<void> {
  await context.view.withMode(SELECTION_MODE, () =>
    context.view.editor.withCursor(CROSSHAIR_CURSOR, fn)
  )
}
