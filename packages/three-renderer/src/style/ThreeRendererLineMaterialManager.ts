import {
  GraphicsInterfaceLineWeight,
  GraphicsInterfaceSubEntityTraits
} from '@mlightcad/graphic-interface'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

import { ThreeRendererMaterialManager } from './ThreeRendererMaterialManager'

export interface ThreeRendererLineMaterialOptions {
  basicMaterialOnly?: boolean
}

/**
 * Material manager responsible for creating and caching all line materials.
 *
 * This class supports:
 * - Thin lines (THREE.LineBasicMaterial)
 * - Lines with a lineweight ({@link LineMaterial})
 *
 * Materials are cached by computed keys. Each material also remembers:
 * - The CAD layer it belongs to
 * - Whether its certain property value (for example color) is ByLayer
 *
 * Layer updates then locate materials using these userData flags instead of
 * maintaining a separate layer → key mapping.
 */
export class ThreeRendererLineMaterialManager extends ThreeRendererMaterialManager<ThreeRendererLineMaterialOptions> {
  /**
   * Builds a stable material key from traits.
   * Every key includes the effective layer so layer-scoped updates stay precise.
   */
  protected buildKey(
    traits: GraphicsInterfaceSubEntityTraits,
    options: ThreeRendererLineMaterialOptions
  ): string {
    const lineWidth = this.resolveLineWidth(traits.lineWeight)
    const mode = options.basicMaterialOnly ? 'basic' : 'fat'
    const drawOrderSuffix = this.buildDrawOrderSuffix(traits)
    const colorKey = this.buildKeyColorSegment(traits)
    return `${traits.layer}_${mode}_${colorKey}_${lineWidth}${drawOrderSuffix}`
  }

  protected createMaterialImpl(
    traits: GraphicsInterfaceSubEntityTraits,
    options: ThreeRendererLineMaterialOptions = {},
    layerColorRgb?: number
  ): THREE.Material {
    let material: THREE.Material
    const rgb = this.resolveMaterialRgb(traits, layerColorRgb)

    if (options.basicMaterialOnly || traits.lineWeight < 0) {
      material = new THREE.LineBasicMaterial({
        color: rgb
      })
    } else {
      const fatLineMaterial = new LineMaterial({
        color: rgb,
        linewidth: this.resolveLineWidth(traits.lineWeight)
      })
      fatLineMaterial.resolution.copy(this.options.resolution)
      material = fatLineMaterial
    }
    return material
  }

  protected hasByLayerKeyTraits(traits: GraphicsInterfaceSubEntityTraits): boolean {
    return (
      super.hasByLayerKeyTraits(traits) ||
      traits.lineWeight === GraphicsInterfaceLineWeight.ByLayer
    )
  }

  private resolveLineWidth(lineWeight: GraphicsInterfaceLineWeight): number {
    if (lineWeight < 0) return 1
    return Math.max(1, lineWeight / 40)
  }

  updateResolution() {
    const resolution = this.options.resolution
    Object.values(this.cache).forEach(material => {
      if (material instanceof LineMaterial) {
        material.resolution.copy(resolution)
      }
    })
  }
}
