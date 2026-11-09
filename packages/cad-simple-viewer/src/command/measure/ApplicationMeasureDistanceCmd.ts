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
  applicationGetMeasurementFontSize,
  applicationMeasurementCanvasLineWidth,
  type ApplicationMeasurementStyle,
  applicationScaleMeasureOverlayPx,
  applicationScreenSegmentLengthPx,
  formatMeasurementLength,
  MEASUREMENT_LINE_WEIGHT
} from '../../util'
import { ThreeRendererView2d } from '../../view'
import {
  ApplicationHtmlLivePreview,
  applicationStrokeLiveSegment
} from '../overlay/ApplicationHtmlLivePreview'
import {
  APPLICATION_OVERLAY_ARROW_SIZE_PX,
} from '../overlay/ApplicationOverlayDrawUtil'
import { ApplicationMeasureDrawCmd } from './ApplicationMeasureDrawCmd'
import { MEASUREMENT_LIVE_LAYER } from './ApplicationMeasurementStore'
import { ApplicationMeasureDistanceEntity } from './entity'

/** Returns the 2D Euclidean distance between two world points. */
function calcDist(p1: GeometryPoint2dLike, p2: GeometryPoint2dLike): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Commit a distance measurement overlay.
 */
export function placeDistanceMeasurement(
  view: ThreeRendererView2d,
  p1: GeometryPoint2dLike,
  p2: GeometryPoint2dLike,
  style: ApplicationMeasurementStyle,
  options?: { id?: string; layoutId?: string }
): void {
  ApplicationMeasureDistanceEntity.create(p1, p2, style, options).commit(view)
}

/**
 * Preview jig for the distance measurement command.
 *
 * Renders a live HTML rubber-band segment and length badge (no AcDb preview).
 */
export class ApplicationMeasureDistanceJig extends EditorPreviewJig<GeometryPoint2dLike> {
  private readonly _view: ThreeRendererView2d
  private readonly _p1: GeometryPoint2dLike
  private readonly _htManager: ThreeRendererHtmlTransientManager
  private readonly _badge: ThreeRendererHtmlBadge
  private readonly _badgeId: string
  private readonly _preview: ApplicationHtmlLivePreview
  private _color: CommonColor
  private _p2: GeometryPoint2dLike

  constructor(view: EditorBaseView, p1: GeometryPoint2dLike, color: CommonColor) {
    super(view)
    this._view = view as ThreeRendererView2d
    this._p1 = p1
    this._p2 = p1
    this._color = color

    this._badgeId = `live-dist-badge-${Date.now()}`
    this._htManager = this._view.htmlTransientManager
    this._badge = new ThreeRendererHtmlBadge({
      id: this._badgeId,
      color,
      worldPosition: p1,
      layer: MEASUREMENT_LIVE_LAYER,
      layoutId: this._view.activeLayoutBtrId,
      fontSize: applicationGetMeasurementFontSize()
    })
    this._htManager.add(this._badge)
    // `add()` applies layout visibility and would force the empty capsule on.
    this._badge.object.visible = false

    this._preview = new ApplicationHtmlLivePreview(
      this._view,
      `live-dist-stroke-${Date.now()}`,
      MEASUREMENT_LIVE_LAYER
    )
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  update(p2: GeometryPoint2dLike) {
    this._p2 = p2
    this._color = applicationGetMeasurementColor()
    this._badge.setColor(this._color)
    const style = applicationGetCurrentMeasurementStyle()

    const dist = calcDist(this._p1, p2)
    const lineWidth = applicationMeasurementCanvasLineWidth(MEASUREMENT_LINE_WEIGHT)
    const linePx = applicationScreenSegmentLengthPx(
      p => this._view.worldToScreen(p),
      this._p1,
      p2
    )

    if (dist < 0.0001) {
      this._preview.applicationSetDraw((ctx, view) => {
        applicationStrokeLiveSegment(
          ctx,
          view,
          this._p1,
          this._p2,
          this._color,
          lineWidth,
          {
            arrow: 'both'
          }
        )
      })
      this._badge.object.visible = false
      return
    }

    const label = formatMeasurementLength(dist)
    const fontSize = applicationAdaptiveMeasureBadgeFontSize(label, style, linePx)
    const arrowSizePx = applicationScaleMeasureOverlayPx(
      APPLICATION_OVERLAY_ARROW_SIZE_PX,
      style.fontSize,
      fontSize
    )
    this._preview.applicationSetDraw((ctx, view) => {
      applicationStrokeLiveSegment(
        ctx,
        view,
        this._p1,
        this._p2,
        this._color,
        lineWidth,
        { arrow: 'both', arrowSizePx }
      )
    })
    this._badge.setFontSize(fontSize)
    this._badge.setText(label)
    this._badge.setPosition({
      x: (this._p1.x + p2.x) / 2,
      y: (this._p1.y + p2.y) / 2
    })
    this._badge.object.visible = true
  }

  end() {
    super.end()
    this._preview.applicationDispose()
    this._htManager.remove(this._badgeId)
  }
}

/**
 * Command that measures the straight-line distance between two points.
 *
 * Prompts for two world points, then commits a measurement overlay.
 * Interactive preview is HTML-only (canvas stroke + badge).
 */
export class ApplicationMeasureDistanceCmd extends ApplicationMeasureDrawCmd {
  async execute(context: ApplicationContext) {
    const editor = context.view.editor
    const color = applicationGetMeasurementColor()

    await this.withMeasureInput(context, async () => {
      const p1Prompt = new EditorPromptPointOptions(
        ApplicationI18n.t('jig.measureDistance.firstPoint')
      )
      const p1Result = await editor.getPoint(p1Prompt)
      if (p1Result.status !== EditorPromptStatus.OK) return
      const p1 = p1Result.value!

      const p2Prompt = new EditorPromptPointOptions(
        ApplicationI18n.t('jig.measureDistance.secondPoint')
      )
      p2Prompt.useBasePoint = true
      p2Prompt.basePoint = new GeometryPoint2d(p1)
      p2Prompt.jig = new ApplicationMeasureDistanceJig(context.view, p1, color)
      const p2Result = await editor.getPoint(p2Prompt)
      if (p2Result.status !== EditorPromptStatus.OK) return
      const p2 = p2Result.value!

      placeDistanceMeasurement(
        context.view as ThreeRendererView2d,
        p1,
        p2,
        applicationGetCurrentMeasurementStyle()
      )
    })
  }
}
