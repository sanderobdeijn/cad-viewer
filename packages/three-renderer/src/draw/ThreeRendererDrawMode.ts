/**
 * How a converted entity's drawables should enter the scene graph.
 *
 * - `batch`: flatten render leaves and merge them in {@link ThreeRendererBatchedGroup}.
 * - `unbatch`: keep the renderer placement hierarchy and draw via the unbatched path.
 */
export type ThreeRendererDrawMode = 'batch' | 'unbatch'
