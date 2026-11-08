import { ApplicationContext, EditorCommand } from '@mlightcad/cad-simple-viewer'

import { useDialogManager } from '../composable'

export class ApplicationDrawingUnitsCmd extends EditorCommand {
  async execute(_context: ApplicationContext) {
    const { toggleDialog } = useDialogManager()
    toggleDialog('DrawingUnitsDlg', true)
  }
}
