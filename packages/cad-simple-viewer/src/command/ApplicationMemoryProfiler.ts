import { type ThreeRendererStyleManagerStats } from '@mlightcad/three-renderer'

import type { ThreeRendererSpatialIndexStats } from '../spatialIndex'
import type { ThreeRendererSceneStats } from '../view/ThreeRendererScene'
import type { ThreeRendererView2d } from '../view/ThreeRendererView2d'

/** Chrome-only approximate JS heap snapshot. */
export interface ApplicationMemoryHeapStats {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

/** One row in the memory summary table / bar chart. */
export interface ApplicationMemoryCategoryRow {
  id: string
  /** Byte total for this category (0 when unknown). */
  bytes: number
  /** When true, bytes are extrapolated / estimated. */
  isEstimated: boolean
  /** Optional secondary metric shown in the UI (counts, etc.). */
  detail?: string
}

export interface ApplicationMemoryGeometryLayerRow {
  layoutKey: string
  layoutIndex: number
  layerName: string
  entityCount: number
  lineBytes: number
  meshBytes: number
  pointBytes: number
  unbatchedBytes: number
  geometryBytes: number
  mappingBytes: number
  unbatchedCount: number
}

export interface ApplicationMemorySpatialLayoutRow {
  layoutKey: string
  stats: ThreeRendererSpatialIndexStats
}

/**
 * Structured memory snapshot for the MEM diagnostics palette.
 *
 * Geometry sizes from batch buffers are relatively accurate; other categories
 * are labeled via {@link ApplicationMemoryCategoryRow.isEstimated}.
 */
export interface ApplicationMemorySnapshot {
  collectedAt: number
  heap?: ApplicationMemoryHeapStats
  summary: ApplicationMemoryCategoryRow[]
  geometry: {
    scene: ThreeRendererSceneStats
    layers: ApplicationMemoryGeometryLayerRow[]
  }
  spatial: {
    layouts: ApplicationMemorySpatialLayoutRow[]
    totalEstimatedBytes: number
    totalRootItems: number
    totalChildItems: number
  }
  materials: ThreeRendererStyleManagerStats
}

/**
 * Formats a byte count for UI display (B / KB / MB / GB).
 */
export function formatMemoryBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function readHeapStats(): ApplicationMemoryHeapStats | undefined {
  const perf = performance as Performance & {
    memory?: {
      usedJSHeapSize: number
      totalJSHeapSize: number
      jsHeapSizeLimit: number
    }
  }
  const memory = perf.memory
  if (!memory) return undefined
  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit
  }
}

function collectGeometryLayers(
  sceneStats: ThreeRendererSceneStats,
  layoutKeys: string[]
): ApplicationMemoryGeometryLayerRow[] {
  const rows: ApplicationMemoryGeometryLayerRow[] = []
  sceneStats.layouts.forEach((layout, layoutIndex) => {
    const layoutKey = layoutKeys[layoutIndex] ?? `layout-${layoutIndex}`
    for (const layer of layout.layers) {
      rows.push({
        layoutKey,
        layoutIndex,
        layerName: layer.name,
        entityCount: layer.summary.entityCount,
        lineBytes:
          layer.line.indexed.geometrySize + layer.line.nonIndexed.geometrySize,
        meshBytes:
          layer.mesh.indexed.geometrySize + layer.mesh.nonIndexed.geometrySize,
        pointBytes:
          layer.point.indexed.geometrySize +
          layer.point.nonIndexed.geometrySize,
        unbatchedBytes: layer.unbatched.geometrySize,
        geometryBytes: layer.summary.totalGeometrySize,
        mappingBytes: layer.summary.totalMappingSize,
        unbatchedCount: layer.unbatched.count
      })
    }
  })
  return rows
}

/**
 * Collects a cross-cutting memory snapshot for the current view.
 */
export async function collectMemorySnapshot(
  view: ThreeRendererView2d
): Promise<ApplicationMemorySnapshot> {
  const sceneStats = view.stats
  const layoutEntries = [...view.cadScene.layouts.entries()]
  const layoutKeys = layoutEntries.map(([ownerId]) => ownerId)

  const geometryLayers = collectGeometryLayers(sceneStats, layoutKeys)

  const spatialLayouts: ApplicationMemorySpatialLayoutRow[] = layoutEntries.map(
    ([ownerId, layout]) => ({
      layoutKey: ownerId,
      stats: layout.spatialIndexStats
    })
  )
  const totalEstimatedBytes = spatialLayouts.reduce(
    (sum, row) => sum + row.stats.estimatedBytes,
    0
  )
  const totalRootItems = spatialLayouts.reduce(
    (sum, row) => sum + (row.stats.rootItemCount ?? row.stats.itemCount),
    0
  )
  const totalChildItems = spatialLayouts.reduce(
    (sum, row) => sum + (row.stats.childItemCount ?? 0),
    0
  )

  const materials = view.renderer.styleManager.getStats()
  const heap = readHeapStats()

  const geometryBytes = sceneStats.summary.totalSize.geometry
  const mappingBytes = sceneStats.summary.totalSize.mapping

  const summary: ApplicationMemoryCategoryRow[] = [
    {
      id: 'geometry',
      bytes: geometryBytes,
      isEstimated: false,
      detail: `${sceneStats.summary.entityCount} entities`
    },
    {
      id: 'mapping',
      bytes: mappingBytes,
      isEstimated: true,
      detail: 'batch slot metadata'
    },
    {
      id: 'spatial',
      bytes: totalEstimatedBytes,
      isEstimated: true,
      detail: `${totalRootItems} root / ${totalChildItems} child items`
    },
    {
      id: 'materials',
      bytes: materials.totalEstimatedBytes,
      isEstimated: true,
      detail: `${materials.totalCount} cached`
    }
  ]

  if (heap) {
    summary.unshift({
      id: 'heap',
      bytes: heap.usedJSHeapSize,
      isEstimated: true,
      detail: `limit ${formatMemoryBytes(heap.jsHeapSizeLimit)}`
    })
  }

  return {
    collectedAt: Date.now(),
    heap,
    summary,
    geometry: {
      scene: sceneStats,
      layers: geometryLayers
    },
    spatial: {
      layouts: spatialLayouts,
      totalEstimatedBytes,
      totalRootItems,
      totalChildItems
    },
    materials
  }
}

/**
 * Collects a cross-cutting memory snapshot for the current view.
 */
export class ApplicationMemoryProfiler {
  static collect(view: ThreeRendererView2d): Promise<ApplicationMemorySnapshot> {
    return collectMemorySnapshot(view)
  }
}
