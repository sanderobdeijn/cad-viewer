import type { AcGiDirectBatchPrimitive } from './AcGiDirectBatchPrimitive'
import type { AcGiEntity } from './AcGiEntity'
import type { AcGiRenderer } from './AcGiRenderer'

/**
 * Something the renderer can draw: one shape, point or dimension of a drawing.
 *
 * The view converts drawables into scene objects. It keys them by
 * {@link objectId}, files them under {@link ownerId} and {@link layer}, and
 * draws them through {@link worldDraw}.
 */
export interface AcGiDrawable {
  /** Id of the drawn item */
  readonly objectId: string
  /** Id of the space that owns the item */
  readonly ownerId: string
  /** Name of the layer the item is drawn on */
  readonly layer: string
  /** Whether the item is shown */
  readonly visibility: boolean
  /** Kind of the item, for diagnostics */
  readonly type: string
  /**
   * The single batchable primitive this item draws, or `null` when it has to
   * be drawn as its own object.
   */
  readonly directBatchPrimitive: AcGiDirectBatchPrimitive | null
  /**
   * Draws the item with the given renderer.
   *
   * @param renderer - The renderer to draw with
   * @param delay - Whether text geometry may be finished later
   * @returns The drawn object, or undefined when nothing is drawn
   */
  worldDraw(renderer: AcGiRenderer, delay?: boolean): AcGiEntity | undefined
}
