import { GeometryMathUtil, GeometryPoint2d } from '@mlightcad/geometry-engine'

import { AcApAngleUnits } from './AcApAngleUnits'
import { AcApLinearUnits } from './AcApLinearUnits'
import {
  acapIsImperialUnits,
  acapIsMetricUnits,
  AcApUnitsValue
} from './AcApUnitsValue'

/**
 * Per-call options for {@link AcApFormatter} methods.
 *
 * These options layer on top of the drawing system variables held by the bound
 * the unit settings; they do not change those settings.
 */
/** The unit settings a {@link AcApFormatter} formats with. */
export interface AcApFormatterUnits {
  /** Linear unit format (LUNITS) */
  lunits: number
  /** Decimal places of lengths (LUPREC) */
  luprec: number
  /** Unit of drawing lengths (INSUNITS) */
  insunits: number
  /** Feet-inch and fraction delimiter style (UNITMODE) */
  unitmode: number
  /** 0 for imperial, 1 for metric (MEASUREMENT) */
  measurement: number
  /** Angle unit format (AUNITS) */
  aunits: number
  /** Decimal places of angles (AUPREC) */
  auprec: number
  /** Direction of angle 0 in radians (ANGBASE) */
  angbase: number
  /** 1 when angles increase clockwise (ANGDIR) */
  angdir: number
}

export interface AcApFormatterOptions {
  /**
   * Whether to append real-world unit suffixes to formatted values.
   *
   * When `true`:
   * - Decimal/scientific/fractional linear values may receive a suffix derived from
   *   **INSUNITS** (or **MEASUREMENT**
   *   when **INSUNITS** is unitless), for example `12.35 mm` or `10"`.
   * - Angles may receive `°`, `g`, `rad`, or inch marks in DMS/surveyor formats.
   * - Engineering and architectural lengths already embed `'` / `"` in the **LUNITS** pattern;
   *   this flag mainly adds the inch quote for those modes when appropriate.
   *
   * When `false` (default), only the numeric pattern dictated by **LUNITS** / **AUNITS** is
   * returned (for example `12.35`, `1'-3 1/2`, `45d30'15"`).
   */
  showUnits?: boolean
  /**
   * Whether to prefix the formatted value with `~ ` when display precision rounds the input.
   *
   * When `true`, values that are not exactly representable at the current **LUPREC** / **AUPREC**
   * (or fractional denominator for architectural modes) are returned as `~ ${formatted}` — for
   * example `~ 12.35` instead of `12.35` for `12.3456` with two decimal places.
   *
   * When `false` (default), no approximate prefix is added.
   */
  showApproximate?: boolean
  /**
   * Whether to apply **ANGBASE** and
   * **ANGDIR** before formatting an angle.
   *
   * When `true` (default), the input is treated as an absolute WCS angle (counterclockwise
   * from +X before adjustment), matching status-bar bearing-style display.
   *
   * When `false`, the input radians are formatted directly (after normalization to
   * \([0, 2\pi)\)), for included angles, relative rotations, rubber-band sweep angles,
   * and dynamic-input relative angle values.
   */
  applyAngbaseAngdir?: boolean
}

/** Radians per gradian (400 grads = full circle). */
const RAD_PER_GRAD = Math.PI / 200

/**
 * Formats linear distances, point coordinates, and angles for display in the UI,
 * matching AutoCAD drawing-unit behavior as closely as the supported system variables allow.
 *
 * On each call it reads the current unit settings from the function it was
 * created with (not a snapshot taken at construction).
 *
 * ### Linear distances and coordinates
 *
 * | Variable | Role |
 * |----------|------|
 * | **LUNITS** | Display format (scientific, decimal, engineering, …) |
 * | **LUPREC** | Precision (decimal places or fractional denominator) |
 * | **INSUNITS** | Unit suffix when {@link AcApFormatterOptions.showUnits} is `true` |
 * | **UNITMODE** | Report vs input delimiters for feet-inch and fractions |
 * | **MEASUREMENT** | Imperial vs metric suffix when **INSUNITS** is unitless |
 *
 * Engineering (**LUNITS** = 3) and architectural (**LUNITS** = 4) formats treat the numeric
 * value as **inches**, consistent with AutoCAD.
 *
 * ### Angles
 *
 * Input angles are **radians in WCS**. Before formatting, the value is adjusted by
 * **ANGBASE** and **ANGDIR**, then converted
 * per **AUNITS** and **AUPREC**.
 *
 * ### Out of scope
 *
 * Dimension entity text uses per-style **DIM\*** variables (for example **DIMLUNIT**, **DIMDEC**),
 * not this class. **SNAPANG** and UCS settings affect snapping/input, not WCS coordinate strings here.
 *
 * @example
 * ```typescript
 * // with lunits = AcApLinearUnits.Decimal and luprec = 2
 *
 * formatter.formatLength(12.3456); // "12.35"
 * formatter.formatLength(12.3456, { showUnits: true }); // "12.35 mm" (with INSUNITS = mm)
 * formatter.formatPoint2d(new GeometryPoint2d(1, 2)); // "1, 2"
 * formatter.formatAngle(Math.PI / 4, { showUnits: true }); // "45°"
 * ```
 */
export class AcApFormatter {
  /**
   * Creates a formatter that reads unit settings from a function.
   *
   * @param units - Returns the **LUNITS**, **AUNITS** and related settings,
   *   consulted on every format call.
   */
  constructor(private readonly units: () => AcApFormatterUnits) {}

  /**
   * Formats a single linear distance in **drawing units**.
   *
   * The output pattern follows **LUNITS** and
   * **LUPREC**. When {@link AcApFormatterOptions.showUnits} is `true`,
   * a suffix may be appended based on **INSUNITS** and
   * **MEASUREMENT**.
   *
   * | **LUNITS** | Typical output (no unit suffix) |
   * |-----------:|--------------------------------|
   * | `1` Scientific | `1.23E+02` |
   * | `2` Decimal | `12.35` |
   * | `3` Engineering | `1'-3.5` (value interpreted as inches) |
   * | `4` Architectural | `1'-3 1/2` |
   * | `5` Fractional | `15 1/2` |
   * | `6` Windows desktop | Same as decimal |
   *
   * **UNITMODE** changes delimiters for engineering, architectural,
   * and fractional modes (for example `1'3-1/2` when **UNITMODE** = 1).
   *
   * @param value - Distance in drawing units (WCS length, not pre-converted to feet or degrees).
   * @param options - Optional display flags; see {@link AcApFormatterOptions}.
   * @returns Formatted string suitable for status bars, measurement overlays, or tooltips.
   *
   * @remarks
   * Non-finite values (`NaN`, `±Infinity`) are formatted as `"0"`.
   *
   * @example
   * ```typescript
   * // with lunits = AcApLinearUnits.Architectural and luprec = 2
   * formatter.formatLength(15.5); // "1'-3 1/2"
   * ```
   */
  formatLength(value: number, options?: AcApFormatterOptions): string {
    const ctx = this.createContext(options)
    return formatLengthWithContext(value, ctx)
  }

  /**
   * Formats a 2D point as `"x, y"`, formatting each component with {@link formatLength}.
   *
   * Both coordinates use the same **LUNITS** / **LUPREC** rules and the
   * same {@link AcApFormatterOptions} for the call. The separator is a comma followed by a space
   * (`, `), which matches common Cartesian display in measurement UIs.
   *
   * @param point - Point in drawing units (WCS **x** / **y**).
   * @param options - Optional display flags applied to each coordinate.
   * @returns Formatted coordinate pair, for example `"1.2, 4.6"` or `"1'-0, 2'-6"` depending on **LUNITS**.
   *
   * @example
   * ```typescript
   * // with lunits = AcApLinearUnits.Decimal and luprec = 1
   * formatter.formatPoint2d(new GeometryPoint2d(1.23, 4.56)); // "1.2, 4.6"
   * ```
   */
  formatPoint2d(
    point: GeometryPoint2d,
    options?: AcApFormatterOptions
  ): string {
    const ctx = this.createContext(options)
    return `${formatLengthWithContext(point.x, ctx)}, ${formatLengthWithContext(point.y, ctx)}`
  }

  /**
   * Formats an angle given in **radians** (WCS), for display according to the drawing angle units.
   *
   * Processing order:
   * 1. Subtract **ANGBASE** (zero direction).
   * 2. Negate if **ANGDIR** = 1 (clockwise positive).
   * 3. Normalize to \([0, 2\pi)\) via {@link GeometryMathUtil.normalizeAngle}.
   * 4. Format using **AUNITS** and **AUPREC**.
   *
   * | **AUNITS** | Typical output (no unit suffix) |
   * |-----------:|--------------------------------|
   * | `0` Decimal degrees | `45` or `45.5` |
   * | `1` Degrees/minutes/seconds | `45d30'15"` |
   * | `2` Gradians | `50` |
   * | `3` Radians | `0.785` |
   * | `4` Surveyor's | `N 45d30'15" E` |
   *
   * @param radians - Angle in radians. When {@link AcApFormatterOptions.applyAngbaseAngdir} is
   *   `true` (default), this is an absolute WCS angle (counterclockwise from +X before
   *   **ANGBASE** / **ANGDIR** adjustment). When `false`, this is the scalar angle to display.
   * @param options - Optional display flags; when {@link AcApFormatterOptions.showUnits} is `true`,
   *   unit markers such as `°`, `g`, or `rad` may be appended.
   * @returns Formatted angle string.
   *
   * @remarks
   * For included or relative angles, pass {@link AcApFormatterOptions.applyAngbaseAngdir} = `false`.
   * For arc sweep or dimension overrides, supply the appropriate radians value and flags.
   *
   * @example
   * ```typescript
   * // with aunits = AcApAngleUnits.DecimalDegrees and auprec = 0
   * formatter.formatAngle(Math.PI / 4); // "45"
   * formatter.formatAngle(Math.PI / 4, { showUnits: true }); // "45°"
   * ```
   */
  formatAngle(radians: number, options?: AcApFormatterOptions): string {
    const ctx = this.createContext(options)
    const applyAngbaseAngdir = options?.applyAngbaseAngdir ?? true
    const displayRadians = applyAngbaseAngdir
      ? toDisplayAngleRadians(
          radians,
          this.units().angbase,
          this.units().angdir
        )
      : GeometryMathUtil.normalizeAngle(radians)
    return formatAngleWithContext(displayRadians, ctx)
  }

  /**
   * Builds the formatting context from the unit settings and call options.
   *
   * @param options - Per-call overrides; omitted fields use the unit settings.
   * @returns Snapshot of linear and angular unit settings for one format call.
   * @internal
   */
  private createContext(options?: AcApFormatterOptions): AcApFormatContext {
    return {
      lunits: this.units().lunits,
      luprec: clampPrecision(this.units().luprec),
      insunits: this.units().insunits as AcApUnitsValue,
      unitmode: this.units().unitmode,
      measurement: this.units().measurement,
      aunits: this.units().aunits,
      auprec: clampPrecision(this.units().auprec),
      showUnits: options?.showUnits ?? false,
      showApproximate: options?.showApproximate ?? false
    }
  }
}

/**
 * Snapshot of drawing unit settings used for one format operation.
 *
 * @internal
 */
interface AcApFormatContext {
  /** Current **LUNITS** value; see {@link AcApLinearUnits}. */
  lunits: number
  /** Clamped **LUPREC** precision for linear output. */
  luprec: number
  /** Current **INSUNITS** insertion/drawing units. */
  insunits: AcApUnitsValue
  /** Current **UNITMODE** delimiter style (`0` report, `1` input). */
  unitmode: number
  /** Current **MEASUREMENT** flag (`0` English, `1` metric). */
  measurement: number
  /** Current **AUNITS** value; see {@link AcApAngleUnits}. */
  aunits: number
  /** Clamped **AUPREC** precision for angular output. */
  auprec: number
  /** Whether to append unit suffixes for this call. */
  showUnits: boolean
  /** Whether to prefix `~ ` when the formatted value is rounded from the input. */
  showApproximate: boolean
}

/**
 * Delimiters and suffixes for engineering/architectural/feet-inch linear formats.
 *
 * @internal
 */
interface ImperialDelimiterStyle {
  /** Separator between feet and inches (for example `'-'` or empty). */
  feetInchSeparator: string
  /** Separator between whole inches and fractional part (space or `'-'`). */
  fractionSeparator: string
  /** Inch mark appended when {@link AcApFormatContext.showUnits} is `true`. */
  inchSuffix: string
}

/**
 * Formats one linear distance using a pre-built {@link AcApFormatContext}.
 *
 * @param value - Distance in drawing units.
 * @param ctx - Unit settings snapshot for this call.
 * @returns Formatted linear string.
 * @internal
 */
function formatLengthWithContext(
  value: number,
  ctx: AcApFormatContext
): string {
  let formatted: string
  switch (ctx.lunits) {
    case AcApLinearUnits.Scientific:
      formatted = appendLinearUnitSuffix(
        formatScientific(value, ctx.luprec),
        ctx
      )
      break
    case AcApLinearUnits.Engineering:
      formatted = formatEngineering(value, ctx)
      break
    case AcApLinearUnits.Architectural:
      formatted = formatArchitectural(value, ctx)
      break
    case AcApLinearUnits.Fractional:
      formatted = appendLinearUnitSuffix(
        formatFractionalLinear(value, ctx),
        ctx
      )
      break
    case AcApLinearUnits.WindowsDesktop:
    case AcApLinearUnits.Decimal:
    default:
      formatted = appendLinearUnitSuffix(formatDecimal(value, ctx.luprec), ctx)
  }
  return applyApproximatePrefix(
    formatted,
    isLinearValueApproximate(value, ctx),
    ctx
  )
}

/**
 * Formats one angle (already adjusted for **ANGBASE** / **ANGDIR**) using {@link AcApFormatContext}.
 *
 * @param radians - Display angle in radians, in range \([0, 2\pi)\).
 * @param ctx - Unit settings snapshot for this call.
 * @returns Formatted angle string.
 * @internal
 */
function formatAngleWithContext(
  radians: number,
  ctx: AcApFormatContext
): string {
  let formatted: string
  switch (ctx.aunits) {
    case AcApAngleUnits.DegreesMinutesSeconds:
      formatted = formatAngleDms(radians, ctx)
      break
    case AcApAngleUnits.Gradians:
      formatted = formatAngleGradians(radians, ctx)
      break
    case AcApAngleUnits.Radians:
      formatted = formatAngleRadians(radians, ctx)
      break
    case AcApAngleUnits.SurveyorsUnits:
      formatted = formatAngleSurveyor(radians, ctx)
      break
    case AcApAngleUnits.DecimalDegrees:
    default:
      formatted = formatAngleDecimalDegrees(radians, ctx)
  }
  return applyApproximatePrefix(
    formatted,
    isAngleValueApproximate(radians, ctx),
    ctx
  )
}

/**
 * Converts a WCS angle to the drawing's display angle before **AUNITS** formatting.
 *
 * @param radians - Raw angle in radians (WCS, counterclockwise from +X).
 * @param angbase - **ANGBASE** zero direction in radians.
 * @param angdir - **ANGDIR** (`0` = CCW positive, `1` = CW positive).
 * @returns Normalized display angle in radians.
 * @internal
 */
function toDisplayAngleRadians(
  radians: number,
  angbase: number,
  angdir: number
): number {
  let angle = radians - angbase
  if (angdir === 1) {
    angle = -angle
  }
  return GeometryMathUtil.normalizeAngle(angle)
}

/**
 * Resolves feet-inch delimiters from **UNITMODE** and {@link AcApFormatContext.showUnits}.
 *
 * @param ctx - Formatting context.
 * @returns Delimiter pattern for imperial linear modes.
 * @internal
 */
function imperialDelimiterStyle(
  ctx: AcApFormatContext
): ImperialDelimiterStyle {
  const inchSuffix = ctx.showUnits ? '"' : ''
  if (ctx.unitmode === 1) {
    return {
      feetInchSeparator: '',
      fractionSeparator: '-',
      inchSuffix
    }
  }
  return {
    feetInchSeparator: '-',
    fractionSeparator: ' ',
    inchSuffix
  }
}

/**
 * Rounds and clamps a precision value to a safe integer range.
 *
 * @param value - Raw precision (for example **LUPREC** or **AUPREC**).
 * @param min - Minimum allowed precision (default `0`).
 * @param max - Maximum allowed precision (default `8`).
 * @returns Clamped integer precision, or `min` when `value` is non-finite.
 * @internal
 */
function clampPrecision(value: number, min = 0, max = 8): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.round(value)))
}

/**
 * Maps negative zero to positive zero for consistent string output.
 *
 * @param value - Input number.
 * @returns `0` when `value` is `-0`, otherwise `value`.
 * @internal
 */
function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value
}

/**
 * Prefixes `~ ` when approximate display is enabled and the value was rounded.
 *
 * @param formatted - Fully formatted display string (including unit suffixes).
 * @param approximate - Whether the input differs from the quantized display value.
 * @param ctx - Formatting context.
 * @returns Original text, or `~ ${formatted}` when flagged approximate.
 * @internal
 */
function applyApproximatePrefix(
  formatted: string,
  approximate: boolean,
  ctx: AcApFormatContext
): string {
  if (!ctx.showApproximate || !approximate) return formatted
  return `~ ${formatted}`
}

/**
 * Returns whether a linear value differs from its **LUPREC**-quantized representation.
 *
 * @param value - Raw distance in drawing units.
 * @param ctx - Formatting context.
 * @internal
 */
function isLinearValueApproximate(
  value: number,
  ctx: AcApFormatContext
): boolean {
  if (!Number.isFinite(value)) return false
  const quantized = quantizeLinearValue(value, ctx)
  return differsAfterQuantization(value, quantized)
}

/**
 * Returns whether an angle differs from its **AUPREC**-quantized representation.
 *
 * @param radians - Display angle in radians (after **ANGBASE** / **ANGDIR**).
 * @param ctx - Formatting context.
 * @internal
 */
function isAngleValueApproximate(
  radians: number,
  ctx: AcApFormatContext
): boolean {
  if (!Number.isFinite(radians)) return false
  if (ctx.aunits === AcApAngleUnits.SurveyorsUnits) {
    return isSurveyorAngleApproximate(radians, ctx.auprec)
  }
  const quantized = quantizeAngleValue(radians, ctx)
  return differsAfterQuantization(radians, quantized)
}

/**
 * Returns whether the surveyor deflection angle would be rounded in DMS output.
 *
 * @internal
 */
function isSurveyorAngleApproximate(radians: number, auprec: number): boolean {
  const degrees = GeometryMathUtil.radToDeg(radians)
  const bearing = (((90 - degrees) % 360) + 360) % 360
  const quadrant = bearingToQuadrant(bearing)
  const deflection = Math.min(
    Math.abs(bearing - quadrant.base),
    Math.abs(quadrant.base + 90 - bearing)
  )
  const deflectionRadians = GeometryMathUtil.degToRad(deflection)
  const quantizedDeflection = quantizeAngleDmsRadians(deflectionRadians, auprec)
  return differsAfterQuantization(deflectionRadians, quantizedDeflection)
}

/**
 * Quantizes a linear value to the precision implied by **LUNITS** and **LUPREC**.
 *
 * @internal
 */
function quantizeLinearValue(value: number, ctx: AcApFormatContext): number {
  const normalized = normalizeZero(value)
  switch (ctx.lunits) {
    case AcApLinearUnits.Scientific:
      return quantizeScientific(normalized, ctx.luprec)
    case AcApLinearUnits.Engineering:
    case AcApLinearUnits.Architectural:
    case AcApLinearUnits.Fractional:
      return quantizeImperialInches(normalized, ctx)
    case AcApLinearUnits.WindowsDesktop:
    case AcApLinearUnits.Decimal:
    default:
      return quantizeDecimal(normalized, ctx.luprec)
  }
}

/**
 * Quantizes an angle to the precision implied by **AUNITS** and **AUPREC**.
 *
 * @internal
 */
function quantizeAngleValue(radians: number, ctx: AcApFormatContext): number {
  const normalized = normalizeZero(radians)
  switch (ctx.aunits) {
    case AcApAngleUnits.DegreesMinutesSeconds:
      return quantizeAngleDmsRadians(normalized, ctx.auprec)
    case AcApAngleUnits.Gradians:
      return (
        quantizeDecimal(normalized / RAD_PER_GRAD, ctx.auprec) * RAD_PER_GRAD
      )
    case AcApAngleUnits.Radians:
      return quantizeDecimal(normalized, ctx.auprec)
    case AcApAngleUnits.DecimalDegrees:
    default:
      return GeometryMathUtil.degToRad(
        quantizeDecimal(GeometryMathUtil.radToDeg(normalized), ctx.auprec)
      )
  }
}

/**
 * Rounds a number to a fixed number of decimal places.
 *
 * @internal
 */
function quantizeDecimal(value: number, precision: number): number {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** precision
  return Math.round(normalizeZero(value) * factor) / factor
}

/**
 * Rounds a value to the mantissa precision used by {@link formatScientific}.
 *
 * @internal
 */
function quantizeScientific(value: number, precision: number): number {
  if (!Number.isFinite(value)) return 0
  const normalized = normalizeZero(value)
  if (normalized === 0) return 0
  const formatted = normalized.toExponential(precision)
  return Number(formatted)
}

/**
 * Quantizes an inch-based length for engineering, architectural, or fractional **LUNITS**.
 *
 * @internal
 */
function quantizeImperialInches(
  inches: number,
  ctx: AcApFormatContext
): number {
  if (!Number.isFinite(inches)) return 0
  const sign = inches < 0 ? -1 : 1
  const absInches = Math.abs(inches)
  const feet = Math.floor(absInches / 12)
  const inchPart = absInches - feet * 12

  if (
    ctx.lunits === AcApLinearUnits.Architectural ||
    ctx.lunits === AcApLinearUnits.Fractional
  ) {
    const denominator = 1 << clampPrecision(ctx.luprec, 0, 8)
    const quantizedInches = quantizeFractionalInches(inchPart, denominator)
    return sign * (feet * 12 + quantizedInches)
  }

  return sign * (feet * 12 + quantizeDecimal(inchPart, ctx.luprec))
}

/**
 * Quantizes the inch component using the same rounding as {@link formatFractionalInches}.
 *
 * @internal
 */
function quantizeFractionalInches(inches: number, denominator: number): number {
  const whole = Math.floor(inches)
  const remainder = inches - whole
  const numerator = Math.round(remainder * denominator)
  if (numerator >= denominator) {
    return whole + 1
  }
  return whole + numerator / denominator
}

/**
 * Quantizes an angle in radians using DMS seconds precision (**AUPREC**).
 *
 * @internal
 */
function quantizeAngleDmsRadians(radians: number, auprec: number): number {
  const degrees = GeometryMathUtil.radToDeg(radians)
  const sign = degrees < 0 ? -1 : 1
  const absDegrees = Math.abs(degrees)
  const d = Math.floor(absDegrees)
  const minutesFloat = (absDegrees - d) * 60
  const m = Math.floor(minutesFloat)
  const seconds = quantizeDecimal((minutesFloat - m) * 60, auprec)
  const quantizedDegrees = d + m / 60 + seconds / 3600
  return GeometryMathUtil.degToRad(sign * quantizedDegrees)
}

/**
 * Returns whether quantization changed the numeric value (beyond float noise).
 *
 * @internal
 */
function differsAfterQuantization(
  original: number,
  quantized: number
): boolean {
  if (original === quantized) return false
  const scale = Math.max(Math.abs(original), Math.abs(quantized), 1)
  return Math.abs(original - quantized) > scale * Number.EPSILON * 8
}

/**
 * Formats a number in plain decimal form with trailing zeros trimmed.
 *
 * @param value - Numeric value to format.
 * @param precision - Number of decimal places (**LUPREC** / **AUPREC**).
 * @returns Decimal string, or `"0"` for non-finite input.
 * @internal
 */
function formatDecimal(value: number, precision: number): string {
  if (!Number.isFinite(value)) return '0'
  const normalized = normalizeZero(value)
  if (Number.isInteger(normalized) && precision === 0) {
    return String(normalized)
  }
  const fixed = normalized.toFixed(precision)
  const trimmed = fixed.replace(/\.?0+$/, '')
  if (trimmed === '' || trimmed === '-') return '0'
  return trimmed
}

/**
 * Formats a number in scientific notation (**LUNITS** = scientific).
 *
 * @param value - Numeric value to format.
 * @param precision - Mantissa decimal places.
 * @returns Uppercase exponent string (for example `1.23E+02`), or `"0"` for non-finite/zero input.
 * @internal
 */
function formatScientific(value: number, precision: number): string {
  if (!Number.isFinite(value)) return '0'
  const normalized = normalizeZero(value)
  if (normalized === 0) return '0'
  const match = normalized.toExponential(precision).match(/^(.+)e([+-])(\d+)$/i)
  if (!match) return '0'
  const [, mantissa, sign, exponentDigits] = match
  const paddedExponent =
    exponentDigits.length < 2 ? exponentDigits.padStart(2, '0') : exponentDigits
  return `${mantissa}E${sign}${paddedExponent}`.toUpperCase()
}

/**
 * Formats a length in engineering feet-and-decimal-inches (**LUNITS** = 3).
 *
 * @param inches - Length interpreted as inches.
 * @param ctx - Formatting context (**LUPREC**, **UNITMODE**, suffix flags).
 * @returns Engineering string (for example `1'-3.5`).
 * @internal
 */
function formatEngineering(inches: number, ctx: AcApFormatContext): string {
  if (!Number.isFinite(inches)) return '0'
  const style = imperialDelimiterStyle(ctx)
  const sign = inches < 0 ? '-' : ''
  const absInches = Math.abs(inches)
  const feet = Math.floor(absInches / 12)
  const inchPart = absInches - feet * 12
  const inchText = formatDecimal(inchPart, ctx.luprec)
  if (feet === 0) {
    return `${sign}${inchText}${style.inchSuffix}`
  }
  return `${sign}${feet}'${style.feetInchSeparator}${inchText}${style.inchSuffix}`
}

/**
 * Formats a length in architectural feet-and-fractional-inches (**LUNITS** = 4).
 *
 * @param inches - Length interpreted as inches.
 * @param ctx - Formatting context; **LUPREC** selects fractional denominator \(2^{LUPREC}\).
 * @returns Architectural string (for example `1'-3 1/2`).
 * @internal
 */
function formatArchitectural(inches: number, ctx: AcApFormatContext): string {
  if (!Number.isFinite(inches)) return '0'
  const style = imperialDelimiterStyle(ctx)
  const sign = inches < 0 ? '-' : ''
  const absInches = Math.abs(inches)
  const feet = Math.floor(absInches / 12)
  const inchPart = absInches - feet * 12
  const denominator = 1 << clampPrecision(ctx.luprec, 0, 8)
  const inchText = formatFractionalInches(
    inchPart,
    denominator,
    style.fractionSeparator
  )
  if (feet === 0) {
    return `${sign}${inchText}${style.inchSuffix}`
  }
  return `${sign}${feet}'${style.feetInchSeparator}${inchText}${style.inchSuffix}`
}

/**
 * Formats a length as a whole number plus fraction (**LUNITS** = fractional).
 *
 * @param inches - Length interpreted as inches.
 * @param ctx - Formatting context.
 * @returns Fractional string (for example `15 1/2`).
 * @internal
 */
function formatFractionalLinear(
  inches: number,
  ctx: AcApFormatContext
): string {
  if (!Number.isFinite(inches)) return '0'
  const style = imperialDelimiterStyle(ctx)
  const sign = inches < 0 ? '-' : ''
  const absInches = Math.abs(inches)
  const denominator = 1 << clampPrecision(ctx.luprec, 0, 8)
  return `${sign}${formatFractionalInches(absInches, denominator, style.fractionSeparator)}`
}

/**
 * Formats the inch component as a whole number and reduced fraction.
 *
 * @param inches - Inch value in \([0, 12)\) (caller supplies fractional part of feet-inch).
 * @param denominator - Fraction denominator (power of two from **LUPREC**).
 * @param fractionSeparator - Space or dash between whole inches and fraction.
 * @returns Inch-only fractional text (for example `3 1/2`).
 * @internal
 */
function formatFractionalInches(
  inches: number,
  denominator: number,
  fractionSeparator: string
): string {
  const whole = Math.floor(inches)
  const remainder = inches - whole
  let numerator = Math.round(remainder * denominator)

  if (numerator >= denominator) {
    return String(whole + 1)
  }
  if (numerator === 0) {
    return String(whole)
  }

  const divisor = gcd(numerator, denominator)
  numerator /= divisor
  const reducedDenominator = denominator / divisor
  const fraction = `${numerator}/${reducedDenominator}`
  if (whole === 0) {
    return fraction
  }
  return `${whole}${fractionSeparator}${fraction}`
}

/**
 * Formats an angle as decimal degrees (**AUNITS** = 0).
 *
 * @param radians - Display angle in radians.
 * @param ctx - Formatting context.
 * @returns Decimal degree string, optionally suffixed with `°`.
 * @internal
 */
function formatAngleDecimalDegrees(
  radians: number,
  ctx: AcApFormatContext
): string {
  const degrees = GeometryMathUtil.radToDeg(radians)
  return `${formatDecimal(degrees, ctx.auprec)}${ctx.showUnits ? '°' : ''}`
}

/**
 * Formats an angle as radians (**AUNITS** = 3).
 *
 * @param radians - Display angle in radians.
 * @param ctx - Formatting context.
 * @returns Radian string, optionally suffixed with ` rad`.
 * @internal
 */
function formatAngleRadians(radians: number, ctx: AcApFormatContext): string {
  return `${formatDecimal(radians, ctx.auprec)}${ctx.showUnits ? ' rad' : ''}`
}

/**
 * Formats an angle as gradians (**AUNITS** = 2).
 *
 * @param radians - Display angle in radians.
 * @param ctx - Formatting context.
 * @returns Gradian string, optionally suffixed with `g`.
 * @internal
 */
function formatAngleGradians(radians: number, ctx: AcApFormatContext): string {
  const grads = radians / RAD_PER_GRAD
  return `${formatDecimal(grads, ctx.auprec)}${ctx.showUnits ? 'g' : ''}`
}

/**
 * Formats an angle as degrees, minutes, and seconds (**AUNITS** = 1).
 *
 * @param radians - Display angle in radians.
 * @param ctx - Formatting context; **AUPREC** applies to the seconds field.
 * @returns DMS string (for example `45d30'15"`).
 * @internal
 */
function formatAngleDms(radians: number, ctx: AcApFormatContext): string {
  const degrees = GeometryMathUtil.radToDeg(radians)
  const sign = degrees < 0 ? '-' : ''
  const absDegrees = Math.abs(degrees)
  const d = Math.floor(absDegrees)
  const minutesFloat = (absDegrees - d) * 60
  const m = Math.floor(minutesFloat)
  const seconds = (minutesFloat - m) * 60
  const secondsText = formatDecimal(seconds, ctx.auprec)
  const secondSuffix = ctx.showUnits ? '"' : ''
  return `${sign}${d}d${m}'${secondsText}${secondSuffix}`
}

/**
 * Formats an angle in surveyor's bearing notation (**AUNITS** = 4).
 *
 * @param radians - Display angle in radians.
 * @param ctx - Formatting context; DMS portion uses {@link formatAngleDms}.
 * @returns Bearing string (for example `N 45d30'15" E`).
 * @internal
 */
function formatAngleSurveyor(radians: number, ctx: AcApFormatContext): string {
  const degrees = GeometryMathUtil.radToDeg(radians)
  const bearing = (((90 - degrees) % 360) + 360) % 360
  const quadrant = bearingToQuadrant(bearing)
  const deflection = Math.min(
    Math.abs(bearing - quadrant.base),
    Math.abs(quadrant.base + 90 - bearing)
  )
  const dms = formatAngleDms(GeometryMathUtil.degToRad(deflection), ctx)
  const dmsBody = dms.replace(/^-/, '')
  return `${quadrant.prefix} ${dmsBody} ${quadrant.suffix}`.trim()
}

/**
 * Maps a north-based bearing in degrees to a surveyor quadrant label and reference azimuth.
 *
 * @param bearing - Bearing from north, clockwise, in \([0, 360)\) degrees.
 * @returns Quadrant prefix/suffix (N/S + E/W) and the quadrant's base bearing in degrees.
 * @internal
 */
function bearingToQuadrant(bearing: number): {
  /** Cardinal prefix (`N` or `S`). */
  prefix: string
  /** Cardinal suffix (`E` or `W`). */
  suffix: string
  /** Base bearing of the quadrant in degrees (`0`, `90`, `180`, or `270`). */
  base: number
} {
  if (bearing < 90) {
    return { prefix: 'N', suffix: 'E', base: 0 }
  }
  if (bearing < 180) {
    return { prefix: 'S', suffix: 'E', base: 90 }
  }
  if (bearing < 270) {
    return { prefix: 'S', suffix: 'W', base: 180 }
  }
  return { prefix: 'N', suffix: 'W', base: 270 }
}

/**
 * Appends an **INSUNITS** / **MEASUREMENT** suffix to a linear string when enabled.
 *
 * Engineering and architectural strings are returned unchanged (units are already embedded).
 *
 * @param text - Formatted numeric linear text.
 * @param ctx - Formatting context.
 * @returns Text with optional suffix (for example `12.35 mm`).
 * @internal
 */
function appendLinearUnitSuffix(text: string, ctx: AcApFormatContext): string {
  if (!ctx.showUnits) return text
  if (
    ctx.lunits === AcApLinearUnits.Engineering ||
    ctx.lunits === AcApLinearUnits.Architectural
  ) {
    return text
  }
  const suffix = linearUnitSuffix(ctx.insunits, ctx.measurement)
  return suffix ? `${text}${suffix}` : text
}

/**
 * Resolves the suffix for decimal/scientific/fractional linear output.
 *
 * @param insunits - **INSUNITS** value.
 * @param measurement - **MEASUREMENT** flag when **INSUNITS** is unitless.
 * @returns Suffix string, or empty when unknown or suffix not applicable.
 * @internal
 */
function linearUnitSuffix(
  insunits: AcApUnitsValue,
  measurement: number
): string {
  if (insunits === AcApUnitsValue.Undefined) {
    return measurement === 0 ? '"' : ' mm'
  }
  if (acapIsMetricUnits(insunits)) {
    return metricUnitSuffix(insunits)
  }
  if (acapIsImperialUnits(insunits)) {
    return imperialUnitSuffix(insunits)
  }
  return ''
}

/**
 * Returns the display suffix for a metric {@link AcApUnitsValue}.
 *
 * @param insunits - Metric insertion unit code.
 * @returns Suffix such as ` mm`, or empty for unsupported codes.
 * @internal
 */
function metricUnitSuffix(insunits: AcApUnitsValue): string {
  switch (insunits) {
    case AcApUnitsValue.Millimeters:
      return ' mm'
    case AcApUnitsValue.Centimeters:
      return ' cm'
    case AcApUnitsValue.Meters:
      return ' m'
    case AcApUnitsValue.Kilometers:
      return ' km'
    case AcApUnitsValue.Decimeters:
      return ' dm'
    case AcApUnitsValue.Microns:
      return ' µm'
    case AcApUnitsValue.Nanometers:
      return ' nm'
    default:
      return ''
  }
}

/**
 * Returns the display suffix for an imperial {@link AcApUnitsValue}.
 *
 * @param insunits - Imperial insertion unit code.
 * @returns Suffix such as `"` or ` mi`, or empty for unsupported codes.
 * @internal
 */
function imperialUnitSuffix(insunits: AcApUnitsValue): string {
  switch (insunits) {
    case AcApUnitsValue.Inches:
    case AcApUnitsValue.Microinches:
    case AcApUnitsValue.Mils:
    case AcApUnitsValue.USSurveyInch:
      return '"'
    case AcApUnitsValue.Feet:
    case AcApUnitsValue.USSurveyFeet:
      return '\''
    case AcApUnitsValue.Miles:
    case AcApUnitsValue.USSurveyMile:
      return ' mi'
    case AcApUnitsValue.Yards:
    case AcApUnitsValue.USSurveyYard:
      return ' yd'
    default:
      return ''
  }
}

/**
 * Greatest common divisor of two integers (Euclidean algorithm).
 *
 * @param a - First integer.
 * @param b - Second integer.
 * @returns GCD of `|a|` and `|b|`, minimum `1`.
 * @internal
 */
function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const temp = y
    y = x % y
    x = temp
  }
  return x || 1
}
