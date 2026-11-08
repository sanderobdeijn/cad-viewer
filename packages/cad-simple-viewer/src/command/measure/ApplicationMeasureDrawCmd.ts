import type { ApplicationContext } from '../../app/ApplicationContext'
import { EditorOpenMode } from '../../editor/view/EditorOpenMode'
import { withDrawOverlayInput } from '../ApplicationDrawOverlayInput'
import { ApplicationDrawStyleDrawCmd } from '../ApplicationDrawStyleDrawCmd'

/**
 * Shared input session for commands that create measurement overlays.
 *
 * Selection mode + crosshair, matching the historical wrap in each
 * measure-draw command.
 */
export const withMeasureInput = withDrawOverlayInput

/**
 * Base class for commands that create measurement overlays.
 *
 * Sets Read mode and binds the phone/pad color / font-size accessory.
 * Clear, visibility, and import/export stay on {@link EditorCommand}.
 */
export abstract class ApplicationMeasureDrawCmd extends ApplicationDrawStyleDrawCmd {
  constructor() {
    super()
    this.mode = EditorOpenMode.Read
  }

  /** Run a measure-draw body inside selection mode + crosshair cursor. */
  protected withMeasureInput(
    context: ApplicationContext,
    fn: () => Promise<void>
  ): Promise<void> {
    return withDrawOverlayInput(context, fn)
  }
}
