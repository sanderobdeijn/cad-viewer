import { AcGeMatrix3d, AcGePoint2dLike } from '@mlightcad/data-model'

/**
 * Builds a world-space rotation matrix around a given base point.
 *
 * @param basePoint - Rotation origin.
 * @param angleRad - Rotation angle in radians.
 * @returns Composite transform that rotates around `basePoint`.
 */
export function createRotationMatrix(
  basePoint: AcGePoint2dLike,
  angleRad: number
) {
  return new AcGeMatrix3d()
    .makeTranslation(basePoint.x, basePoint.y, 0)
    .multiply(new AcGeMatrix3d().makeRotationZ(angleRad))
    .multiply(
      new AcGeMatrix3d().makeTranslation(-basePoint.x, -basePoint.y, -0)
    )
}
