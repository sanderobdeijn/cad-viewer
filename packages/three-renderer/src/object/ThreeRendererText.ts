// troika-three-text ships no usable types; this file declares the parts used here.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../types/troika-three-text.d.ts" />
import { CommonEventManager } from '@mlightcad/common'
import {
  GraphicsInterfaceSubEntityTraits,
  GraphicsInterfaceTextData
} from '@mlightcad/graphic-interface'
import * as THREE from 'three'
import { Text } from 'troika-three-text'

import type { ThreeRendererDrawMode } from '../draw/ThreeRendererDrawMode'
import { ThreeRendererRenderContext } from '../renderer/ThreeRendererRenderContext'
import { getSceneDrawableUserData } from '../util/ThreeRendererObjectUserData'
import { ThreeRendererEntity } from './ThreeRendererEntity'

/** Average glyph width as a fraction of the text height, for the bounding box. */
const CHAR_WIDTH_FACTOR = 0.6

/**
 * Display object for one line of text, drawn with troika-three-text.
 *
 * troika lays out and rasterises the glyphs asynchronously, so the text shows
 * up a frame or more after it is added. {@link ThreeRendererText.events}
 * fires when a layout finishes so the view can repaint.
 */
export class ThreeRendererText extends ThreeRendererEntity {
  /** Events shared by all text objects. */
  static readonly events = {
    /** Fired when a text object has finished its layout and can be drawn. */
    synced: new CommonEventManager<void>()
  }

  /**
   * Font URL (.ttf, .otf or .woff) used for all text. When unset, troika
   * loads its default font.
   */
  static font: string | null = null

  /**
   * Creates a text display object.
   *
   * @param data Text and placement to draw.
   * @param traits Sub-entity traits that resolve the text colour.
   * @param context Active renderer context that owns the style manager.
   */
  constructor(
    data: GraphicsInterfaceTextData,
    traits: GraphicsInterfaceSubEntityTraits,
    context: ThreeRendererRenderContext
  ) {
    super(context)
    const rotation = data.rotation ?? 0
    const text = new Text()
    text.text = data.text
    text.fontSize = data.height
    text.font = ThreeRendererText.font
    text.anchorX = 'center'
    text.anchorY = 'middle'
    text.position.set(data.position.x, data.position.y, 0)
    text.rotation.z = rotation
    text.material = context.styleManager.getFillMaterial(traits)
    text.addEventListener('synccomplete' as keyof THREE.Object3DEventMap, () => {
      ThreeRendererText.events.synced.dispatch()
    })
    // troika geometry is instanced and drawn by its own shader, so it can't be
    // merged into the batches; the scene keeps it as a separate object.
    getSceneDrawableUserData(text).noBatch = true
    getSceneDrawableUserData(text).bboxIntersectionCheck = true
    this.add(text)
    this.wcsBbox = ThreeRendererText.estimateBox(data, rotation)
    text.sync()
  }

  /**
   * Text is always drawn outside the batches.
   */
  override resolveDrawMode(): ThreeRendererDrawMode {
    return 'unbatch'
  }

  /**
   * Estimates the text's bounding box from its length and height, because
   * troika only measures the glyphs once its asynchronous layout finishes.
   */
  private static estimateBox(data: GraphicsInterfaceTextData, rotation: number) {
    const halfWidth = (data.text.length * data.height * CHAR_WIDTH_FACTOR) / 2
    const halfHeight = data.height / 2
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    const box = new THREE.Box3()
    for (const [x, y] of [
      [-halfWidth, -halfHeight],
      [halfWidth, -halfHeight],
      [halfWidth, halfHeight],
      [-halfWidth, halfHeight]
    ]) {
      box.expandByPoint(
        new THREE.Vector3(
          data.position.x + x * cos - y * sin,
          data.position.y + x * sin + y * cos,
          0
        )
      )
    }
    return box
  }
}
