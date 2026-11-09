import { GraphicsInterfaceSubEntityTraits } from '@mlightcad/graphic-interface'
import * as THREE from 'three'

import { ThreeRendererMaterialManager } from './ThreeRendererMaterialManager'

export type ThreeRendererLineMaterialOptions = Record<string, never>

/**
 * Material manager responsible for creating and caching all line materials.
 *
 * All lines are thin ({@link THREE.LineBasicMaterial}); materials are cached
 * by computed keys.
 */
export class ThreeRendererLineMaterialManager extends ThreeRendererMaterialManager<ThreeRendererLineMaterialOptions> {
  /**
   * Builds a stable material key from traits.
   */
  protected buildKey(traits: GraphicsInterfaceSubEntityTraits): string {
    const drawOrderSuffix = this.buildDrawOrderSuffix(traits)
    const colorKey = this.buildKeyColorSegment(traits)
    return `${colorKey}${drawOrderSuffix}`
  }

  protected createMaterialImpl(
    traits: GraphicsInterfaceSubEntityTraits
  ): THREE.Material {
    return new THREE.LineBasicMaterial({ color: this.resolveTraitsRgb(traits) })
  }
}
