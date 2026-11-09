import type { GraphicsInterfaceDirectBatchPrimitive } from './GraphicsInterfaceDirectBatchPrimitive'
import type { GraphicsInterfaceEntity } from './GraphicsInterfaceEntity'
import type { GraphicsInterfaceRenderer } from './GraphicsInterfaceRenderer'

/**
 * Something the renderer can draw: one shape, point or dimension of a drawing.
 *
 * The view converts drawables into scene objects. It keys them by
 * {@link objectId}, files them under {@link ownerId}, and draws them through
 * {@link worldDraw}.
 */
export interface GraphicsInterfaceDrawable {
  /** Id of the drawn item */
  readonly objectId: string
  /** Id of the space that owns the item */
  readonly ownerId: string
  /** Whether the item is shown */
  readonly visibility: boolean
  /** Kind of the item, for diagnostics */
  readonly type: string
  /**
   * The single batchable primitive this item draws, or `null` when it has to
   * be drawn as its own object.
   */
  readonly directBatchPrimitive: GraphicsInterfaceDirectBatchPrimitive | null
  /**
   * Draws the item with the given renderer.
   *
   * @param renderer - The renderer to draw with
   * @param delay - Whether text geometry may be finished later
   * @returns The drawn object, or undefined when nothing is drawn
   */
  worldDraw(renderer: GraphicsInterfaceRenderer, delay?: boolean): GraphicsInterfaceEntity | undefined
}
