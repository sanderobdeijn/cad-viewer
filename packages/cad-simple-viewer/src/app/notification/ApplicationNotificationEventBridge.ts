import { eventBus } from '../../editor/global/eventBus'
import { applicationI18nTranslate } from '../../util/ApplicationI18nTranslate'
import type { ApplicationDocManager } from '../ApplicationDocManager'
import type { ApplicationNotificationCenter } from './ApplicationNotificationTypes'

/**
 * Subscribes to engine events and forwards user-visible alerts into the active
 * {@link ApplicationNotificationCenter}.
 *
 * Shared by the built-in DOM center and host overrides (e.g. cad-viewer).
 */
export class ApplicationNotificationEventBridge {
  /** Document manager whose lifecycle events clear notifications. */
  private readonly _docManager: ApplicationDocManager
  /** Lazily resolves the active center (built-in or host override). */
  private _getCenter: () => ApplicationNotificationCenter
  /** Whether {@link install} has attached listeners. */
  private _installed = false

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
    switch (params.type) {
      case 'error':
        center.error(title, params.message)
        break
      case 'warning':
        center.warning(title, params.message)
        break
      case 'success':
        center.success(title, params.message)
        break
      default:
        center.info(title, params.message)
        break
    }
  }

  /** Clears the notifications of a document that is going away. */
  private readonly _onDocumentToBeDestroyed = () => {
    this._getCenter().clear()
  }

  /**
   * @param docManager - Manager whose events are observed.
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

    eventBus.on('message', this._onMessage)

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

    this._docManager.events.documentToBeDestroyed.removeEventListener(
      this._onDocumentToBeDestroyed
    )
  }
}
