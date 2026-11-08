/**
 * Wires {@link UIToolbar} document open / open-mode state to DocManager.
 *
 * Kept separate from the UI module so the offline HTML viewer-runtime can
 * import {@link UIToolbar} without pulling DocManager into the IIFE.
 *
 * @module ApplicationToolbarDocBind
 * @packageDocumentation
 */

import { ApplicationDocManager } from '../app/ApplicationDocManager'
import { EditorOpenMode } from '../editor/view/EditorOpenMode'
import type { UIToolbar } from '../ui/toolbar/UIToolbar'

/**
 * Binds document activated / opening events to a main toolbar.
 * Safe to call after DocManager construction completes.
 *
 * @param toolbar - Toolbar created for a view container.
 * @returns Cleanup that removes listeners.
 */
export function applicationBindToolbarDocState(toolbar: UIToolbar): () => void {
  const syncFromDocument = () => {
    const dm = ApplicationDocManager.tryGetInstance()
    if (!dm) {
      toolbar.setDocState({
        hasDocument: false,
        isOpening: false,
        openMode: EditorOpenMode.Read
      })
      return
    }
    const doc = dm.curDocument
    toolbar.setDocState({
      hasDocument: Boolean(doc),
      isOpening: false,
      openMode: doc?.openMode ?? EditorOpenMode.Read
    })
  }

  const onDocumentToBeOpened = () => {
    toolbar.setDocState({ isOpening: true })
  }

  const attachDocManager = (attempt = 0) => {
    const dm = ApplicationDocManager.tryGetInstance()
    if (!dm) {
      // Created mid-constructor: retry briefly until the singleton is assigned.
      // Cap retries so hosts without DocManager never spin forever.
      if (attempt < 20) queueMicrotask(() => attachDocManager(attempt + 1))
      return
    }
    dm.events.documentActivated.addEventListener(syncFromDocument)
    dm.events.documentToBeOpened.addEventListener(onDocumentToBeOpened)
    syncFromDocument()
  }

  attachDocManager()

  return () => {
    const dm = ApplicationDocManager.tryGetInstance()
    dm?.events.documentActivated.removeEventListener(syncFromDocument)
    dm?.events.documentToBeOpened.removeEventListener(onDocumentToBeOpened)
  }
}
