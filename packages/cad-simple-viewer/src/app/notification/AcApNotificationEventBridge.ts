import { eventBus } from '../../editor/global/eventBus'
import { AcApFontUtil } from '../../util/AcApFontUtil'
import { acapFormatFontsMissedReplacement } from '../../util/AcApFormatFontMissedMessage'
import { acapI18nTranslate } from '../../util/AcApI18nTranslate'
import type { AcApDocManager, AcApDocumentEventArgs } from '../AcApDocManager'
import type { AcApNotificationCenter } from './AcApNotificationTypes'

/**
 * Subscribes to engine events and forwards user-visible alerts into the active
 * {@link AcApNotificationCenter}.
 *
 * Shared by the built-in DOM center and host overrides (e.g. cad-viewer).
 * Notifications are tagged with the current {@link AcApDocSession.id}.
 */
export class AcApNotificationEventBridge {
  /** Document manager whose lifecycle events drive session scoping. */
  private readonly _docManager: AcApDocManager
  /** Lazily resolves the active center (built-in or host override). */
  private _getCenter: () => AcApNotificationCenter
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
        ? acapI18nTranslate('main.notification.title.systemError')
        : params.type === 'warning'
          ? acapI18nTranslate('main.notification.title.systemWarning')
          : params.type === 'success'
            ? acapI18nTranslate('main.notification.title.systemMessage')
            : acapI18nTranslate('main.notification.title.systemInfo')
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
   * Handles fonts that failed to load from the remote repository.
   *
   * @param params - Failed font descriptors.
   */
  private readonly _onFontsNotLoaded = (params: {
    fonts: { fontName: string; url: string }[]
  }) => {
    const fontNames = params.fonts.map(font => font.fontName)
    this._getCenter().error(
      acapI18nTranslate('main.notification.title.fontNotLoaded'),
      acapI18nTranslate('main.message.fontsNotLoaded', {
        fonts: acapFormatFontsMissedReplacement(fontNames)
      }),
      {
        source: 'font-missed',
        fontNames,
        persistent: true,
        ...this.sessionOptions()
      }
    )
  }

  /**
   * Handles fonts that could not be found in the remote repository.
   *
   * @param params - Missing font names.
   */
  private readonly _onFontsNotFound = (params: { fonts: string[] }) => {
    this._getCenter().warning(
      acapI18nTranslate('main.notification.title.fontNotFound'),
      acapI18nTranslate('main.message.fontsNotFound', {
        fonts: acapFormatFontsMissedReplacement(params.fonts)
      }),
      {
        source: 'font-missed',
        fontNames: params.fonts,
        ...this.sessionOptions()
      }
    )
  }

  /**
   * Handles a single font required by the drawing that is unavailable at render time.
   *
   * Replaces any prior `font-missed` entry for the same font name.
   *
   * @param params - Font name and how many text objects require it.
   */
  private readonly _onFontNotFound = (params: {
    fontName: string
    count: number
  }) => {
    const fontName = params.fontName.trim()
    if (!fontName) return
    const center = this._getCenter()
    center.removeWhere(
      notification =>
        notification.source === 'font-missed' &&
        notification.fontNames?.includes(fontName) === true
    )
    center.warning(
      acapI18nTranslate('main.notification.title.fontNotFound'),
      acapI18nTranslate('main.message.fontMissedInDrawing', {
        font: fontName,
        count: params.count,
        replacementFont: AcApFontUtil.getReplacementFontName(fontName)
      }),
      { source: 'font-missed', fontNames: [fontName], ...this.sessionOptions() }
    )
  }

  /**
   * Prunes resolved `font-missed` notifications when missed-data changes.
   */
  private readonly _onMissedDataChanged = () => {
    const missedFonts = Object.keys(this._docManager.curView.missedData.fonts)
    this._getCenter().removeResolvedFontMissedNotifications(missedFonts)
  }

  /**
   * Handles failure to fetch the available-fonts catalog.
   *
   * @param params - Catalog URL that failed.
   */
  private readonly _onFailedToGetFonts = (params: { url: string }) => {
    this._getCenter().error(
      acapI18nTranslate('main.notification.title.systemError'),
      acapI18nTranslate('main.message.failedToGetAvaiableFonts', {
        url: params.url
      }),
      this.sessionOptions()
    )
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
  private readonly _onDocumentToBeDestroyed = (args: AcApDocumentEventArgs) => {
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
    docManager: AcApDocManager,
    getCenter: () => AcApNotificationCenter
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
    eventBus.on('fonts-not-loaded', this._onFontsNotLoaded)
    eventBus.on('fonts-not-found', this._onFontsNotFound)
    eventBus.on('font-not-found', this._onFontNotFound)
    eventBus.on('missed-data-changed', this._onMissedDataChanged)
    eventBus.on('failed-to-get-avaiable-fonts', this._onFailedToGetFonts)

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
    eventBus.off('fonts-not-loaded', this._onFontsNotLoaded)
    eventBus.off('fonts-not-found', this._onFontsNotFound)
    eventBus.off('font-not-found', this._onFontNotFound)
    eventBus.off('missed-data-changed', this._onMissedDataChanged)
    eventBus.off('failed-to-get-avaiable-fonts', this._onFailedToGetFonts)

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
