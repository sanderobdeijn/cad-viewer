import * as THREE from 'three'

import {
  isBatchGeometryActive,
  isBatchGeometryVisible
} from '../ThreeRendererBatchedGeometryInfo'
import {
  resolveBatchDrawVisibilityMode,
  ThreeRendererBatchDrawVisibilityStrategy} from './ThreeRendererBatchDrawVisibilityStrategy'
import type {
  ThreeRendererBatchDrawVisibilityInfo,
  ThreeRendererBatchDrawVisibilityMode
} from './ThreeRendererBatchDrawVisibilityTypes'
import { ThreeRendererIndexedBatchDrawVisibilityStrategy } from './ThreeRendererIndexedBatchDrawVisibilityStrategy'
import { ThreeRendererLine2BatchDrawVisibilityStrategy } from './ThreeRendererLine2BatchDrawVisibilityStrategy'
import { ThreeRendererVertexBatchDrawVisibilityStrategy } from './ThreeRendererVertexBatchDrawVisibilityStrategy'

/**
 * Facade that routes batch slot visibility updates to geometry-layout strategies.
 */
class ThreeRendererBatchDrawVisibility {
  private static readonly strategies: Record<
    ThreeRendererBatchDrawVisibilityMode,
    ThreeRendererBatchDrawVisibilityStrategy
  > = {
    indexed: new ThreeRendererIndexedBatchDrawVisibilityStrategy(),
    vertex: new ThreeRendererVertexBatchDrawVisibilityStrategy(),
    line2: new ThreeRendererLine2BatchDrawVisibilityStrategy()
  }

  /**
   * Collapses or restores packed GPU geometry for one batch slot.
   */
  static apply(
    geometry: THREE.BufferGeometry,
    info: ThreeRendererBatchDrawVisibilityInfo,
    visible: boolean,
    mode: ThreeRendererBatchDrawVisibilityMode = resolveBatchDrawVisibilityMode(geometry)
  ): boolean {
    if (!isBatchGeometryActive(info.flags)) {
      return false
    }

    return ThreeRendererBatchDrawVisibility.strategies[mode].apply(
      geometry,
      info,
      visible
    )
  }

  /**
   * Resolves the strategy instance for one packed geometry layout.
   */
  static getStrategy(
    geometry: THREE.BufferGeometry,
    mode?: ThreeRendererBatchDrawVisibilityMode
  ): ThreeRendererBatchDrawVisibilityStrategy {
    const resolvedMode = mode ?? resolveBatchDrawVisibilityMode(geometry)
    return ThreeRendererBatchDrawVisibility.strategies[resolvedMode]
  }
}

/**
 * Collapses or restores packed GPU geometry for one batch slot so invisible
 * entities are skipped at draw time without removing the slot from the batch.
 */
export function applyBatchSlotDrawVisibility(
  geometry: THREE.BufferGeometry,
  info: ThreeRendererBatchDrawVisibilityInfo,
  visible: boolean,
  mode?: ThreeRendererBatchDrawVisibilityMode
): boolean {
  return ThreeRendererBatchDrawVisibility.apply(geometry, info, visible, mode)
}

/**
 * Clears stale draw snapshots and re-collapses hidden slots after batch
 * compaction moves packed GPU buffer ranges.
 */
export function syncBatchDrawVisibilityAfterOptimize(
  geometry: THREE.BufferGeometry,
  geometryInfoList: ThreeRendererBatchDrawVisibilityInfo[]
) {
  const mode = resolveBatchDrawVisibilityMode(geometry)

  for (const info of geometryInfoList) {
    if (!isBatchGeometryActive(info.flags)) {
      continue
    }

    delete info.hiddenDrawSnapshot

    if (!isBatchGeometryVisible(info.flags)) {
      applyBatchSlotDrawVisibility(geometry, info, false, mode)
    }
  }
}
