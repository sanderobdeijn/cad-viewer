import {
  ThreeRendererBaseView,
  ThreeRendererRenderer
} from '@mlightcad/three-renderer'
import { AxesGizmo, ObjectPosition } from '@mlightcad/three-viewcube'
import * as THREE from 'three'

import { EditorViewMode } from '../editor/view/EditorBaseView'
import { ThreeRendererScene } from './ThreeRendererScene'

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
 * const layoutView = new ThreeRendererLayoutView(renderer, layoutId, 800, 600);
 * layoutView.mode = EditorViewMode.PAN;
 * layoutView.render(scene);
 * ```
 */
export class ThreeRendererLayoutView extends ThreeRendererBaseView {
  /** The block table record ID associated with this layout */
  private _layoutBtrId: string
  /** The axes gizmo for showing coordinate system orientation */
  private _axesGizmo: AxesGizmo
  /** The current view mode (selection, pan, etc.) */
  private _mode: EditorViewMode

  /**
   * Construct one instance of this class.
   *
   * @param renderer - Input renderer for this view
   * @param layoutBtrId - Input the id of the block table record associated the layout
   * @param width - Input width of this view in pixels
   * @param height - Input height of this view in pixels
   */
  constructor(
    renderer: ThreeRendererRenderer,
    layoutBtrId: string,
    width: number,
    height: number
  ) {
    super(renderer, width, height)
    this._layoutBtrId = layoutBtrId
    this._mode = EditorViewMode.SELECTION
    this._axesGizmo = this.createAxesGizmo()
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
  set mode(value: EditorViewMode) {
    if (value == EditorViewMode.SELECTION) {
      this._cameraControls.mouseButtons = {
        MIDDLE: THREE.MOUSE.PAN
      }
    } else if (value == EditorViewMode.PAN) {
      this._cameraControls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN
      }
    }
    this._cameraControls.update()
    this._mode = value
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
  render(scene: ThreeRendererScene) {
    this._renderer.clear()
    const needsRedraw = this._renderer.render(scene.internalScene, this._camera)
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

}
