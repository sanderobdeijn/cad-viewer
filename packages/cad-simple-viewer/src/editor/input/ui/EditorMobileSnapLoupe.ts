/**
 * Shared mobile snap loupe: one HUD per view for point pick and osnap grip drag.
 *
 * On phone/pad, whenever a touch gesture needs precise object snap, callers
 * refresh this loupe instead of owning their own {@link EditorSnapLoupe}.
 */

import { ApplicationOsnapMode } from '../../../model/ApplicationOsnapMode'
import type { EditorBaseView } from '../../view'
import { EditorOsnapResolver } from '../EditorOsnapResolver'
import type { EditorMarkerType } from '../marker/EditorMarker'
import { editorInteractionStrategy } from './EditorInteractionStrategy'
import { EditorSnapLoupe } from './EditorSnapLoupe'

/** Lazily created loupe HUD keyed by view. */
const loupes = new WeakMap<EditorBaseView, EditorSnapLoupe>()

/**
 * World-space snap sample used to place the OSNAP glyph inside the loupe.
 * `type` may be an object-snap mode or an already-resolved marker shape.
 */
export interface EditorMobileSnapLoupeSnap {
  /** Snapped world X. */
  x: number
  /** Snapped world Y. */
  y: number
  /** Object-snap mode or marker shape for the glyph. */
  type: ApplicationOsnapMode | EditorMarkerType
}

/**
 * Shows or repositions the shared snap loupe around a client sample.
 *
 * No-op on desktop UI. Creates the HUD on first use for this view.
 *
 * @param view - View that owns the overlay viewport and coordinate helpers.
 * @param clientX - Sample X in viewport/client CSS pixels.
 * @param clientY - Sample Y in viewport/client CSS pixels.
 * @param snap - Active object snap in world space, if any.
 */
export function editorRefreshMobileSnapLoupe(
  view: EditorBaseView,
  clientX: number,
  clientY: number,
  snap?: EditorMobileSnapLoupeSnap | null
): void {
  if (!editorInteractionStrategy().point.showsSnapLoupeOnTouchPick) return
  let loupe = loupes.get(view)
  if (!loupe) {
    loupe = new EditorSnapLoupe(view)
    loupes.set(view, loupe)
  }
  const canvas = view.viewportToCanvas({ x: clientX, y: clientY })
  if (snap) {
    const snapScreen = view.worldToScreen(snap)
    const markerType =
      typeof snap.type === 'string'
        ? snap.type
        : EditorOsnapResolver.osnapModeToMarkerType(snap.type)
    loupe.show(
      canvas.x,
      canvas.y,
      { x: snapScreen.x, y: snapScreen.y },
      markerType
    )
  } else {
    loupe.show(canvas.x, canvas.y)
  }
}

/**
 * Hides the shared snap loupe for `view` if it is visible.
 *
 * @param view - View whose loupe should be hidden.
 */
export function editorHideMobileSnapLoupe(view: EditorBaseView): void {
  loupes.get(view)?.hide()
}

/**
 * Disposes the shared loupe HUD for `view` (tests / view teardown).
 *
 * @param view - View whose loupe should be destroyed.
 */
export function editorDisposeMobileSnapLoupe(view: EditorBaseView): void {
  const loupe = loupes.get(view)
  if (!loupe) return
  loupe.dispose()
  loupes.delete(view)
}
