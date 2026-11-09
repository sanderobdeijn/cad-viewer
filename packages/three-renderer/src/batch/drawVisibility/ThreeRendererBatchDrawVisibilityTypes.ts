import type { ThreeRendererVertexBatchGeometryInfo } from '../ThreeRendererBatchedGeometryInfo'

/**
 * Per-slot metadata consumed by draw-visibility strategies when toggling
 * whether one batched sub-geometry is rendered.
 *
 * This type extends {@link ThreeRendererVertexBatchGeometryInfo} so strategies can
 * read slot range/state (`vertexStart`, `vertexCount`, `flags`)
 * and optional draw snapshots ({@link ThreeRendererBatchDrawSnapshot | hiddenDrawSnapshot})
 * from the same record stored in `ThreeRendererBatchedLine`, `ThreeRendererBatchedMesh`,
 * `ThreeRendererBatchedPoint`, or `ThreeRendererBatchedLine2`.
 *
 * Indexed batches also expose optional index-range fields. They are present
 * for line/mesh slots packed with an index buffer and omitted for non-indexed
 * vertex or wide-line segment slots.
 *
 * @see {@link ThreeRendererBatchDrawVisibility.apply}
 * @see {@link ThreeRendererBatchDrawVisibilityStrategy}
 */
export type ThreeRendererBatchDrawVisibilityInfo = ThreeRendererVertexBatchGeometryInfo & {
  /**
   * Start offset of this slot within the packed index buffer.
   *
   * Required by {@link ThreeRendererIndexedBatchDrawVisibilityStrategy | indexed}
   * collapse/restore logic. Omitted or negative when the batch geometry has
   * no index attribute.
   */
  indexStart?: number

  /**
   * Number of index entries owned by this slot in the packed index buffer.
   *
   * Used together with {@link indexStart} to snapshot and rewrite the index
   * range when hiding an indexed line or mesh slot.
   */
  indexCount?: number
}

/**
 * Geometry-layout discriminator used to select a draw-visibility strategy.
 *
 * Each mode corresponds to one concrete
 * {@link ThreeRendererBatchDrawVisibilityStrategy} implementation and matches the
 * attribute layout of the parent batch object's shared
 * {@link THREE.BufferGeometry}.
 *
 * - `'indexed'` — geometry uses an index buffer (typical
 *   {@link THREE.LineSegments} / {@link THREE.Mesh} batches).
 * - `'vertex'` — geometry is drawn from contiguous vertex ranges without
 *   indices (non-indexed lines and points).
 *
 * When omitted at call sites, {@link resolveBatchDrawVisibilityMode} infers
 * the mode from the buffer layout.
 */
export type ThreeRendererBatchDrawVisibilityMode = 'indexed' | 'vertex'
