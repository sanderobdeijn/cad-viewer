import { GeometryBox3d, GeometryPoint2dLike } from '@mlightcad/geometry-engine'

import { ApplicationSettingManager } from '../../app/ApplicationSettingManager'
import {
  type ApplicationItemContents,
  intersectItems,
  itemExtents,
  itemIntersectCurves,
  itemOsnapPoints
} from '../../model/ApplicationItemGeometry'
import {
  applicationHasOsnapMode,
  applicationMaskToOsnapModes,
  ApplicationOsnapMode
} from '../../model/ApplicationOsnapMode'
import { EditorBaseView } from '../view/EditorBaseView'
import {
  EditorSpatialQueryResultItemEx,
  isEffectiveSpatialQueryHit
} from '../view/EditorSpatialQueryResult'
import {
  centerMarksCoincide,
  collectCenterMarksFromItem,
  type EditorOsnapCenterMark,
  mergeAcquiredCenterMarks
} from './EditorOsnapCenterMarks'
import { EditorMarkerType } from './marker/EditorMarker'

export type { EditorOsnapCenterMark } from './EditorOsnapCenterMarks'

export type EditorOsnapPoint = GeometryPoint2dLike & {
  type: ApplicationOsnapMode
}

export interface EditorOsnapResolveOptions {
  /** WCS point used as the osnap pick and proximity reference. */
  cursorWcs: GeometryPoint2dLike
  /** Previous point passed to entity osnap queries. */
  lastPoint?: GeometryPoint2dLike
  /** Screen-space pick aperture radius in pixels. */
  hitRadiusPx?: number
}

const DEFAULT_HIT_RADIUS_PX = 20

/**
 * Max nearby geometry sources considered per intersection query.
 * Prefer pick-hit subentities (group children) over whole groups.
 */
const MAX_INTERSECTION_SOURCES = 16

/** Hard cap on pairwise `intersectWith` calls per resolve. */
const MAX_INTERSECTION_PAIR_TESTS = 48

/** Wall-clock budget for pairwise intersection math per resolve. */
const INTERSECTION_TIME_BUDGET_MS = 8

/**
 * Skip leaf entities whose curve primitive count exceeds this. Fat polylines
 * must not expand into INT snap on every touch move.
 */
const MAX_PRIMITIVES_PER_SOURCE = 32

type IntersectionSource = {
  key: string
  box: GeometryBox3d
  item: ApplicationItemContents
}

function boxesOverlapXY(a: GeometryBox3d, b: GeometryBox3d): boolean {
  return (
    a.min.x <= b.max.x &&
    a.max.x >= b.min.x &&
    a.min.y <= b.max.y &&
    a.max.y >= b.min.y
  )
}

/**
 * Whether an item has few enough curves to be tested for intersections on
 * every cursor move.
 */
function isLightIntersectionItem(item: ApplicationItemContents): boolean {
  const count = itemIntersectCurves(item).length
  return count > 0 && count <= MAX_PRIMITIVES_PER_SOURCE
}

export class EditorOsnapResolver {
  private readonly _view: EditorBaseView
  private _acquiredCenters: EditorOsnapCenterMark[] = []

  constructor(view: EditorBaseView) {
    this._view = view
  }

  /**
   * Center ticks acquired by hovering circular geometry. Shown as plus marks
   * for the rest of the current point prompt; moving the cursor onto a tick
   * snaps to that center.
   */
  get acquiredCenterMarks(): readonly EditorOsnapCenterMark[] {
    return this._acquiredCenters
  }

  /** Clears acquired center ticks. Call when an input session ends. */
  clearAcquiredCenters() {
    this._acquiredCenters = []
  }

  /**
   * Center ticks to draw as plus marks. Hides a tick that is already the
   * active Center snap so the circle AutoSnap marker replaces it.
   */
  static displayCenterMarks(
    marks: readonly EditorOsnapCenterMark[],
    snap?: EditorOsnapPoint
  ): EditorOsnapCenterMark[] {
    if (!snap || snap.type !== ApplicationOsnapMode.Center) {
      return marks as EditorOsnapCenterMark[]
    }
    return marks.filter(mark => !centerMarksCoincide(mark, snap))
  }

  /**
   * Resolves the best osnap point near the cursor, matching command-input behavior.
   */
  resolve(options: EditorOsnapResolveOptions): EditorOsnapPoint | undefined {
    const hitRadiusPx = options.hitRadiusPx ?? DEFAULT_HIT_RADIUS_PX
    const p1 = this._view.screenToWorld({ x: 0, y: 0 })
    const p2 = this._view.screenToWorld({ x: hitRadiusPx, y: 0 })
    const threshold = Math.abs(p2.x - p1.x)
    const snapPoints = this.collectOsnapPoints(
      options.cursorWcs,
      hitRadiusPx,
      threshold
    )

    for (const mark of this._acquiredCenters) {
      snapPoints.push({
        x: mark.x,
        y: mark.y,
        type: ApplicationOsnapMode.Center
      })
    }

    if (snapPoints.length === 0) return undefined

    let bestPriority = Number.MAX_VALUE
    let bestDist = Number.MAX_VALUE
    let bestIndex = -1

    for (let i = 0; i < snapPoints.length; i++) {
      const snap = snapPoints[i]
      const dx = options.cursorWcs.x - snap.x
      const dy = options.cursorWcs.y - snap.y
      const dist = Math.hypot(dx, dy)
      if (dist >= threshold) continue

      const priority = EditorOsnapResolver.osnapModePriority(snap.type)
      if (
        priority < bestPriority ||
        (priority === bestPriority && dist < bestDist)
      ) {
        bestPriority = priority
        bestDist = dist
        bestIndex = i
      }
    }

    return bestIndex !== -1 ? snapPoints[bestIndex] : undefined
  }

  /**
   * Maps an osnap mode to the marker shape shown at the snap location.
   */
  static osnapModeToMarkerType(osnapMode: ApplicationOsnapMode): EditorMarkerType {
    switch (osnapMode) {
      case ApplicationOsnapMode.EndPoint:
        return 'rect'
      case ApplicationOsnapMode.MidPoint:
        return 'triangle'
      case ApplicationOsnapMode.Center:
        return 'circle'
      case ApplicationOsnapMode.Quadrant:
        return 'diamond'
      case ApplicationOsnapMode.Nearest:
        return 'x'
      case ApplicationOsnapMode.Intersection:
        return 'intersection'
      default:
        return 'rect'
    }
  }

  private static osnapModePriority(mode: ApplicationOsnapMode): number {
    switch (mode) {
      case ApplicationOsnapMode.EndPoint:
      case ApplicationOsnapMode.MidPoint:
      case ApplicationOsnapMode.Center:
      case ApplicationOsnapMode.Intersection:
        return 0
      case ApplicationOsnapMode.Quadrant:
        return 1
      case ApplicationOsnapMode.Nearest:
        return 2
      default:
        return 1
    }
  }

  private collectOsnapPointsInAvailableModes(
    item: ApplicationItemContents,
    osnapPoints: EditorOsnapPoint[],
    pickPoint: GeometryPoint2dLike
  ) {
    const modes = applicationMaskToOsnapModes(ApplicationSettingManager.instance.osnapModes)
    modes.forEach(mode => {
      // Intersection requires pairwise item tests; see collectIntersectionOsnapPoints.
      if (mode === ApplicationOsnapMode.Intersection) return
      for (const point of itemOsnapPoints(item, mode, pickPoint)) {
        osnapPoints.push({ x: point.x, y: point.y, type: mode })
      }
    })
  }

  private collectIntersectionOsnapPoints(
    pickResults: EditorSpatialQueryResultItemEx[],
    osnapPoints: EditorOsnapPoint[],
    cursorWcs: GeometryPoint2dLike,
    threshold: number
  ) {
    const sources: IntersectionSource[] = []
    const seenKeys = new Set<string>()

    const tryAdd = (source: IntersectionSource) => {
      if (sources.length >= MAX_INTERSECTION_SOURCES) return
      if (seenKeys.has(source.key)) return
      if (source.box.isEmpty()) return
      if (!isLightIntersectionItem(source.item)) return
      seenKeys.add(source.key)
      sources.push(source)
    }

    for (const hit of pickResults) {
      if (sources.length >= MAX_INTERSECTION_SOURCES) break
      if (!isEffectiveSpatialQueryHit(hit)) continue
      const item = this._view.itemLookup(hit.id)
      if (!item) continue
      tryAdd({ key: hit.id, box: itemExtents(item), item })
    }

    if (sources.length < 2) return

    const threshSq = threshold * threshold
    const started = performance.now()
    let pairTests = 0

    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        if (pairTests >= MAX_INTERSECTION_PAIR_TESTS) return
        if (performance.now() - started > INTERSECTION_TIME_BUDGET_MS) return
        if (!boxesOverlapXY(sources[i].box, sources[j].box)) continue

        pairTests++
        const points = intersectItems(sources[i].item, sources[j].item)
        for (const point of points) {
          const dx = point.x - cursorWcs.x
          const dy = point.y - cursorWcs.y
          if (dx * dx + dy * dy > threshSq) continue
          osnapPoints.push({
            x: point.x,
            y: point.y,
            type: ApplicationOsnapMode.Intersection
          })
        }
      }
    }
  }

  private collectOsnapPoints(
    cursorWcs: GeometryPoint2dLike,
    hitRadiusPx: number,
    threshold: number
  ): EditorOsnapPoint[] {
    const results = this._view.pick(cursorWcs, hitRadiusPx)
    const osnapPoints: EditorOsnapPoint[] = []
    const pickPoint = cursorWcs

    results.forEach(hit => {
      const item = this._view.itemLookup(hit.id)
      if (!item) return
      this.collectOsnapPointsInAvailableModes(item, osnapPoints, pickPoint)
    })

    if (
      applicationHasOsnapMode(
        ApplicationSettingManager.instance.osnapModes,
        ApplicationOsnapMode.Intersection
      )
    ) {
      this.collectIntersectionOsnapPoints(
        results,
        osnapPoints,
        cursorWcs,
        threshold
      )
    }

    this.updateAcquiredCenters(results, pickPoint)

    return osnapPoints
  }

  private updateAcquiredCenters(
    results: EditorSpatialQueryResultItemEx[],
    pickPoint: GeometryPoint2dLike
  ) {
    if (
      !applicationHasOsnapMode(
        ApplicationSettingManager.instance.osnapModes,
        ApplicationOsnapMode.Center
      )
    ) {
      this._acquiredCenters = []
      return
    }

    const hovered: EditorOsnapCenterMark[] = []
    results.forEach(hit => {
      const item = this._view.itemLookup(hit.id)
      if (item) hovered.push(...collectCenterMarksFromItem(item, pickPoint))
    })

    this._acquiredCenters = mergeAcquiredCenterMarks(
      this._acquiredCenters,
      hovered
    )
  }
}
