import { CommonColor, CommonColorMethod } from '@mlightcad/common'
import { GraphicsInterfaceLineWeight } from '@mlightcad/graphic-interface'

import { ApplicationSettingManager } from '../app/ApplicationSettingManager'
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

/** Authoring mode for measurement text height. */
export type ApplicationTextHeightMode = 'adaptive' | 'custom'

/** Session draw color for newly created measurements (undefined = use sysvar). */
let measurementDrawColor: CommonColor | undefined

/** Session draw font size for newly created measurement badges. */
let measurementDrawFontSize = MEASUREMENT_FONT_SIZE

/** Session text-height authoring mode. */
let measurementTextHeightMode: ApplicationTextHeightMode = 'adaptive'

/** Session custom WCS text height when mode is `'custom'`. */
let measurementCustomTextHeightWcs: number | undefined

/** Visual style stored on a committed measurement group. */
export interface ApplicationMeasurementStyle {
  color: CommonColor
  lineWeight: GraphicsInterfaceLineWeight
  fontSize: number
  /** Authoring mode; omitted means adaptive (legacy). */
  textHeightMode?: ApplicationTextHeightMode
  /** World-space text height when {@link textHeightMode} is `'custom'`. */
  textHeightWcs?: number
}

/** Returns the current measurement overlay color (session override or the measurement colour setting). */
export function applicationGetMeasurementColor(): CommonColor {
  if (measurementDrawColor) return measurementDrawColor.clone()
  const color = new CommonColor(CommonColorMethod.ByColor)
  color.setRGBValue(ApplicationSettingManager.instance.get('measurementColor'))
  return color
}

/** Current font size (CSS px) used when drawing measurement badges. */
export function applicationGetMeasurementFontSize(): number {
  return measurementDrawFontSize
}

/** Update the session measurement draw color (affects current/future measurements). */
export function applicationSetMeasurementDrawColor(color: CommonColor): void {
  measurementDrawColor = color.clone()
}

/** Update the session measurement draw font size (CSS px). */
export function applicationSetMeasurementDrawFontSize(size: number): void {
  if (!Number.isFinite(size) || size <= 0) return
  measurementDrawFontSize = size
  measurementTextHeightMode = 'adaptive'
  measurementCustomTextHeightWcs = undefined
}

/** Current measurement text-height authoring mode. */
export function applicationGetMeasurementTextHeightMode(): ApplicationTextHeightMode {
  return measurementTextHeightMode
}

/** Custom WCS text height for the measurement draw session, if any. */
export function applicationGetMeasurementCustomTextHeightWcs(): number | undefined {
  return measurementCustomTextHeightWcs
}

/**
 * Sets adaptive (screen) or custom (WCS) text height for new measurements.
 *
 * @param mode - Authoring mode.
 * @param value - Font size px when adaptive; WCS height when custom.
 */
export function applicationSetMeasurementTextHeight(
  mode: ApplicationTextHeightMode,
  value: number
): void {
  if (!Number.isFinite(value) || value <= 0) return
  measurementTextHeightMode = mode
  if (mode === 'adaptive') {
    measurementDrawFontSize = value
    measurementCustomTextHeightWcs = undefined
    return
  }
  measurementCustomTextHeightWcs = value
}

/** Restore factory session measurement draw style (tests / document reset). */
export function applicationResetMeasurementDrawStyle(): void {
  measurementDrawColor = undefined
  measurementDrawFontSize = MEASUREMENT_FONT_SIZE
  measurementTextHeightMode = 'adaptive'
  measurementCustomTextHeightWcs = undefined
}

/** Build a style object from the current measurement draw color / font size. */
export function applicationGetCurrentMeasurementStyle(): ApplicationMeasurementStyle {
  return {
    color: applicationGetMeasurementColor(),
    lineWeight: MEASUREMENT_LINE_WEIGHT,
    fontSize: applicationGetMeasurementFontSize(),
    textHeightMode: measurementTextHeightMode,
    ...(measurementTextHeightMode === 'custom' &&
    measurementCustomTextHeightWcs != null &&
    measurementCustomTextHeightWcs > 0
      ? { textHeightWcs: measurementCustomTextHeightWcs }
      : {})
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
    textHeightMode: style.textHeightMode,
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

/** Converts an CommonColor to a CSS hex color string for overlays / sidecars. */
export function applicationCssColor(c: CommonColor): string {
  return commonColorToCssHex(c)
}

/** Parse a CSS color string back into CommonColor (best-effort). */
export function applicationCssToMeasurementColor(css: string): CommonColor {
  return parseCssToAcCmColor(css, [123, 135, 148])
}
