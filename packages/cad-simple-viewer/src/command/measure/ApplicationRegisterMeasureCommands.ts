import type { ApplicationSystemCommandRegistrar } from '../ApplicationDrawStyleSession'
import {
  type ApplicationDrawStyleSessionInstallContext,
  applicationInstallDrawStyleSessionAccessory
} from '../ApplicationDrawStyleSession'
import { ApplicationClearMeasurementsCmd } from './ApplicationClearMeasurementsCmd'
import { ApplicationMeasureAngleCmd } from './ApplicationMeasureAngleCmd'
import { ApplicationMeasureArcCmd } from './ApplicationMeasureArcCmd'
import { ApplicationMeasureAreaCmd } from './ApplicationMeasureAreaCmd'
import { ApplicationMeasureContinuousCmd } from './ApplicationMeasureContinuousCmd'
import { ApplicationMeasureDistanceCmd } from './ApplicationMeasureDistanceCmd'
import { ApplicationMeasurementExportCmd } from './ApplicationMeasurementImportExportCmd'
import { ApplicationMeasurementImportCmd } from './ApplicationMeasurementImportExportCmd'
import { ApplicationMeasurementVisibilityCmd } from './ApplicationMeasurementVisibilityCmd'
import { ApplicationMeasurePointCmd } from './ApplicationMeasurePointCmd'

/**
 * Registers measurement commands and installs the shared draw-style session
 * accessory for the view (idempotent).
 */
export function registerMeasureCommands(
  addSystemCommand: ApplicationSystemCommandRegistrar,
  installCtx: ApplicationDrawStyleSessionInstallContext
): void {
  applicationInstallDrawStyleSessionAccessory(installCtx)

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
  addSystemCommand(
    'measurementexport',
    'measurementexport',
    new ApplicationMeasurementExportCmd()
  )
  addSystemCommand(
    'measurementimport',
    'measurementimport',
    new ApplicationMeasurementImportCmd()
  )
}
