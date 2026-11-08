import { GeometryBox2d, GeometryPoint2d } from '@mlightcad/geometry-engine'

import { EditorBaseView } from '../../view'
import { EditorMarker, EditorMarkerType } from '../marker/EditorMarker'
import { editorInteractionStrategy } from './EditorInteractionStrategy'
import {
  EDITOR_SNAP_LOUPE_SIZE_PX,
  EDITOR_SNAP_LOUPE_ZOOM,
  editorLoupeLocalFromCanvasDelta,
  editorResolveLoupePlacement
} from './EditorSnapLoupeMath'

export {
  EDITOR_SNAP_LOUPE_GAP_BELOW_PROMPT_PX,
  EDITOR_SNAP_LOUPE_INSET_PX,
  EDITOR_SNAP_LOUPE_SIZE_PX,
  EDITOR_SNAP_LOUPE_ZOOM,
  editorLoupeLocalFromCanvasDelta,
  editorResolveLoupePlacement
} from './EditorSnapLoupeMath'

/**
 * DOM chrome for the mobile snap loupe: border and OSNAP glyph.
 *
 * CAD geometry is drawn by the view's overlay viewport; this widget only
 * drives that viewport and paints HUD on top.
 */
export class EditorSnapLoupe {
  /** Whether the loupe stylesheet has been injected into `document.head`. */
  private static stylesInjected = false

  /** View whose overlay viewport shows the magnified CAD content. */
  private readonly view: EditorBaseView
  /** Root HUD element (border), positioned over the overlay. */
  private readonly root: HTMLDivElement
  /** OSNAP glyph drawn inside the loupe when a snap is active. */
  private readonly marker: EditorMarker

  /**
   * Creates the loupe HUD and attaches it to the view container.
   *
   * @param view - View that owns the overlay viewport and coordinate helpers.
   */
  constructor(view: EditorBaseView) {
    this.view = view
    EditorSnapLoupe.injectCss()
    this.root = document.createElement('div')
    this.root.className = 'ml-snap-loupe'
    this.root.setAttribute('aria-hidden', 'true')
    const hostPosition = getComputedStyle(view.container).position
    if (hostPosition === 'static') {
      view.container.style.position = 'relative'
    }
    view.container.appendChild(this.root)
    this.marker = new EditorMarker(
      'rect',
      12,
      'var(--ml-ui-canvas-line, green)',
      this.root
    )
    this.hide()
  }

  /**
   * Shows the loupe at the canvas-local sample and updates the overlay viewport.
   *
   * @param canvasX - Sample X in canvas CSS pixels.
   * @param canvasY - Sample Y in canvas CSS pixels.
   * @param snapCanvas - Snapped point in canvas CSS pixels, if any.
   * @param snapType - OSNAP marker shape when snapped.
   */
  show(
    canvasX: number,
    canvasY: number,
    snapCanvas?: { x: number; y: number },
    snapType?: EditorMarkerType
  ) {
    const placement = editorResolveLoupePlacement(this.view.container, {
      usesSessionChrome: editorInteractionStrategy().point.usesSessionChrome
    })
    const { x: inset, y: top, size } = placement
    const viewBox = editorLoupeViewBoxFromCanvasSample(
      this.view,
      canvasX,
      canvasY
    )
    this.view.setSnapLoupe({ x: inset, y: top, size, viewBox })

    const host = this.view.canvasToContainer({ x: inset, y: top })
    this.root.style.left = `${host.x}px`
    this.root.style.top = `${host.y}px`
    this.root.style.display = 'block'

    if (snapCanvas && snapType) {
      this.marker.type = snapType
      this.marker.setPosition(
        editorLoupeLocalFromCanvasDelta(
          snapCanvas.x - canvasX,
          snapCanvas.y - canvasY
        )
      )
    } else {
      this.marker.setPosition({ x: -1000, y: -1000 })
    }
  }

  /**
   * Hides the HUD and the overlay viewport.
   */
  hide() {
    this.root.style.display = 'none'
    this.view.setSnapLoupe(null)
    this.marker.setPosition({ x: -1000, y: -1000 })
  }

  /**
   * Hides the loupe and removes its DOM from the view container.
   */
  dispose() {
    this.hide()
    this.marker.destroy()
    this.root.remove()
  }

  /**
   * Injects loupe HUD styles into `document.head` once per page.
   */
  private static injectCss() {
    if (EditorSnapLoupe.stylesInjected) return
    EditorSnapLoupe.stylesInjected = true
    const style = document.createElement('style')
    style.id = 'ml-snap-loupe-style'
    style.textContent = `
      .ml-snap-loupe {
        position: absolute;
        width: ${EDITOR_SNAP_LOUPE_SIZE_PX}px;
        height: ${EDITOR_SNAP_LOUPE_SIZE_PX}px;
        box-sizing: border-box;
        border: 2px solid var(--ml-ui-canvas-line, #0f0);
        border-radius: 2px;
        pointer-events: none;
        z-index: 20;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
      }
    `
    document.head.appendChild(style)
  }
}

/**
 * World box around a canvas sample that fills the loupe at {@link EDITOR_SNAP_LOUPE_ZOOM}.
 *
 * @param view - View used to convert canvas samples to world coordinates.
 * @param canvasX - Sample X in canvas CSS pixels (loupe center).
 * @param canvasY - Sample Y in canvas CSS pixels (loupe center).
 * @returns Axis-aligned world box mapped onto the square loupe.
 */
export function editorLoupeViewBoxFromCanvasSample(
  view: EditorBaseView,
  canvasX: number,
  canvasY: number
): GeometryBox2d {
  const half = EDITOR_SNAP_LOUPE_SIZE_PX / EDITOR_SNAP_LOUPE_ZOOM / 2
  const p1 = view.screenToWorld({ x: canvasX - half, y: canvasY - half })
  const p2 = view.screenToWorld({ x: canvasX + half, y: canvasY + half })
  const box = new GeometryBox2d()
  box.expandByPoint(new GeometryPoint2d(p1.x, p1.y))
  box.expandByPoint(new GeometryPoint2d(p2.x, p2.y))
  return box
}
