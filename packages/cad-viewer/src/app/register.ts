import { ApplicationDocManager, EditorCommandStack } from '@mlightcad/cad-simple-viewer'
import { markRaw } from 'vue'

import {
  ApplicationDrawingUnitsCmd
} from '../command'
import { MlDrawingUnitsDlg } from '../component'
import { useDialogManager } from '../composable'

let isCommandRegistered = false
export const registerCmds = () => {
  if (!isCommandRegistered) {
    const register = ApplicationDocManager.instance.commandManager
    register.addCommand(
      EditorCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'units',
      'units',
      new ApplicationDrawingUnitsCmd()
    )
    isCommandRegistered = true
  }
}

let isDialogRegistered = false
export const registerDialogs = () => {
  if (!isDialogRegistered) {
    const { registerDialog } = useDialogManager()
    registerDialog({
      name: 'DrawingUnitsDlg',
      component: markRaw(MlDrawingUnitsDlg),
      props: {}
    })
    isDialogRegistered = true
  }
}
