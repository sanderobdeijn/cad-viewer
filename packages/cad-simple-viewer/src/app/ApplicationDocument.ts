import { log } from '@mlightcad/common'

import { EditorOpenMode } from '../editor/view'
import { ApplicationEntityService } from '../service/ApplicationEntityService'
import { ApplicationDocManager } from './ApplicationDocManager'
import { ApplicationModelSync } from './ApplicationModelSync'
import { ApplicationOpenDatabaseOptions } from './ApplicationOpenDatabaseOptions'

/** Sentinel stored in {@link ApplicationDocument.docTitle} for unsaved documents. */
export const APPLICATION_UNTITLED_DOC_TITLE = 'Untitled'

/**
 * Represents a CAD document: the drawing model and its metadata.
 *
 * This class handles:
 * - Creating blank drawings
 * - Managing document properties (title, access mode)
 * - Providing access to the drawing model
 */
export class ApplicationDocument {
  /** The URI of the opened document, if opened from a URI */
  private _uri?: string
  /** The file name of the document */
  private _fileName: string = ''
  /** The display title of the document */
  private _docTitle: string = ''
  /** The access mode for the document */
  private _openMode: EditorOpenMode = EditorOpenMode.Write
  /** Object ids temporarily hidden by HIDEOBJECTS in the current session */
  private _hiddenObjects = new Set<string>()
  /** Lazily created entity service bound to this document's model. */
  private _entityService?: ApplicationEntityService
  /** Holds the drawing model and its drawables */
  private readonly _modelSync: ApplicationModelSync

  /**
   * Creates a new document instance with an empty drawing.
   *
   * The document is initialized with {@link APPLICATION_UNTITLED_DOC_TITLE} and write mode enabled.
   */
  constructor() {
    this.docTitle = APPLICATION_UNTITLED_DOC_TITLE
    this._openMode = EditorOpenMode.Write
    this._modelSync = new ApplicationModelSync(this, () => {
      const manager = ApplicationDocManager.tryGetInstance()
      return manager?.curDocument === this ? manager.curView : undefined
    })
  }

  /**
   * The model of this drawing: its shapes, points and dimensions. The drawing
   * window and the text editor show this model.
   */
  get model() {
    return this._modelSync.model
  }

  /** Holds the drawing model, its drawables and applies edited text. */
  get modelSync() {
    return this._modelSync
  }

  /**
   * Fills this document with a blank drawing and draws it.
   *
   * @param options - Options applied to the new drawing
   * @returns Promise resolving to true if successful, false if failed
   */
  async createNewDrawing(options: ApplicationOpenDatabaseOptions) {
    this._uri = undefined
    this._fileName = ''
    this._openMode = options?.mode ?? EditorOpenMode.Write
    this.docTitle = APPLICATION_UNTITLED_DOC_TITLE
    try {
      this._modelSync.resync()
      return true
    } catch (error) {
      log.error('Failed to create a new drawing:', error)
      return false
    }
  }

  /**
   * Gets the URI of the document if opened from a URI.
   *
   * @returns The document URI, or undefined if not opened from URI
   */
  get uri() {
    return this._uri
  }

  /**
   * Gets the file name of the current document.
   *
   * @returns The file name, or an empty string for untitled documents
   */
  get fileName() {
    return this._fileName
  }

  /**
   * Gets the display title of the document.
   *
   * @returns The title of the document
   */
  get docTitle() {
    return this._docTitle
  }

  /**
   * Sets the display title of the document.
   *
   * Notes:
   * The browser tab title isn't updated on purpose because users may use it as
   * one component and don't want to the browser tab title changed. So if you
   * want to change the browser tab title, you can listen events
   * `ApplicationDocManager.events.documentActivated` to change it in your event listener.
   *
   * @param value - The new document title
   */
  set docTitle(value: string) {
    this._docTitle = value
  }

  /**
   * Gets the access mode of the document.
   *
   * @returns The access mode (Read or Write)
   */
  get openMode() {
    return this._openMode
  }

  /**
   * Returns true when this document is an unused Untitled drawing that OPEN
   * can reuse instead of creating another tab.
   */
  get isReusableUntitled(): boolean {
    if (this._uri || this._fileName) {
      return false
    }
    if (this._docTitle !== APPLICATION_UNTITLED_DOC_TITLE) {
      return false
    }
    if (this._modelSync.model.items.length > 0) {
      return false
    }
    return true
  }

  /**
   * Returns true when the object is temporarily hidden by HIDEOBJECTS.
   */
  isObjectHidden(objectId: string) {
    return this._hiddenObjects.has(objectId)
  }

  /**
   * Records one object as temporarily hidden in the current session.
   */
  addHiddenObject(objectId: string) {
    this._hiddenObjects.add(objectId)
  }

  /**
   * Returns and clears all temporarily hidden object ids.
   */
  takeHiddenObjects(): string[] {
    const hiddenIds = [...this._hiddenObjects]
    this._hiddenObjects.clear()
    return hiddenIds
  }

  /**
   * Returns the entity service for this document's model.
   */
  get entityService(): ApplicationEntityService {
    if (!this._entityService) {
      this._entityService = new ApplicationEntityService(this._modelSync)
    }
    return this._entityService
  }

  /**
   * Tears down document-scoped services and session state.
   *
   * Call before replacing this document's drawing content or when discarding
   * the document. Lazy services are recreated on the next access.
   */
  destroy(): void {
    this._entityService = undefined
    this._hiddenObjects.clear()
  }
}
