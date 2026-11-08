import {
  FontManager,
  type FontMemoryStats,
  type MemoryUsageReport
} from '@mlightcad/mtext-renderer'
import {
  ThreeRendererMTextRenderer,
  type ThreeRendererStyleManagerStats
} from '@mlightcad/three-renderer'

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

/** One loaded font row for the Memory palette fonts table. */
export interface ApplicationMemoryFontRow {
  name: string
  type: string
  estimatedBytes: number
}

/**
 * Text / mtext-renderer memory stats from
 * {@link ThreeRendererMTextRenderer.estimateMemoryUsage}.
 */
export interface ApplicationMemoryFontStats {
  missedCount: number
  missedNames: string[]
  /** Live isolate memory (main + workers); excludes IndexedDB storage. */
  estimatedBytes: number
  mainThreadBytes: number
  workerBytes: number
  loadedFontCount: number
  /**
   * Persistent IndexedDB font blobs (disk/storage).
   * Not included in {@link estimatedBytes} or the memory pie chart.
   */
  indexedDbBytes: number
  indexedDbFontCount: number
  fonts: ApplicationMemoryFontRow[]
  /** Full mtext-renderer report when available. */
  report?: MemoryUsageReport
  isEstimated: true
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
  fonts: ApplicationMemoryFontStats
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

function flattenFontRows(report: MemoryUsageReport): ApplicationMemoryFontRow[] {
  const fonts: FontMemoryStats[] = [
    ...report.mainThread.fonts,
    ...report.workers.flatMap(worker => worker.fonts)
  ]
  const byName = new Map<string, ApplicationMemoryFontRow>()
  for (const font of fonts) {
    const name = font.names[0] ?? '(unnamed)'
    const existing = byName.get(name)
    if (!existing || font.estimatedBytes > existing.estimatedBytes) {
      byName.set(name, {
        name,
        type: font.type,
        estimatedBytes: font.estimatedBytes
      })
    }
  }
  return [...byName.values()].sort(
    (a, b) => b.estimatedBytes - a.estimatedBytes
  )
}

async function collectFontStats(): Promise<ApplicationMemoryFontStats> {
  const missed = FontManager.instance.missedFonts ?? {}
  const missedNames = Object.keys(missed)

  const report = await ThreeRendererMTextRenderer.getInstance().estimateMemoryUsage()
  const workerBytes = report.workers.reduce(
    (sum, worker) => sum + worker.totalEstimatedBytes,
    0
  )

  return {
    missedCount: missedNames.length,
    missedNames,
    estimatedBytes: report.totalEstimatedBytes,
    mainThreadBytes: report.mainThread.totalEstimatedBytes,
    workerBytes,
    loadedFontCount: flattenFontRows(report).length,
    indexedDbBytes: report.indexedDbFontCache.totalBytes,
    indexedDbFontCount: report.indexedDbFontCache.fontCount,
    fonts: flattenFontRows(report),
    report,
    isEstimated: true
  }
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
  const fonts = await collectFontStats()
  const heap = readHeapStats()

  const geometryBytes = sceneStats.summary.totalSize.geometry
  const mappingBytes = sceneStats.summary.totalSize.mapping

  const fontDetailParts = [`${fonts.loadedFontCount} loaded`]
  if (fonts.missedCount > 0) {
    fontDetailParts.push(`${fonts.missedCount} missed`)
  }
  // IndexedDB font blobs are disk/storage, not live memory — never include
  // them in summary bytes or pie-chart details.

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
    },
    {
      id: 'fonts',
      bytes: fonts.estimatedBytes,
      isEstimated: true,
      detail: fontDetailParts.join(' · ')
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
    materials,
    fonts
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
