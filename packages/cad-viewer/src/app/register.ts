import { ApplicationDocManager, EditorCommandStack } from '@mlightcad/cad-simple-viewer'
import { markRaw } from 'vue'

import {
  ApplicationDrawingUnitsCmd,
  ApplicationMeasurementPanelCmd,
  ApplicationMemCmd,
  ApplicationPointStyleCmd
} from '../command'
import { MlDrawingUnitsDlg, MlPointStyleDlg } from '../component'
import { useDialogManager } from '../composable'

let isCommandRegistered = false
export const registerCmds = () => {
  if (!isCommandRegistered) {
    const register = ApplicationDocManager.instance.commandManager
    register.addCommand(
      EditorCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'pttype',
      'pttype',
      new ApplicationPointStyleCmd()
    )
    register.addCommand(
      EditorCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'units',
      'units',
      new ApplicationDrawingUnitsCmd()
    )
    register.addCommand(
      EditorCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'measurementpanel',
      'measurementpanel',
      new ApplicationMeasurementPanelCmd()
    )
    register.addCommand(
      EditorCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'mem',
      'mem',
      new ApplicationMemCmd(),
      'memstat'
    )
    isCommandRegistered = true
  }
}

let isDialogRegistered = false
export const registerDialogs = () => {
  if (!isDialogRegistered) {
    const { registerDialog } = useDialogManager()
    registerDialog({
      name: 'PointStyleDlg',
      component: markRaw(MlPointStyleDlg),
      props: {}
    })
    registerDialog({
      name: 'DrawingUnitsDlg',
      component: markRaw(MlDrawingUnitsDlg),
      props: {}
    })
    isDialogRegistered = true
  }
}
