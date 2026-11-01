import { AcCmColor, AcCmTransparency } from '@mlightcad/common'
import { AcGiLineWeight } from '@mlightcad/graphic-interface'

import type { AcDbEntity } from '../entity/AcDbEntity'
import { ByBlock, ByLayer, DEFAULT_LINE_TYPE } from '../misc/AcDbConstants'
import type { AcDbDatabase } from './AcDbDatabase'

/** Layer name that every flattened entity ends up on. */
const FLATTENED_LAYER_NAME = '0'

interface AcDbFlattenedLayerStyle {
  color: AcCmColor
  linetype: string
  lineWeight: AcGiLineWeight
  transparency: AcCmTransparency
}

/**
 * Collapses a drawing onto layer `0` while it is being read.
 *
 * Construct it once the layer table is loaded: it captures each layer's style,
 * removes every layer except `0` and makes `0` visible and unlocked. Each entity
 * is then passed to {@link flatten} as it is appended, which bakes the style of
 * its original layer into the entity, so everything keeps its authored
 * appearance and content from hidden or frozen layers becomes visible.
 *
 * Inside a block, an entity on layer `0` inherits from the owning INSERT rather
 * than from a layer. Its ByLayer properties become ByBlock, which resolve against
 * the INSERT's baked values. An INSERT with an explicit color and a ByLayer
 * child therefore shows the INSERT's color rather than its layer's color.
 */
export class AcDbLayerFlattener {
  private readonly styles = new Map<string, AcDbFlattenedLayerStyle>()

  constructor(private readonly db: AcDbDatabase) {
    const layerTable = db.tables.layerTable
    const names: string[] = []
    for (const layer of layerTable.newIterator()) {
      names.push(layer.name)
      if (layer.name === FLATTENED_LAYER_NAME) continue
      this.styles.set(layer.name, {
        color: layer.color,
        linetype: layer.linetype || DEFAULT_LINE_TYPE,
        lineWeight: layer.lineWeight,
        transparency: layer.transparency
      })
    }
    for (const name of names) {
      if (name !== FLATTENED_LAYER_NAME) layerTable.remove(name)
    }

    if (!layerTable.has(FLATTENED_LAYER_NAME)) {
      db.createDefaultData({ layer: true })
    }
    const baseLayer = layerTable.getAt(FLATTENED_LAYER_NAME)
    if (baseLayer) {
      baseLayer.isOff = false
      // The isFrozen / isLocked setters can only set their flags, not clear them.
      baseLayer.standardFlags = baseLayer.standardFlags & ~0x05
      baseLayer.isPlottable = true
    }
  }

  /**
   * Moves one entity to layer `0`, baking in the style it had on its old layer.
   * Calling it again on the same entity has no effect.
   *
   * @param entity - Entity being appended.
   * @param inheritsFromOwner - True for block contents and attributes, whose
   *   layer-0 properties inherit from the owning INSERT.
   */
  flatten(entity: AcDbEntity, inheritsFromOwner: boolean) {
    const layerName = entity.layer
    if (layerName === FLATTENED_LAYER_NAME) {
      if (inheritsFromOwner) this.convertByLayerToByBlock(entity)
      return
    }

    const style = this.styles.get(layerName)
    if (style) {
      if (entity.color.isByLayer) entity.color = style.color.clone()
      if (entity.lineType === ByLayer) entity.lineType = style.linetype
      if (entity.lineWeight === AcGiLineWeight.ByLayer) {
        entity.lineWeight = style.lineWeight
      }
      if (style.transparency.isByAlpha && entity.transparency.isByLayer) {
        entity.transparency = style.transparency.clone()
      }
    }
    entity.layer = FLATTENED_LAYER_NAME
  }

  /** Puts the current layer back on layer `0` once reading has finished. */
  finish() {
    this.db.clayer = FLATTENED_LAYER_NAME
  }

  private convertByLayerToByBlock(entity: AcDbEntity) {
    if (entity.color.isByLayer) entity.color = new AcCmColor().setByBlock()
    if (entity.lineType === ByLayer) entity.lineType = ByBlock
    if (entity.lineWeight === AcGiLineWeight.ByLayer) {
      entity.lineWeight = AcGiLineWeight.ByBlock
    }
  }
}
