import {
  GeometryArea2d,
  GeometryCircularArc2d,
  GeometryEllipseArc2d,
  GeometryPoint2d,
  GeometryPoint2dLike,
  GeometryPolyline2d
} from '@mlightcad/geometry-engine'
import {
  graphicsInterfaceDrawTessellateOptions,
  GraphicsInterfacePointStyle,
  GraphicsInterfaceRenderer,
  GraphicsInterfaceSubEntityTraits,
  GraphicsInterfaceTextData
} from '@mlightcad/graphic-interface'
import * as THREE from 'three'

import type { ThreeRendererBatchDrawPolicy } from '../draw/ThreeRendererBatchDrawPolicy'
import {
  ThreeRendererEntity,
  ThreeRendererGroup,
  ThreeRendererLine,
  ThreeRendererLineSegments,
  ThreeRendererObject,
  ThreeRendererPoint,
  ThreeRendererPolygon,
  ThreeRendererText
} from '../object'
import {
  buildOffsetRingCenterline,
  buildOffsetRingDirectGeometry
} from '../object/ThreeRendererLineGeometryBuilder'
import { ThreeRendererMaterialManager } from '../style/ThreeRendererMaterialManager'
import { ThreeRendererSubEntityTraitsUtil } from '../util'
import { ThreeRendererCamera } from '../viewport/ThreeRendererCamera'
import {
  ThreeRendererEntityPreview,
  type ThreeRendererEntityPreviewOptions,
  type ThreeRendererEntityPreviewResult
} from './ThreeRendererEntityPreview'
import { ThreeRendererRenderContext } from './ThreeRendererRenderContext'

/**
 * Lifecycle state for the direct-batch draw-call capture session.
 *
 * - `'off'`: capture is inactive; draw methods build full entity geometry.
 * - `'capturing'`: waiting for the first matching primitive draw call.
 * - `'captured'`: exactly one compatible draw call was recorded.
 * - `'missed'`: a second call, an incompatible call, or an empty primitive
 *   aborted the session (caller should fall back to the legacy path).
 *
 * @see {@link ThreeRendererRenderer.beginDirectCapture}
 * @see {@link ThreeRendererRenderer.takeDirectCapture}
 */
export type ThreeRendererDirectCaptureState = 'off' | 'capturing' | 'captured' | 'missed'

/**
 * Shared stand-in entity returned by draw calls while a direct-batch capture
 * session is active.
 *
 * A capture runs `entity.worldDraw(renderer)` purely for its side effects: the
 * first matching draw call is recorded into a payload and the returned drawable
 * is discarded right afterwards. Each capture previously constructed a fresh
 * `ThreeRendererEntity` just to be discarded, which cost one allocation + `dispose` per
 * captured entity (~2s for 434k entities). The shared
 * placeholder is created once per renderer instead. It is intentionally empty:
 * the capture path attaches geometry to the payload, never to the drawable, so
 * the same instance survives every capture session it is handed out for.
 * `dispose()` is intentionally a no-op so callers releasing the capture result
 * cannot tear the shared instance down. It is never created without an owning
 * render context, and it never receives geometry children.
 */
class ThreeRendererDirectCapturePlaceholder extends ThreeRendererEntity {
  /**
   * Keeps the shared placeholder usable after callers release the capture
   * result, which is when a real entity would release geometry/materials.
   */
  override dispose() {}

  /**
   * Keeps the shared placeholder detached without letting three.js allocate a
   * disposal event for it.
   */
  override removeFromParent(): this {
    return this
  }
}

/**
 * Primitive payload captured from a single `worldDraw` draw call for the
 * direct-batch fast path (skip temporary drawable allocate → clone → dispose).
 *
 * Discriminated by `kind`:
 * - `'lineStrip'`: connected polyline vertices from {@link ThreeRendererRenderer.lines}
 *   (and other paths that funnel through private `linePoints`).
 * - `'point'`: a single point plus its display style.
 * - `'area'`: a filled 2-D area.
 * - `'lineSegments'`: raw interleaved segment buffer (positions + indices).
 */
export type ThreeRendererDirectCapturePayload =
  | {
      /** Connected polyline captured from a line-strip draw. */
      kind: 'lineStrip'
      /** World-space vertices along the strip (at least two when captured). */
      points: GeometryPoint2dLike[]
    }
  | {
      /** Single point primitive captured from {@link ThreeRendererRenderer.point}. */
      kind: 'point'
      /** World-space point location. */
      point: GeometryPoint2d
      /** Point display style (size, shape, etc.). */
      style: GraphicsInterfacePointStyle
    }
  | {
      /** Filled area captured from {@link ThreeRendererRenderer.area}. */
      kind: 'area'
      /** Area geometry in drawing coordinates. */
      area: GeometryArea2d
    }
  | {
      /**
       * Closed wide polyline payload shape retained for direct-batch rebuild.
       * {@link ThreeRendererRenderer.offsetRing} no longer captures this kind — fill +
       * centerline stroke cannot share one payload — but batch rebuild still
       * accepts it. `outer[i]` / `inner[i]` are the two offsets of one sample.
       */
      kind: 'offsetRing'
      outer: GeometryPoint2dLike[]
      inner: GeometryPoint2dLike[]
    }
  | {
      /** Indexed line segments captured from {@link ThreeRendererRenderer.lineSegments}. */
      kind: 'lineSegments'
      /** Interleaved position (or other) attribute data. */
      array: Float32Array
      /** Components per vertex in `array`. */
      itemSize: number
      /** Index buffer pairing vertices into segments. */
      indices: Uint16Array
    }

export class ThreeRendererRenderer implements GraphicsInterfaceRenderer<ThreeRendererEntity> {
  /**
   * Z step between successive entities. Keeps the stack within typical
   * orthographic near/far ranges for drawings with hundreds of thousands
   * of entities while remaining above float32 depth precision.
   */
  private static readonly DRAW_ORDER_Z_STEP = 1e-4

  private _context: ThreeRendererRenderContext
  private _renderer: THREE.WebGLRenderer
  private _subEntityTraits: GraphicsInterfaceSubEntityTraits
  /**
   * Current direct-batch capture session state.
   *
   * When not `'off'`, the first matching draw call stores a payload instead of
   * building full entity geometry. A second draw call or incompatible call
   * marks the capture `'missed'`.
   */
  private _directCapture: ThreeRendererDirectCaptureState = 'off'
  /**
   * Payload stored while `_directCapture` is `'captured'`; cleared on miss,
   * cancel, or {@link takeDirectCapture}.
   */
  private _capturedDirectPayload: ThreeRendererDirectCapturePayload | null = null
  /**
   * Lazily created placeholder returned by draw calls during a direct-batch
   * capture session. One instance is reused for every captured entity so the
   * fast path never allocates a throw-away `ThreeRendererEntity`.
   *
   * @see {@link createDirectCapturePlaceholder}
   */
  private _directCapturePlaceholder: ThreeRendererEntity | null = null
  /**
   * Monotonic Z used so later entities occlude earlier ones on the shared
   * CAD plane (AutoCAD creation-order behaviour). Reset when the
   * view clears / starts a new convert.
   */
  private _drawOrderZ = 0

  /**
   * Options for {@link ThreeRendererRenderer} construction beyond a live WebGL backend.
   */
  static readonly DEFAULT_EXPORT_VIEWPORT = { width: 1920, height: 1080 }

  constructor(renderer: THREE.WebGLRenderer) {
    this._renderer = renderer
    this._context = new ThreeRendererRenderContext()
    const size = renderer.getSize(new THREE.Vector2())
    this._context.styleManager.updateLineResolution(size.x, size.y)
    this._subEntityTraits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()
  }

  /**
   * Builds a renderer that can run `worldDraw` / direct-batch capture without
   * a browser, canvas, or WebGL context.
   *
   * Geometry construction never calls `render` / viewport APIs.
   */
  static createForExport(options?: {
    width?: number
    height?: number
  }): ThreeRendererRenderer {
    const width = options?.width ?? ThreeRendererRenderer.DEFAULT_EXPORT_VIEWPORT.width
    const height =
      options?.height ?? ThreeRendererRenderer.DEFAULT_EXPORT_VIEWPORT.height
    return new ThreeRendererRenderer(createExportWebGlStub(width, height))
  }

  /**
   * Starts capturing the next direct-batch draw call from
   * `GraphicsInterfaceDrawable.worldDraw` without building full entity geometry.
   *
   * Resets any previous payload and sets the session to `'capturing'`.
   * Call {@link takeDirectCapture} or {@link cancelDirectCapture} to end it.
   */
  beginDirectCapture() {
    this._directCapture = 'capturing'
    this._capturedDirectPayload = null
  }

  /**
   * Ends the capture session and returns the stored payload when the draw path
   * was a single matching call (`'captured'`).
   *
   * Always clears the session back to `'off'`, including on miss.
   *
   * @returns The captured primitive payload, or `null` when capture missed or
   *   was never started successfully.
   */
  takeDirectCapture(): ThreeRendererDirectCapturePayload | null {
    const payload =
      this._directCapture === 'captured' ? this._capturedDirectPayload : null
    this._directCapture = 'off'
    this._capturedDirectPayload = null
    return payload
  }

  /**
   * Aborts an in-flight direct capture without returning a payload.
   *
   * Clears both the session state and any stored payload. Prefer this when the
   * caller abandons the fast path before `worldDraw` finishes.
   */
  cancelDirectCapture() {
    this._directCapture = 'off'
    this._capturedDirectPayload = null
  }

  /**
   * Marks the current capture session as `'missed'` and drops any stored
   * payload.
   *
   * No-op when capture is already `'off'`. Used when a second draw call,
   * unsupported primitive, or empty geometry makes the entity ineligible for
   * direct batching.
   */
  private missDirectCapture() {
    if (this._directCapture !== 'off') {
      this._directCapture = 'missed'
      this._capturedDirectPayload = null
    }
  }

  /**
   * Attempts to store `payload` as the sole captured primitive for this
   * session.
   *
   * Succeeds only while the session is `'capturing'` and no payload has been
   * stored yet. Otherwise marks the session as missed via
   * {@link missDirectCapture}.
   *
   * @param payload - Primitive data from the matching draw method.
   * @returns `true` when the payload was stored and the state became
   *   `'captured'`; `false` when the capture was marked missed.
   */
  private tryCaptureDirectPayload(payload: ThreeRendererDirectCapturePayload) {
    if (
      this._directCapture !== 'capturing' ||
      this._capturedDirectPayload != null
    ) {
      this.missDirectCapture()
      return false
    }
    this._capturedDirectPayload = payload
    this._directCapture = 'captured'
    return true
  }

  /**
   * @inheritdoc
   */
  get subEntityTraits() {
    return this._subEntityTraits
  }

  /**
   * Draw-time context for resolving semantic trait colours (for example ACI 7
   * foreground) into pixel RGB values.
   *
   * Derived from {@link currentBackgroundColor} on each read — no separate
   * sync is required when the canvas background changes.
   */
  get context(): ThreeRendererRenderContext {
    this._context.syncBackgroundColor(
      this._context.styleManager.currentBackgroundColor
    )
    return this._context
  }

  /**
   * Strategy that decides whether converted entities should batch or stay unbatched.
   */
  get batchDrawPolicy(): ThreeRendererBatchDrawPolicy {
    return this._context.batchDrawPolicy
  }
  set batchDrawPolicy(policy: ThreeRendererBatchDrawPolicy) {
    this._context.batchDrawPolicy = policy
  }

  get autoClear() {
    return this._renderer.autoClear
  }
  set autoClear(value: boolean) {
    this._renderer.autoClear = value
  }

  get domElement() {
    return this._renderer.domElement
  }

  setSize(width: number, height: number) {
    this._renderer.setSize(width, height)
    this._context.styleManager.updateLineResolution(width, height)
  }

  /**
   * Updates wide-line shader resolution without resizing the canvas.
   */
  updateLineResolution(width: number, height: number) {
    this._context.styleManager.updateLineResolution(width, height)
  }

  /**
   * Syncs shader uniforms that depend on the active camera zoom.
   */
  syncCameraZoom(zoom: number) {
    this.updateCameraZoomUniform(zoom)
  }

  getViewport(target: THREE.Vector4) {
    return this._renderer.getViewport(target)
  }
  setViewport(x: number, y: number, width: number, height: number) {
    this._renderer.setViewport(x, y, width, height)
  }

  /**
   * Sets the WebGL scissor rectangle in CSS pixels (origin bottom-left).
   *
   * @param x - Left edge in CSS pixels.
   * @param y - Bottom edge in CSS pixels.
   * @param width - Width in CSS pixels.
   * @param height - Height in CSS pixels.
   */
  setScissor(x: number, y: number, width: number, height: number) {
    this._renderer.setScissor(x, y, width, height)
  }

  /**
   * Enables or disables scissor clipping for subsequent draws.
   *
   * @param enabled - When true, drawing is clipped to the last {@link setScissor}.
   */
  setScissorTest(enabled: boolean) {
    this._renderer.setScissorTest(enabled)
  }

  clear() {
    this._renderer.clear()
  }

  clearDepth() {
    this._renderer.clearDepth()
  }

  render(scene: THREE.Object3D, camera: ThreeRendererCamera): boolean {
    this.updateCameraZoomUniform(camera.zoom)
    this._renderer.render(scene, camera.internalCamera)
    // RTE frame scheduling is added in the large-coordinate feature branch.
    return false
  }

  /**
   * The canvas background colour tracked by the style manager.
   *
   * Reading returns the value last written here (or the default
   * `0x000000`).  Writing stores the colour on the style manager options
   * so material managers know the current theme.
   */
  get currentBackgroundColor(): number {
    return this._context.styleManager.currentBackgroundColor
  }
  set currentBackgroundColor(value: number) {
    this._context.styleManager.currentBackgroundColor = value
  }

  /**
   * Next Z offset for entity draw-order occlusion on the shared CAD plane.
   *
   * Later entities receive a larger Z so depth testing lets them cover
   * earlier linework / fills (AutoCAD creation-order / SORTENTS behaviour).
   */
  allocateDrawOrderZ(): number {
    const z = this._drawOrderZ
    this._drawOrderZ += ThreeRendererRenderer.DRAW_ORDER_Z_STEP
    return z
  }

  /** Resets the draw-order Z counter (call when clearing / regenerating). */
  resetDrawOrderZ(): void {
    this._drawOrderZ = 0
  }

  /** Shared style/material cache used by entity conversion. */
  get styleManager() {
    return this._context.styleManager
  }

  /**
   * Sets the clear color used when clearing the canvas.
   *
   * @param color - Background color as 24-bit hexadecimal RGB number
   * @param alpha - Optional alpha value (0.0 - 1.0)
   */
  setClearColor(color: number, alpha?: number) {
    this._renderer.setClearColor(color, alpha)
  }

  /**
   * Gets the current clear color as a 24-bit hexadecimal RGB number.
   */
  getClearColor() {
    const color = new THREE.Color()
    this._renderer.getClearColor(color)
    return color.getHex()
  }

  /**
   * Sets the clear alpha used when clearing the canvas.
   *
   * @param alpha - Alpha value (0.0 - 1.0)
   */
  set clearAlpha(alpha: number) {
    this._renderer.setClearAlpha(alpha)
  }

  /**
   * Gets the current clear alpha value.
   */
  get clearAlpha() {
    return this._renderer.getClearAlpha()
  }

  /**
   * The internal THREE.js webgl renderer
   */
  get internalRenderer() {
    return this._renderer
  }

  /**
   * Gets whether entity lineweights are displayed.
   */
  get showLineWeight() {
    return this._context.styleManager.showLineWeight
  }

  /**
   * Sets whether entity lineweights are displayed.
   *
   * When disabled, line entities are rendered with basic 1px materials.
   */
  set showLineWeight(value: boolean) {
    this._context.styleManager.showLineWeight = value
  }

  /**
   * Whether the next line conversion should honor entity lineweights even
   * when {@link showLineWeight} (LWDISPLAY) is off.
   */
  get forceShowLineWeight() {
    return this._context.styleManager.forceShowLineWeight
  }

  set forceShowLineWeight(value: boolean) {
    this._context.styleManager.forceShowLineWeight = value
  }

  /**
   * Create one empty drawable object
   */
  createObject() {
    return new ThreeRendererObject(this._context)
  }

  /**
   * Create one empty entity
   */
  createEntity() {
    return new ThreeRendererEntity(this._context)
  }

  /**
   * Returns the shared placeholder for the active direct-batch capture session.
   *
   * The placeholder is created on first use and reused for every captured
   * entity, so the capture fast path allocates no throw-away drawables. It is
   * dispose-immune (see {@link ThreeRendererDirectCapturePlaceholder}) and stays empty
   * and detached for its whole lifetime.
   */
  createDirectCapturePlaceholder() {
    if (!this._directCapturePlaceholder) {
      this._directCapturePlaceholder = new ThreeRendererDirectCapturePlaceholder(
        this._context
      )
    }
    return this._directCapturePlaceholder
  }

  /**
   * @inheritdoc
   */
  group(entities: ThreeRendererEntity[]) {
    if (this._directCapture !== 'off') {
      this.missDirectCapture()
      return this.createDirectCapturePlaceholder() as ThreeRendererGroup
    }
    return new ThreeRendererGroup(entities as ThreeRendererEntity[], this._context)
  }

  /**
   * @inheritdoc
   */
  point(point: GeometryPoint2d, style: GraphicsInterfacePointStyle) {
    if (this._directCapture !== 'off') {
      if (this.tryCaptureDirectPayload({ kind: 'point', point, style })) {
        return this.createDirectCapturePlaceholder() as ThreeRendererPoint
      }
      return this.createDirectCapturePlaceholder() as ThreeRendererPoint
    }
    return new ThreeRendererPoint(point, this._subEntityTraits, style, this._context)
  }

  /**
   * @inheritdoc
   */
  circularArc(arc: GeometryCircularArc2d) {
    return this.linePoints(arc.tessellate(graphicsInterfaceDrawTessellateOptions(this)))
  }

  /**
   * @inheritdoc
   */
  ellipticalArc(ellipseArc: GeometryEllipseArc2d) {
    return this.linePoints(
      ellipseArc.tessellate(graphicsInterfaceDrawTessellateOptions(this))
    )
  }

  /**
   * @inheritdoc
   */
  lines(points: GeometryPoint2dLike[]) {
    return this.linePoints(points)
  }

  /**
   * @inheritdoc
   */
  lineSegments(array: Float32Array, itemSize: number, indices: Uint16Array) {
    if (this._directCapture !== 'off') {
      if (
        this.tryCaptureDirectPayload({
          kind: 'lineSegments',
          array,
          itemSize,
          indices
        })
      ) {
        return this.createDirectCapturePlaceholder() as ThreeRendererLineSegments
      }
      return this.createDirectCapturePlaceholder() as ThreeRendererLineSegments
    }
    return new ThreeRendererLineSegments(
      array,
      itemSize,
      indices,
      this._subEntityTraits,
      this._context
    )
  }

  /**
   * @inheritdoc
   */
  area(area: GeometryArea2d) {
    if (this._directCapture !== 'off') {
      if (this.tryCaptureDirectPayload({ kind: 'area', area })) {
        return this.createDirectCapturePlaceholder() as ThreeRendererPolygon
      }
      return this.createDirectCapturePlaceholder() as ThreeRendererPolygon
    }
    return new ThreeRendererPolygon(area, this._subEntityTraits, this._context)
  }

  /**
   * @inheritdoc
   *
   * Draws the filled offset ring and a centerline stroke. The fill carries
   * true world-space width; the stroke stays ≥ ~1 device pixel so frames with a
   * small `constantWidth` do not vanish at fit-zoom.
   */
  offsetRing(outer: GeometryPoint2dLike[], inner: GeometryPoint2dLike[]) {
    if (this._directCapture !== 'off') {
      // Fill + centerline cannot share one direct payload; fall back so the
      // hairline visibility stroke is not dropped.
      this.missDirectCapture()
      return this.createDirectCapturePlaceholder()
    }
    const built = buildOffsetRingDirectGeometry(
      outer,
      inner,
      this._subEntityTraits,
      this._context
    )
    const fill = built
      ? this.createOffsetRingFillEntity(built)
      : // Strip triangulation rejects collapsed or non-aligned loops. Rebuild
        // the same two boundaries as an area so the fill is not dropped.
        this.area(this.offsetRingArea(outer, inner))
    const centerline = buildOffsetRingCenterline(outer, inner)
    if (!centerline) {
      return fill
    }
    return this.group([fill, this.linePoints(centerline)])
  }

  private createOffsetRingFillEntity(
    built: NonNullable<ReturnType<typeof buildOffsetRingDirectGeometry>>
  ): ThreeRendererEntity {
    const entity = new ThreeRendererEntity(this._context)
    const mesh = new THREE.Mesh(built.geometry, built.material)
    mesh.position.copy(built.worldOffset)
    entity.add(mesh)
    entity.wcsBbox = built.wcsBbox
    return entity
  }

  private offsetRingArea(
    outer: GeometryPoint2dLike[],
    inner: GeometryPoint2dLike[]
  ) {
    const area = new GeometryArea2d()
    const toLoop = (points: GeometryPoint2dLike[]) =>
      new GeometryPolyline2d(
        points.map(point => new GeometryPoint2d(point.x, point.y)),
        true
      )
    area.add(toLoop(outer))
    area.add(toLoop(inner))
    return area
  }

  /**
   * @inheritdoc
   */
  text(text: GraphicsInterfaceTextData) {
    if (this._directCapture !== 'off') {
      this.missDirectCapture()
      return this.createDirectCapturePlaceholder() as ThreeRendererText
    }
    return new ThreeRendererText(text, this._subEntityTraits, this._context)
  }

  /**
   * Renders one or more entities (or a preview root) to an offscreen canvas.
   *
   * Pass a detached preview root such as the group returned by
   * {@link ThreeRendererBatchedGroup.createPreviewSubset} or an {@link ThreeRendererGroup}. When the object is already attached to a scene, a
   * deep clone is rendered internally.
   *
   * @param object - Drawable root to preview
   * @param options - Output size and optional framing overrides
   * @returns Preview canvas and framing bounds, or `null` when bounds cannot be resolved
   *
   * @example
   * ```ts
   * const subset = batchGroup.createPreviewSubset(['line-1', 'arc-2'])
   * if (subset) {
   *   const preview = renderer.renderEntityPreview(subset, { width: 128, height: 128 })
   *   disposePreviewSubset(subset)
   * }
   * ```
   */
  renderEntityPreview(
    object: THREE.Object3D,
    options: ThreeRendererEntityPreviewOptions
  ): ThreeRendererEntityPreviewResult | null {
    return new ThreeRendererEntityPreview(this).capture(object, options)
  }

  /**
   * Clears all cached materials and releases its memory
   */
  dispose() {
    this._context.styleManager.dispose()
  }

  private linePoints(points: GeometryPoint2dLike[]) {
    if (this._directCapture !== 'off') {
      if (points.length < 2) {
        this.missDirectCapture()
        return this.createDirectCapturePlaceholder()
      }
      if (this.tryCaptureDirectPayload({ kind: 'lineStrip', points })) {
        // Placeholder so worldDraw can attach objectId metadata.
        return this.createDirectCapturePlaceholder()
      }
      return this.createDirectCapturePlaceholder()
    }

    if (points.length < 2) {
      return this.createEntity()
    }
    return new ThreeRendererLine(points, this._subEntityTraits, this._context, false)
  }

  /**
   * Updates camera zoom value for shader materials
   */
  private updateCameraZoomUniform(zoom: number) {
    // DxfLoader.CameraZoomUniform.value = (zoom * this.container.height) / 50;
    ThreeRendererMaterialManager.CameraZoomUniform.value = zoom
  }
}

/**
 * Minimal WebGLRenderer stand-in for headless geometry conversion.
 * Only {@link THREE.WebGLRenderer.getSize} is used during export construction.
 */
function createExportWebGlStub(
  width: number,
  height: number
): THREE.WebGLRenderer {
  const stub = {
    autoClear: true,
    domElement: undefined as unknown as HTMLCanvasElement,
    getSize(target: THREE.Vector2) {
      return target.set(width, height)
    },
    setSize() {},
    getViewport(target: THREE.Vector4) {
      return target.set(0, 0, width, height)
    },
    setViewport() {},
    setScissor() {},
    setScissorTest() {},
    clear() {},
    clearDepth() {},
    render() {},
    setClearColor() {},
    getClearColor(color: THREE.Color) {
      return color
    },
    setClearAlpha() {},
    getClearAlpha() {
      return 1
    }
  }
  return stub as unknown as THREE.WebGLRenderer
}
