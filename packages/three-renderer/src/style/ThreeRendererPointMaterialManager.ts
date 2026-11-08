import { GraphicsInterfaceSubEntityTraits } from '@mlightcad/graphic-interface'
import * as THREE from 'three'

import { ThreeRendererMaterialManager } from './ThreeRendererMaterialManager'

export interface ThreeRendererPointMaterialOptions {
  size?: number
}

/**
 * Material manager dedicated to point entities.
 *
 * Produces and caches THREE.PointsMaterial instances keyed by color and size.
 * This ensures that repeated point drawings reuse the same optimized material.
 */
export class ThreeRendererPointMaterialManager extends ThreeRendererMaterialManager<ThreeRendererPointMaterialOptions> {
  /**
   * Builds a stable material key from traits.
   */
  protected buildKey(
    traits: GraphicsInterfaceSubEntityTraits,
    options: ThreeRendererPointMaterialOptions
  ): string {
    const size = options.size ?? 1
    const drawOrderSuffix = this.buildDrawOrderSuffix(traits)
    const colorKey = this.buildKeyColorSegment(traits)
    return `${traits.layer}_${colorKey}_${size}${drawOrderSuffix}`
  }

  /** Returns true if color is ByLayer. */
  protected hasByLayerKeyTraits(traits: GraphicsInterfaceSubEntityTraits): boolean {
    return traits.color.isByLayer
  }

  protected createMaterialImpl(
    traits: GraphicsInterfaceSubEntityTraits,
    options: ThreeRendererPointMaterialOptions = {},
    layerColorRgb?: number
  ): THREE.Material {
    return new THREE.PointsMaterial({
      color: this.resolveMaterialRgb(traits, layerColorRgb),
      size: options.size
    })
  }
}
