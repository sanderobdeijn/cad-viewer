import { CommonColor, CommonColorMethod } from '@mlightcad/common'
import { GraphicsInterfaceLineWeight } from '@mlightcad/graphic-interface'

import { commonColorToCssHex, parseCssToAcCmColor } from './ApplicationCssColor'

/**
 * Overlay line weight meaning "no CAD lineweight" (hairline).
 *
 * Drawn as 1 CSS pixel and not scaled with zoom.
 */
export const OVERLAY_HAIRLINE_LINE_WEIGHT = 0 as GraphicsInterfaceLineWeight

/** Factory default CAD line weight for measurement geometry. */
export const MEASUREMENT_LINE_WEIGHT = OVERLAY_HAIRLINE_LINE_WEIGHT

/** Factory default screen font size (CSS px) for measurement badges. */
export const MEASUREMENT_FONT_SIZE = 13

/** Visual style stored on a committed measurement group. */
export interface ApplicationMeasurementStyle {
  color: CommonColor
  lineWeight: GraphicsInterfaceLineWeight
  fontSize: number
  /** World-space text height, once one has been baked in. */
  textHeightWcs?: number
}

/** Colour of measurement overlays as `0xRRGGBB`. */
const MEASUREMENT_COLOR = 0x60a5fa

/** Returns the colour of measurement overlays. */
export function applicationGetMeasurementColor(): CommonColor {
  const color = new CommonColor(CommonColorMethod.ByColor)
  color.setRGBValue(MEASUREMENT_COLOR)
  return color
}

/** Font size (CSS px) of measurement badges. */
export function applicationGetMeasurementFontSize(): number {
  return MEASUREMENT_FONT_SIZE
}

/** Returns the style of newly drawn measurements. */
export function applicationGetCurrentMeasurementStyle(): ApplicationMeasurementStyle {
  return {
    color: applicationGetMeasurementColor(),
    lineWeight: MEASUREMENT_LINE_WEIGHT,
    fontSize: MEASUREMENT_FONT_SIZE
  }
}

/** Clone a measurement style (color is cloned). */
export function applicationCloneMeasurementStyle(
  style: ApplicationMeasurementStyle
): ApplicationMeasurementStyle {
  return {
    color: style.color.clone(),
    lineWeight: style.lineWeight,
    fontSize: style.fontSize,
    textHeightWcs: style.textHeightWcs
  }
}

/**
 * Map a CAD line weight to a canvas stroke width in CSS pixels.
 *
 * Hairline ({@link OVERLAY_HAIRLINE_LINE_WEIGHT}) returns `0` so overlay
 * painters can keep a 1px screen stroke that does not scale with zoom.
 * {@link GraphicsInterfaceLineWeight.LineWeight070} (70) ≈ 2.5px.
 */
export function applicationMeasurementCanvasLineWidth(weight: GraphicsInterfaceLineWeight): number {
  const n = Number(weight)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.max(1, n / 28)
}

/** Converts an CommonColor to a CSS rgba() string. */
export function applicationColorToCssAlpha(c: CommonColor, alpha: number): string {
  return `rgba(${c.red}, ${c.green}, ${c.blue}, ${alpha})`
}

/** Converts an CommonColor to a CSS hex color string for overlays. */
export function applicationCssColor(c: CommonColor): string {
  return commonColorToCssHex(c)
}

/** Parse a CSS color string back into CommonColor (best-effort). */
export function applicationCssToMeasurementColor(css: string): CommonColor {
  return parseCssToAcCmColor(css, [123, 135, 148])
}
