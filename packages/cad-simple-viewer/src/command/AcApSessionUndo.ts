import type { AcDbDatabase } from '@mlightcad/data-model'

import { eventBus } from '../editor/global/eventBus'
import { acapNotifyUndoStackChanged } from '../util/AcApDatabaseEdit'

/**
 * Kind of session-level undoable operation.
 * - `'db'`: CAD database transaction
 * - `'overlay'`: HTML overlay (e.g. measurement) history
 */
type SessionOpKind = 'db' | 'overlay'

/** Undo/redo binding for HTML overlay histories (e.g. measurements). */
export interface AcApOverlayHistoryBinding {
  /** Whether the overlay history has an undo step. */
  canUndo(): boolean
  /** Whether the overlay history has a redo step. */
  canRedo(): boolean
  /**
   * Undo the last overlay mutation.
   * @returns true when a step was applied.
   */
  undo(): boolean
  /**
   * Redo the last undone overlay mutation.
   * @returns true when a step was applied.
   */
  redo(): boolean
  /** Drop redo entries (e.g. after a new DB edit). */
  clearRedo(): void
  /** Drop all overlay history (e.g. document close). */
  clear(): void
}

/** Bound HTML overlay history consulted by {@link AcApSessionUndo}. */
let overlayHistory: AcApOverlayHistoryBinding | undefined

/**
 * Register the measurement / HTML overlay history with session undo.
 * Pass `undefined` to unbind.
 * @param history - Overlay history adapter, or `undefined` to clear the binding.
 */
export function bindOverlayHistory(
  history: AcApOverlayHistoryBinding | undefined
): void {
  overlayHistory = history
}

/**
 * Chronological session undo that interleaves DB edits and HTML overlay
 * (measurement) edits.
 */
export class AcApSessionUndo {
  /** Chronological kinds of committed session ops (oldest first). */
  private readonly undoKinds: SessionOpKind[] = []
  /** Chronological kinds of undone session ops waiting to redo (oldest first). */
  private readonly redoKinds: SessionOpKind[] = []

  /** Call when a new outermost DB undo mark is committed. */
  recordDb(): void {
    this.undoKinds.push('db')
    this.redoKinds.length = 0
    overlayHistory?.clearRedo()
  }

  /** Call when a new HTML overlay (measurement) history entry is pushed. */
  recordOverlay(): void {
    this.undoKinds.push('overlay')
    this.redoKinds.length = 0
  }

  /**
   * Whether any session op (DB or overlay) can be undone.
   * @param db - Database whose transaction manager is consulted for DB undo.
   */
  canUndo(db: AcDbDatabase): boolean {
    return (
      this.undoKinds.length > 0 ||
      (overlayHistory?.canUndo() ?? false) ||
      (db.transactionManager?.canUndo() ?? false)
    )
  }

  /**
   * Whether any session op (DB or overlay) can be redone.
   * @param db - Database whose transaction manager is consulted for DB redo.
   */
  canRedo(db: AcDbDatabase): boolean {
    return (
      this.redoKinds.length > 0 ||
      (overlayHistory?.canRedo() ?? false) ||
      (db.transactionManager?.canRedo() ?? false)
    )
  }

  /**
   * Undo the chronologically last session op.
   * @param db - Database used when the last op was a DB transaction.
   * @returns `'overlay'` when HTML overlay undo already updated the view,
   *   `'db'` when only DB changed, or `false` when nothing was undone.
   */
  undo(db: AcDbDatabase): 'overlay' | 'db' | false {
    while (true) {
      const kind = this.undoKinds.pop()
      if (kind === 'overlay') {
        if (overlayHistory?.undo()) {
          this.redoKinds.push('overlay')
          return 'overlay'
        }
        continue
      }
      if (kind === 'db') {
        if (db.transactionManager.undo()) {
          this.redoKinds.push('db')
          return 'db'
        }
        continue
      }
      if (overlayHistory?.undo()) {
        this.redoKinds.push('overlay')
        return 'overlay'
      }
      if (db.transactionManager?.undo()) {
        this.redoKinds.push('db')
        return 'db'
      }
      return false
    }
  }

  /**
   * Redo the chronologically last undone session op.
   * @param db - Database used when the last undone op was a DB transaction.
   * @returns `'overlay'` when HTML overlay redo already updated the view,
   *   `'db'` when only DB changed, or `false` when nothing was redone.
   */
  redo(db: AcDbDatabase): 'overlay' | 'db' | false {
    while (true) {
      const kind = this.redoKinds.pop()
      if (kind === 'overlay') {
        if (overlayHistory?.redo()) {
          this.undoKinds.push('overlay')
          return 'overlay'
        }
        continue
      }
      if (kind === 'db') {
        if (db.transactionManager.redo()) {
          this.undoKinds.push('db')
          return 'db'
        }
        continue
      }
      if (overlayHistory?.redo()) {
        this.undoKinds.push('overlay')
        return 'overlay'
      }
      if (db.transactionManager?.redo()) {
        this.undoKinds.push('db')
        return 'db'
      }
      return false
    }
  }

  /** Drop session undo/redo kinds and bound overlay history. */
  clear(): void {
    this.undoKinds.length = 0
    this.redoKinds.length = 0
    overlayHistory?.clear()
  }
}

/** Session undo coordinators keyed by {@link AcApDocSession.id}. */
const sessionUndos = new Map<string, AcApSessionUndo>()
/** Session currently receiving undo records. */
let activeSessionId: string | undefined
/** Fallback coordinator used before any session is bound. */
let fallbackUndo: AcApSessionUndo | undefined

/** Session undo coordinator for the active document session. */
export function getSessionUndo(): AcApSessionUndo {
  if (!activeSessionId) {
    if (!fallbackUndo) fallbackUndo = new AcApSessionUndo()
    return fallbackUndo
  }
  let undo = sessionUndos.get(activeSessionId)
  if (!undo) {
    undo = new AcApSessionUndo()
    sessionUndos.set(activeSessionId, undo)
  }
  return undo
}

/**
 * Binds session undo to a document session id.
 *
 * @param sessionId - {@link AcApDocSession.id} of the active document.
 */
export function acapBindSessionUndo(sessionId: string): void {
  activeSessionId = sessionId
  getSessionUndo()
}

/**
 * Drops session undo state for a closed document session.
 *
 * @param sessionId - Session whose undo coordinator should be dropped.
 */
export function acapDisposeSessionUndo(sessionId: string): void {
  sessionUndos.delete(sessionId)
  if (activeSessionId === sessionId) {
    activeSessionId = undefined
  }
}

/** Clears the active session's undo/redo history (document open / close). */
export function resetSessionUndo(): void {
  getSessionUndo().clear()
  acapNotifyUndoStackChanged()
}

// Bind at module load so early DB edits are not missed.
eventBus.on('session-db-edit-committed', () => {
  getSessionUndo().recordDb()
})
