import { CommonColor, CommonColorUtil } from '@mlightcad/common'
/**
 * If an RGB color matches the AutoCAD palette exactly, restore ByACI so
 * ribbon color dropdowns can show named colors (Red, Yellow, …) instead of
 * Custom after a CSS round-trip.
 */
export function preferExactAciColor(color: CommonColor): CommonColor {
  if (!color.isByColor) return color
  const rgb = color.RGB
  if (rgb == null) return color
  const index = CommonColorUtil.getIndexByColor(rgb)
  if (index == null) return color
  const aci = new CommonColor()
  aci.colorIndex = index
  return aci
}

/**
 * CSS hex / functional notations that {@link CommonColor.fromString} does not
 * accept. Passing them to `fromString` logs "Unknown color name" (hex like
 * `#d51572` is looked up as a named color).
 */
function shouldSkipFromString(css: string): boolean {
  const s = css.trim()
  return s.startsWith('#') || /^(rgb|rgba|hsl|hsla)\(/i.test(s)
}

/**
 * Parse a CSS color string into {@link CommonColor}.
 *
 * Prefer {@link CommonColor.setRGBFromCss} for `#hex` / `rgb()` / `hsl()`;
 * {@link CommonColor.fromString} only understands named / ACI-style / `RGB:r,g,b`
 * values and logs "Unknown color name" for CSS hex and functional colors.
 */
export function parseCssToAcCmColor(
  css: string,
  fallbackRgb: [number, number, number] = [123, 135, 148]
): CommonColor {
  const trimmed = css.trim()
  if (!trimmed) {
    const empty = new CommonColor()
    empty.setRGB(fallbackRgb[0], fallbackRgb[1], fallbackRgb[2])
    return empty
  }

  if (!shouldSkipFromString(trimmed)) {
    try {
      const fromString = CommonColor.fromString(trimmed)
      if (fromString) return preferExactAciColor(fromString)
    } catch {
      // Fall through to setRGBFromCss.
    }
  }

  try {
    return preferExactAciColor(new CommonColor().setRGBFromCss(trimmed))
  } catch {
    const fallback = new CommonColor()
    fallback.setRGB(fallbackRgb[0], fallbackRgb[1], fallbackRgb[2])
    return fallback
  }
}

/** Stable `#rrggbb` for sidecar JSON (avoids `rgb()` round-trip issues). */
export function commonColorToCssHex(color: CommonColor): string {
  const byte = (n: number | undefined) =>
    Math.max(0, Math.min(255, Math.round(n ?? 0)))
      .toString(16)
      .padStart(2, '0')
  return `#${byte(color.red)}${byte(color.green)}${byte(color.blue)}`
}
