import type { AcTrViewSessionState } from '../view/AcTrViewSessionState'
import type { AcApContext } from './AcApContext'
import type { AcApDocument } from './AcApDocument'

/**
 * One in-memory CAD document plus the view state needed to show it again.
 *
 * The shared {@link AcTrView2d} parks this snapshot when another document
 * becomes active, then restores it on {@link AcApDocManager.activateDocument}.
 */
export class AcApDocSession {
  /** Stable id for UI tabs and activate/close. */
  readonly id: string
  /** Application context bound to this document. */
  readonly context: AcApContext
  /**
   * Parked GPU/camera/selection state while this document is inactive.
   * Undefined while the session owns the shared view.
   */
  viewState?: AcTrViewSessionState

  /**
   * @param id - Stable session id (e.g. `doc-1`).
   * @param context - Document/view binding for this session.
   */
  constructor(id: string, context: AcApContext) {
    this.id = id
    this.context = context
  }

  /** Document wrapped by this session. */
  get doc(): AcApDocument {
    return this.context.doc
  }
}
