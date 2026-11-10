import {
  GeometryMatrix2d,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'
/**
 * Builds a world-space rotation matrix around a given base point.
 *
 * @param basePoint - Rotation origin.
 * @param angleRad - Rotation angle in radians.
 * @returns Composite transform that rotates around `basePoint`.
 */
export function createRotationMatrix(
  basePoint: GeometryPoint2dLike,
  angleRad: number
) {
  return new GeometryMatrix2d()
    .makeTranslation(basePoint.x, basePoint.y)
    .multiply(new GeometryMatrix2d().makeRotation(angleRad))
    .multiply(
      new GeometryMatrix2d().makeTranslation(-basePoint.x, -basePoint.y)
    )
}
