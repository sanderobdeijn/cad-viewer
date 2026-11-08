import { AcGiSubEntityTraits } from '@mlightcad/graphic-interface'
import { AcTrRenderer } from '@mlightcad/three-renderer'
import * as THREE from 'three'

import {
  ACAP_DEFAULT_LAYER,
  acapDefaultLayerTraits
} from '../model/AcApItemDrawable'
import { AcTrScene } from './AcTrScene'

/**
 * Synchronizes scene drawable materials with live layer-table style changes.
 *
 * The host view ({@link AcTrView2d}) delegates layer add/update and background
 * refresh entry points here so material cache updates, scene fan-out, and text
 * rematerialization stay out of the view class.
 */
export class AcTrLayerAppearanceController {
  /**
   * @param scene - Scene whose layout layer groups receive appearance updates.
   * @param renderer - Renderer whose layer materials are updated.
   * @param getLayerTraits - Optional override for resolving live layer-table traits.
   */
  constructor(
    private readonly scene: AcTrScene,
    private readonly renderer: AcTrRenderer,
    private readonly getLayerTraits?: (
      layerName: string
    ) => Partial<AcGiSubEntityTraits> | undefined
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
   * Rebinds text materials after groups are split/reparented or when the
   * canvas background changes (ACI-7 foreground inversion).
   *
   * @param root - Object subtree to traverse for text refresh hooks.
   * @param layerTraits - Optional resolved traits passed through to text wrappers.
   */
  refreshTextMaterialsInObjectTree(
    root: THREE.Object3D,
    layerTraits?: Partial<AcGiSubEntityTraits>
  ): void {
    root.traverse(child => {
      const refresh = (
        child as {
          refreshTextMaterials?: (
            layerTraits?: Partial<AcGiSubEntityTraits>
          ) => void
        }
      ).refreshTextMaterials
      if (typeof refresh === 'function') {
        refresh.call(child, layerTraits)
      }
    })
  }

  /**
   * Builds resolved layer traits used when syncing appearance.
   *
   * Uses the traits of {@link ACAP_DEFAULT_LAYER} unless a custom resolver was
   * supplied to the constructor.
   *
   * @param layerName - Name of the layer to resolve.
   * @returns Resolved sub-entity traits, or undefined when the layer is missing.
   */
  getEffectiveLayerTraits(
    layerName: string
  ): Partial<AcGiSubEntityTraits> | undefined {
    if (this.getLayerTraits) {
      return this.getLayerTraits(layerName)
    }

    return layerName === ACAP_DEFAULT_LAYER.name
      ? acapDefaultLayerTraits()
      : undefined
  }
}
