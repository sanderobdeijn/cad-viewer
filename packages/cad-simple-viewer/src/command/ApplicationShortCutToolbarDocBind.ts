/**
 * Wires {@link UIShortCutToolbar} to DocManager selection state.
 *
 * Kept separate from the UI module so the offline HTML viewer-runtime can
 * import {@link UIShortCutToolbar} without pulling DocManager / measure
 * into the IIFE.
 *
 * @module ApplicationShortCutToolbarDocBind
 * @packageDocumentation
 */

import { ApplicationDocManager } from '../app/ApplicationDocManager'
import type { EditorBaseView } from '../editor/view/EditorBaseView'
import type {
  UIShortCutToolbar,
  UIShortCutToolbarActionState
} from '../ui/UIShortCutToolbar'
import {
  MEASUREMENT_LAYER,
  runMeasurementEdit,
  subscribeMeasurementSelection
} from './measure/ApplicationMeasurementStore'

/**
 * Binds document selection and default command actions to a
 * shortcut toolbar. Safe to call after DocManager construction completes.
 *
 * @param toolbar - Toolbar created for a view container.
 * @returns Cleanup that removes listeners.
 */
export function applicationBindShortCutToolbarDocState(
  toolbar: UIShortCutToolbar
): () => void {
  let unbindViewSelection: (() => void) | null = null

  const resolveActionState = (): UIShortCutToolbarActionState => {
    const dm = ApplicationDocManager.tryGetInstance()
    if (!dm) {
      return { erase: false }
    }
    const view = dm.curView
    const canErase = Boolean(
      view &&
      (view.selectionSet.count > 0 || view.htmlTransientManager.hasSelection())
    )
    return { erase: canErase }
  }

  const runErase = () => {
    const dm = ApplicationDocManager.tryGetInstance()
    if (!dm) return
    const view = dm.curView
    if (view && !view.editor.isActive) {
      let removed = false
      const ht = view.htmlTransientManager
      if (ht.hasSelection()) {
        const selected = ht.getSelectedGroups()
        const measurements = selected.filter(
          group => group.layer === MEASUREMENT_LAYER
        )
        if (measurements.length > 0) {
          runMeasurementEdit(() => {
            for (const group of measurements) {
              ht.remove(group.id)
            }
          })
          removed = true
        }
      }
      if (removed) {
        view.isHtmlDirty = true
        toolbar.syncActionState()
        return
      }
    }
    dm.sendStringToExecute('erase')
  }

  const bindViewSelection = (view: EditorBaseView | null | undefined) => {
    unbindViewSelection?.()
    unbindViewSelection = null
    if (!view) return
    const onSelectionChanged = () => toolbar.syncActionState()
    const { selectionSet } = view
    selectionSet.events.selectionAdded.addEventListener(onSelectionChanged)
    selectionSet.events.selectionRemoved.addEventListener(onSelectionChanged)
    unbindViewSelection = () => {
      selectionSet.events.selectionAdded.removeEventListener(onSelectionChanged)
      selectionSet.events.selectionRemoved.removeEventListener(
        onSelectionChanged
      )
    }
  }

  const onDocumentActivated = () => {
    const dm = ApplicationDocManager.tryGetInstance()
    if (!dm) return
    bindViewSelection(dm.curView)
    toolbar.syncActionState()
  }
  const onSelectionChanged = () => toolbar.syncActionState()

  toolbar.setActions({
    erase: runErase
  })
  toolbar.setActionStateProvider(resolveActionState)

  const attachDocManager = (attempt = 0) => {
    const dm = ApplicationDocManager.tryGetInstance()
    if (!dm) {
      // Created mid-constructor: retry briefly until the singleton is assigned.
      // Cap retries so hosts without DocManager never spin forever.
      if (attempt < 20) queueMicrotask(() => attachDocManager(attempt + 1))
      return
    }
    dm.events.documentActivated.addEventListener(onDocumentActivated)
    bindViewSelection(dm.curView)
    toolbar.syncActionState()
  }

  const offMeasure = subscribeMeasurementSelection(onSelectionChanged)
  attachDocManager()

  return () => {
    offMeasure()
    unbindViewSelection?.()
    const dm = ApplicationDocManager.tryGetInstance()
    dm?.events.documentActivated.removeEventListener(onDocumentActivated)
    toolbar.setActionStateProvider(undefined)
  }
}
