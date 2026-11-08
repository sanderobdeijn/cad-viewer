import { AcEdBaseView } from '../editor'
import { AcApContext } from './AcApContext'
import { AcApDocument } from './AcApDocument'

type SceneVisibilityView = AcEdBaseView & {
  hasEntity(objectId: string): boolean
  setEntitySceneVisible(objectId: string, visible: boolean): boolean
}

/**
 * Returns true when the view supports session-only object visibility changes.
 */
function isSceneVisibilityView(
  view: AcApContext['view']
): view is SceneVisibilityView {
  return (
    typeof view.hasEntity === 'function' &&
    typeof view.setEntitySceneVisible === 'function'
  )
}

/**
 * Applies the session hidden state for one object when it enters the scene.
 */
export function applySessionHiddenObjectState(
  doc: AcApDocument,
  view: AcApContext['view'],
  objectId: string
) {
  if (!doc.isObjectHidden(objectId) || !isSceneVisibilityView(view)) {
    return
  }

  view.setEntitySceneVisible(objectId, false)
}

/**
 * Temporarily suppresses display of the specified objects in the current view.
 *
 * Hidden objects remain in the drawing database and reappear after
 * {@link unisolateObjects} or when the document session ends.
 */
export function hideObjects(context: AcApContext, objectIds: string[]): number {
  const view = context.view
  if (!isSceneVisibilityView(view)) {
    return 0
  }

  const doc = context.doc
  let count = 0

  for (const objectId of objectIds) {
    if (doc.isObjectHidden(objectId)) {
      continue
    }

    if (!doc.modelSync.item(objectId) || !view.hasEntity(objectId)) {
      continue
    }

    if (view.setEntitySceneVisible(objectId, false)) {
      doc.addHiddenObject(objectId)
      count++
    }
  }

  if (count > 0) {
    view.selectionSet.clear()
  }

  return count
}

/**
 * Redisplay all objects temporarily hidden by {@link hideObjects}.
 */
export function unisolateObjects(context: AcApContext): number {
  const view = context.view
  if (!isSceneVisibilityView(view)) {
    return 0
  }

  const doc = context.doc
  const hiddenIds = doc.takeHiddenObjects()
  let count = 0

  for (const objectId of hiddenIds) {
    if (!doc.modelSync.item(objectId) || !view.hasEntity(objectId)) {
      continue
    }

    if (view.setEntitySceneVisible(objectId, true)) {
      count++
    }
  }

  view.selectionSet.clear()
  return count
}
