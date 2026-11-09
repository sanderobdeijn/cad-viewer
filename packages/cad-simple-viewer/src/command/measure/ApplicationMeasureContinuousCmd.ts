import { CommonColor } from '@mlightcad/common'
import {
  GeometryPoint2d,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'
import {
  ThreeRendererHtmlBadge,
  ThreeRendererHtmlTransientManager
} from '@mlightcad/three-renderer'

import { ApplicationContext } from '../../app'
import {
  EditorBaseView,
  EditorPreviewJig,
  EditorPromptPointOptions,
  EditorPromptStatus
} from '../../editor'
import { ApplicationI18n } from '../../i18n'
import {
  applicationAdaptiveMeasureBadgeFontSize,
  applicationGetCurrentMeasurementStyle,
  applicationGetMeasurementColor,
  applicationMeasurementCanvasLineWidth,
  applicationScaleMeasureOverlayPx,
  applicationScreenSegmentLengthPx,
  formatMeasurementLength,
  MEASUREMENT_LINE_WEIGHT
} from '../../util'
import { ThreeRendererView2d } from '../../view'
import {
  ApplicationHtmlLivePreview,
  applicationStrokeLivePolyline
} from '../overlay/ApplicationHtmlLivePreview'
import {
  APPLICATION_OVERLAY_ARROW_SIZE_PX,
} from '../overlay/ApplicationOverlayDrawUtil'
import { placeDistanceMeasurement } from './ApplicationMeasureDistanceCmd'
import { ApplicationMeasureDrawCmd } from './ApplicationMeasureDrawCmd'
import {
  MEASUREMENT_LIVE_LAYER,
  runMeasurementEdit
} from './ApplicationMeasurementStore'
import { newMeasureOverlayId } from './entity/ApplicationMeasureEntity'

/** Returns the 2D Euclidean distance between two world points. */
function calcDist(p1: GeometryPoint2dLike, p2: GeometryPoint2dLike): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/** Midpoint of a segment. */
function midOf(
  a: GeometryPoint2dLike,
  b: GeometryPoint2dLike
): GeometryPoint2dLike {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** Snapshot a pick so later getPoint mutations cannot collapse earlier vertices. */
function clonePoint(p: GeometryPoint2dLike): GeometryPoint2dLike {
  return { x: p.x, y: p.y }
}

/**
 * Preview jig for the continuous distance measurement command.
 *
 * Renders live HTML rubber-band segments and a length badge at each midpoint
 * (no AcDb preview). Confirmed vertices stay in `points`; `update` adds the
 * rubber-band to the cursor.
 */
export class ApplicationMeasureContinuousJig extends EditorPreviewJig<GeometryPoint2dLike> {
  private readonly _view: ThreeRendererView2d
  private readonly _points: GeometryPoint2dLike[]
  private readonly _htManager: ThreeRendererHtmlTransientManager
  private readonly _badges: ThreeRendererHtmlBadge[] = []
  private readonly _preview: ApplicationHtmlLivePreview
  private _color: CommonColor

  constructor(
    view: EditorBaseView,
    points: GeometryPoint2dLike[],
    color: CommonColor
  ) {
    super(view)
    this._view = view as ThreeRendererView2d
    this._points = points
    this._color = color
    this._htManager = this._view.htmlTransientManager
    this._preview = new ApplicationHtmlLivePreview(
      this._view,
      `live-cont-stroke-${Date.now()}`,
      MEASUREMENT_LIVE_LAYER,
      { alignToViewCanvas: true }
    )
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  update(cursor: GeometryPoint2dLike) {
    this._color = applicationGetMeasurementColor()
    const style = applicationGetCurrentMeasurementStyle()
    const lineWidth = applicationMeasurementCanvasLineWidth(MEASUREMENT_LINE_WEIGHT)
    const vertices = [...this._points, cursor].map(clonePoint)
    const segmentArrowSizesPx: number[] = []
    for (let i = 0; i < vertices.length - 1; i++) {
      const a = vertices[i]!
      const b = vertices[i + 1]!
      const dist = calcDist(a, b)
      if (dist < 0.0001) {
        segmentArrowSizesPx.push(APPLICATION_OVERLAY_ARROW_SIZE_PX)
        continue
      }
      const label = formatMeasurementLength(dist)
      const fontSize = applicationAdaptiveMeasureBadgeFontSize(
        label,
        style,
        applicationScreenSegmentLengthPx(p => this._view.worldToScreen(p), a, b)
      )
      segmentArrowSizesPx.push(
        applicationScaleMeasureOverlayPx(
          APPLICATION_OVERLAY_ARROW_SIZE_PX,
          style.fontSize,
          fontSize
        )
      )
    }
    this._preview.applicationSetDraw((ctx, view) => {
      applicationStrokeLivePolyline(ctx, view, vertices, this._color, lineWidth, {
        segmentArrows: true,
        segmentArrowSizesPx
      })
    })
    this.syncBadges(vertices, style.fontSize)
  }

  /**
   * `getPoint` calls {@link end} after every accepted click. Keep the live
   * overlay so confirmed segments stay visible while picking the next vertex.
   * The command calls {@link disposePreview} when the whole chain finishes.
   */
  end() {
    super.end()
  }

  /** Removes the live polyline canvas and midpoint badges. */
  disposePreview() {
    this._preview.applicationDispose()
    for (const badge of this._badges) {
      this._htManager.remove(badge.id)
    }
    this._badges.length = 0
  }

  /** Creates, updates, or hides per-segment live badges. */
  private syncBadges(vertices: GeometryPoint2dLike[], fontSize: number) {
    const style = applicationGetCurrentMeasurementStyle()
    const needed = Math.max(0, vertices.length - 1)
    while (this._badges.length < needed) {
      const badge = new ThreeRendererHtmlBadge({
        id: `live-cont-badge-${Date.now()}-${this._badges.length}`,
        color: this._color,
        worldPosition: vertices[this._badges.length] ?? { x: 0, y: 0 },
        layer: MEASUREMENT_LIVE_LAYER,
        layoutId: this._view.activeLayoutBtrId,
        fontSize
      })
      this._htManager.add(badge)
      this._badges.push(badge)
    }
    while (this._badges.length > needed) {
      const badge = this._badges.pop()
      if (badge) this._htManager.remove(badge.id)
    }
    for (let i = 0; i < needed; i++) {
      const a = vertices[i]
      const b = vertices[i + 1]
      const dist = calcDist(a, b)
      const badge = this._badges[i]
      badge.setColor(this._color)
      if (dist < 0.0001) {
        badge.object.visible = false
        continue
      }
      const label = formatMeasurementLength(dist)
      const clamped = applicationAdaptiveMeasureBadgeFontSize(
        label,
        { ...style, fontSize },
        applicationScreenSegmentLengthPx(p => this._view.worldToScreen(p), a, b)
      )
      badge.setFontSize(clamped)
      badge.setText(label)
      badge.setPosition(midOf(a, b))
      badge.object.visible = true
    }
  }
}

/**
 * Command that measures chained straight-line distances, like LINE.
 *
 * The user keeps picking the next vertex until Enter or Cancel. Each
 * consecutive pair is committed as a normal distance measurement.
 */
export class ApplicationMeasureContinuousCmd extends ApplicationMeasureDrawCmd {
  async execute(context: ApplicationContext) {
    const editor = context.view.editor
    const color = applicationGetMeasurementColor()
    const points: GeometryPoint2dLike[] = []

    await this.withMeasureInput(context, async () => {
      const p1Prompt = new EditorPromptPointOptions(
        ApplicationI18n.t('jig.measureContinuous.firstPoint')
      )
      const p1Result = await editor.getPoint(p1Prompt)
      if (p1Result.status !== EditorPromptStatus.OK) return
      points.push(clonePoint(p1Result.value!))

      const jig = new ApplicationMeasureContinuousJig(context.view, points, color)
      try {
        while (points.length < 100) {
          const prompt = new EditorPromptPointOptions(
            ApplicationI18n.t('jig.measureContinuous.nextPoint')
          )
          prompt.useBasePoint = true
          prompt.basePoint = new GeometryPoint2d(points[points.length - 1])
          prompt.allowNone = true
          prompt.jig = jig
          const result = await editor.getPoint(prompt)
          if (result.status !== EditorPromptStatus.OK) break
          const next = clonePoint(result.value!)
          const last = points[points.length - 1]!
          if (calcDist(last, next) < 1e-9) continue
          points.push(next)
        }
      } finally {
        jig.disposePreview()
      }
    })

    if (points.length < 2) return

    const view = context.view as ThreeRendererView2d
    const style = applicationGetCurrentMeasurementStyle()
    runMeasurementEdit(() => {
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i]!
        const b = points[i + 1]!
        if (calcDist(a, b) < 1e-4) continue
        placeDistanceMeasurement(view, a, b, style, {
          id: newMeasureOverlayId('dist')
        })
      }
    })
  }
}
