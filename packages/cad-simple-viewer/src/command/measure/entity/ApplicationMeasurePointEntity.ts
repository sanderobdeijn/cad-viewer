import type { GeometryPoint2dLike } from '@mlightcad/geometry-engine'
import { ThreeRendererHtmlBadge, ThreeRendererHtmlGrip } from '@mlightcad/three-renderer'

import {
  type ApplicationMeasurementStyle,
  formatMeasurementValue
} from '../../../util'
import type { ThreeRendererView2d } from '../../../view'
import { applicationBindOverlayPointerDrag, applicationPlaceOverlayHtml } from '../../overlay'
import { republishMeasurement } from '../ApplicationMeasurementRepublish'
import {
  getMeasurementSnapshot,
  MEASUREMENT_LAYER,
  runMeasurementEdit
} from '../ApplicationMeasurementStore'
import type { ApplicationMeasurementRecord } from '../ApplicationMeasurementTypes'
import {
  ApplicationMeasureEntity,
  type ApplicationMeasureEntityOptions,
  type ApplicationMeasureWorldDrawResult
} from './ApplicationMeasureEntity'
import { selectMeasurementGroup } from './ApplicationMeasureEntityGrips'

/**
 * Point / coordinate measurement overlay entity.
 *
 * Renders an HTML dot at the measured location and a badge showing formatted
 * X/Y coordinates. The endpoint grip moves the point and updates the label.
 */
export class ApplicationMeasurePointEntity extends ApplicationMeasureEntity {
  /** Measured point in world coordinates. */
  private readonly point: GeometryPoint2dLike

  /**
   * Creates a point measure entity at the given location.
   *
   * @param point - World position to measure
   * @param options - Shared id, layout, and style options
   */
  constructor(point: GeometryPoint2dLike, options: ApplicationMeasureEntityOptions) {
    super(
      options.id ?? `point-${Date.now()}`,
      options.layoutId,
      options.style,
      options.textHeightWcs,
      options.strokeWidthWcs
    )
    this.point = point
  }

  /**
   * Factory that builds a point entity from a world position and style.
   *
   * @param point - World position to measure
   * @param style - Measurement visual style
   * @param options - Optional id and layout overrides
   * @returns New {@link ApplicationMeasurePointEntity}
   */
  static create(
    point: GeometryPoint2dLike,
    style: ApplicationMeasurementStyle,
    options?: { id?: string; layoutId?: string }
  ): ApplicationMeasurePointEntity {
    return new ApplicationMeasurePointEntity(point, {
      style,
      id: options?.id,
      layoutId: options?.layoutId
    })
  }

  /**
   * Primary anchor for the measurement (the measured point itself).
   *
   * @returns Copy of {@link point} with `z: 0`
   */
  override primaryPoint(): GeometryPoint2dLike {
    return { x: this.point.x, y: this.point.y }
  }

  /**
   * Serializes this point measurement to a store/sidecar record.
   *
   * @param layoutId - Optional layout BTR id written onto the record
   * @param view - Optional view used to convert screen style to WCS
   * @returns Record with `type: 'point'` and position geometry
   */
  toRecord(layoutId?: string, view?: ThreeRendererView2d): ApplicationMeasurementRecord {
    return {
      id: this.entityId,
      type: 'point',
      layoutId,
      style: this.serializeStyle(view),
      geometry: {
        type: 'point',
        position: { x: this.point.x, y: this.point.y }
      }
    }
  }

  /**
   * Draws the coordinate dot, badge, and commit extras (no CAD transients).
   *
   * @param view - Active 2D view for HTML overlays
   * @returns World-draw result with empty `entityIds`
   */
  protected drawMeasurement(view: ThreeRendererView2d): ApplicationMeasureWorldDrawResult {
    const live = { x: this.point.x, y: this.point.y }
    const layoutId = this.resolveLayoutId(view)
    let value = {
      kind: 'coordinate' as const,
      x: live.x,
      y: live.y
    }
    const color = this.style.color
    const dot = new ThreeRendererHtmlGrip({
      id: `${this.entityId}-dot`,
      color,
      worldPosition: live,
      layer: MEASUREMENT_LAYER
    })
    const badge = new ThreeRendererHtmlBadge({
      id: `${this.entityId}-badge`,
      color,
      text: formatMeasurementValue(value),
      worldPosition: live,
      layer: MEASUREMENT_LAYER,
      fontSize: this.style.fontSize,
      transform: 'translate(-50%, calc(-50% - 16px))'
    })
    this.seedOverlaySizes(view, [dot, badge])
    const group = this.createGroup(view).add(dot, badge)

    const cleanups: Array<() => void> = []
    const pendingGrips: Array<() => void> = []
    let dragStart = { ...live }

    const refreshLive = () => {
      value = { kind: 'coordinate', x: live.x, y: live.y }
      badge.setText(formatMeasurementValue(value))
      applicationPlaceOverlayHtml(view, badge, live)
      view.isHtmlDirty = true
    }

    pendingGrips.push(() => {
      cleanups.push(
        applicationBindOverlayPointerDrag({
          view,
          el: dot.element,
          onDragStart: () => {
            selectMeasurementGroup(view, this.entityId)
            dragStart = { ...live }
          },
          onMove: point => {
            live.x = point.x
            live.y = point.y
            applicationPlaceOverlayHtml(view, dot, live)
            refreshLive()
          },
          onCommit: () => {
            if (Math.hypot(live.x - dragStart.x, live.y - dragStart.y) < 1e-9) {
              refreshLive()
              return
            }
            const snap = getMeasurementSnapshot(this.entityId)
            const geometry: ApplicationMeasurementRecord['geometry'] = {
              type: 'point',
              position: { x: live.x, y: live.y }
            }
            const record: ApplicationMeasurementRecord = snap
              ? { ...snap, geometry }
              : {
                  id: this.entityId,
                  type: 'point',
                  layoutId,
                  style: this.serializeStyle(view),
                  geometry
                }
            runMeasurementEdit(() => {
              republishMeasurement(view, record)
            })
          }
        })
      )
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
        style: this.style,
        value,
        snapshot: this.toRecord(layoutId, view)
      }
    }
  }
}
