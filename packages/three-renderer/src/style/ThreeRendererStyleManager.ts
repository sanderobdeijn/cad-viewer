import { CommonColor } from '@mlightcad/common'
import {
  GRAPHICS_INTERFACE_MODEL_SPACE_BACKGROUND,
  graphicsInterfaceForegroundColorForBackground,
  GraphicsInterfaceSubEntityTraits
} from '@mlightcad/graphic-interface'
import * as THREE from 'three'

import { ThreeRendererFillMaterialManager } from './ThreeRendererFillMaterialManager'
import { ThreeRendererLineMaterialManager } from './ThreeRendererLineMaterialManager'
import { ThreeRendererMaterialCacheStats } from './ThreeRendererMaterialManager'
import { ThreeRendererPointMaterialManager } from './ThreeRendererPointMaterialManager'
import { ThreeRendererStyleManagerOptions } from './ThreeRendererStyleManagerOptions'

/** Aggregated material-cache stats across point / line / fill managers. */
export interface ThreeRendererStyleManagerStats {
  point: ThreeRendererMaterialCacheStats
  line: ThreeRendererMaterialCacheStats
  fill: ThreeRendererMaterialCacheStats
  totalCount: number
  totalEstimatedBytes: number
}

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
    resolution: new THREE.Vector2(1, 1),
    showLineWeight: false,
    currentBackgroundColor: GRAPHICS_INTERFACE_MODEL_SPACE_BACKGROUND
  }
  private pointMgr: ThreeRendererPointMaterialManager
  private lineMgr: ThreeRendererLineMaterialManager
  private fillMgr: ThreeRendererFillMaterialManager
  /**
   * When true, fat-line materials are used even if {@link showLineWeight}
   * (LWDISPLAY) is off. Overlay transients (measurement) set this
   * for the duration of conversion so ribbon lineweight is visible.
   */
  private _forceShowLineWeight = false

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
   * @param basicMaterialOnly - The flag whether to search and return the basic material only
   */
  getLineMaterial(
    traits: GraphicsInterfaceSubEntityTraits,
    basicMaterialOnly?: boolean,
    layerColor?: CommonColor,
    layerColorRgb?: number
  ): THREE.Material {
    const showLineWeight =
      this.options.showLineWeight || this._forceShowLineWeight
    const forceBasicMaterial = !showLineWeight
    return this.lineMgr.getMaterial(
      traits,
      {
        basicMaterialOnly: basicMaterialOnly || forceBasicMaterial
      },
      layerColorRgb,
      layerColor
    )!
  }

  /**
   * Gets whether lineweights are currently displayed.
   */
  get showLineWeight(): boolean {
    return this.options.showLineWeight
  }

  /**
   * Sets whether lineweights are displayed.
   */
  set showLineWeight(value: boolean) {
    this.options.showLineWeight = value
  }

  /**
   * Whether overlay conversion should honor entity lineweights even when
   * {@link showLineWeight} is false.
   */
  get forceShowLineWeight(): boolean {
    return this._forceShowLineWeight
  }

  set forceShowLineWeight(value: boolean) {
    this._forceShowLineWeight = value
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
   * Forces all materials that belong to the given layer to update,
   * for traits that use ByLayer color or ByLayer lineType.
   *
   * @param layerName - The name of the layer whose materials need to be updated.
   * @param newTraits - Layer-level traits (color, lineType, etc.) resolved from your layer table.
   * @returns Mapping: oldMaterialId → newMaterial
   */
  updateLayerMaterial(
    layerName: string,
    newTraits: Partial<GraphicsInterfaceSubEntityTraits>
  ): Record<number, THREE.Material> {
    return {
      ...this.lineMgr.updateLayerMaterial(layerName, newTraits),
      ...this.pointMgr.updateLayerMaterial(layerName, newTraits),
      ...this.fillMgr.updateLayerMaterial(layerName, newTraits)
    }
  }

  /**
   * Returns a cached material bound to an effective layer without changing symbolic traits.
   *
   * The returned material keeps the same appearance now, but future layer updates
   * will target the effective layer instead of the source layer.
   *
   * @param material - Existing material used by a rendered object.
   * @param layerName - Effective layer that should own future updates for this material.
   * @param layerTraits - Optional resolved layer traits applied immediately for ByLayer attributes.
   * @returns A cached material bound to the effective layer.
   */
  getLayerBoundMaterial(
    material: THREE.Material,
    layerName: string,
    layerTraits?: Partial<GraphicsInterfaceSubEntityTraits>
  ) {
    return (
      this.lineMgr.getLayerBoundMaterial(material, layerName, layerTraits) ||
      this.pointMgr.getLayerBoundMaterial(material, layerName, layerTraits) ||
      this.fillMgr.getLayerBoundMaterial(material, layerName, layerTraits) ||
      material
    )
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

  /**
   * Returns aggregated material-cache stats for memory diagnostics.
   */
  getStats(): ThreeRendererStyleManagerStats {
    const point = this.pointMgr.getStats()
    const line = this.lineMgr.getStats()
    const fill = this.fillMgr.getStats()
    return {
      point,
      line,
      fill,
      totalCount: point.count + line.count + fill.count,
      totalEstimatedBytes:
        point.estimatedBytes + line.estimatedBytes + fill.estimatedBytes
    }
  }

  updateLineResolution(width: number, height: number): void {
    this.options.resolution.set(width, height)
    this.lineMgr.updateResolution()
  }
}
