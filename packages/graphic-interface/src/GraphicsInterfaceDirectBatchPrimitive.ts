/**
 * Primitive kinds that a renderer may capture from a single {@link GraphicsInterfaceRenderer}
 * draw call and append into a batch without an intermediate scene-graph entity.
 *
 * Drawables advertise support via {@link GraphicsInterfaceDrawable.directBatchPrimitive}.
 *
 * @internal
 */
export type GraphicsInterfaceDirectBatchPrimitive =
  /** `lines` / `circularArc` / `ellipticalArc` (tessellated to a point strip). */
  | 'lineStrip'
  /** `lineSegments` (indexed `gl.LINES`). */
  | 'lineSegments'
  /** `point` with a simple Points drawable (no symbol LineSegments). */
  | 'point'
