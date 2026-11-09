/**
 * Fit-to-screen measure badges must not swallow the segment they label.
 * Capsule width is limited to a fraction of the segment's screen length.
 *
 * Capsule padding and border are authored in `em` (see {@link ThreeRendererHtmlBadge}),
 * so horizontal chrome scales with font size.
 */

/** Reference font size matching {@link ThreeRendererHtmlBadge} authoring. */
export const APPLICATION_MEASURE_BADGE_REF_FONT_PX = 13

/** Horizontal padding at {@link APPLICATION_MEASURE_BADGE_REF_FONT_PX} (each side). */
export const APPLICATION_MEASURE_BADGE_PAD_X_PX = 14

/** Border width at {@link APPLICATION_MEASURE_BADGE_REF_FONT_PX} (each side). */
export const APPLICATION_MEASURE_BADGE_BORDER_PX = 1

/** Max fraction of the measured segment a mid-line badge may occupy. */
export const APPLICATION_MEASURE_BADGE_MAX_LINE_FRACTION = 0.5

/**
 * Angle badge reference uses this fraction of the shorter arm (screen),
 * matching the dimension-arc radius so the capsule stays near the wedge.
 */
export const APPLICATION_MEASURE_ANGLE_BADGE_REF_ARM_FRACTION = 0.5

let measureCtx: CanvasRenderingContext2D | null | undefined

function textMeasureContext(): CanvasRenderingContext2D | null {
  if (measureCtx !== undefined) return measureCtx
  if (typeof document === 'undefined') {
    measureCtx = null
    return null
  }
  try {
    measureCtx = document.createElement('canvas').getContext('2d')
  } catch {
    measureCtx = null
  }
  return measureCtx
}

export type ApplicationMeasureBadgeFontOptions = {
  /**
   * Horizontal padding in `em` (default
   * {@link APPLICATION_MEASURE_BADGE_PAD_X_PX} / {@link APPLICATION_MEASURE_BADGE_REF_FONT_PX}).
   */
  padXEm?: number
  /**
   * Border width each side in `em` (default
   * {@link APPLICATION_MEASURE_BADGE_BORDER_PX} / {@link APPLICATION_MEASURE_BADGE_REF_FONT_PX}).
   */
  borderEm?: number
  fontWeight?: string
  fontFamily?: string
  /** Max badge width as a fraction of segment length (default 0.5). */
  maxLineFraction?: number
}

function padXEm(options?: ApplicationMeasureBadgeFontOptions): number {
  return (
    options?.padXEm ??
    APPLICATION_MEASURE_BADGE_PAD_X_PX / APPLICATION_MEASURE_BADGE_REF_FONT_PX
  )
}

function borderEm(options?: ApplicationMeasureBadgeFontOptions): number {
  const b =
    options?.borderEm ??
    APPLICATION_MEASURE_BADGE_BORDER_PX / APPLICATION_MEASURE_BADGE_REF_FONT_PX
  return b > 0 ? b : 0
}

/** Horizontal capsule chrome (pad + border) at a given font size. */
export function applicationMeasureBadgeChromePx(
  fontSizePx: number,
  options?: ApplicationMeasureBadgeFontOptions
): number {
  if (!(fontSizePx > 0)) return 0
  return 2 * (padXEm(options) + borderEm(options)) * fontSizePx
}

/** Estimates the rendered width of a measure value capsule at `fontSizePx`. */
export function applicationEstimateMeasureBadgeWidthPx(
  text: string,
  fontSizePx: number,
  options?: ApplicationMeasureBadgeFontOptions
): number {
  const chrome = applicationMeasureBadgeChromePx(fontSizePx, options)
  if (!(fontSizePx > 0)) return chrome
  const ctx = textMeasureContext()
  if (!ctx) {
    // Headless / no canvas: rough CJK-aware fallback (~0.6em average).
    return text.length * fontSizePx * 0.6 + chrome
  }
  const weight = options?.fontWeight ?? '500'
  const family = options?.fontFamily ?? 'sans-serif'
  ctx.font = `${weight} ${fontSizePx}px ${family}`
  return ctx.measureText(text).width + chrome
}

/**
 * Returns `preferredFontSizePx`, or a smaller size so the capsule width is at
 * most {@link APPLICATION_MEASURE_BADGE_MAX_LINE_FRACTION} of `lineLengthScreenPx`.
 *
 * Assumes em-based horizontal padding and border so chrome shrinks with the font.
 */
export function applicationClampMeasureBadgeFontSize(
  text: string,
  preferredFontSizePx: number,
  lineLengthScreenPx: number,
  options?: ApplicationMeasureBadgeFontOptions
): number {
  if (!(preferredFontSizePx > 0) || !(lineLengthScreenPx > 0)) {
    return preferredFontSizePx
  }
  const fraction =
    options?.maxLineFraction ?? APPLICATION_MEASURE_BADGE_MAX_LINE_FRACTION
  const maxWidth = lineLengthScreenPx * fraction
  const preferredWidth = applicationEstimateMeasureBadgeWidthPx(
    text,
    preferredFontSizePx,
    options
  )
  if (preferredWidth <= maxWidth) return preferredFontSizePx
  if (!(maxWidth > 0)) return 1

  const textWidth = Math.max(
    0,
    preferredWidth - applicationMeasureBadgeChromePx(preferredFontSizePx, options)
  )
  const kText = textWidth / preferredFontSizePx
  const kChrome = 2 * (padXEm(options) + borderEm(options))
  const denom = kText + kChrome
  if (!(denom > 0)) return preferredFontSizePx
  return Math.max(1, maxWidth / denom)
}

/**
 * Clamp badge font so the capsule stays within half the segment.
 */
export function applicationAdaptiveMeasureBadgeFontSize(
  text: string,
  style: { fontSize: number },
  lineLengthScreenPx: number,
  options?: ApplicationMeasureBadgeFontOptions
): number {
  return applicationClampMeasureBadgeFontSize(
    text,
    style.fontSize,
    lineLengthScreenPx,
    options
  )
}

/** Screen-space length of a world-space segment. */
export function applicationScreenSegmentLengthPx(
  worldToScreen: (p: { x: number; y: number }) => { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const sa = worldToScreen(a)
  const sb = worldToScreen(b)
  return Math.hypot(sb.x - sa.x, sb.y - sa.y)
}

/**
 * Scales a Fit-to-screen overlay length (arrow head, etc.) with the badge font
 * clamp so endpoint arrows shrink when the capsule is forced smaller.
 */
export function applicationScaleMeasureOverlayPx(
  preferredPx: number,
  preferredFontSizePx: number,
  clampedFontSizePx: number
): number {
  if (!(preferredPx > 0) || !(preferredFontSizePx > 0)) return preferredPx
  if (!(clampedFontSizePx > 0) || clampedFontSizePx >= preferredFontSizePx) {
    return preferredPx
  }
  return Math.max(1, preferredPx * (clampedFontSizePx / preferredFontSizePx))
}

type Point2 = { x: number; y: number }
type WorldToScreen = (p: Point2) => Point2

/** Screen length of the angle dimension arc radius (shorter arm × fraction). */
export function applicationScreenAngleBadgeRefLengthPx(
  worldToScreen: WorldToScreen,
  vertex: Point2,
  arm1: Point2,
  arm2: Point2
): number {
  return (
    Math.min(
      applicationScreenSegmentLengthPx(worldToScreen, vertex, arm1),
      applicationScreenSegmentLengthPx(worldToScreen, vertex, arm2)
    ) * APPLICATION_MEASURE_ANGLE_BADGE_REF_ARM_FRACTION
  )
}

/**
 * Screen length of a measured arc, via uniform scale `screenR / radiusWcs`.
 */
export function applicationScreenArcLengthPx(
  worldToScreen: WorldToScreen,
  center: Point2,
  radiusWcs: number,
  arcLengthWcs: number
): number {
  if (!(radiusWcs > 0) || !(arcLengthWcs > 0)) return 0
  const a = worldToScreen(center)
  const b = worldToScreen({ x: center.x + radiusWcs, y: center.y })
  const screenR = Math.hypot(b.x - a.x, b.y - a.y)
  return (screenR / radiusWcs) * arcLengthWcs
}

/** Distance from point `p` to segment `a`→`b` in the same coordinate space. */
function distPointToSegment2d(p: Point2, a: Point2, b: Point2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (!(len2 > 0)) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/**
 * Reference screen length for an area badge at the vertex centroid.
 *
 * Uses the shorter of: minimum polygon edge, and twice the screen distance
 * from the centroid to the nearest edge (local “width” around the label).
 */
export function applicationScreenAreaBadgeRefLengthPx(
  worldToScreen: WorldToScreen,
  points: readonly Point2[]
): number {
  const n = points.length
  if (n < 3) return 0
  let minEdge = Infinity
  for (let i = 0; i < n; i++) {
    const a = points[i]!
    const b = points[(i + 1) % n]!
    minEdge = Math.min(minEdge, applicationScreenSegmentLengthPx(worldToScreen, a, b))
  }
  let cx = 0
  let cy = 0
  for (const p of points) {
    cx += p.x
    cy += p.y
  }
  cx /= n
  cy /= n
  const sc = worldToScreen({ x: cx, y: cy })
  let minToEdge = Infinity
  for (let i = 0; i < n; i++) {
    const a = worldToScreen(points[i]!)
    const b = worldToScreen(points[(i + 1) % n]!)
    minToEdge = Math.min(minToEdge, distPointToSegment2d(sc, a, b))
  }
  return Math.min(minEdge, 2 * minToEdge)
}
