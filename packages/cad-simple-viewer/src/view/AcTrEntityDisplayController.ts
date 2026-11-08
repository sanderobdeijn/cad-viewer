import type { AcGiDrawable } from '@mlightcad/graphic-interface'

import { AcEdLayerInfo } from '../editor'
import { AcTrLayer } from './AcTrLayer'

type AcTrEntityDisplayCandidate = Pick<AcGiDrawable, 'visibility' | 'layer'>

/**
 * Resolves whether database entities should be converted into scene geometry.
 *
 * Entity-level {@link AcGiDrawable.visibility} only reflects per-entity hide state
 * (DXF code 60). Layer off/frozen state is tracked separately on the layer table
 * so off-layer content can be skipped at open time and converted later when the
 * layer becomes visible again.
 *
 * The host view ({@link AcTrView2d}) supplies layer metadata and performs batch
 * conversion through its existing entity pipeline.
 */
export class AcTrEntityDisplayController {
  constructor(
    private readonly getLayerInfo: (
      layerName: string
    ) => AcEdLayerInfo | undefined
  ) {}

  /**
   * Returns true when an entity should be converted into scene geometry now.
   */
  shouldConvert(entity: AcTrEntityDisplayCandidate): boolean {
    if (!entity.visibility) {
      return false
    }

    const layer = this.getLayerInfo(entity.layer)
    if (!layer) {
      return true
    }

    return AcTrLayer.isLayerVisible(layer)
  }

  /**
   * Returns true when an entity should be converted for offline export.
   *
   * Export snapshots carry layer on/off state separately; geometry for off layers
   * must still be present so the HTML layer panel can toggle visibility.
   */
  shouldConvertForExport(
    entity: AcTrEntityDisplayCandidate,
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
