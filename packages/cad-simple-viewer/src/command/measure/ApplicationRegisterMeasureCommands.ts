import type { EditorCommand } from '../../editor/command/EditorCommand'
import { ApplicationClearMeasurementsCmd } from './ApplicationClearMeasurementsCmd'
import { ApplicationMeasureAngleCmd } from './ApplicationMeasureAngleCmd'
import { ApplicationMeasureArcCmd } from './ApplicationMeasureArcCmd'
import { ApplicationMeasureAreaCmd } from './ApplicationMeasureAreaCmd'
import { ApplicationMeasureContinuousCmd } from './ApplicationMeasureContinuousCmd'
import { ApplicationMeasureDistanceCmd } from './ApplicationMeasureDistanceCmd'
import { ApplicationMeasurementVisibilityCmd } from './ApplicationMeasurementVisibilityCmd'
import { ApplicationMeasurePointCmd } from './ApplicationMeasurePointCmd'

/**
 * Registers a built-in system command with resolved aliases.
 *
 * @param cmdGlobalName - Global (English) command name.
 * @param cmdLocalName - Localized command name.
 * @param cmd - Command instance to register.
 */
export type ApplicationSystemCommandRegistrar = (
  cmdGlobalName: string,
  cmdLocalName: string,
  cmd: EditorCommand
) => void

/** Registers the measurement commands. */
export function registerMeasureCommands(
  addSystemCommand: ApplicationSystemCommandRegistrar
): void {
  addSystemCommand(
    'measuredistance',
    'measuredistance',
    new ApplicationMeasureDistanceCmd()
  )
  addSystemCommand(
    'measurecontinuous',
    'measurecontinuous',
    new ApplicationMeasureContinuousCmd()
  )
  addSystemCommand('measurearea', 'measurearea', new ApplicationMeasureAreaCmd())
  addSystemCommand('measureangle', 'measureangle', new ApplicationMeasureAngleCmd())
  addSystemCommand('measurearc', 'measurearc', new ApplicationMeasureArcCmd())
  addSystemCommand('measurepoint', 'measurepoint', new ApplicationMeasurePointCmd())
  addSystemCommand(
    'clearmeasurements',
    'clearmeasurements',
    new ApplicationClearMeasurementsCmd()
  )
  addSystemCommand(
    'measurementvis',
    'measurementvis',
    new ApplicationMeasurementVisibilityCmd()
  )
}
