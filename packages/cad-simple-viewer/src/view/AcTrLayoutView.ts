import {
  AcTrBaseView,
  AcTrOverlayViewport,
  AcTrRenderer
} from '@mlightcad/three-renderer'
import { AxesGizmo, ObjectPosition } from '@mlightcad/three-viewcube'
import * as THREE from 'three'

import { AcEdViewMode } from '../editor/view/AcEdBaseView'
import { AcTrScene } from './AcTrScene'

/**
 * Interface for database entity event arguments.
 * Provides context information for entity-related events.
 */
export interface AcDbEntityEventArgs {
  /** The layout view associated with the event */
  view: AcTrLayoutView
}

/**
 * Each layout has its own camera and camera control. This class represents view associated with one layout.
 *
 * A layout view manages the visual representation and interaction for a specific AutoCAD layout.
 * It provides:
 * - Camera and view controls specific to the layout
 * - View mode switching (selection, pan, etc.)
 * - Axes gizmo for orientation feedback
 * - The screen-fixed overlay viewport used by the snap loupe
 *
 * @example
 * ```typescript
 * const layoutView = new AcTrLayoutView(renderer, layoutId, 800, 600);
 * layoutView.mode = AcEdViewMode.PAN;
 * layoutView.render(scene);
 * ```
 */
export class AcTrLayoutView extends AcTrBaseView {
  /** The block table record ID associated with this layout */
  private _layoutBtrId: string
  /** The axes gizmo for showing coordinate system orientation */
  private _axesGizmo: AxesGizmo
  /** The current view mode (selection, pan, etc.) */
  private _mode: AcEdViewMode
  /** Screen-fixed overlay viewport (snap loupe, etc.). */
  private readonly _overlayViewport: AcTrOverlayViewport

  /**
   * Construct one instance of this class.
   *
   * @param renderer - Input renderer for this view
   * @param layoutBtrId - Input the id of the block table record associated the layout
   * @param width - Input width of this view in pixels
   * @param height - Input height of this view in pixels
   */
  constructor(
    renderer: AcTrRenderer,
    layoutBtrId: string,
    width: number,
    height: number
  ) {
    super(renderer, width, height)
    this._layoutBtrId = layoutBtrId
    this._mode = AcEdViewMode.SELECTION
    this._axesGizmo = this.createAxesGizmo()
    this._overlayViewport = new AcTrOverlayViewport(renderer)
  }

  /**
   * Gets the block table record ID associated with this layout.
   *
   * @returns The layout's block table record ID
   */
  get layoutBtrId() {
    return this._layoutBtrId
  }

  /**
   * The view mode of the current layout view.
   * Controls how mouse interactions are interpreted (selection vs pan mode).
   */
  get mode() {
    return this._mode
  }
  set mode(value: AcEdViewMode) {
    if (value == AcEdViewMode.SELECTION) {
      this._cameraControls.mouseButtons = {
        MIDDLE: THREE.MOUSE.PAN
      }
    } else if (value == AcEdViewMode.PAN) {
      this._cameraControls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN
      }
    }
    this._cameraControls.update()
    this._mode = value
  }

  /**
   * Screen-fixed overlay viewport drawn after the layout.
   *
   * @returns The overlay used for the snap loupe and similar HUD viewports.
   */
  get overlayViewport(): AcTrOverlayViewport {
    return this._overlayViewport
  }

  /**
   * The internal THREE camera used by this layout view.
   */
  get internalCamera() {
    return this._camera.internalCamera
  }

  /**
   * Resize this layout view.
   * Updates the view dimensions and the camera frustum.
   *
   * @param width - Input new width of the layout view in pixels
   * @param height - Input new height of the layout view in pixels
   */
  resize(width: number, height: number) {
    this._height = height
    this._width = width
    this._frustum = height / 2
    this.updateCameraFrustum()
  }

  /**
   * Renders the scene in this layout view.
   * Performs the main rendering pass and then draws the overlay viewport.
   * Updates the axes gizmo to reflect the current camera orientation.
   *
   * @param scene - The scene containing the layout data to render
   */
  render(scene: AcTrScene) {
    this._renderer.clear()
    const needsRedraw = this._renderer.render(scene.internalScene, this._camera)
    this.drawOverlay(scene)
    this._axesGizmo?.update()
    return needsRedraw
  }

  /**
   * Creates and configures the axes gizmo for this view.
   * The gizmo shows the current coordinate system orientation and is positioned
   * at the bottom-left of the view without a Z-axis (2D view).
   *
   * @returns The configured axes gizmo instance
   */
  private createAxesGizmo() {
    const axesGizmo = new AxesGizmo(
      this._camera.internalCamera,
      this._renderer.internalRenderer,
      {
        hasZAxis: false,
        pos: ObjectPosition.LEFT_BOTTOM
      }
    )
    return axesGizmo
  }

  /**
   * Draws the screen-fixed overlay viewport (magnified snap loupe) on top of
   * the main layout.
   *
   * @param scene - Scene containing the layout.
   */
  private drawOverlay(scene: AcTrScene) {
    const overlay = this._overlayViewport
    if (!overlay.visible) return
    overlay.render(scene.internalScene, this._height)
  }
}
