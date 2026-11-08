/**
 * HTML-only live preview stroke for measure jigs.
 *
 * Uses {@link AcTrHtmlCanvasOverlay} on a live layer; never adds AcDb entities.
 * Updates set {@link AcTrView2d.isHtmlDirty} only (not {@link AcTrView2d.isDirty}),
 * so jig rubber-bands no longer force a WebGL redraw.
 */

import type { AcCmColor } from '@mlightcad/common'
import { AcTrHtmlCanvasOverlay } from '@mlightcad/three-renderer'

import { acapCssColor } from '../../util'
import type { AcTrView2d } from '../../view'
import {
  acapDrawOverlayArrowHead,
  acapFitOverlayCanvas,
  acapFitOverlayCanvasToView,
  acapOverlayArrowSize,
  acapOverlayDash,
  acapScaledOverlayLineWidth
} from './AcApOverlayDrawUtil'

/** World-space 2D point for live preview strokes. */
export interface AcApHtmlLivePoint {
  /** World X. */
  x: number
  /** World Y. */
  y: number
}

/**
 * Drawable content for one live-preview frame.
 */
export type AcApHtmlLiveDrawFn = (
  ctx: CanvasRenderingContext2D,
  view: AcTrView2d
) => void

/**
 * Full-viewport HTML canvas used as a jig rubber-band / shape preview.
 */
export class AcApHtmlLivePreview {
  /** Host view. */
  private readonly view: AcTrView2d
  /** Screen-space canvas overlay on the live layer. */
  private readonly overlay: AcTrHtmlCanvasOverlay
  /** Current frame drawer; `null` clears the canvas. */
  private drawFn: AcApHtmlLiveDrawFn | null = null
  /** Bound viewChanged listener. */
  private readonly onViewChanged = () => this.acapPaint()
  /**
   * When true, the overlay is sized to the WebGL canvas and offset with
   * {@link AcTrView2d.canvasToContainer} so `worldToScreen` strokes align
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
    view: AcTrView2d,
    id: string,
    layer: string,
    options?: { alignToViewCanvas?: boolean }
  ) {
    this.view = view
    this.alignToViewCanvas = options?.alignToViewCanvas === true
    this.overlay = new AcTrHtmlCanvasOverlay({
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
   * Marks {@link AcTrView2d.isHtmlDirty} so CSS2D siblings (badges / dots)
   * updated in the same jig tick are reprojected. Canvas strokes themselves
   * are painted synchronously and do not need a WebGL pass.
   *
   * @param drawFn - Frame drawer, or `null` to clear.
   */
  acapSetDraw(drawFn: AcApHtmlLiveDrawFn | null): void {
    this.drawFn = drawFn
    this.acapPaint()
    this.view.isHtmlDirty = true
  }

  /** Clear the canvas without disposing the overlay. */
  acapClear(): void {
    this.acapSetDraw(null)
  }

  /**
   * Remove overlay and viewChanged listener.
   *
   * Sets {@link AcTrView2d.isHtmlDirty} so CSS2D can drop related live badges.
   */
  acapDispose(): void {
    this.view.events.viewChanged.removeEventListener(this.onViewChanged)
    this.view.htmlTransientManager.remove(this.overlay.id)
    this.view.isHtmlDirty = true
  }

  /** Paint the current frame onto the overlay canvas. */
  private acapPaint(): void {
    const ctx = this.alignToViewCanvas
      ? acapFitOverlayCanvasToView(this.overlay.canvas, this.view)
      : acapFitOverlayCanvas(this.overlay.canvas, this.view.container)
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
 * @param color - CSS or AcCmColor stroke color.
 * @param lineWidth - Stroke width in CSS pixels.
 * @param options - Optional dash pattern and arrow head (`true` at `b`,
 *   `'both'` at both endpoints).
 */
export function acapStrokeLiveSegment(
  ctx: CanvasRenderingContext2D,
  view: AcTrView2d,
  a: AcApHtmlLivePoint,
  b: AcApHtmlLivePoint,
  color: string | AcCmColor,
  lineWidth: number,
  options?: {
    dashed?: boolean
    arrow?: boolean | 'both'
    /** Override arrow-head length in CSS px (default tracks stroke width). */
    arrowSizePx?: number
  }
): void {
  const css = typeof color === 'string' ? color : acapCssColor(color)
  const sa = view.worldToScreen(a)
  const sb = view.worldToScreen(b)
  ctx.strokeStyle = css
  const strokeWidth = acapScaledOverlayLineWidth(lineWidth, ctx.canvas, view)
  ctx.lineWidth = strokeWidth
  if (options?.dashed) ctx.setLineDash(acapOverlayDash(strokeWidth, lineWidth))
  ctx.beginPath()
  ctx.moveTo(sa.x, sa.y)
  ctx.lineTo(sb.x, sb.y)
  ctx.stroke()
  if (options?.dashed) ctx.setLineDash([])
  if (options?.arrow) {
    const size =
      options.arrowSizePx != null && options.arrowSizePx > 0
        ? options.arrowSizePx
        : acapOverlayArrowSize(strokeWidth, lineWidth)
    if (options.arrow === 'both') {
      if (Math.hypot(sb.x - sa.x, sb.y - sa.y) >= size) {
        acapDrawOverlayArrowHead(ctx, sb, sa, css, size)
        acapDrawOverlayArrowHead(ctx, sa, sb, css, size)
      }
    } else {
      acapDrawOverlayArrowHead(ctx, sa, sb, css, size)
    }
  }
}

/**
 * Stroke a world-space closed polyline (screen projection).
 *
 * @param ctx - Canvas context in CSS pixels.
 * @param view - View for world → screen.
 * @param points - World vertices in order.
 * @param color - CSS or AcCmColor stroke color.
 * @param lineWidth - Stroke width in CSS pixels.
 * @param options - Optional dash / closePath / per-segment arrows.
 */
export function acapStrokeLivePolyline(
  ctx: CanvasRenderingContext2D,
  view: AcTrView2d,
  points: AcApHtmlLivePoint[],
  color: string | AcCmColor,
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
  const css = typeof color === 'string' ? color : acapCssColor(color)
  const screen = points.map(p => view.worldToScreen(p))
  ctx.strokeStyle = css
  const strokeWidth = acapScaledOverlayLineWidth(lineWidth, ctx.canvas, view)
  ctx.lineWidth = strokeWidth
  if (options?.dashed) ctx.setLineDash(acapOverlayDash(strokeWidth, lineWidth))
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
        : acapOverlayArrowSize(strokeWidth, lineWidth)
    for (let i = 0; i < screen.length - 1; i++) {
      const a = screen[i]!
      const b = screen[i + 1]!
      const sized = options.segmentArrowSizesPx?.[i]
      const size = sized != null && sized > 0 ? sized : fallback
      if (Math.hypot(b.x - a.x, b.y - a.y) >= size) {
        acapDrawOverlayArrowHead(ctx, b, a, css, size)
        acapDrawOverlayArrowHead(ctx, a, b, css, size)
      }
    }
  }
}
