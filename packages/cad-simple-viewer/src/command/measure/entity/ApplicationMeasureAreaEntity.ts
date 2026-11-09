import type { GeometryPoint2dLike } from '@mlightcad/geometry-engine'
import {
  ThreeRendererHtmlBadge,
  ThreeRendererHtmlCanvasOverlay,
  ThreeRendererHtmlGrip
} from '@mlightcad/three-renderer'

import {
  applicationAdaptiveMeasureBadgeFontSize,
  applicationMeasurementCanvasLineWidth,
  type ApplicationMeasurementStyle,
  applicationScreenAreaBadgeRefLengthPx,
  formatMeasurementArea
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
  drawMeasureAreaOnCanvas,
  measureCentroid,
  measureShoelaceArea
} from './ApplicationMeasureDrawUtil'
import {
  ApplicationMeasureEntity,
  type ApplicationMeasureEntityOptions,
  type ApplicationMeasureWorldDrawResult
} from './ApplicationMeasureEntity'
import { selectMeasurementGroup } from './ApplicationMeasureEntityGrips'

type Point2 = { x: number; y: number }

/**
 * Area measurement overlay entity.
 *
 * Renders a filled canvas polygon, HTML dots at each vertex, and an area
 * badge at the vertex centroid. Vertex grips update the measured value live
 * and republish on commit.
 */
export class ApplicationMeasureAreaEntity extends ApplicationMeasureEntity {
  /** Polygon vertices in world coordinates (closed implicitly when drawn). */
  private readonly points: GeometryPoint2dLike[]

  /**
   * Creates an area measure entity from a polygon vertex list.
   *
   * @param points - Polygon vertices in world coordinates
   * @param options - Shared id, layout, and style options
   */
  constructor(
    points: GeometryPoint2dLike[],
    options: ApplicationMeasureEntityOptions
  ) {
    super(
      options.id ?? `area-${Date.now()}`,
      options.layoutId,
      options.style,
      options.textHeightWcs,
      options.strokeWidthWcs
    )
    this.points = points
  }

  /**
   * Factory that builds an area entity from vertices and style.
   *
   * @param points - Polygon vertices in world coordinates
   * @param style - Measurement visual style
   * @param options - Optional id and layout overrides
   * @returns New {@link ApplicationMeasureAreaEntity}
   */
  static create(
    points: GeometryPoint2dLike[],
    style: ApplicationMeasurementStyle,
    options?: { id?: string; layoutId?: string }
  ): ApplicationMeasureAreaEntity {
    return new ApplicationMeasureAreaEntity(points, {
      style,
      id: options?.id,
      layoutId: options?.layoutId
    })
  }

  /**
   * Primary anchor for the measurement (vertex centroid).
   *
   * @returns Centroid with `z: 0`, or `undefined` when there are no points
   */
  override primaryPoint(): GeometryPoint2dLike | undefined {
    if (this.points.length === 0) return undefined
    const c = measureCentroid(this.points)
    return { x: c.x, y: c.y }
  }

  /**
   * Serializes this area measurement to a store record.
   *
   * @param layoutId - Optional layout BTR id written onto the record
   * @param view - Optional view used to convert screen style to WCS
   * @returns Record with `type: 'area'` and polygon point geometry
   */
  toRecord(layoutId?: string, view?: ThreeRendererView2d): ApplicationMeasurementRecord {
    return {
      id: this.entityId,
      type: 'area',
      layoutId,
      style: this.serializeStyle(view),
      geometry: {
        type: 'area',
        points: this.points.map(p => ({ x: p.x, y: p.y }))
      }
    }
  }

  /**
   * Draws the filled polygon canvas, vertex dots, area badge, and extras.
   *
   * When fewer than three points are present, returns an empty group and
   * empty extras without registering view listeners.
   *
   * @param view - Active 2D view for HTML overlays
   * @returns World-draw result including redraw/dispose hooks when valid
   */
  protected drawMeasurement(view: ThreeRendererView2d): ApplicationMeasureWorldDrawResult {
    if (this.points.length < 3) {
      const group = this.createGroup(view)
      return {
        group,
        entityIds: [],
        dispose: () => undefined,
        extras: {}
      }
    }
    const live: Point2[] = this.points.map(p => ({ x: p.x, y: p.y }))
    let area = measureShoelaceArea(live)
    const color = this.style.color
    const layoutId = this.resolveLayoutId(view)

    const persistOverlay = new ThreeRendererHtmlCanvasOverlay({
      id: `area-canvas-${this.entityId}`,
      container: view.container,
      layer: MEASUREMENT_LAYER,
      layoutId
    })
    const label = formatMeasurementArea(area)
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
        applicationScreenAreaBadgeRefLengthPx(p => view.worldToScreen(p), live)
      )
      textHeightWcs = applicationScreenPxToWcs(badgeFontSize, view)
    }
    const badge = new ThreeRendererHtmlBadge({
      id: `${this.entityId}-badge`,
      color,
      text: label,
      worldPosition: measureCentroid(live),
      layer: MEASUREMENT_LAYER,
      fontSize: badgeFontSize
    })
    const dots = live.map(
      (p, i) =>
        new ThreeRendererHtmlGrip({
          id: `${this.entityId}-dot${i}`,
          color,
          worldPosition: p,
          layer: MEASUREMENT_LAYER
        })
    )
    const recordStyle = this.serializeStyle(view)
    applicationSeedOverlaySizesFromWcs(view, {
      textHeightWcs: textHeightWcs ?? recordStyle.textHeightWcs,
      strokeWidthWcs: this.strokeWidthWcs,
      arrowSizeWcs: this.arrowSizeWcs ?? recordStyle.arrowSizeWcs,
      fontSizePx: badgeFontSize,
      strokeScreenPx: applicationMeasurementCanvasLineWidth(this.style.lineWeight),
      elements: [badge, ...dots],
      canvases: [persistOverlay.canvas]
    })
    const paintArea = (paintStyle = this.style) =>
      drawMeasureAreaOnCanvas(
        persistOverlay.canvas,
        view,
        live,
        paintStyle.color,
        applicationMeasurementCanvasLineWidth(paintStyle.lineWeight)
      )
    paintArea()
    const redrawPersist = () =>
      paintArea(getMeasurementStyle(this.entityId) ?? this.style)
    view.events.viewChanged.addEventListener(redrawPersist)

    const group = this.createGroup(view)
      .add(badge, ...dots)
      .addCanvas(persistOverlay)

    const cleanups: Array<() => void> = [
      () => view.events.viewChanged.removeEventListener(redrawPersist)
    ]
    const pendingGrips: Array<() => void> = []
    let dragStart = live.map(p => ({ ...p }))

    const refreshLive = () => {
      area = measureShoelaceArea(live)
      badge.setText(formatMeasurementArea(area))
      applicationPlaceOverlayHtml(view, badge, measureCentroid(live))
      paintArea(getMeasurementStyle(this.entityId) ?? this.style)
      view.isHtmlDirty = true
    }

    const beginEndpointDrag = () => {
      selectMeasurementGroup(view, this.entityId)
      dragStart = live.map(p => ({ ...p }))
    }

    const commitEndpoints = () => {
      let delta = 0
      for (let i = 0; i < live.length; i++) {
        delta += Math.hypot(
          live[i].x - dragStart[i].x,
          live[i].y - dragStart[i].y
        )
      }
      if (delta < 1e-9) {
        refreshLive()
        return
      }
      const snap = getMeasurementSnapshot(this.entityId)
      const geometry: ApplicationMeasurementRecord['geometry'] = {
        type: 'area',
        points: live.map(p => ({ x: p.x, y: p.y }))
      }
      const record: ApplicationMeasurementRecord = snap
        ? { ...snap, geometry }
        : {
            id: this.entityId,
            type: 'area',
            layoutId,
            style: this.serializeStyle(view),
            geometry
          }
      runMeasurementEdit(() => {
        republishMeasurement(view, record)
      })
    }

    pendingGrips.push(() => {
      for (let i = 0; i < dots.length; i++) {
        const index = i
        const dot = dots[index]
        cleanups.push(
          applicationBindOverlayPointerDrag({
            view,
            el: dot.element,
            onDragStart: beginEndpointDrag,
            onMove: point => {
              live[index] = point
              applicationPlaceOverlayHtml(view, dot, point)
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
        value: { kind: 'area', value: area },
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
        redraw: paintArea
      }
    }
  }
}
