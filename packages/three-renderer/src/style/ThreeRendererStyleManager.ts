import {
  GRAPHICS_INTERFACE_MODEL_SPACE_BACKGROUND,
  graphicsInterfaceForegroundColorForBackground,
  GraphicsInterfaceSubEntityTraits
} from '@mlightcad/graphic-interface'
import * as THREE from 'three'

import { ThreeRendererFillMaterialManager } from './ThreeRendererFillMaterialManager'
import { ThreeRendererLineMaterialManager } from './ThreeRendererLineMaterialManager'
import { ThreeRendererPointMaterialManager } from './ThreeRendererPointMaterialManager'
import { ThreeRendererStyleManagerOptions } from './ThreeRendererStyleManagerOptions'

/**
 * Central style/material access point for the CAD viewer.
 *
 * This class delegates all material creation to the four specialized
 * ThreeRendererMaterialManager implementations:
 *
 * - Point materials
 * - Line materials
 * - Mesh materials
 * - Fill materials
 *
 * This ensures consistent material reuse, improved rendering performance,
 * and clean separation of material logic.
 */
export class ThreeRendererStyleManager {
  public options: ThreeRendererStyleManagerOptions = {
    currentBackgroundColor: GRAPHICS_INTERFACE_MODEL_SPACE_BACKGROUND
  }
  private pointMgr: ThreeRendererPointMaterialManager
  private lineMgr: ThreeRendererLineMaterialManager
  private fillMgr: ThreeRendererFillMaterialManager
  constructor() {
    this.pointMgr = new ThreeRendererPointMaterialManager(this.options)
    this.lineMgr = new ThreeRendererLineMaterialManager(this.options)
    this.fillMgr = new ThreeRendererFillMaterialManager(this.options)
  }

  /** Unsupported text styles mapped by name → usage count. */
  public unsupportedTextStyles: Record<string, number> = {}

  /**
   * Returns a material for point entities.
   *
   * @param size - Point size (default = 2).
   */
  getPointsMaterial(
    traits: GraphicsInterfaceSubEntityTraits,
    size: number = 2
  ): THREE.Material {
    return this.pointMgr.getMaterial(traits, { size })!
  }

  /**
   * Returns a thin or lineweight line material.
   *
   * @param traits - Current entity traits.
   */
  getLineMaterial(traits: GraphicsInterfaceSubEntityTraits): THREE.Material {
    return this.lineMgr.getMaterial(traits, {})!
  }

  /**
   * Current canvas background colour tracked by the style manager.
   *
   * See `ThreeRendererStyleManagerOptions.currentBackgroundColor` for the full
   * contract. In short: this is the single source of truth that material
   * managers consult when creating theme-sensitive materials.
   */
  get currentBackgroundColor(): number {
    return this.options.currentBackgroundColor
  }

  /**
   * Updates the canvas background colour and refreshes ACI-7 foreground
   * inversion to contrast with the new layout background.
   */
  set currentBackgroundColor(value: number) {
    this.options.currentBackgroundColor = value
    this.repaintForegroundMaterials(graphicsInterfaceForegroundColorForBackground(value))
  }

  /**
   * Returns the solid fill material.
   *
   * @param traits - Current entity traits.
   */
  getFillMaterial(traits: GraphicsInterfaceSubEntityTraits): THREE.Material {
    return this.fillMgr.getMaterial(traits, {})
  }

  /**
   * Returns a `BackSide` variant of the given fill material.
   *
   * Mirrored transforms (negative determinant)
   * reverse triangle winding.  Instead of paying `DoubleSide` for every
   * fill in the scene, the batching layer calls this method only for
   * meshes that actually need it.  The variant is cached so repeated
   * calls for the same material are free.
   *
   * For non-fill materials (lines, points) this is a no-op — those
   * primitives are unaffected by face culling.
   */
  getBackSideVariant(material: THREE.Material): THREE.Material {
    return this.fillMgr.getBackSideVariant(material)
  }

  /**
   * Repaints cached ACI-7 / foreground-tracked materials.
   */
  private repaintForegroundMaterials(color: number) {
    this.lineMgr.changeForeground(color)
    this.pointMgr.changeForeground(color)
    this.fillMgr.changeForeground(color)
  }

  /**
   * Clears all cached materials and releases its memory
   */
  dispose(): void {
    this.lineMgr.dispose()
    this.pointMgr.dispose()
    this.fillMgr.dispose()
  }

}
