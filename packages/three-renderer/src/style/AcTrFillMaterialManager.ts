import { AcGiSubEntityTraits } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrMaterialManager, AcTrMaterialSide } from './AcTrMaterialManager'
import {
  getMaterialMetadata,
  setMaterialMetadata
} from './AcTrMaterialMetadata'

export interface AcTrFillMaterialOptions {
  /**
   * Which face the rasteriser keeps.  Defaults to `'front'`.
   *
   * Mirrored transforms (negative-determinant transforms) reverse
   * triangle winding, causing `FrontSide` fills to be culled.  The
   * batching layer requests `'back'` for those meshes so the culler
   * keeps the (now CW-wound) triangles — with zero fillrate overhead.
   */
  side?: AcTrMaterialSide
}

/**
 * Material manager for solid fill entities.
 *
 * Responsibilities:
 * - Returns THREE.MeshBasicMaterial for solid fills.
 * - Caches materials per layer, colour, transparency, side and draw order.
 * - Provides `clear()` method to dispose of all cached materials.
 */
export class AcTrFillMaterialManager extends AcTrMaterialManager<AcTrFillMaterialOptions> {
  /**
   * Returns a `BackSide` variant of the given fill material.
   *
   * The variant is cached under a separate key so that mirrored and
   * non-mirrored fills land in different batches (same draw-call cost
   * per fragment, no `DoubleSide` overhead).
   */
  getBackSideVariant(material: THREE.Material): THREE.Material {
    const metadata = getMaterialMetadata(material)
    const key = metadata.materialKey
    if (!key) return material

    // Already a back-side material — return as-is (idempotent).
    if (metadata.side === 'back') return material

    const traits = this.keyToTraits[key]
    if (!traits) return material

    // `keyToTraits` stores the full options alongside traits, so we
    // preserve the original draw-order tier and only override `side`.
    return this.getMaterial(traits, { ...traits, side: 'back' })
  }

  /**
   * Solid fills follow layout-background ACI-7 inversion so content stays
   * legible on both light and dark canvases, matching AutoCAD model space.
   */
  protected shouldTrackForeground(
    traits: AcGiSubEntityTraits,
    _options: AcTrFillMaterialOptions
  ): boolean {
    return traits.color.isForeground
  }

  /**
   * Creates the MeshBasicMaterial for a solid fill.
   */
  protected createMaterialImpl(
    traits: AcGiSubEntityTraits,
    options: AcTrFillMaterialOptions,
    layerColorRgb?: number
  ): THREE.Material {
    const side = options.side ?? 'front'
    const threeSide = side === 'back' ? THREE.BackSide : THREE.FrontSide
    const rgb = this.resolveMaterialRgb(traits, layerColorRgb)

    const material = this.createMeshBasicMaterial(rgb, threeSide)

    this.applyTransparency(material, traits)

    // Store side in userData so getBackSideVariant can check idempotency.
    // Draw-order metadata is stamped by the base material manager from
    // `traits.drawOrder`.
    setMaterialMetadata(material, {
      side
    })
    return material
  }

  /**
   * Honours {@link AcGiSubEntityTraits.transparency} on fill meshes.
   * Fully transparent fills (alpha 0) stay raycastable for IMAGE/OLE frames
   * while remaining invisible — matching AutoCAD pick-through-frame behaviour.
   */
  private applyTransparency(
    material: THREE.Material,
    traits: AcGiSubEntityTraits
  ) {
    const transparency = traits.transparency
    if (!transparency || typeof transparency.alpha !== 'number') {
      return
    }
    const alpha = transparency.alpha
    if (alpha >= 255) {
      return
    }
    material.transparent = true
    material.opacity = Math.max(0, Math.min(1, alpha / 255))
    material.depthWrite = alpha > 0
  }

  private createMeshBasicMaterial(
    rgb: number,
    side: THREE.Side
  ): THREE.Material {
    return new THREE.MeshBasicMaterial({ color: rgb, side })
  }

  /**
   * Build a deterministic caching key based on traits and options.
   *
   * Partitioning dimensions beyond colour/layer:
   *
   * - `side`: `'back'` variant goes in a separate key so mirrored
   *   fills don't steal the front-side material of the common path.
   * - `drawOrder`: under-linework fills must not share a material instance with
   *   line-like fill meshes (wide polylines, text glyphs) because the
   *   batcher groups by material id and applies one `renderOrder` tier
   *   per batch.
   *
   * All suffixes are appended only when they differ from the default,
   * keeping existing keys stable and avoiding unnecessary cache
   * fragmentation on the common path.
   */
  protected buildKey(
    traits: AcGiSubEntityTraits,
    options: AcTrFillMaterialOptions
  ): string {
    const sideSuffix = options.side === 'back' ? '_back' : ''
    const drawOrderSuffix = this.buildDrawOrderSuffix(traits)
    const colorKey = this.buildKeyColorSegment(traits)
    return `solid_${traits.layer}_${colorKey}_a${this.transparencyKey(traits)}${sideSuffix}${drawOrderSuffix}`
  }

  private transparencyKey(traits: AcGiSubEntityTraits): number {
    const alpha = traits.transparency?.alpha
    return typeof alpha === 'number' ? alpha : 255
  }
}
