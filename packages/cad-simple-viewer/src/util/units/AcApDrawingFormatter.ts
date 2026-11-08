import { AcApSettingManager } from '../../app/AcApSettingManager'
import { AcApFormatter } from './AcApFormatter'
import { acapIsImperialUnits } from './AcApUnitsValue'

/**
 * Returns a formatter for lengths and angles in the drawing's unit settings.
 *
 * The formatter reads the settings on every call, so it follows later
 * changes.
 */
export function acapDrawingFormatter(): AcApFormatter {
  return new AcApFormatter(() => {
    const settings = AcApSettingManager.instance
    const insunits = settings.get('insertionUnits')
    return {
      lunits: settings.get('linearUnits'),
      luprec: settings.get('linearPrecision'),
      insunits,
      unitmode: 0,
      measurement: acapIsImperialUnits(insunits) ? 0 : 1,
      aunits: settings.get('angularUnits'),
      auprec: settings.get('angularPrecision'),
      angbase: settings.get('angleBase'),
      angdir: settings.get('angleDirection')
    }
  })
}
