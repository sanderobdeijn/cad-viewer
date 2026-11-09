import type { GeometryPoint2dLike } from '@mlightcad/geometry-engine'
import { type ThreeRendererHtmlElement, ThreeRendererHtmlGroup } from '@mlightcad/three-renderer'

import {
  applicationCloneMeasurementStyle,
  applicationMeasurementCanvasLineWidth,
  type ApplicationMeasurementStyle
} from '../../../util'
import type { ThreeRendererView2d } from '../../../view'
import {
  ApplicationOverlayEntity,
  type ApplicationOverlaySerializable,
  type ApplicationOverlayWorldDrawResult,
  applicationSeedOverlaySizesFromWcs
} from '../../overlay'
import { hitTestMeasurementGeometry } from '../ApplicationMeasurementGeometry'
import { serializeMeasurementStyle } from '../ApplicationMeasurementRecordStyle'
import {
  type ApplicationMeasurementGroupExtras,
  commitMeasurementGroup,
  MEASUREMENT_LAYER
} from '../ApplicationMeasurementStore'
import type {
  ApplicationMeasurementRecord,
  ApplicationMeasurementRecordStyle
} from '../ApplicationMeasurementTypes'

/**
 * Unique overlay id for a measurement group.
 *
 * `Date.now()` alone collides when several distances are committed in the
 * same millisecond (continuous measure). The HTML manager replaces groups
 * with the same id, which drops earlier segments.
 */
export function newMeasureOverlayId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Options shared by measurement entity constructors.
 *
 * Concrete measure entities pass these into {@link ApplicationMeasureEntity} so id,
 * layout, and visual style are consistent across distance, angle, area, arc,
 * and point measurements.
 */
export interface ApplicationMeasureEntityOptions {
  /** Optional stable id; when omitted, subclasses generate a typed timestamp id. */
  id?: string
  /** Layout BTR id to bind the HTML group to, or omit for the active layout. */
  layoutId?: string
  /** Visual style (color, line weight, font size) for CAD and HTML overlays. */
  style: ApplicationMeasurementStyle
  /** World-space badge height from the record (optional). */
  textHeightWcs?: number
  /** World-space stroke width from the record (optional). */
  strokeWidthWcs?: number
  /** World-space arrow-head length from the record (optional). */
  arrowSizeWcs?: number
}

/**
 * Result of drawing a measurement: HTML group plus store extras for commit.
 *
 * Extends the overlay world-draw result with {@link extras} consumed by
 * {@link commitMeasurementGroup} when persisting the measurement.
 *
 * Put CAD / listener teardown on {@link ApplicationOverlayWorldDrawResult.dispose};
 * {@link ApplicationMeasureEntity.commit} wires that into `extras.dispose` so the
 * store always runs it. Do not duplicate cleanup in `extras.dispose`.
 */
export interface ApplicationMeasureWorldDrawResult extends ApplicationOverlayWorldDrawResult {
  /** Store payload (style, value, snapshot, redraw) for commit. */
  extras: ApplicationMeasurementGroupExtras
}

/**
 * Base class for measurement overlays (distance / angle / area / arc / point).
 *
 * Not an HTML leaf — composes {@link ThreeRendererHtmlGroup} and canvas / badge / dot
 * children. Subclasses implement {@link toRecord} and
 * {@link drawMeasurement}; callers should use {@link commit} rather than
 * the generic overlay `worldDraw` path.
 *
 * Implements {@link ApplicationOverlaySerializable} via {@link toRecord}. Rehydrate
 * with {@link import('./ApplicationMeasureEntityFactory').createMeasureEntityFromRecord}.
 */
export abstract class ApplicationMeasureEntity
  extends ApplicationOverlayEntity
  implements ApplicationOverlaySerializable<ApplicationMeasurementRecord>
{
  /** Visual style applied to HTML badges/dots and canvas strokes. */
  protected readonly style: ApplicationMeasurementStyle
  /** Stable measurement id used for HTML group, and store records. */
  protected readonly entityId: string
  /** Optional layout override from construction options. */
  protected readonly layoutIdOption: string | undefined
  /** Imported world-space badge height. */
  protected readonly textHeightWcs?: number
  /** Imported world-space stroke width. */
  protected readonly strokeWidthWcs?: number
  /** Imported world-space arrow-head length. */
  protected readonly arrowSizeWcs?: number

  /**
   * Creates a measure entity with the given id, layout, and style.
   *
   * @param id - Stable measurement identifier
   * @param layoutId - Layout BTR id, or `undefined` to resolve from the view
   * @param style - Measurement visual style
   * @param textHeightWcs - Optional imported world-space text height
   * @param strokeWidthWcs - Optional imported world-space stroke width
   * @param arrowSizeWcs - Optional imported world-space arrow-head length
   */
  constructor(
    id: string,
    layoutId: string | undefined,
    style: ApplicationMeasurementStyle,
    textHeightWcs?: number,
    strokeWidthWcs?: number,
    arrowSizeWcs?: number
  ) {
    super()
    this.entityId = id
    this.layoutIdOption = layoutId
    this.style = style
    this.textHeightWcs = textHeightWcs
    this.strokeWidthWcs = strokeWidthWcs
    this.arrowSizeWcs = arrowSizeWcs
  }

  /**
   * Stable identifier for this measurement entity.
   *
   * @returns The entity id used in the HTML group and store
   */
  get id(): string {
    return this.entityId
  }

  /**
   * Builds a serializable snapshot of this measurement.
   *
   * Geometry is taken from construction-time fields; `layoutId` may override
   * the layout stored on the record. When `view` is provided, style includes
   * world-space text / stroke sizes for camera-independent import.
   *
   * @param layoutId - Optional layout BTR id written onto the record
   * @param view - Optional view used to convert screen style to WCS
   * @returns Measurement record
   */
  abstract toRecord(layoutId?: string, view?: ThreeRendererView2d): ApplicationMeasurementRecord

  /**
   * Hit-tests this measurement's geometry against a canvas point.
   *
   * Delegates to {@link hitTestMeasurementGeometry} using
   * {@link toRecord}'s geometry.
   *
   * @param canvas - Pointer position in canvas/screen coordinates
   * @param worldToScreen - Converts world XY to screen for distance checks
   * @param threshold - Hit tolerance in screen pixels
   * @returns `true` if the point is within threshold of the geometry
   */
  override hitTest(
    canvas: { x: number; y: number },
    worldToScreen: (point: { x: number; y: number }) => {
      x: number
      y: number
    },
    threshold: number
  ): boolean {
    return hitTestMeasurementGeometry(
      this.toRecord().geometry,
      canvas,
      worldToScreen,
      threshold
    )
  }

  /**
   * Builds visuals and commits them to the measurement store / HTML manager.
   *
   * Calls {@link drawMeasurement}, then {@link commitMeasurementGroup}
   * with the resulting group and extras. Uses {@link ApplicationOverlayWorldDrawResult.dispose}
   * as the store's dispose hook so entity cleanup cannot be dropped.
   *
   * @param view - Active 2D view hosting HTML overlays and CAD transients
   */
  commit(view: ThreeRendererView2d): void {
    const drawn = this.drawMeasurement(view)
    commitMeasurementGroup(view, drawn.group, {
      ...drawn.extras,
      dispose: drawn.dispose
    })
    // Bind after manager.add so pointer capture targets a published DOM node.
    drawn.bindGrips?.()
  }

  /**
   * Overlay `worldDraw` hook — not supported for measurements.
   *
   * Use {@link commit}, which also publishes the measurement.
   *
   * @param view - Active 2D view (unused)
   * @returns Never returns; always throws
   * @throws Error directing callers to use {@link commit}
   */
  protected subWorldDraw(view: ThreeRendererView2d): ApplicationOverlayWorldDrawResult {
    void view
    throw new Error('Use ApplicationMeasureEntity.commit(view) instead of worldDraw')
  }

  /**
   * Builds the HTML group, CAD transients, and store extras for this measure.
   *
   * @param view - Active 2D view
   * @returns World-draw result including commit extras
   */
  protected abstract drawMeasurement(
    view: ThreeRendererView2d
  ): ApplicationMeasureWorldDrawResult

  /**
   * Creates an empty selectable HTML group on the measurement layer.
   *
   * @param view - View used to resolve the active layout when needed
   * @returns New {@link ThreeRendererHtmlGroup} for this entity id
   */
  protected createGroup(view: ThreeRendererView2d): ThreeRendererHtmlGroup {
    return new ThreeRendererHtmlGroup({
      id: this.entityId,
      layer: MEASUREMENT_LAYER,
      layoutId: this.resolveLayoutId(view),
      selectable: true
    })
  }

  /**
   * Resolves the layout id for HTML overlays.
   *
   * Uses {@link layoutIdOption} when set; otherwise the view's active layout
   * BTR id.
   *
   * @param view - View providing the active layout fallback
   * @returns Layout BTR id, or `undefined` if neither is available
   */
  protected resolveLayoutId(view: ThreeRendererView2d): string | undefined {
    return this.layoutIdOption ?? view.activeLayoutBtrId
  }

  /** Record style including world-space sizes at the current view. */
  protected serializeStyle(view?: ThreeRendererView2d): ApplicationMeasurementRecordStyle {
    return serializeMeasurementStyle(this.style, view)
  }

  /**
   * Live store style for a just-drawn measurement.
   *
   * Fit-to-screen may clamp the badge font below the session preference; the
   * committed live style must match what was painted so later color-only
   * paints do not restore the unclamped size.
   */
  protected committedLiveStyle(
    badgeFontSize: number,
    textHeightWcs?: number
  ): ApplicationMeasurementStyle {
    const style = applicationCloneMeasurementStyle(this.style)
    style.fontSize = badgeFontSize
    if (textHeightWcs != null && textHeightWcs > 0) {
      style.textHeightWcs = textHeightWcs
    }
    return style
  }

  /**
   * Seeds world-space sizes onto HTML overlays and canvases before first paint.
   *
   * Prefers an explicit import {@link textHeightWcs}. Otherwise resolves from
   * the live style: custom keeps the authored WCS height; Fit-to-screen bakes
   * the current screen font size into WCS at commit time.
   */
  protected seedOverlaySizes(
    view: ThreeRendererView2d,
    elements: readonly ThreeRendererHtmlElement[],
    canvases: readonly HTMLElement[] = []
  ): void {
    const recordStyle = this.serializeStyle(view)
    applicationSeedOverlaySizesFromWcs(view, {
      textHeightWcs: this.textHeightWcs ?? recordStyle.textHeightWcs,
      strokeWidthWcs: this.strokeWidthWcs,
      arrowSizeWcs: this.arrowSizeWcs ?? recordStyle.arrowSizeWcs,
      fontSizePx: this.style.fontSize,
      strokeScreenPx: applicationMeasurementCanvasLineWidth(this.style.lineWeight),
      elements,
      canvases
    })
  }
}

export type { GeometryPoint2dLike }
