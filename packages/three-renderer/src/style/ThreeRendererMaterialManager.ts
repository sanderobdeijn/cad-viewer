import { deepClone } from '@mlightcad/common'
import {
  graphicsInterfaceForegroundColorForBackground,
  graphicsInterfaceResolveSubEntityTraitsRgbFromBackground,
  GraphicsInterfaceSubEntityTraits
} from '@mlightcad/graphic-interface'
import * as THREE from 'three'

import { ThreeRendererMaterialUtil } from '../util'
import {
  getMaterialMetadata,
  setMaterialMetadata
} from './ThreeRendererMaterialMetadata'
import { ThreeRendererStyleManagerOptions } from './ThreeRendererStyleManagerOptions'

/**
 * Valid material side values for cache partitioning.
 *
 * - `'front'` — default; culls back-faces (CW winding after CCW input).
 * - `'back'`  — culls front-faces; used for meshes whose winding was
 *   reversed by a mirrored transform (negative determinant).
 *
 * `DoubleSide` is intentionally excluded: in 2-D CAD every fill has a
 * deterministic winding after the matrix bake, so one of the two
 * single-side values always suffices with zero fillrate overhead.
 */
export type ThreeRendererMaterialSide = 'front' | 'back'

/**
 * Base class for all material managers (line, fill, point).
 *
 * This class implements:
 * - caching
 * - key → traits storage
 * - getMaterial()
 * - dispose()
 *
 * Subclasses must implement:
 * - buildKey()
 * - createMaterialImpl()
 */
export abstract class ThreeRendererMaterialManager<T> {
  /** Materials share this uniform */
  static CameraZoomUniform = { value: 1.0 }

  /** Material cache indexed by key. */
  protected cache: Record<string, THREE.Material> = {}

  /** Original cloned traits for each key (needed for side variants). */
  protected keyToTraits: Record<string, GraphicsInterfaceSubEntityTraits & T> = {}

  /** Options shared with subclasses (viewport scale, zoom uniforms, etc.) */
  protected options: ThreeRendererStyleManagerOptions

  constructor(options: ThreeRendererStyleManagerOptions) {
    this.options = options
  }

  /**
   * Returns (or creates) a material matching traits.
   * Subclasses provide buildKey() and createMaterialImpl().
   */
  getMaterial(traits: GraphicsInterfaceSubEntityTraits, options: T): THREE.Material {
    const key = this.buildKey(traits, options)

    // cache original traits
    if (!this.keyToTraits[key]) {
      this.keyToTraits[key] = this.cloneTraits({
        ...traits,
        ...options
      } as GraphicsInterfaceSubEntityTraits & T)
    }

    // hit cache
    if (this.cache[key]) {
      return this.cache[key]
    }

    // otherwise create
    return this.createMaterial(key, traits, options)
  }

  /**
   * Changes material color to the specified color if its userData 'isForeground' is true.
   * Generally this function is used to change rendering color of entities whose color is
   * ACI 7.
   * @param color - New rendering color.
   */
  changeForeground(color: number) {
    // iterate all cached materials and check userData
    for (const oldKey of Object.keys(this.cache)) {
      const oldMaterial = this.cache[oldKey]
      const metadata = getMaterialMetadata(oldMaterial)

      const isTarget = metadata.isForeground === true
      if (!isTarget) continue

      const oldTraits = this.keyToTraits[oldKey]
      if (!oldTraits) continue

      ThreeRendererMaterialUtil.setMaterialColor(oldMaterial, new THREE.Color(color))
    }
  }

  /**
   * Clears all cached materials.
   */
  dispose(): void {
    Object.values(this.cache).forEach(m => m.dispose())
    this.cache = {}
    this.keyToTraits = {}
  }

  /**
   * Returns a `BackSide` variant of the given material.
   *
   * The default implementation returns the material unchanged — only
   * subclasses whose primitives are affected by face culling (i.e.
   * meshes / fills) override this to produce a cached `BackSide` clone.
   *
   * @param material - A material previously obtained from this manager.
   */
  getBackSideVariant(material: THREE.Material): THREE.Material {
    return material
  }

  /**
   * Clones render traits while preserving class-based color/transparency values.
   *
   * {@link deepClone} only copies enumerable fields, so `CommonColor` /
   * `CommonTransparency` instances would degrade into plain objects and later
   * resolve to white during material rebuilds.
   */
  protected cloneTraits<U extends GraphicsInterfaceSubEntityTraits & Partial<T>>(
    traits: U
  ): U {
    const cloned = deepClone(traits) as U
    if (traits.color?.clone) {
      cloned.color = traits.color.clone()
    }
    if (traits.transparency?.clone) {
      cloned.transparency = traits.transparency.clone()
    }
    return cloned
  }

  /**
   * Creates a THREE.js material and stores metadata in userData:
   *   - isForeground      (inverts with layout background when tracked)
   *   - drawOrder         (batch/render-order tier for same-plane meshes)
   *   - materialKey (cache key, used by getBackSideVariant for reverse lookup)
   */
  protected createMaterial(
    key: string,
    traits: GraphicsInterfaceSubEntityTraits,
    options: T
  ): THREE.Material {
    const material = this.createMaterialImpl(traits, options)
    const isForeground = this.shouldTrackForeground(traits, options)

    // Foreground-follow materials (typically ACI 7 lines/text) must be
    // initialized from the current layout background, not from trait RGB,
    // otherwise they can be created with stale white before the first
    // background-driven repaint occurs.
    if (isForeground) {
      ThreeRendererMaterialUtil.setMaterialColor(
        material,
        new THREE.Color(
          graphicsInterfaceForegroundColorForBackground(this.options.currentBackgroundColor)
        )
      )
    }

    // Attach metadata required for foreground repaints and side-variant lookups
    setMaterialMetadata(material, {
      isForeground,
      drawOrder: traits.drawOrder ?? 0,
      materialKey: key
    })

    this.cache[key] = material
    return material
  }

  /**
   * Whether materials from this manager should follow layout-background
   * ACI-7 inversion (i.e. be flipped by `changeForeground`).
   *
   * The default implementation delegates to `CommonColor.isForeground`,
   * so lines, points and text glyph fills keep inverting ACI 7 with
   * the theme to preserve legibility (dark stroke on light background
   * / light stroke on dark background).
   *
   * Subclasses can override this to opt a primitive type out of the
   * inversion. `ThreeRendererFillMaterialManager` overrides this and uses
   * `traits.drawOrder` to distinguish text / line-like fills
   * (invert) from hatch fills when needed.
   */
  protected shouldTrackForeground(
    traits: GraphicsInterfaceSubEntityTraits,
    _options: T
  ): boolean {
    return traits.color.isForeground
  }

  /**
   * Cache-key suffix used to keep different render tiers from sharing
   * the same material instance.
   *
   * This matters for mesh primitives because batching groups by
   * material id. If two entities need different `renderOrder` values,
   * they must not collapse onto the same cached material.
   */
  protected buildDrawOrderSuffix(traits: GraphicsInterfaceSubEntityTraits): string {
    return traits.drawOrder === 0 ? '' : `_draw_${traits.drawOrder ?? 0}`
  }

  /** Resolves trait colour to pixel RGB using the current canvas background. */
  protected resolveTraitsRgb(traits: GraphicsInterfaceSubEntityTraits): number {
    return graphicsInterfaceResolveSubEntityTraitsRgbFromBackground(
      traits,
      this.options.currentBackgroundColor
    )
  }

  /**
   * Builds the colour portion of a material cache key from symbolic CAD colour.
   */
  protected buildKeyColorSegment(traits: GraphicsInterfaceSubEntityTraits): string {
    return traits.color.toString()
  }

  /** Subclass must build stable key. */
  protected abstract buildKey(traits: GraphicsInterfaceSubEntityTraits, options: T): string

  /** Subclass must create material. */
  protected abstract createMaterialImpl(
    traits: GraphicsInterfaceSubEntityTraits,
    options: T
  ): THREE.Material
}
