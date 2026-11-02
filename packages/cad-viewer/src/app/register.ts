import {
  AcApDocManager,
  AcEdCommandStack,
  AcEdMTextEditor
} from '@mlightcad/cad-simple-viewer'
import { markRaw } from 'vue'

import {
  AcApCountListCmd,
  AcApDrawingUnitsCmd,
  AcApFindCmd,
  AcApMeasurementPanelCmd,
  AcApMemCmd,
  AcApMissedDataCmd,
  AcApOpenPerfCmd,
  AcApPointStyleCmd,
  AcApPropertiesCmd,
  AcApQSelectCmd,
  AcApTextStyleCmd
} from '../command'
import {
  createMlColorIndexPickerToolbarFactory,
  MlDrawingUnitsDlg,
  MlPointStyleDlg,
  MlQuickSelectDlg,
  MlTextStyleDlg
} from '../component'
import { useDialogManager } from '../composable'

let isCommandRegistered = false
export const registerCmds = () => {
  if (!isCommandRegistered) {
    const register = AcApDocManager.instance.commandManager
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'md',
      'md',
      new AcApMissedDataCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'pttype',
      'pttype',
      new AcApPointStyleCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'qselect',
      'qselect',
      new AcApQSelectCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'units',
      'units',
      new AcApDrawingUnitsCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'properties',
      'properties',
      new AcApPropertiesCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'find',
      'find',
      new AcApFindCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'countlist',
      'countlist',
      new AcApCountListCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'measurementpanel',
      'measurementpanel',
      new AcApMeasurementPanelCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'mem',
      'mem',
      new AcApMemCmd(),
      'memstat'
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'openperf',
      'openperf',
      new AcApOpenPerfCmd(),
      ['openprofile', 'openprofui']
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'style',
      'style',
      new AcApTextStyleCmd(),
      'st'
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
      name: 'QuickSelectDlg',
      component: markRaw(MlQuickSelectDlg),
      props: {}
    })
    registerDialog({
      name: 'DrawingUnitsDlg',
      component: markRaw(MlDrawingUnitsDlg),
      props: {}
    })
    registerDialog({
      name: 'TextStyleDlg',
      component: markRaw(MlTextStyleDlg),
      props: {}
    })
    isDialogRegistered = true
  }
}

let isMTextColorPickerRegistered = false
export const registerMTextColorPicker = () => {
  if (!isMTextColorPickerRegistered) {
    AcEdMTextEditor.setDefaultColorPicker(
      createMlColorIndexPickerToolbarFactory()
    )
    isMTextColorPickerRegistered = true
  }
}
