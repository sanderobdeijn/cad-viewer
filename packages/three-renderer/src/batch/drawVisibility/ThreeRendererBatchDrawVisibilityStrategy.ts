import * as THREE from 'three'

import type {
  ThreeRendererBatchDrawVisibilityInfo,
  ThreeRendererBatchDrawVisibilityMode
} from './ThreeRendererBatchDrawVisibilityTypes'

/**
 * Strategy interface for collapsing and restoring one batched geometry slot.
 */
export abstract class ThreeRendererBatchDrawVisibilityStrategy {
  /**
   * Rewrites GPU buffers so the slot produces no visible pixels.
   */
  abstract collapse(
    geometry: THREE.BufferGeometry,
    info: ThreeRendererBatchDrawVisibilityInfo
  ): boolean

  /**
   * Restores GPU buffers from the slot snapshot when available.
   */
  abstract restore(
    geometry: THREE.BufferGeometry,
    info: ThreeRendererBatchDrawVisibilityInfo
  ): boolean

  /**
   * Applies one visibility transition to the slot draw buffers.
   */
  apply(
    geometry: THREE.BufferGeometry,
    info: ThreeRendererBatchDrawVisibilityInfo,
    visible: boolean
  ): boolean {
    if (visible) {
      return this.restore(geometry, info)
    }
    return this.collapse(geometry, info)
  }

  /**
   * Copies one typed-array slice for snapshot storage.
   */
  protected copyTypedArraySlice(
    array: THREE.TypedArray,
    start: number,
    count: number
  ): THREE.TypedArray {
    const sliceCtor = array.constructor as {
      new (length: number): THREE.TypedArray
    }
    const slice = new sliceCtor(count)
    slice.set(array.subarray(start, start + count))
    return slice
  }
}

/**
 * Detects which draw-visibility strategy matches a packed batch geometry layout.
 */
export function resolveBatchDrawVisibilityMode(
  geometry: THREE.BufferGeometry
): ThreeRendererBatchDrawVisibilityMode {
  if (
    geometry.getAttribute('instanceStart') &&
    geometry.getAttribute('instanceEnd')
  ) {
    return 'line2'
  }
  if (geometry.getIndex()) {
    return 'indexed'
  }
  return 'vertex'
}
