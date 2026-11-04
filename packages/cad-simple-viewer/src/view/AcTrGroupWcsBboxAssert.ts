import * as THREE from 'three'

export interface AcTrGroupWcsBboxLike {
  wcsBbox: THREE.Box3
  wcsChildBoxes: ReadonlyArray<{
    minX: number
    minY: number
    maxX: number
    maxY: number
  }>
}

/**
 * Tests whether a 2D axis-aligned box has finite extents.
 *
 * Deferred MText/Shape geometry can seed `±Infinity` placeholders in
 * {@link AcTrGroup.wcsChildBoxes}; those entries must be skipped when unioning
 * bounds for spatial indexing.
 */
export function isFiniteSpatialBBox(box: {
  minX: number
  minY: number
  maxX: number
  maxY: number
}): boolean {
  return (
    Number.isFinite(box.minX) &&
    Number.isFinite(box.minY) &&
    Number.isFinite(box.maxX) &&
    Number.isFinite(box.maxY)
  )
}

/**
 * Unions per-child WCS boxes into one axis-aligned WCS box.
 *
 * Non-finite child boxes are skipped, matching
 * {@link AcTrGroup.syncWcsBboxFromChildBoxes}.
 */
export function unionGroupWcsChildBoxes(
  group: AcTrGroupWcsBboxLike
): THREE.Box3 {
  const union = new THREE.Box3()
  for (const box of group.wcsChildBoxes) {
    if (!isFiniteSpatialBBox(box)) {
      continue
    }
    union.union(
      new THREE.Box3(
        new THREE.Vector3(box.minX, box.minY, 0),
        new THREE.Vector3(box.maxX, box.maxY, 0)
      )
    )
  }
  return union
}
