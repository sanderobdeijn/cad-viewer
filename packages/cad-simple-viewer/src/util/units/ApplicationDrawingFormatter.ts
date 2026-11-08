import { ApplicationSettingManager } from '../../app/ApplicationSettingManager'
import { ApplicationFormatter } from './ApplicationFormatter'
import { applicationIsImperialUnits } from './ApplicationUnitsValue'

/**
 * Returns a formatter for lengths and angles in the drawing's unit settings.
 *
 * The formatter reads the settings on every call, so it follows later
 * changes.
 */
export function applicationDrawingFormatter(): ApplicationFormatter {
  return new ApplicationFormatter(() => {
    const settings = ApplicationSettingManager.instance
    const insunits = settings.get('insertionUnits')
    return {
      lunits: settings.get('linearUnits'),
      luprec: settings.get('linearPrecision'),
      insunits,
      unitmode: 0,
      measurement: applicationIsImperialUnits(insunits) ? 0 : 1,
      aunits: settings.get('angularUnits'),
      auprec: settings.get('angularPrecision'),
      angbase: settings.get('angleBase'),
      angdir: settings.get('angleDirection')
    }
  })
}
