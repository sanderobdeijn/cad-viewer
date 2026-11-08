import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'

import { AcApSettingManager } from '../../app/AcApSettingManager'

/**
 * Returns whether orthogonal cursor locking is enabled.
 */
export function isOrthoModeEnabled(): boolean {
  return Number(AcApSettingManager.instance.get('orthoMode')) !== 0
}

/**
 * Constrains a point to horizontal or vertical movement relative to a reference
 * point, matching AutoCAD ORTHOMODE behavior.
 */
export function constrainToOrtho(
  point: GeometryPoint2dLike,
  reference: GeometryPoint2dLike
): GeometryPoint2dLike {
  const dx = point.x - reference.x
  const dy = point.y - reference.y

  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: point.x, y: reference.y }
  }

  return { x: reference.x, y: point.y }
}
