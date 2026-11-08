import type { ThreeRendererViewSessionState } from '../view/ThreeRendererViewSessionState'
import type { ApplicationContext } from './ApplicationContext'
import type { ApplicationDocument } from './ApplicationDocument'

/**
 * One in-memory CAD document plus the view state needed to show it again.
 *
 * The shared {@link ThreeRendererView2d} parks this snapshot when another document
 * becomes active, then restores it on {@link ApplicationDocManager.activateDocument}.
 */
export class ApplicationDocSession {
  /** Stable id for UI tabs and activate/close. */
  readonly id: string
  /** Application context bound to this document. */
  readonly context: ApplicationContext
  /**
   * Parked GPU/camera/selection state while this document is inactive.
   * Undefined while the session owns the shared view.
   */
  viewState?: ThreeRendererViewSessionState

  /**
   * @param id - Stable session id (e.g. `doc-1`).
   * @param context - Document/view binding for this session.
   */
  constructor(id: string, context: ApplicationContext) {
    this.id = id
    this.context = context
  }

  /** Document wrapped by this session. */
  get doc(): ApplicationDocument {
    return this.context.doc
  }
}
