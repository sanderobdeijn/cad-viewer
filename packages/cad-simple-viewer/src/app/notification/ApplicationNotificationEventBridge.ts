import { eventBus } from '../../editor/global/eventBus'
import { applicationI18nTranslate } from '../../util/ApplicationI18nTranslate'
import type { ApplicationDocManager, ApplicationDocumentEventArgs } from '../ApplicationDocManager'
import type { ApplicationNotificationCenter } from './ApplicationNotificationTypes'

/**
 * Subscribes to engine events and forwards user-visible alerts into the active
 * {@link ApplicationNotificationCenter}.
 *
 * Shared by the built-in DOM center and host overrides (e.g. cad-viewer).
 * Notifications are tagged with the current {@link ApplicationDocSession.id}.
 */
export class ApplicationNotificationEventBridge {
  /** Document manager whose lifecycle events drive session scoping. */
  private readonly _docManager: ApplicationDocManager
  /** Lazily resolves the active center (built-in or host override). */
  private _getCenter: () => ApplicationNotificationCenter
  /** Whether {@link install} has attached listeners. */
  private _installed = false

  /**
   * Builds options that stamp the active session id onto a new notification.
   *
   * @returns `{ sessionId }` when a session is active, otherwise `{}`.
   */
  private sessionOptions(): { sessionId: string } | Record<string, never> {
    const sessionId = this._docManager.activeSessionId
    return sessionId ? { sessionId } : {}
  }

  /**
   * Pushes the manager's active session id into the center.
   */
  private syncActiveSession() {
    this._getCenter().setActiveSession(this._docManager.activeSessionId)
  }

  /**
   * Handles generic `message` bus events and mirrors them into the center.
   *
   * @param params - Message text and severity.
   */
  private readonly _onMessage = (params: {
    message: string
    type: 'info' | 'warning' | 'error' | 'success'
  }) => {
    const center = this._getCenter()
    const title =
      params.type === 'error'
        ? applicationI18nTranslate('main.notification.title.systemError')
        : params.type === 'warning'
          ? applicationI18nTranslate('main.notification.title.systemWarning')
          : params.type === 'success'
            ? applicationI18nTranslate('main.notification.title.systemMessage')
            : applicationI18nTranslate('main.notification.title.systemInfo')
    const options = this.sessionOptions()
    switch (params.type) {
      case 'error':
        center.error(title, params.message, options)
        break
      case 'warning':
        center.warning(title, params.message, options)
        break
      case 'success':
        center.success(title, params.message, options)
        break
      default:
        center.info(title, params.message, options)
        break
    }
  }

  /**
   * Syncs the active session before a new document opens.
   */
  private readonly _onDocumentToBeOpened = () => {
    this.syncActiveSession()
  }

  /**
   * Syncs the active session when a document is created.
   */
  private readonly _onDocumentCreated = () => {
    this.syncActiveSession()
  }

  /**
   * Syncs the active session when a document is activated.
   */
  private readonly _onDocumentActivated = () => {
    this.syncActiveSession()
  }

  /**
   * Clears the closed session's notifications.
   *
   * @param args - Document about to be destroyed.
   */
  private readonly _onDocumentToBeDestroyed = (args: ApplicationDocumentEventArgs) => {
    const session = this._docManager.sessionFor(args.doc)
    if (session) {
      this._getCenter().clearSession(session.id)
    }
  }

  /**
   * @param docManager - Manager whose events and active session are observed.
   * @param getCenter - Accessor for the currently installed notification center.
   */
  constructor(
    docManager: ApplicationDocManager,
    getCenter: () => ApplicationNotificationCenter
  ) {
    this._docManager = docManager
    this._getCenter = getCenter
  }

  /**
   * Attaches event-bus and document-manager listeners. Idempotent.
   */
  install() {
    if (this._installed) return
    this._installed = true

    this.syncActiveSession()

    eventBus.on('message', this._onMessage)

    this._docManager.events.documentToBeOpened.addEventListener(
      this._onDocumentToBeOpened
    )
    this._docManager.events.documentCreated.addEventListener(
      this._onDocumentCreated
    )
    this._docManager.events.documentActivated.addEventListener(
      this._onDocumentActivated
    )
    this._docManager.events.documentToBeDestroyed.addEventListener(
      this._onDocumentToBeDestroyed
    )
  }

  /**
   * Detaches all listeners. Idempotent.
   */
  uninstall() {
    if (!this._installed) return
    this._installed = false

    eventBus.off('message', this._onMessage)

    this._docManager.events.documentToBeOpened.removeEventListener(
      this._onDocumentToBeOpened
    )
    this._docManager.events.documentCreated.removeEventListener(
      this._onDocumentCreated
    )
    this._docManager.events.documentActivated.removeEventListener(
      this._onDocumentActivated
    )
    this._docManager.events.documentToBeDestroyed.removeEventListener(
      this._onDocumentToBeDestroyed
    )
  }
}
