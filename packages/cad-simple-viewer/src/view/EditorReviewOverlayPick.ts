import { GeometryBox2d } from '@mlightcad/geometry-engine'

import { measurementGeometryBounds } from '../command/measure/ApplicationMeasurementGeometry'
import {
  getMeasurementGeometry,
  isMeasurementVisible,
  MEASUREMENT_LAYER,
  pickMeasurementAt
} from '../command/measure/ApplicationMeasurementStore'
import type { EditorSelectionAction, EditorSelectionMode } from '../editor'
import {
  isSpatialBoxFullyInside,
  type ThreeRendererSpatialIndexBBox} from '../spatialIndex/ThreeRendererSpatialIndex'
import type { ThreeRendererView2d } from './ThreeRendererView2d'

/** Pixel radius used when clicking measurement strokes. */
export const REVIEW_OVERLAY_HIT_THRESHOLD_PX = 10

function toSpatialBBox(box: GeometryBox2d): ThreeRendererSpatialIndexBBox {
  return {
    minX: box.min.x,
    minY: box.min.y,
    maxX: box.max.x,
    maxY: box.max.y
  }
}

function boxesIntersect(
  a: ThreeRendererSpatialIndexBBox,
  b: ThreeRendererSpatialIndexBBox
): boolean {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  )
}

function overlayMatchesBox(
  bounds: GeometryBox2d,
  selection: ThreeRendererSpatialIndexBBox,
  mode: EditorSelectionMode
): boolean {
  const item = toSpatialBBox(bounds)
  if (mode === 'window') {
    return isSpatialBoxFullyInside(item, selection)
  }
  return boxesIntersect(item, selection)
}

/**
 * Collect measurement group ids whose geometry AABB matches the
 * selection box (window = fully inside, crossing = intersects).
 */
export function collectReviewOverlayIdsByBox(
  view: ThreeRendererView2d,
  box: GeometryBox2d,
  mode: EditorSelectionMode
): string[] {
  const selection = toSpatialBBox(box)
  const layoutId = view.activeLayoutBtrId
  const ids: string[] = []

  if (!isMeasurementVisible()) return ids

  for (const group of view.htmlTransientManager.groupsOnLayer(
    MEASUREMENT_LAYER
  )) {
    if (!group.visible) continue
    if (group.layoutId != null && group.layoutId !== layoutId) continue
    const geometry = getMeasurementGeometry(group.id)
    if (!geometry) continue
    const bounds = measurementGeometryBounds(geometry)
    if (!bounds) continue
    if (overlayMatchesBox(bounds, selection, mode)) {
      ids.push(group.id)
    }
  }

  return ids
}

/**
 * Apply a click to one overlay group.
 *
 * @returns `true` when this click should consume the pick (skip CAD entities).
 *   `'remove'` / `'add'` only consume when selection actually changed, so a
 *   Shift-click on an unselected overlay can still reach CAD geometry.
 *   `'replace'` always consumes a hit overlay.
 */
function applyOverlaySelection(
  view: ThreeRendererView2d,
  id: string,
  action: EditorSelectionAction
): boolean {
  const ht = view.htmlTransientManager
  if (action === 'remove') {
    return ht.deselectGroup(id)
  }
  if (action === 'add') {
    return ht.selectGroup(id, false)
  }
  ht.selectGroup(id, true)
  return true
}

function applyOverlayBoxSelection(
  view: ThreeRendererView2d,
  ids: string[],
  action: EditorSelectionAction
): boolean {
  const ht = view.htmlTransientManager
  let changed = false

  if (action === 'replace') {
    const hadSelection = ht.hasSelection()
    ht.deselectAll()
    for (const id of ids) {
      if (ht.selectGroup(id, false)) changed = true
    }
    return hadSelection || changed
  }

  if (ids.length === 0) return false

  if (action === 'add') {
    for (const id of ids) {
      if (ht.selectGroup(id, false)) changed = true
    }
    return changed
  }

  for (const id of ids) {
    if (ht.deselectGroup(id)) changed = true
  }
  return changed
}

/**
 * Select a measurement overlay under a canvas click on its
 * drawn stroke (CAD transient or canvas leader), not just HTML handles.
 *
 * @returns `true` when an overlay was hit and this click should not fall
 *   through to CAD entity picking.
 */
export function trySelectReviewOverlay(
  view: ThreeRendererView2d,
  canvasX: number,
  canvasY: number,
  action: EditorSelectionAction
): boolean {
  const threshold = Math.max(
    view.selectionBoxSize * 2,
    REVIEW_OVERLAY_HIT_THRESHOLD_PX
  )
  const id = pickMeasurementAt(view, canvasX, canvasY, threshold)
  if (!id) return false
  const consumed = applyOverlaySelection(view, id, action)
  if (consumed) view.isHtmlDirty = true
  return consumed
}

/**
 * Select measurement overlays by window or crossing box.
 *
 * @returns `true` when HTML selection state changed.
 */
export function trySelectReviewOverlaysByBox(
  view: ThreeRendererView2d,
  box: GeometryBox2d,
  mode: EditorSelectionMode,
  action: EditorSelectionAction
): boolean {
  const ids = collectReviewOverlayIdsByBox(view, box, mode)
  const changed = applyOverlayBoxSelection(view, ids, action)
  if (changed) view.isHtmlDirty = true
  return changed
}
