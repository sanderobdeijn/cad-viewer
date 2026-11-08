/**
 * HTML-only live preview stroke for measure jigs.
 *
 * Uses {@link ThreeRendererHtmlCanvasOverlay} on a live layer; never adds AcDb entities.
 * Updates set {@link ThreeRendererView2d.isHtmlDirty} only (not {@link ThreeRendererView2d.isDirty}),
 * so jig rubber-bands no longer force a WebGL redraw.
 */

import type { CommonColor } from '@mlightcad/common'
import { ThreeRendererHtmlCanvasOverlay } from '@mlightcad/three-renderer'

import { applicationCssColor } from '../../util'
import type { ThreeRendererView2d } from '../../view'
import {
  applicationDrawOverlayArrowHead,
  applicationFitOverlayCanvas,
  applicationFitOverlayCanvasToView,
  applicationOverlayArrowSize,
  applicationOverlayDash,
  applicationScaledOverlayLineWidth
} from './ApplicationOverlayDrawUtil'

/** World-space 2D point for live preview strokes. */
export interface ApplicationHtmlLivePoint {
  /** World X. */
  x: number
  /** World Y. */
  y: number
}

/**
 * Drawable content for one live-preview frame.
 */
export type ApplicationHtmlLiveDrawFn = (
  ctx: CanvasRenderingContext2D,
  view: ThreeRendererView2d
) => void

/**
 * Full-viewport HTML canvas used as a jig rubber-band / shape preview.
 */
export class ApplicationHtmlLivePreview {
  /** Host view. */
  private readonly view: ThreeRendererView2d
  /** Screen-space canvas overlay on the live layer. */
  private readonly overlay: ThreeRendererHtmlCanvasOverlay
  /** Current frame drawer; `null` clears the canvas. */
  private drawFn: ApplicationHtmlLiveDrawFn | null = null
  /** Bound viewChanged listener. */
  private readonly onViewChanged = () => this.applicationPaint()
  /**
   * When true, the overlay is sized to the WebGL canvas and offset with
   * {@link ThreeRendererView2d.canvasToContainer} so `worldToScreen` strokes align
   * with CSS2D badges. Default fits the outer view container.
   */
  private readonly alignToViewCanvas: boolean

  /**
   * @param view - Active 2D view.
   * @param id - Unique overlay id.
   * @param layer - HTML transient live layer name.
   * @param options - Overlay alignment. Use `alignToViewCanvas` for measure
   *   jigs that stroke with `worldToScreen` next to CSS2D badges.
   */
  constructor(
    view: ThreeRendererView2d,
    id: string,
    layer: string,
    options?: { alignToViewCanvas?: boolean }
  ) {
    this.view = view
    this.alignToViewCanvas = options?.alignToViewCanvas === true
    this.overlay = new ThreeRendererHtmlCanvasOverlay({
      id,
      container: view.container,
      layer,
      layoutId: view.activeLayoutBtrId
    })
    view.htmlTransientManager.add(this.overlay)
    view.events.viewChanged.addEventListener(this.onViewChanged)
  }

  /** Overlay id (for manager remove). */
  get id(): string {
    return this.overlay.id
  }

  /**
   * Replace the draw callback and immediately paint.
   *
   * Marks {@link ThreeRendererView2d.isHtmlDirty} so CSS2D siblings (badges / dots)
   * updated in the same jig tick are reprojected. Canvas strokes themselves
   * are painted synchronously and do not need a WebGL pass.
   *
   * @param drawFn - Frame drawer, or `null` to clear.
   */
  applicationSetDraw(drawFn: ApplicationHtmlLiveDrawFn | null): void {
    this.drawFn = drawFn
    this.applicationPaint()
    this.view.isHtmlDirty = true
  }

  /** Clear the canvas without disposing the overlay. */
  applicationClear(): void {
    this.applicationSetDraw(null)
  }

  /**
   * Remove overlay and viewChanged listener.
   *
   * Sets {@link ThreeRendererView2d.isHtmlDirty} so CSS2D can drop related live badges.
   */
  applicationDispose(): void {
    this.view.events.viewChanged.removeEventListener(this.onViewChanged)
    this.view.htmlTransientManager.remove(this.overlay.id)
    this.view.isHtmlDirty = true
  }

  /** Paint the current frame onto the overlay canvas. */
  private applicationPaint(): void {
    const ctx = this.alignToViewCanvas
      ? applicationFitOverlayCanvasToView(this.overlay.canvas, this.view)
      : applicationFitOverlayCanvas(this.overlay.canvas, this.view.container)
    if (!ctx) return
    this.drawFn?.(ctx, this.view)
  }
}

/**
 * Stroke a world-space segment in screen space.
 *
 * @param ctx - Canvas context in CSS pixels.
 * @param view - View for world → screen.
 * @param a - Segment start (world).
 * @param b - Segment end (world).
 * @param color - CSS or CommonColor stroke color.
 * @param lineWidth - Stroke width in CSS pixels.
 * @param options - Optional dash pattern and arrow head (`true` at `b`,
 *   `'both'` at both endpoints).
 */
export function applicationStrokeLiveSegment(
  ctx: CanvasRenderingContext2D,
  view: ThreeRendererView2d,
  a: ApplicationHtmlLivePoint,
  b: ApplicationHtmlLivePoint,
  color: string | CommonColor,
  lineWidth: number,
  options?: {
    dashed?: boolean
    arrow?: boolean | 'both'
    /** Override arrow-head length in CSS px (default tracks stroke width). */
    arrowSizePx?: number
  }
): void {
  const css = typeof color === 'string' ? color : applicationCssColor(color)
  const sa = view.worldToScreen(a)
  const sb = view.worldToScreen(b)
  ctx.strokeStyle = css
  const strokeWidth = applicationScaledOverlayLineWidth(lineWidth, ctx.canvas, view)
  ctx.lineWidth = strokeWidth
  if (options?.dashed) ctx.setLineDash(applicationOverlayDash(strokeWidth, lineWidth))
  ctx.beginPath()
  ctx.moveTo(sa.x, sa.y)
  ctx.lineTo(sb.x, sb.y)
  ctx.stroke()
  if (options?.dashed) ctx.setLineDash([])
  if (options?.arrow) {
    const size =
      options.arrowSizePx != null && options.arrowSizePx > 0
        ? options.arrowSizePx
        : applicationOverlayArrowSize(strokeWidth, lineWidth)
    if (options.arrow === 'both') {
      if (Math.hypot(sb.x - sa.x, sb.y - sa.y) >= size) {
        applicationDrawOverlayArrowHead(ctx, sb, sa, css, size)
        applicationDrawOverlayArrowHead(ctx, sa, sb, css, size)
      }
    } else {
      applicationDrawOverlayArrowHead(ctx, sa, sb, css, size)
    }
  }
}

/**
 * Stroke a world-space closed polyline (screen projection).
 *
 * @param ctx - Canvas context in CSS pixels.
 * @param view - View for world → screen.
 * @param points - World vertices in order.
 * @param color - CSS or CommonColor stroke color.
 * @param lineWidth - Stroke width in CSS pixels.
 * @param options - Optional dash / closePath / per-segment arrows.
 */
export function applicationStrokeLivePolyline(
  ctx: CanvasRenderingContext2D,
  view: ThreeRendererView2d,
  points: ApplicationHtmlLivePoint[],
  color: string | CommonColor,
  lineWidth: number,
  options?: {
    dashed?: boolean
    closed?: boolean
    segmentArrows?: boolean
    /** Uniform arrow-head length in CSS px. */
    arrowSizePx?: number
    /** Per-segment arrow lengths in CSS px (overrides {@link arrowSizePx}). */
    segmentArrowSizesPx?: readonly number[]
  }
): void {
  if (points.length < 2) return
  const css = typeof color === 'string' ? color : applicationCssColor(color)
  const screen = points.map(p => view.worldToScreen(p))
  ctx.strokeStyle = css
  const strokeWidth = applicationScaledOverlayLineWidth(lineWidth, ctx.canvas, view)
  ctx.lineWidth = strokeWidth
  if (options?.dashed) ctx.setLineDash(applicationOverlayDash(strokeWidth, lineWidth))
  ctx.beginPath()
  ctx.moveTo(screen[0]!.x, screen[0]!.y)
  for (let i = 1; i < screen.length; i++) {
    ctx.lineTo(screen[i]!.x, screen[i]!.y)
  }
  if (options?.closed) ctx.closePath()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.stroke()
  if (options?.dashed) ctx.setLineDash([])
  if (options?.segmentArrows) {
    const fallback =
      options.arrowSizePx != null && options.arrowSizePx > 0
        ? options.arrowSizePx
        : applicationOverlayArrowSize(strokeWidth, lineWidth)
    for (let i = 0; i < screen.length - 1; i++) {
      const a = screen[i]!
      const b = screen[i + 1]!
      const sized = options.segmentArrowSizesPx?.[i]
      const size = sized != null && sized > 0 ? sized : fallback
      if (Math.hypot(b.x - a.x, b.y - a.y) >= size) {
        applicationDrawOverlayArrowHead(ctx, b, a, css, size)
        applicationDrawOverlayArrowHead(ctx, a, b, css, size)
      }
    }
  }
}
