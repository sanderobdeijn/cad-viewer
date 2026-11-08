import {
  GraphicsInterfaceShapeData,
  GraphicsInterfaceSubEntityTraits,
  GraphicsInterfaceTextStyle
} from '@mlightcad/graphic-interface'
import { ShapeData } from '@mlightcad/mtext-renderer'

import { ThreeRendererMTextRenderer } from '../renderer/ThreeRendererMTextRenderer'
import { ThreeRendererRenderContext } from '../renderer/ThreeRendererRenderContext'
import { resolveShapeGlyphKey, resolveShapeTextStyle } from '../util'
import { ThreeRendererGlyphEntity } from './ThreeRendererGlyphEntity'

/**
 * Display object for a CAD SHAPE entity rendered through the mtext-renderer.
 */
export class ThreeRendererShape extends ThreeRendererGlyphEntity {
  /** Source SHAPE data from the CAD database. */
  private _shape: GraphicsInterfaceShapeData

  /**
   * Creates a SHAPE display object.
   *
   * @param shape SHAPE definition and placement from the CAD database.
   * @param traits CAD sub-entity traits used to resolve color and layer behavior.
   * @param style Optional text style override; resolved against shape and context when omitted.
   * @param context Active renderer context that owns style and batching policy.
   * @param delay When `true`, skips the initial draw so callers can finish setup first.
   */
  constructor(
    shape: GraphicsInterfaceShapeData,
    traits: GraphicsInterfaceSubEntityTraits,
    style: GraphicsInterfaceTextStyle | null | undefined,
    context: ThreeRendererRenderContext,
    _delay: boolean = false
  ) {
    super(context, traits, resolveShapeTextStyle(shape, style, context))
    this._shape = shape
    // Geometry is built by syncDraw/asyncDraw in ThreeRendererView2d / ThreeRendererGroup so
    // font-awaiting asyncDraw can run without blocking other entity converts.
  }

  /**
   * Builds renderer input with only the glyph key that should be resolved.
   *
   * Chooses either a non-numeric name or a shape code via
   * {@link resolveShapeGlyphKey}, then clears the unused field so mtext-renderer
   * does not incorrectly fall back between them.
   *
   * @returns SHAPE payload suitable for the mtext-renderer.
   */
  private toRenderableShapeData(): ShapeData {
    const source = this._shape as ShapeData
    const { byName, byCode } = resolveShapeGlyphKey(this._shape)
    return {
      ...source,
      name: byName,
      shapeNumber: byCode
    }
  }

  /**
   * Key for sharing mesh buffers across identical complex-linetype SHAPE symbols.
   * Placement is applied via this object's transform, not baked into the key.
   */
  get linetypeGlyphShareKey(): string {
    return [
      this._shape.name ?? '',
      this._shape.shapeNumber ?? '',
      this._shape.size,
      this._style.font ?? '',
      this._style.extendedFont ?? '',
      this._style.widthFactor ?? 1,
      this._shape.widthFactor ?? 1
    ].join('\0')
  }

  /** @inheritdoc */
  protected override contentShareKey(): string {
    return this.linetypeGlyphShareKey
  }

  /**
   * Moves baked SHAPE placement onto this object's transform and rebuilds the
   * glyph at the local origin so identical symbols can share one mesh.
   */
  hoistBakedPlacement(): void {
    const position = this._shape.position
    this.position.set(position?.x ?? 0, position?.y ?? 0, 0)
    this.rotation.z = this._shape.rotation ?? 0
    this._shape = {
      ...this._shape,
      position: { x: 0, y: 0 },
      rotation: 0
    }
  }

  /**
   * @inheritdoc
   */
  protected override getDrawPosition() {
    const position = this._shape.position
    if (
      position &&
      position.x === 0 &&
      position.y === 0 &&
      (this.position.x !== 0 || this.position.y !== 0 || this.position.z !== 0)
    ) {
      return {
        x: this.position.x,
        y: this.position.y,
        z: this.position.z
      }
    }
    return position
  }

  /**
   * @inheritdoc
   */
  protected override renderSync(renderer: ThreeRendererMTextRenderer) {
    return renderer.syncRenderShape(
      this.toRenderableShapeData(),
      this._style,
      this._colorSettings
    )
  }

  /**
   * @inheritdoc
   */
  protected override async renderAsync(renderer: ThreeRendererMTextRenderer) {
    return renderer.asyncRenderShape(
      this.toRenderableShapeData(),
      this._style,
      this._colorSettings
    )
  }

  /**
   * @inheritdoc
   */
  protected override describeRenderFailure() {
    const label =
      this._shape.name?.trim() || String(this._shape.shapeNumber ?? '')
    return `shape '${label}'`
  }
}
