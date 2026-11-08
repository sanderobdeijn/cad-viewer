import { GeometryBox2d, GeometryVector2d } from '@mlightcad/geometry-engine'
import * as THREE from 'three'

import { ThreeRendererRenderer } from '../renderer/ThreeRendererRenderer'
import { ThreeRendererCamera } from './ThreeRendererCamera'
import { type ThreeRendererCssRect, threeRendererCssTopLeftRectToGl } from './ThreeRendererCssRect'

/**
 * Screen-fixed overlay viewport: a CSS-pixel rectangle on the canvas that
 * shows an independent orthographic view of a world-space box.
 *
 * Used for transient magnifiers such as the snap loupe.
 */
export class ThreeRendererOverlayViewport {
  /** Shared WebGL renderer (same canvas as the main layout view). */
  private readonly _renderer: ThreeRendererRenderer
  /** Orthographic camera fitted to {@link viewBox} inside {@link screenRect}. */
  private readonly _camera: ThreeRendererCamera
  /** When false, {@link render} is a no-op. */
  private _visible = false
  /** On-canvas rectangle in CSS pixels (origin top-left). */
  private _screenRect: ThreeRendererCssRect = { x: 0, y: 0, width: 1, height: 1 }
  /** World-space extents shown in {@link screenRect}. */
  private readonly _viewBox = new GeometryBox2d()
  /** CSS width used when fitting the camera to {@link viewBox}. */
  private _width = 1
  /** CSS height used when fitting the camera to {@link viewBox}. */
  private _height = 1

  /**
   * Creates an overlay viewport that draws into `renderer`'s canvas.
   *
   * @param renderer - Shared WebGL renderer (same canvas as the main view).
   */
  constructor(renderer: ThreeRendererRenderer) {
    this._renderer = renderer
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 1000)
    camera.position.set(0, 0, 500)
    camera.up.set(0, 1, 0)
    camera.updateProjectionMatrix()
    this._camera = new ThreeRendererCamera(camera)
  }

  /**
   * Whether this overlay is drawn during the layout's overlay pass.
   *
   * When false, {@link render} is a no-op.
   */
  get visible() {
    return this._visible
  }
  /**
   * @param value - When false, {@link render} is a no-op.
   */
  set visible(value: boolean) {
    this._visible = value
  }

  /**
   * CSS rectangle of this overlay (origin at the top-left of the canvas).
   */
  get screenRect(): Readonly<ThreeRendererCssRect> {
    return this._screenRect
  }

  /**
   * World-space box shown in {@link screenRect}.
   */
  get viewBox(): GeometryBox2d {
    return this._viewBox
  }

  /**
   * Sets the on-canvas rectangle in CSS pixels (origin top-left).
   *
   * @param x - Left edge in CSS pixels.
   * @param y - Top edge in CSS pixels.
   * @param width - Width in CSS pixels.
   * @param height - Height in CSS pixels.
   */
  setScreenRect(x: number, y: number, width: number, height: number) {
    this._screenRect = { x, y, width, height }
    this._width = Math.max(width, 1)
    this._height = Math.max(height, 1)
    this.applyViewBox()
  }

  /**
   * Sets the world-space extents shown in the screen rectangle.
   *
   * @param box - World box mapped onto {@link screenRect}.
   */
  setViewBox(box: GeometryBox2d) {
    this._viewBox.min.copy(box.min)
    this._viewBox.max.copy(box.max)
    this.applyViewBox()
  }

  /**
   * Renders `scene` into {@link screenRect}, clearing that region first so
   * the overlay replaces the main view's pixels.
   *
   * @param scene - Scene graph to draw (typically the active layout).
   * @param canvasCssHeight - Canvas CSS height used to convert top-left → GL.
   */
  render(scene: THREE.Object3D, canvasCssHeight: number) {
    if (!this._visible || this._viewBox.isEmpty()) return
    if (this._screenRect.width < 1 || this._screenRect.height < 1) return
    this.renderRect(
      scene,
      this._screenRect,
      this._screenRect,
      canvasCssHeight,
      {
        clearColor: true
      }
    )
  }

  /**
   * Refits the overlay camera to the stored {@link viewBox} and screen size.
   */
  private applyViewBox() {
    if (this._viewBox.isEmpty()) return
    this.fitCamera(this._viewBox, this._width, this._height)
  }

  /**
   * Fits the orthographic camera so `box` fills a CSS rectangle of
   * `width` × `height`.
   *
   * @param box - World extents to show.
   * @param width - Target CSS width in pixels.
   * @param height - Target CSS height in pixels.
   * @param twist - Optional DVIEW twist in radians.
   */
  private fitCamera(
    box: GeometryBox2d,
    width: number,
    height: number,
    twist?: number
  ) {
    const size = new GeometryVector2d()
    box.getSize(size)
    const center = new GeometryVector2d()
    box.getCenter(center)

    const frustum = Math.max(height, 1) / 2
    const aspect = Math.max(width, 1) / Math.max(height, 1)
    const fitWidth = Math.max(Math.abs(size.x), Number.EPSILON)
    const fitHeight = Math.max(Math.abs(size.y), Number.EPSILON)
    const zoom = Math.min(
      (2 * aspect * frustum) / fitWidth,
      (2 * frustum) / fitHeight
    )

    const camera = this._camera.internalCamera
    camera.left = -aspect * frustum
    camera.right = aspect * frustum
    camera.top = frustum
    camera.bottom = -frustum
    camera.position.set(center.x, center.y, camera.position.z)
    camera.lookAt(center.x, center.y, 0)
    const angle = Number.isFinite(twist) ? (twist as number) : 0
    camera.up.set(-Math.sin(angle), Math.cos(angle), 0)
    camera.setRotationFromEuler(new THREE.Euler(0, 0, angle))
    camera.zoom = zoom
    camera.updateProjectionMatrix()
  }

  /**
   * Issues one scissor/viewport pass: optionally clear, then draw `scene`.
   *
   * @param scene - Geometry to draw.
   * @param viewportRect - CSS rectangle mapped to the camera frustum.
   * @param scissorRect - CSS clip rectangle.
   * @param canvasCssHeight - Canvas CSS height for GL conversion.
   * @param options.clearColor - When true, clear color+depth in the scissor;
   *   otherwise only depth is cleared.
   */
  private renderRect(
    scene: THREE.Object3D,
    viewportRect: ThreeRendererCssRect,
    scissorRect: ThreeRendererCssRect,
    canvasCssHeight: number,
    options: { clearColor: boolean }
  ) {
    const glViewport = threeRendererCssTopLeftRectToGl(viewportRect, canvasCssHeight)
    const glScissor = threeRendererCssTopLeftRectToGl(scissorRect, canvasCssHeight)
    const autoClear = this._renderer.autoClear
    this._renderer.autoClear = false
    const oldViewport = new THREE.Vector4()
    this._renderer.getViewport(oldViewport)

    this._renderer.setScissor(
      glScissor.x,
      glScissor.y,
      glScissor.width,
      glScissor.height
    )
    this._renderer.setScissorTest(true)
    this._renderer.setViewport(
      glViewport.x,
      glViewport.y,
      glViewport.width,
      glViewport.height
    )
    if (options.clearColor) {
      this._renderer.clear()
    } else {
      this._renderer.clearDepth()
    }
    this._renderer.render(scene, this._camera)
    this._renderer.setScissorTest(false)
    this._renderer.setViewport(
      oldViewport.x,
      oldViewport.y,
      oldViewport.z,
      oldViewport.w
    )
    this._renderer.autoClear = autoClear
  }
}
