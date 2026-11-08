import { ApplicationContext, EditorCommand } from '@mlightcad/cad-simple-viewer'

import { useDialogManager } from '../composable'

export class ApplicationPointStyleCmd extends EditorCommand {
  async execute(_context: ApplicationContext) {
    const { toggleDialog } = useDialogManager()
    toggleDialog('PointStyleDlg', true)
  }
}
