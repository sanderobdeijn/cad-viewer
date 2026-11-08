import type { GraphicsInterfaceDrawable } from '@mlightcad/graphic-interface'

import { EditorLayerInfo } from '../editor'
import { ThreeRendererLayer } from './ThreeRendererLayer'

type ThreeRendererEntityDisplayCandidate = Pick<GraphicsInterfaceDrawable, 'visibility' | 'layer'>

/**
 * Resolves whether database entities should be converted into scene geometry.
 *
 * Entity-level {@link GraphicsInterfaceDrawable.visibility} only reflects per-entity hide state
 * (DXF code 60). Layer off/frozen state is tracked separately on the layer table
 * so off-layer content can be skipped at open time and converted later when the
 * layer becomes visible again.
 *
 * The host view ({@link ThreeRendererView2d}) supplies layer metadata and performs batch
 * conversion through its existing entity pipeline.
 */
export class ThreeRendererEntityDisplayController {
  constructor(
    private readonly getLayerInfo: (
      layerName: string
    ) => EditorLayerInfo | undefined
  ) {}

  /**
   * Returns true when an entity should be converted into scene geometry now.
   */
  shouldConvert(entity: ThreeRendererEntityDisplayCandidate): boolean {
    if (!entity.visibility) {
      return false
    }

    const layer = this.getLayerInfo(entity.layer)
    if (!layer) {
      return true
    }

    return ThreeRendererLayer.isLayerVisible(layer)
  }

  /**
   * Returns true when an entity should be converted for offline export.
   *
   * Export snapshots carry layer on/off state separately; geometry for off layers
   * must still be present so the HTML layer panel can toggle visibility.
   */
  shouldConvertForExport(
    entity: ThreeRendererEntityDisplayCandidate,
    includeInvisibleLayers = true
  ): boolean {
    if (!entity.visibility) {
      return false
    }

    if (includeInvisibleLayers) {
      return true
    }

    return this.shouldConvert(entity)
  }
}
