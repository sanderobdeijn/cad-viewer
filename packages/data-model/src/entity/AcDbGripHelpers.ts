import { AcGeVector3dLike } from '@mlightcad/geometry-engine'

/** A 2D or 3D point that a grip move can offset in place. */
type AcGeMovablePoint = { add(offset: AcGeVector3dLike): unknown }

/**
 * Invokes a grip move handler for each valid grip index.
 */
export function acdbForEachGripIndex(
  indices: readonly number[],
  moveAtIndex: (index: number) => void
) {
  for (const index of indices) {
    if (Number.isInteger(index) && index >= 0) {
      moveAtIndex(index)
    }
  }
}

/**
 * Moves the primary grip point at index 0.
 */
export function acdbMovePrimaryGripPointAt(
  indices: readonly number[],
  offset: AcGeVector3dLike,
  point: AcGeMovablePoint
) {
  acdbForEachGripIndex(indices, index => {
    if (index === 0) {
      point.add(offset)
    }
  })
}

/**
 * Moves one vertex on a 2D polyline geometry object.
 */
export function acdbMovePolyline2dVertexAt(
  vertices: Array<{ x: number; y: number }>,
  index: number,
  offset: AcGeVector3dLike
) {
  const vertex = vertices[index]
  if (!vertex) return
  vertex.x += offset.x
  vertex.y += offset.y
}

/**
 * Moves indexed points in a mutable point array.
 */
export function acdbMovePointArrayGripAt(
  indices: readonly number[],
  offset: AcGeVector3dLike,
  points: readonly AcGeMovablePoint[]
) {
  acdbForEachGripIndex(indices, index => {
    const point = points[index]
    if (point) {
      point.add(offset)
    }
  })
}
