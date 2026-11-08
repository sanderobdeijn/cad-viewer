import { AcApSettingManager } from '../app/AcApSettingManager'
import {
  AcApAngleUnits,
  AcApFormatter,
  type AcApFormatterOptions,
  acapIsImperialUnits,
  AcApLinearUnits
} from './units'

/** Linear/angular unit settings used when formatting measurement labels. */
export interface AcApMeasurementUnits {
  /** Linear display format (LUNITS). */
  lunits: number
  /** Linear display precision (LUPREC). */
  luprec: number
  /** Angular display format (AUNITS). */
  aunits: number
  /** Angular display precision (AUPREC). */
  auprec: number
  /** Length display unit (INSUNITS code) or {@link MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING}. */
  lengthUnit: number
}

/** Sentinel length unit meaning "follow the drawing units" (no conversion). */
export const MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING = -1

/** AutoCAD INSUNITS code → scale factor expressed in millimeters. */
const ACAD_UNIT_TO_MM: Readonly<Record<number, number>> = {
  0: 1,
  1: 25.4,
  2: 304.8,
  3: 1609344,
  4: 1,
  5: 10,
  6: 1000,
  7: 1000000,
  8: 0.0000254,
  9: 0.0254,
  10: 914.4,
  11: 0.0000001,
  12: 0.000001,
  13: 0.001,
  14: 100,
  15: 10000,
  16: 100000,
  17: 1000000000000,
  18: 149597870700000,
  19: 9.4607304725808e18,
  20: 3.085677581491367e19,
  21: 304.80060960121926,
  22: 25.400050800101603,
  23: 914.4018288036576,
  24: 1609347.2186944375
}

/** Short Latin suffixes shown after converted measurement lengths. */
const ACAD_UNIT_SYMBOLS: Readonly<Record<number, string>> = {
  1: 'in',
  2: 'ft',
  4: 'mm',
  5: 'cm',
  6: 'm',
  7: 'km',
  10: 'yd'
}

function acapUnitToMm(unit: number): number {
  if (!Number.isFinite(unit)) return 1
  return ACAD_UNIT_TO_MM[Math.trunc(unit)] ?? 1
}

/** Scale a value expressed in `fromUnit` so it is expressed in `toUnit`. */
export function convertLengthValue(
  value: number,
  fromUnit: number,
  toUnit: number
): number {
  const toMm = acapUnitToMm(toUnit)
  if (toMm === 0) return value
  return value * (acapUnitToMm(fromUnit) / toMm)
}

/** Scale an area expressed in `fromUnit` so it is expressed in `toUnit`. */
export function convertAreaValue(
  value: number,
  fromUnit: number,
  toUnit: number
): number {
  const factor = convertLengthValue(1, fromUnit, toUnit)
  return value * factor * factor
}

/** Short symbol for a length-unit code, or empty when unknown / follow-drawing. */
export function measurementLengthUnitSymbol(unit: number): string {
  return ACAD_UNIT_SYMBOLS[Math.trunc(unit)] ?? ''
}

/** Numeric value stored on a committed measurement so its badge can be reformatted. */
export type AcApMeasurementValue =
  | { kind: 'length'; value: number }
  | { kind: 'area'; value: number }
  | { kind: 'angle'; radians: number }
  | { kind: 'coordinate'; x: number; y: number }

/** Display flags for length / area / coordinate measurement labels. */
export const MEASUREMENT_LENGTH_FORMAT_OPTIONS: AcApFormatterOptions = {
  showUnits: true,
  showApproximate: true
}

/**
 * Display flags for a length already rescaled to another physical unit. The
 * formatter must not add the drawing suffix — the target unit symbol is
 * appended by the caller.
 */
const MEASUREMENT_CONVERTED_LENGTH_FORMAT_OPTIONS: AcApFormatterOptions = {
  showUnits: false,
  showApproximate: true
}

/** Display flags for included-angle measurement labels. */
export const MEASUREMENT_ANGLE_FORMAT_OPTIONS: AcApFormatterOptions = {
  showUnits: true,
  showApproximate: true,
  applyAngbaseAngdir: false
}

/**
 * Session overrides for measurement display units. `undefined` fields follow
 * the current drawing (LUNITS / LUPREC / AUNITS / AUPREC).
 */
let measurementUnitOverride: Partial<AcApMeasurementUnits> = {}

/**
 * Effective measurement units: session override when the user changed a ribbon
 * control, otherwise the unit settings.
 */
export function getEffectiveMeasurementUnits(): AcApMeasurementUnits {
  const settings = AcApSettingManager.instance
  return {
    lunits: measurementUnitOverride.lunits ?? settings.get('linearUnits'),
    luprec: measurementUnitOverride.luprec ?? settings.get('linearPrecision'),
    aunits: measurementUnitOverride.aunits ?? settings.get('angularUnits'),
    auprec: measurementUnitOverride.auprec ?? settings.get('angularPrecision'),
    lengthUnit:
      measurementUnitOverride.lengthUnit ??
      MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING
  }
}

/** Fields the user has overridden on the Measurement ribbon unit panels. */
export function getMeasurementUnitOverride(): Partial<AcApMeasurementUnits> {
  return { ...measurementUnitOverride }
}

/**
 * Record a user override for one or more measurement unit fields.
 * Does not change drawing system variables.
 */
export function setMeasurementUnitOverride(
  patch: Partial<AcApMeasurementUnits>
): void {
  if (patch.lunits != null) measurementUnitOverride.lunits = patch.lunits
  if (patch.luprec != null) measurementUnitOverride.luprec = patch.luprec
  if (patch.aunits != null) measurementUnitOverride.aunits = patch.aunits
  if (patch.auprec != null) measurementUnitOverride.auprec = patch.auprec
  if (patch.lengthUnit != null)
    measurementUnitOverride.lengthUnit = patch.lengthUnit
}

/** Clear session measurement unit overrides (document open / tests). */
export function resetMeasurementUnitOverride(): void {
  measurementUnitOverride = {}
}

/** LUNITS values that assume drawing INSUNITS, not arbitrary physical units. */
function isDrawingNativeLengthFormat(lunits: number): boolean {
  return (
    lunits === AcApLinearUnits.Architectural ||
    lunits === AcApLinearUnits.Engineering
  )
}

/**
 * A formatter reading the effective measurement units and the drawing unit
 * settings. Architectural and engineering lengths fall back to decimal when
 * `forceDecimalLength` is set.
 */
function measurementFormatter(formatPatch?: {
  forceDecimalLength?: boolean
}): AcApFormatter {
  return new AcApFormatter(() => {
    const settings = AcApSettingManager.instance
    const units = getEffectiveMeasurementUnits()
    const insunits = settings.get('insertionUnits') ?? 0
    return {
      lunits:
        formatPatch?.forceDecimalLength &&
        isDrawingNativeLengthFormat(units.lunits)
          ? AcApLinearUnits.Decimal
          : units.lunits,
      luprec: units.luprec,
      insunits,
      unitmode: 0,
      measurement: acapIsImperialUnits(insunits) ? 0 : 1,
      aunits: units.aunits,
      auprec: units.auprec,
      angbase: settings.get('angleBase'),
      angdir: settings.get('angleDirection')
    }
  })
}

/** Format a linear value without applying a physical-unit conversion. */
function formatMeasurementLengthRaw(
  value: number,
  options: AcApFormatterOptions = MEASUREMENT_LENGTH_FORMAT_OPTIONS,
  formatPatch?: { forceDecimalLength?: boolean }
): string {
  return measurementFormatter(formatPatch).formatLength(value, options)
}

/** Merge caller flags with converted-length defaults (units suffix always off). */
function convertedLengthFormatOptions(
  options: AcApFormatterOptions
): AcApFormatterOptions {
  return {
    ...MEASUREMENT_CONVERTED_LENGTH_FORMAT_OPTIONS,
    ...options,
    showUnits: false
  }
}

/**
 * Length unit code to convert measurement values to, or `undefined` when labels
 * should stay in drawing units (no override selected, the override equals the
 * drawing's INSUNITS, INSUNITS is undefined, or the follow-drawing sentinel is
 * active).
 */
function convertedLengthUnit(): number | undefined {
  const fromUnit = AcApSettingManager.instance.get('insertionUnits') ?? 0
  if (fromUnit === 0) return undefined

  const target = measurementUnitOverride.lengthUnit
  if (
    target == null ||
    target === fromUnit ||
    target === MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING
  )
    return undefined
  return target
}

/** Format a linear distance using effective measurement units. */
export function formatMeasurementLength(
  value: number,
  options: AcApFormatterOptions = MEASUREMENT_LENGTH_FORMAT_OPTIONS
): string {
  const target = convertedLengthUnit()
  if (target == null) {
    return formatMeasurementLengthRaw(value, options)
  }

  const fromUnit = AcApSettingManager.instance.get('insertionUnits') ?? 0
  const scaled = convertLengthValue(value, fromUnit, target)
  const text = formatMeasurementLengthRaw(
    scaled,
    convertedLengthFormatOptions(options),
    { forceDecimalLength: true }
  )
  const symbol = measurementLengthUnitSymbol(target)
  return symbol ? `${text} ${symbol}` : text
}

/** Format an area using effective measurement units (length unit squared). */
export function formatMeasurementArea(
  value: number,
  options: AcApFormatterOptions = MEASUREMENT_LENGTH_FORMAT_OPTIONS
): string {
  const target = convertedLengthUnit()
  if (target == null) {
    return `${formatMeasurementLengthRaw(value, options)}²`
  }

  const fromUnit = AcApSettingManager.instance.get('insertionUnits') ?? 0
  const scaled = convertAreaValue(value, fromUnit, target)
  const text = formatMeasurementLengthRaw(
    scaled,
    convertedLengthFormatOptions(options),
    { forceDecimalLength: true }
  )
  const symbol = measurementLengthUnitSymbol(target)
  return symbol ? `${text} ${symbol}²` : `${text}²`
}

/**
 * Rounds `value` to `precision` decimal places.
 *
 * Used to work around {@link AcApFormatter} `formatDecimal`: for non-integers it
 * runs `toFixed(precision)` then strips with `/\.?0+$/`, which turns `"90"` into
 * `"9"` (and `"100"` into `"1"`). Pre-rounding lets whole numbers hit the
 * `Number.isInteger` fast path that returns the full digit string.
 */
function quantizeDecimal(value: number, precision: number): number {
  if (!Number.isFinite(value)) return value
  const p = Math.max(0, Math.floor(precision))
  const factor = 10 ** p
  const quantized = Math.round(value * factor) / factor
  return Object.is(quantized, -0) ? 0 : quantized
}

/**
 * Pre-round an included angle so {@link AcApFormatter.formatAngle} cannot drop
 * trailing zeros from the decimal-degree (or similar) display string.
 */
function radiansForMeasurementFormat(
  radians: number,
  aunits: number,
  auprec: number
): number {
  switch (aunits) {
    case AcApAngleUnits.DecimalDegrees: {
      const deg = quantizeDecimal((radians * 180) / Math.PI, auprec)
      return (deg * Math.PI) / 180
    }
    case AcApAngleUnits.Gradians: {
      // π rad = 200 gon
      const grads = quantizeDecimal(radians * (200 / Math.PI), auprec)
      return grads * (Math.PI / 200)
    }
    case AcApAngleUnits.Radians:
      return quantizeDecimal(radians, auprec)
    default:
      return radians
  }
}

/** Format an angle in radians using effective measurement units. */
export function formatMeasurementAngle(
  radians: number,
  options: AcApFormatterOptions = MEASUREMENT_ANGLE_FORMAT_OPTIONS
): string {
  const { aunits, auprec } = getEffectiveMeasurementUnits()
  const value = radiansForMeasurementFormat(radians, aunits, auprec)
  return measurementFormatter().formatAngle(value, {
    ...MEASUREMENT_ANGLE_FORMAT_OPTIONS,
    ...options,
    applyAngbaseAngdir: false
  })
}

/** Format a stored measurement value for a badge label. */
export function formatMeasurementValue(value: AcApMeasurementValue): string {
  switch (value.kind) {
    case 'length':
      return formatMeasurementLength(value.value)
    case 'area':
      return formatMeasurementArea(value.value)
    case 'angle':
      return formatMeasurementAngle(value.radians)
    case 'coordinate': {
      const x = formatMeasurementLength(value.x)
      const y = formatMeasurementLength(value.y)
      return `X ${x}  Y ${y}`
    }
  }
}
