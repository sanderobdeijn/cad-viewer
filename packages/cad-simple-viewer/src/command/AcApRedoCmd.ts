import { AcApContext } from '../app'
import { AcEdCommand } from '../editor'
import { AcApI18n } from '../i18n'
import { acapNotifyUndoStackChanged } from '../util/AcApDatabaseEdit'
import { getSessionUndo } from './AcApSessionUndo'

/**
 * Redoes the last undone session editing operation (database or measurement).
 */
export class AcApRedoCmd extends AcEdCommand {
  constructor() {
    super()
    this.globalName = 'redo'
    this.localName = 'Redo'
    this.recordsUndoStack = false
  }

  async execute(context: AcApContext) {
    const result = getSessionUndo().redo(context.doc.database)
    if (!result) {
      const msgKey = AcApI18n.sysCmdKey(this.globalName, 'nothingToRedo')
      this.showMessage(
        AcApI18n.sysCmd(this.globalName, 'nothingToRedo'),
        'info',
        msgKey
      )
      return
    }
    acapNotifyUndoStackChanged()
  }
}
