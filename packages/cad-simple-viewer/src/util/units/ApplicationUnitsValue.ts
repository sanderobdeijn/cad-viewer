/**
 * Enumeration of linear units used in AutoCAD drawings.
 *
 * This enum defines the various units that can be used to represent
 * linear measurements in AutoCAD drawings, including metric, imperial,
 * and survey units.
 */
export enum ApplicationUnitsValue {
  /** Undefined or unitless */
  Undefined = 0,
  /** Inches */
  Inches = 1,
  /** Feet */
  Feet = 2,
  /** Miles */
  Miles = 3,
  /** Millimeters */
  Millimeters = 4,
  /** Centimeters */
  Centimeters = 5,
  /** Meters */
  Meters = 6,
  /** Kilometers */
  Kilometers = 7,
  /** Microinches */
  Microinches = 8,
  /** Mils (thousandths of an inch) */
  Mils = 9,
  /** Yards */
  Yards = 10,
  /** Angstroms */
  Angstroms = 11,
  /** Nanometers */
  Nanometers = 12,
  /** Microns (micrometers) */
  Microns = 13,
  /** Decimeters */
  Decimeters = 14,
  /** Dekameters */
  Dekameters = 15,
  /** Hectometers */
  Hectometers = 16,
  /** Gigameters */
  Gigameters = 17,
  /** Astronomical units */
  Astronomical = 18,
  /** Light years */
  LightYears = 19,
  /** Parsecs */
  Parsecs = 20,
  /**
   * US Survey Feet - a historical survey unit that's about 2 parts per million larger than
   * the International Feet unit. This difference is significant only at scales used for mapping in
   * the U.S. The US Survey Feet setting is supported only for inserting or attaching drawings
   * starting with AutoCAD 2017-based products. Drawings opened in prior versions will treat the US
   * Survey Feet setting as Unitless.
   */
  USSurveyFeet = 21,
  /** US Survey Inches */
  USSurveyInch = 22,
  /** US Survey Yards */
  USSurveyYard = 23,
  /** US Survey Miles */
  USSurveyMile = 24,
  /** Maximum value for units */
  Max = USSurveyMile
}

/**
 * Checks if the specified units value represents metric units.
 *
 * This function returns true if the units are part of the metric system,
 * including millimeters, centimeters, meters, kilometers, and their
 * decimal multiples and submultiples.
 *
 * @param units - The units value to check
 * @returns True if the units are metric, false otherwise
 *
 * @example
 * ```typescript
 * const isMetric = applicationIsMetricUnits(ApplicationUnitsValue.Millimeters); // true
 * const isMetric2 = applicationIsMetricUnits(ApplicationUnitsValue.Inches); // false
 * ```
 */
export function applicationIsMetricUnits(units: ApplicationUnitsValue) {
  return (
    units == ApplicationUnitsValue.Millimeters ||
    units == ApplicationUnitsValue.Centimeters ||
    units == ApplicationUnitsValue.Meters ||
    units == ApplicationUnitsValue.Kilometers ||
    units == ApplicationUnitsValue.Nanometers ||
    units == ApplicationUnitsValue.Microns ||
    units == ApplicationUnitsValue.Decimeters ||
    units == ApplicationUnitsValue.Dekameters ||
    units == ApplicationUnitsValue.Hectometers ||
    units == ApplicationUnitsValue.Gigameters
  )
}

/**
 * Checks if the specified units value represents imperial units.
 *
 * This function returns true if the units are part of the imperial system,
 * including inches, feet, miles, yards, and US survey units.
 *
 * @param units - The units value to check
 * @returns True if the units are imperial, false otherwise
 *
 * @example
 * ```typescript
 * const isImperial = applicationIsImperialUnits(ApplicationUnitsValue.Inches); // true
 * const isImperial2 = applicationIsImperialUnits(ApplicationUnitsValue.Millimeters); // false
 * ```
 */
export function applicationIsImperialUnits(units: ApplicationUnitsValue) {
  return (
    units == ApplicationUnitsValue.Inches ||
    units == ApplicationUnitsValue.Feet ||
    units == ApplicationUnitsValue.Miles ||
    units == ApplicationUnitsValue.Microinches ||
    units == ApplicationUnitsValue.Mils ||
    units == ApplicationUnitsValue.Yards ||
    units == ApplicationUnitsValue.USSurveyFeet
  )
}
