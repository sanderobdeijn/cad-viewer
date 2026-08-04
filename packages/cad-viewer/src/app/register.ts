import { registerLazyHtmlPlugin } from '@mlightcad/cad-html-plugin/register'
import {
  AcApDocManager,
  AcEdCommandStack,
  AcEdMTextEditor
} from '@mlightcad/cad-simple-viewer'
import { markRaw } from 'vue'

import {
  AcApAttDefCmd,
  AcApAttEditCmd,
  AcApCountListCmd,
  AcApDrawingUnitsCmd,
  AcApExportHtmlDlgCmd,
  AcApInsertPaletteCmd,
  AcApLayerStateCmd,
  AcApMemCmd,
  AcApMissedDataCmd,
  AcApOpenPerfCmd,
  AcApPointStyleCmd,
  AcApPropertiesCmd,
  AcApQSelectCmd,
  AcApTextStyleCmd,
  AcApXrefCmd,
  hatchRibbonCommand
} from '../command'
import {
  createMlColorIndexPickerToolbarFactory,
  MlAttDefDlg,
  MlAttEditDlg,
  MlDrawingUnitsDlg,
  MlExportHtmlDlg,
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
      'layer',
      'layer',
      new AcApLayerStateCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'hatch',
      'hatch',
      hatchRibbonCommand
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'md',
      'md',
      new AcApMissedDataCmd()
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'xref',
      'xref',
      new AcApXrefCmd()
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
      'chtml',
      'chtml',
      new AcApExportHtmlDlgCmd()
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
      'insert',
      'insert',
      new AcApInsertPaletteCmd(),
      'blockspalette'
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'countlist',
      'countlist',
      new AcApCountListCmd()
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
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'attedit',
      'attedit',
      new AcApAttEditCmd(),
      ['eattedit', 'ate']
    )
    register.addCommand(
      AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      'attdef',
      'attdef',
      new AcApAttDefCmd(),
      'ddattdef'
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
      name: 'ExportHtmlDlg',
      component: markRaw(MlExportHtmlDlg),
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
    registerDialog({
      name: 'AttEditDlg',
      component: markRaw(MlAttEditDlg),
      props: {}
    })
    registerDialog({
      name: 'AttDefDlg',
      component: markRaw(MlAttDefDlg),
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

let isLazyPluginRegistered = false

/**
 * Registers lazy plugins that load on first use of their trigger commands.
 *
 * Currently registers the HTML export plugin (`-chtml`).
 * Safe to call multiple times; registration runs once per application lifetime.
 */
export const registerLazyPlugins = () => {
  if (isLazyPluginRegistered) {
    return
  }

  const pluginManager = AcApDocManager.instance.pluginManager
  registerLazyHtmlPlugin(pluginManager)

  isLazyPluginRegistered = true
}
