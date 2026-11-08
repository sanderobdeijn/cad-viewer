import { CommonColor } from '@mlightcad/common'
import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'
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
  applicationScreenAngleBadgeRefLengthPx,
  formatMeasurementAngle,
  MEASUREMENT_LINE_WEIGHT
} from '../../util'
import { ThreeRendererView2d } from '../../view'
import {
  ApplicationHtmlLivePreview,
  applicationStrokeLiveSegment
} from '../overlay/ApplicationHtmlLivePreview'
import { applicationSyncLiveOverlayTextHeight } from '../overlay/ApplicationOverlayDrawUtil'
import { ApplicationMeasureDrawCmd } from './ApplicationMeasureDrawCmd'
import { MEASUREMENT_LIVE_LAYER } from './ApplicationMeasurementStore'
import { ApplicationMeasureAngleEntity } from './entity'

/** Returns the angle in degrees between two arms sharing a common vertex. */
function calcAngleDeg(
  vertex: GeometryPoint2dLike,
  arm1: GeometryPoint2dLike,
  arm2: GeometryPoint2dLike
): number {
  const dx1 = arm1.x - vertex.x
  const dy1 = arm1.y - vertex.y
  const dx2 = arm2.x - vertex.x
  const dy2 = arm2.y - vertex.y
  const dot = dx1 * dx2 + dy1 * dy2
  const cross = dx1 * dy2 - dy1 * dx2
  const rad = Math.atan2(Math.abs(cross), dot)
  return (rad * 180) / Math.PI
}

/**
 * Commit an angle measurement overlay (also used when importing a sidecar).
 */
export function placeAngleMeasurement(
  view: ThreeRendererView2d,
  vertex: GeometryPoint2dLike,
  arm1: GeometryPoint2dLike,
  arm2: GeometryPoint2dLike,
  style: ApplicationMeasurementStyle,
  options?: { id?: string; layoutId?: string }
): void {
  ApplicationMeasureAngleEntity.create(vertex, arm1, arm2, style, options).commit(view)
}

/**
 * Rubber-band jig for picking arm1: solid HTML preview from vertex to cursor.
 */
class ApplicationMeasureArm1Jig extends EditorPreviewJig<GeometryPoint2dLike> {
  private readonly _vertex: GeometryPoint2dLike
  private readonly _preview: ApplicationHtmlLivePreview
  private readonly _color: CommonColor
  private _cursor: GeometryPoint2dLike

  constructor(
    view: EditorBaseView,
    vertex: GeometryPoint2dLike,
    color: CommonColor
  ) {
    super(view)
    this._vertex = vertex
    this._cursor = vertex
    this._color = color

    this._preview = new ApplicationHtmlLivePreview(
      view as ThreeRendererView2d,
      `live-angle-arm1-${Date.now()}`,
      MEASUREMENT_LIVE_LAYER
    )
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  update(p: GeometryPoint2dLike) {
    this._cursor = p
    const lineWidth = applicationMeasurementCanvasLineWidth(MEASUREMENT_LINE_WEIGHT)
    this._preview.applicationSetDraw((ctx, view) => {
      applicationStrokeLiveSegment(
        ctx,
        view,
        this._vertex,
        this._cursor,
        this._color,
        lineWidth
      )
    })
  }

  end() {
    super.end()
    this._preview.applicationDispose()
  }
}

/**
 * Preview jig for picking arm2: dashed arm1 + solid arm2 on one HTML canvas,
 * plus a live angle badge.
 */
class ApplicationMeasureAngleJig extends EditorPreviewJig<GeometryPoint2dLike> {
  private readonly _view: ThreeRendererView2d
  private readonly _vertex: GeometryPoint2dLike
  private readonly _arm1: GeometryPoint2dLike
  private readonly _badge: ThreeRendererHtmlBadge
  private readonly _htManager: ThreeRendererHtmlTransientManager
  private readonly _badgeId: string
  private readonly _preview: ApplicationHtmlLivePreview
  private _color: CommonColor
  private _arm2: GeometryPoint2dLike

  constructor(
    view: EditorBaseView,
    vertex: GeometryPoint2dLike,
    arm1: GeometryPoint2dLike,
    color: CommonColor
  ) {
    super(view)
    this._view = view as ThreeRendererView2d
    this._vertex = vertex
    this._arm1 = arm1
    this._arm2 = vertex
    this._color = color

    this._badgeId = `live-angle-badge-${Date.now()}`
    this._htManager = this._view.htmlTransientManager
    this._badge = new ThreeRendererHtmlBadge({
      id: this._badgeId,
      color,
      worldPosition: vertex,
      layer: MEASUREMENT_LIVE_LAYER,
      layoutId: this._view.activeLayoutBtrId,
      fontSize: applicationGetMeasurementFontSize(),
      // Keep the label slightly above the vertex (was -30px screen offset).
      transform: 'translate(-50%, calc(-50% - 30px))'
    })
    this._htManager.add(this._badge)
    applicationSyncLiveOverlayTextHeight(
      this._view,
      [this._badge],
      applicationGetCurrentMeasurementStyle()
    )
    this._badge.object.visible = false

    this._preview = new ApplicationHtmlLivePreview(
      this._view,
      `live-angle-arm2-${Date.now()}`,
      MEASUREMENT_LIVE_LAYER
    )
  }

  /** HTML-only preview — no CAD transient. */
  get entity(): null {
    return null
  }

  update(p: GeometryPoint2dLike) {
    this._arm2 = p
    this._color = applicationGetMeasurementColor()
    this._badge.setColor(this._color)
    const style = applicationGetCurrentMeasurementStyle()

    const lineWidth = applicationMeasurementCanvasLineWidth(MEASUREMENT_LINE_WEIGHT)
    this._preview.applicationSetDraw((ctx, view) => {
      applicationStrokeLiveSegment(
        ctx,
        view,
        this._vertex,
        this._arm1,
        this._color,
        lineWidth,
        { dashed: true }
      )
      applicationStrokeLiveSegment(
        ctx,
        view,
        this._vertex,
        this._arm2,
        this._color,
        lineWidth
      )
    })

    const deg = calcAngleDeg(this._vertex, this._arm1, p)
    const label = formatMeasurementAngle((deg * Math.PI) / 180)
    const fontSize = applicationAdaptiveMeasureBadgeFontSize(
      label,
      style,
      applicationScreenAngleBadgeRefLengthPx(
        pt => this._view.worldToScreen(pt),
        this._vertex,
        this._arm1,
        p
      )
    )
    this._badge.setFontSize(fontSize)
    applicationSyncLiveOverlayTextHeight(this._view, [this._badge], {
      ...style,
      fontSize
    })
    this._badge.setText(label)
    this._badge.setPosition(this._vertex)
    this._badge.object.visible = true
  }

  end() {
    super.end()
    this._preview.applicationDispose()
    this._htManager.remove(this._badgeId)
  }
}

/**
 * Command that measures the angle between two arms sharing a common vertex.
 *
 * Prompts the user to pick three world points: the vertex, a point on the
 * first arm, and a point on the second arm. Interactive preview is HTML-only
 * (canvas strokes + badge). Committed overlay is placed via
 * {@link placeAngleMeasurement}.
 */
export class ApplicationMeasureAngleCmd extends ApplicationMeasureDrawCmd {
  async execute(context: ApplicationContext) {
    const editor = context.view.editor
    const color = applicationGetMeasurementColor()

    await this.withMeasureInput(context, async () => {
      // Pick vertex
      const vertexPrompt = new EditorPromptPointOptions(
        ApplicationI18n.t('jig.measureAngle.vertex')
      )
      const vertexResult = await editor.getPoint(vertexPrompt)
      if (vertexResult.status !== EditorPromptStatus.OK) return
      const vertex = vertexResult.value!

      // Pick first arm endpoint (jig provides HTML rubber-band from vertex)
      const arm1Prompt = new EditorPromptPointOptions(
        ApplicationI18n.t('jig.measureAngle.arm1')
      )
      arm1Prompt.useBasePoint = true
      arm1Prompt.jig = new ApplicationMeasureArm1Jig(context.view, vertex, color)
      const arm1Result = await editor.getPoint(arm1Prompt)
      if (arm1Result.status !== EditorPromptStatus.OK) return
      const arm1 = arm1Result.value!

      // Pick second arm endpoint with live preview (dashed arm1 + solid arm2 + badge)
      const arm2Prompt = new EditorPromptPointOptions(
        ApplicationI18n.t('jig.measureAngle.arm2')
      )
      arm2Prompt.jig = new ApplicationMeasureAngleJig(
        context.view,
        vertex,
        arm1,
        color
      )

      const arm2Result = await editor.getPoint(arm2Prompt)
      if (arm2Result.status !== EditorPromptStatus.OK) return
      const arm2 = arm2Result.value!

      placeAngleMeasurement(
        context.view as ThreeRendererView2d,
        vertex,
        arm1,
        arm2,
        applicationGetCurrentMeasurementStyle()
      )
    })
  }
}
