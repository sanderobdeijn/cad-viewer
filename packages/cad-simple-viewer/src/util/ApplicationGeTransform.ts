import {
  GeometryMatrix3d,
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
  return new GeometryMatrix3d()
    .makeTranslation(basePoint.x, basePoint.y, 0)
    .multiply(new GeometryMatrix3d().makeRotationZ(angleRad))
    .multiply(
      new GeometryMatrix3d().makeTranslation(-basePoint.x, -basePoint.y, -0)
    )
}
