import { GeometryCircularArc2d } from '@mlightcad/geometry-engine'
import {
  ThreeRendererHtmlBadge,
  ThreeRendererHtmlCanvasOverlay,
  ThreeRendererHtmlGrip
} from '@mlightcad/three-renderer'

import {
  applicationAdaptiveMeasureBadgeFontSize,
  applicationMeasurementCanvasLineWidth,
  type ApplicationMeasurementStyle,
  applicationScreenArcLengthPx,
  formatMeasurementLength
} from '../../../util'
import type { ThreeRendererView2d } from '../../../view'
import {
  applicationBindOverlayPointerDrag,
  applicationPlaceOverlayHtml,
  applicationScreenPxToWcs,
  applicationSeedOverlaySizesFromWcs
} from '../../overlay'
import { republishMeasurement } from '../ApplicationMeasurementRepublish'
import {
  getMeasurementSnapshot,
  getMeasurementStyle,
  MEASUREMENT_LAYER,
  runMeasurementEdit
} from '../ApplicationMeasurementStore'
import type { ApplicationMeasurementRecord } from '../ApplicationMeasurementTypes'
import {
  type ApplicationMeasureCircleGeom,
  drawMeasureArcOnCanvas
} from './ApplicationMeasureDrawUtil'
import {
  ApplicationMeasureEntity,
  type ApplicationMeasureEntityOptions,
  type ApplicationMeasureWorldDrawResult
} from './ApplicationMeasureEntity'
import { selectMeasurementGroup } from './ApplicationMeasureEntityGrips'

type Point2 = { x: number; y: number }

/**
 * Project a free point onto a circle (for legacy short-arc records).
 */
function projectOntoCircle(geom: ApplicationMeasureCircleGeom, point: Point2): Point2 {
  const dx = point.x - geom.cx
  const dy = point.y - geom.cy
  const len = Math.hypot(dx, dy)
  if (!(len > 1e-12)) {
    return { x: geom.cx + geom.r, y: geom.cy }
  }
  const s = geom.r / len
  return { x: geom.cx + dx * s, y: geom.cy + dy * s }
}

/**
 * Arc-length measurement overlay entity.
 *
 * Renders a canvas stroke of the measured arc, HTML dots at the control
 * points, and a length badge at the arc midpoint. Endpoint grips update the
 * measured value live and republish on commit.
 */
export class ApplicationMeasureArcEntity extends ApplicationMeasureEntity {
  /** Circle center and radius defining the measured arc. */
  private readonly geom: ApplicationMeasureCircleGeom
  /** Arc start point in world XY. */
  private readonly start: Point2
  /** Optional point on the measured sweep (distinguishes major vs minor arc). */
  private readonly through: Point2 | undefined
  /** Arc end point in world XY. */
  private readonly end: Point2

  /**
   * Creates an arc-length measure entity on the given circle.
   *
   * @param geom - Circle center and radius
   * @param start - Arc start point in world XY
   * @param end - Arc end point in world XY
   * @param options - Shared id, layout, and style options
   * @param through - Point on the measured sweep; omit for legacy short-arc records
   */
  constructor(
    geom: ApplicationMeasureCircleGeom,
    start: Point2,
    end: Point2,
    options: ApplicationMeasureEntityOptions,
    through?: Point2
  ) {
    super(
      options.id ?? `arc-${Date.now()}`,
      options.layoutId,
      options.style,
      options.textHeightWcs,
      options.strokeWidthWcs
    )
    this.geom = geom
    this.start = start
    this.end = end
    this.through = through
  }

  /**
   * Reconstructs the measured sweep from stored control points.
   */
  private resolveMeasuredArc(
    geom: ApplicationMeasureCircleGeom,
    start: Point2,
    end: Point2,
    through?: Point2
  ): GeometryCircularArc2d | null {
    if (through) {
      return GeometryCircularArc2d.tryCreateByThreePoints(start, through, end)
    }
    return GeometryCircularArc2d.tryCreateShorterArc(start, end, {
      x: geom.cx,
      y: geom.cy
    })
  }

  /**
   * Factory that builds an arc entity from circle geometry, endpoints, and style.
   *
   * @param geom - Circle center and radius
   * @param start - Arc start point in world XY
   * @param end - Arc end point in world XY
   * @param style - Measurement visual style
   * @param options - Optional id, layout, and through-point overrides
   * @returns New {@link ApplicationMeasureArcEntity}
   */
  static create(
    geom: ApplicationMeasureCircleGeom,
    start: Point2,
    end: Point2,
    style: ApplicationMeasurementStyle,
    options?: { id?: string; layoutId?: string; through?: Point2 }
  ): ApplicationMeasureArcEntity {
    return new ApplicationMeasureArcEntity(
      geom,
      start,
      end,
      {
        style,
        id: options?.id,
        layoutId: options?.layoutId
      },
      options?.through
    )
  }

  /**
   * Primary anchor for the measurement (midpoint of the measured sweep).
   *
   * @returns World point on the arc between {@link start} and {@link end}
   */
  override primaryPoint() {
    const mid = this.resolveMeasuredArc(
      this.geom,
      this.start,
      this.end,
      this.through
    )?.midPoint
    return mid ? { x: mid.x, y: mid.y } : { x: this.start.x, y: this.start.y }
  }

  /**
   * Serializes this arc measurement to a store record.
   *
   * @param layoutId - Optional layout BTR id written onto the record
   * @param view - Optional view used to convert screen style to WCS
   * @returns Record with `type: 'arc'` and center/radius/start/through/end geometry
   */
  toRecord(layoutId?: string, view?: ThreeRendererView2d): ApplicationMeasurementRecord {
    return {
      id: this.entityId,
      type: 'arc',
      layoutId,
      style: this.serializeStyle(view),
      geometry: {
        type: 'arc',
        center: { x: this.geom.cx, y: this.geom.cy },
        radius: this.geom.r,
        start: { x: this.start.x, y: this.start.y },
        end: { x: this.end.x, y: this.end.y },
        ...(this.through
          ? { through: { x: this.through.x, y: this.through.y } }
          : {})
      }
    }
  }

  /**
   * Draws the arc canvas stroke, control-point dots, length badge, and extras.
   *
   * @param view - Active 2D view for HTML overlays
   * @returns World-draw result including redraw/dispose hooks
   */
  protected drawMeasurement(view: ThreeRendererView2d): ApplicationMeasureWorldDrawResult {
    const hasThrough = this.through != null
    const live = {
      geom: { ...this.geom } as ApplicationMeasureCircleGeom,
      start: { ...this.start } as Point2,
      end: { ...this.end } as Point2,
      through: this.through ? ({ ...this.through } as Point2) : undefined
    }

    const resolveArc = () =>
      this.resolveMeasuredArc(live.geom, live.start, live.end, live.through)

    const syncGeomFromThreePoints = (): boolean => {
      if (!live.through) return true
      const arc = GeometryCircularArc2d.tryCreateByThreePoints(
        live.start,
        live.through,
        live.end
      )
      if (!arc) return false
      live.geom = {
        cx: arc.center.x,
        cy: arc.center.y,
        r: arc.radius
      }
      return true
    }

    let arcLen = resolveArc()?.length ?? 0
    const midPoint = (): Point2 => {
      const mid = resolveArc()?.midPoint
      return mid ? { x: mid.x, y: mid.y } : { x: live.start.x, y: live.start.y }
    }

    const color = this.style.color
    const layoutId = this.resolveLayoutId(view)

    const persistOverlay = new ThreeRendererHtmlCanvasOverlay({
      id: `arc-canvas-${this.entityId}`,
      container: view.container,
      layer: MEASUREMENT_LAYER,
      layoutId
    })
    const dot1 = new ThreeRendererHtmlGrip({
      id: `${this.entityId}-dot1`,
      color,
      worldPosition: live.start,
      layer: MEASUREMENT_LAYER
    })
    const dotThrough = live.through
      ? new ThreeRendererHtmlGrip({
          id: `${this.entityId}-dot-through`,
          color,
          worldPosition: live.through,
          layer: MEASUREMENT_LAYER
        })
      : undefined
    const dot2 = new ThreeRendererHtmlGrip({
      id: `${this.entityId}-dot2`,
      color,
      worldPosition: live.end,
      layer: MEASUREMENT_LAYER
    })
    const label = formatMeasurementLength(arcLen)
    const importedTextHeight =
      this.textHeightWcs != null && this.textHeightWcs > 0
        ? this.textHeightWcs
        : undefined
    let badgeFontSize = this.style.fontSize
    let textHeightWcs = importedTextHeight
    if (importedTextHeight == null) {
      badgeFontSize = applicationAdaptiveMeasureBadgeFontSize(
        label,
        this.style,
        applicationScreenArcLengthPx(
          p => view.worldToScreen(p),
          { x: live.geom.cx, y: live.geom.cy },
          live.geom.r,
          arcLen
        )
      )
      textHeightWcs = applicationScreenPxToWcs(badgeFontSize, view)
    }
    const badge = new ThreeRendererHtmlBadge({
      id: `${this.entityId}-badge`,
      color,
      text: label,
      worldPosition: midPoint(),
      layer: MEASUREMENT_LAYER,
      fontSize: badgeFontSize
    })
    const overlayElements = dotThrough
      ? [dot1, dotThrough, dot2, badge]
      : [dot1, dot2, badge]
    const recordStyle = this.serializeStyle(view)
    applicationSeedOverlaySizesFromWcs(view, {
      textHeightWcs: textHeightWcs ?? recordStyle.textHeightWcs,
      strokeWidthWcs: this.strokeWidthWcs,
      arrowSizeWcs: this.arrowSizeWcs ?? recordStyle.arrowSizeWcs,
      fontSizePx: badgeFontSize,
      strokeScreenPx: applicationMeasurementCanvasLineWidth(this.style.lineWeight),
      elements: overlayElements,
      canvases: [persistOverlay.canvas]
    })
    const paintArc = (paintStyle = this.style) =>
      drawMeasureArcOnCanvas(
        persistOverlay.canvas,
        view,
        live.geom,
        live.start,
        live.end,
        paintStyle.color,
        applicationMeasurementCanvasLineWidth(paintStyle.lineWeight),
        live.through
      )
    paintArc()
    const redrawPersist = () =>
      paintArc(getMeasurementStyle(this.entityId) ?? this.style)
    view.events.viewChanged.addEventListener(redrawPersist)

    const group = this.createGroup(view)
      .add(dot1, ...(dotThrough ? [dotThrough] : []), dot2, badge)
      .addCanvas(persistOverlay)

    const cleanups: Array<() => void> = [
      () => view.events.viewChanged.removeEventListener(redrawPersist)
    ]
    const pendingGrips: Array<() => void> = []
    let dragStart = {
      start: { ...live.start },
      end: { ...live.end },
      through: live.through ? { ...live.through } : undefined,
      geom: { ...live.geom }
    }

    const refreshLive = () => {
      const valid = syncGeomFromThreePoints()
      const arc = valid ? resolveArc() : null
      arcLen = arc?.length ?? 0
      badge.setText(formatMeasurementLength(arcLen))
      applicationPlaceOverlayHtml(view, badge, midPoint())
      paintArc(getMeasurementStyle(this.entityId) ?? this.style)
      view.isHtmlDirty = true
    }

    const restoreDragStart = () => {
      live.start = { ...dragStart.start }
      live.end = { ...dragStart.end }
      live.through = dragStart.through ? { ...dragStart.through } : undefined
      live.geom = { ...dragStart.geom }
      applicationPlaceOverlayHtml(view, dot1, live.start)
      applicationPlaceOverlayHtml(view, dot2, live.end)
      if (dotThrough && live.through) {
        applicationPlaceOverlayHtml(view, dotThrough, live.through)
      }
      refreshLive()
    }

    const beginEndpointDrag = () => {
      selectMeasurementGroup(view, this.entityId)
      dragStart = {
        start: { ...live.start },
        end: { ...live.end },
        through: live.through ? { ...live.through } : undefined,
        geom: { ...live.geom }
      }
    }

    const commitEndpoints = () => {
      const delta =
        Math.hypot(
          live.start.x - dragStart.start.x,
          live.start.y - dragStart.start.y
        ) +
        Math.hypot(live.end.x - dragStart.end.x, live.end.y - dragStart.end.y) +
        (live.through && dragStart.through
          ? Math.hypot(
              live.through.x - dragStart.through.x,
              live.through.y - dragStart.through.y
            )
          : 0)
      if (delta < 1e-9) {
        refreshLive()
        return
      }
      if (!syncGeomFromThreePoints()) {
        restoreDragStart()
        return
      }
      const snap = getMeasurementSnapshot(this.entityId)
      const geometry: ApplicationMeasurementRecord['geometry'] = {
        type: 'arc',
        center: { x: live.geom.cx, y: live.geom.cy },
        radius: live.geom.r,
        start: { ...live.start },
        end: { ...live.end },
        ...(live.through ? { through: { ...live.through } } : {})
      }
      const record: ApplicationMeasurementRecord = snap
        ? { ...snap, geometry }
        : {
            id: this.entityId,
            type: 'arc',
            layoutId,
            style: this.serializeStyle(view),
            geometry
          }
      runMeasurementEdit(() => {
        republishMeasurement(view, record)
      })
    }

    const constrainEndpoint = (point: Point2): Point2 =>
      hasThrough ? point : projectOntoCircle(live.geom, point)

    pendingGrips.push(() => {
      cleanups.push(
        applicationBindOverlayPointerDrag({
          view,
          el: dot1.element,
          onDragStart: beginEndpointDrag,
          onMove: point => {
            live.start = constrainEndpoint(point)
            applicationPlaceOverlayHtml(view, dot1, live.start)
            refreshLive()
          },
          onCommit: commitEndpoints
        }),
        applicationBindOverlayPointerDrag({
          view,
          el: dot2.element,
          onDragStart: beginEndpointDrag,
          onMove: point => {
            live.end = constrainEndpoint(point)
            applicationPlaceOverlayHtml(view, dot2, live.end)
            refreshLive()
          },
          onCommit: commitEndpoints
        })
      )
      if (dotThrough && live.through) {
        cleanups.push(
          applicationBindOverlayPointerDrag({
            view,
            el: dotThrough.element,
            onDragStart: beginEndpointDrag,
            onMove: point => {
              live.through = point
              applicationPlaceOverlayHtml(view, dotThrough, point)
              refreshLive()
            },
            onCommit: commitEndpoints
          })
        )
      }
    })

    return {
      group,
      entityIds: [],
      dispose: () => {
        for (const fn of cleanups) {
          try {
            fn()
          } catch {
            // ignore
          }
        }
      },
      bindGrips: () => {
        for (const bind of pendingGrips) bind()
      },
      extras: {
        style: this.committedLiveStyle(badgeFontSize, textHeightWcs),
        value: { kind: 'length', value: arcLen },
        snapshot: (() => {
          const snapshot = this.toRecord(layoutId, view)
          if (
            importedTextHeight == null &&
            textHeightWcs != null &&
            textHeightWcs > 0
          ) {
            snapshot.style.fontSize = badgeFontSize
            snapshot.style.textHeightWcs = textHeightWcs
          }
          return snapshot
        })(),
        redraw: paintArc
      }
    }
  }
}
