import { GraphicsInterfaceSubEntityTraits } from '@mlightcad/graphic-interface'
import { ThreeRendererRenderer } from '@mlightcad/three-renderer'

import {
  APPLICATION_DEFAULT_LAYER,
  applicationDefaultLayerTraits
} from '../model/ApplicationItemDrawable'
import { ThreeRendererScene } from './ThreeRendererScene'

/**
 * Synchronizes scene drawable materials with live layer-table style changes.
 *
 * The host view ({@link ThreeRendererView2d}) delegates layer add/update and background
 * refresh entry points here so material cache updates, scene fan-out, and text
 * rematerialization stay out of the view class.
 */
export class ThreeRendererLayerAppearanceController {
  /**
   * @param scene - Scene whose layout layer groups receive appearance updates.
   * @param renderer - Renderer whose layer materials are updated.
   * @param getLayerTraits - Optional override for resolving live layer-table traits.
   */
  constructor(
    private readonly scene: ThreeRendererScene,
    private readonly renderer: ThreeRendererRenderer,
    private readonly getLayerTraits?: (
      layerName: string
    ) => Partial<GraphicsInterfaceSubEntityTraits> | undefined
  ) {}

  /**
   * Refreshes cached layer materials from the live layer-table record and
   * propagates the result to batched drawables and text hierarchies.
   *
   * @param layer - Live layer-table record whose traits should drive the refresh.
   */
  syncFromLiveRecord(layerName: string): void {
    const layerTraits = this.getEffectiveLayerTraits(layerName)
    if (!layerTraits) {
      return
    }

    const materials = this.renderer.updateLayerMaterial(layerName, layerTraits)
    this.scene.forEachSceneLayer(layerName, sceneLayer =>
      sceneLayer.syncAppearanceFromRecord(
        layerName,
        layerTraits,
        materials,
        this.renderer
      )
    )
  }

  /**
   * Builds resolved layer traits used when syncing appearance.
   *
   * Uses the traits of {@link APPLICATION_DEFAULT_LAYER} unless a custom resolver was
   * supplied to the constructor.
   *
   * @param layerName - Name of the layer to resolve.
   * @returns Resolved sub-entity traits, or undefined when the layer is missing.
   */
  getEffectiveLayerTraits(
    layerName: string
  ): Partial<GraphicsInterfaceSubEntityTraits> | undefined {
    if (this.getLayerTraits) {
      return this.getLayerTraits(layerName)
    }

    return layerName === APPLICATION_DEFAULT_LAYER.name
      ? applicationDefaultLayerTraits()
      : undefined
  }
}
