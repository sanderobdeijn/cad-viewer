import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'

import { EditorSpatialQueryResultItemEx } from '../editor'

export function sortPickResults(
  results: EditorSpatialQueryResultItemEx[],
  point: GeometryPoint2dLike
) {
  return [...results].sort((a, b) => comparePickResults(a, b, point))
}

function comparePickResults(
  a: EditorSpatialQueryResultItemEx,
  b: EditorSpatialQueryResultItemEx,
  point: GeometryPoint2dLike
) {
  const areaDelta = bboxArea(a) - bboxArea(b)
  if (Math.abs(areaDelta) > Number.EPSILON) return areaDelta

  const distanceDelta =
    squaredDistanceToBox(point, a) - squaredDistanceToBox(point, b)
  if (Math.abs(distanceDelta) > Number.EPSILON) return distanceDelta

  return 0
}

function bboxArea(item: EditorSpatialQueryResultItemEx) {
  return Math.max(item.maxX - item.minX, 0) * Math.max(item.maxY - item.minY, 0)
}

function squaredDistanceToBox(
  point: GeometryPoint2dLike,
  item: EditorSpatialQueryResultItemEx
) {
  const dx =
    point.x < item.minX
      ? item.minX - point.x
      : point.x > item.maxX
        ? point.x - item.maxX
        : 0
  const dy =
    point.y < item.minY
      ? item.minY - point.y
      : point.y > item.maxY
        ? point.y - item.maxY
        : 0

  return dx * dx + dy * dy
}
