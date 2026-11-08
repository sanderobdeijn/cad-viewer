import {
  formatMeasurementAngle,
  formatMeasurementArea,
  formatMeasurementLength,
  formatMeasurementValue,
  getEffectiveMeasurementUnits,
  getMeasurementUnitOverride,
  MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING,
  resetMeasurementUnitOverride,
  setMeasurementUnitOverride
} from '../src/util/AcApMeasurementUnits'
import {
  AcApAngleUnits,
  AcApLinearUnits,
  AcApUnitsValue
} from '../src/util/units'
import { useTestSettings } from './helpers/settings'

/** Decimal lengths with 4 places and decimal degrees, in the given units. */
function useDrawingUnits(options?: { insunits?: number; lunits?: number }) {
  useTestSettings({
    linearUnits: options?.lunits ?? AcApLinearUnits.Decimal,
    linearPrecision: 4,
    angularUnits: AcApAngleUnits.DecimalDegrees,
    angularPrecision: 0,
    insertionUnits: options?.insunits ?? AcApUnitsValue.Millimeters
  })
}

describe('AcApMeasurementUnits', () => {
  afterEach(() => {
    resetMeasurementUnitOverride()
  })

  it('follows drawing units until the user overrides a field', () => {
    useDrawingUnits()
    expect(getEffectiveMeasurementUnits()).toEqual({
      lunits: 2,
      luprec: 4,
      aunits: 0,
      auprec: 0,
      lengthUnit: MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING
    })

    setMeasurementUnitOverride({ luprec: 2, aunits: 3 })
    expect(getEffectiveMeasurementUnits()).toEqual({
      lunits: 2,
      luprec: 2,
      aunits: 3,
      auprec: 0,
      lengthUnit: MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING
    })
    expect(getMeasurementUnitOverride()).toEqual({ luprec: 2, aunits: 3 })
  })

  it('formats lengths in the drawing units', () => {
    useDrawingUnits()
    expect(formatMeasurementLength(1000)).toBe('1000 mm')
    expect(formatMeasurementLength(12.3456)).toBe('12.3456 mm')
  })

  it('formats lengths with the override precision', () => {
    useDrawingUnits()
    setMeasurementUnitOverride({ luprec: 1 })

    expect(formatMeasurementLength(12.3456)).toBe('~ 12.3 mm')
  })

  it('formats angle, area, and coordinate labels from stored values', () => {
    useDrawingUnits()
    setMeasurementUnitOverride({ luprec: 1 })

    expect(formatMeasurementAngle(Math.PI / 4)).toBe('45°')
    expect(formatMeasurementValue({ kind: 'area', value: 10 })).toBe('10 mm²')
    expect(formatMeasurementValue({ kind: 'coordinate', x: 1, y: 2 })).toBe(
      'X 1 mm  Y 2 mm'
    )
  })

  it('keeps trailing zeros on near-right angles', () => {
    useDrawingUnits()
    const radians = (90.16096030272212 * Math.PI) / 180
    expect(formatMeasurementAngle(radians)).toBe('90°')
    expect(formatMeasurementAngle(Math.PI / 2)).toBe('90°')
  })

  it('converts length to the selected unit and appends its symbol', () => {
    useDrawingUnits()
    setMeasurementUnitOverride({ lengthUnit: AcApUnitsValue.Meters })

    expect(formatMeasurementLength(1000)).toBe('1 m')
    expect(formatMeasurementLength(1234.5)).toBe('1.2345 m')
  })

  it('follows drawing units for the follow-drawing sentinel', () => {
    useDrawingUnits()
    setMeasurementUnitOverride({
      lengthUnit: MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING
    })

    expect(formatMeasurementLength(1000)).toBe('1000 mm')
  })

  it('converts area by the square of the selected length unit', () => {
    useDrawingUnits()
    setMeasurementUnitOverride({ lengthUnit: AcApUnitsValue.Meters })

    expect(formatMeasurementArea(3125000)).toBe('3.125 m²')
  })

  it('keeps area in drawing units for the follow-drawing sentinel', () => {
    useDrawingUnits()
    setMeasurementUnitOverride({
      lengthUnit: MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING
    })

    expect(formatMeasurementArea(3125000)).toBe('3125000 mm²')
  })

  it('skips conversion when drawing INSUNITS is undefined (0)', () => {
    useDrawingUnits({ insunits: AcApUnitsValue.Undefined })
    setMeasurementUnitOverride({ lengthUnit: AcApUnitsValue.Meters })

    expect(formatMeasurementLength(1000)).toBe('1000 mm')
    expect(formatMeasurementArea(1000)).toBe('1000 mm²')
  })

  it('uses decimal length format when converting with architectural LUNITS', () => {
    useDrawingUnits({ lunits: AcApLinearUnits.Architectural })
    setMeasurementUnitOverride({ lengthUnit: AcApUnitsValue.Meters })

    expect(formatMeasurementLength(1000)).toBe('1 m')
  })

  it('converts from feet drawing units to millimeters', () => {
    useDrawingUnits({ insunits: AcApUnitsValue.Feet })
    setMeasurementUnitOverride({ lengthUnit: AcApUnitsValue.Millimeters })

    expect(formatMeasurementLength(1)).toBe('304.8 mm')
  })

  it('restores follow-drawing length unit after reset', () => {
    useDrawingUnits()
    setMeasurementUnitOverride({ lengthUnit: AcApUnitsValue.Meters })
    resetMeasurementUnitOverride()

    expect(getEffectiveMeasurementUnits().lengthUnit).toBe(
      MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING
    )
    expect(formatMeasurementLength(1000)).toBe('1000 mm')
  })
})
