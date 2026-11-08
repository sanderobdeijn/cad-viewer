import {
  GeometryMatrix3d,
  GeometryPoint2dLike,
  type ModelItem
} from '@mlightcad/geometry-engine'

import type { AcApModelSync } from '../app/AcApModelSync'
import { type AcApItemContents, transformItem } from '../model/AcApItemGeometry'
import { createRotationMatrix } from '../util/AcApGeTransform'

/**
 * Options for {@link AcApEntityService.cloneAndTransform}.
 */
export interface AcApCloneAndTransformOptions {
  /** Add the clones to the drawing. Default `true`. */
  append?: boolean
}

/**
 * Centralizes drawing changes for modify commands and non-command callers.
 *
 * Provides geometric transforms, cloning and erasure of the items of one
 * document's model.
 */
export class AcApEntityService {
  private readonly sync: AcApModelSync

  /**
   * Creates a service bound to a document's model.
   *
   * @param sync - The model whose items will be changed.
   */
  constructor(sync: AcApModelSync) {
    this.sync = sync
  }

  /**
   * Returns the items with the given ids that exist.
   *
   * @param ids - Item ids to look up.
   */
  getItemsByIds(ids: string[]): ModelItem[] {
    return ids
      .map(id => this.sync.item(id))
      .filter((item): item is ModelItem => !!item)
  }

  /**
   * Applies a transform matrix to items, keeping their ids.
   *
   * @param items - Items to transform.
   * @param matrix - Transform to apply.
   * @returns Number of items transformed.
   */
  transformItems(items: ModelItem[], matrix: GeometryMatrix3d): number {
    let count = 0
    for (const item of items) {
      if (this.sync.update(item.id, transformItem(item, matrix))) count++
    }
    return count
  }

  /**
   * Translates items by a displacement vector.
   *
   * @param items - Items to move.
   * @param displacement - Translation vector in WCS.
   * @returns Number of items translated.
   */
  translateItems(
    items: ModelItem[],
    displacement: GeometryPoint2dLike
  ): number {
    const matrix = new GeometryMatrix3d().makeTranslation(
      displacement.x,
      displacement.y,
      0
    )
    return this.transformItems(items, matrix)
  }

  /**
   * Rotates items around a base point.
   *
   * @param items - Items to rotate.
   * @param basePoint - Rotation origin in WCS.
   * @param angleRad - Rotation angle in radians.
   * @returns Number of items rotated.
   */
  rotateItems(
    items: ModelItem[],
    basePoint: GeometryPoint2dLike,
    angleRad: number
  ): number {
    return this.transformItems(items, createRotationMatrix(basePoint, angleRad))
  }

  /**
   * Transforms copies of items and optionally adds them to the drawing.
   *
   * @param items - Items to copy.
   * @param matrix - Transform applied to each copy.
   * @param options - Append behavior.
   * @returns The transformed copies.
   */
  cloneAndTransform(
    items: ModelItem[],
    matrix: GeometryMatrix3d,
    options: AcApCloneAndTransformOptions = {}
  ): AcApItemContents[] {
    const copies = items.map(item => transformItem(item, matrix))
    if ((options.append ?? true) && copies.length > 0) {
      this.sync.addItems(copies)
    }
    return copies
  }

  /**
   * Erases items by id.
   *
   * @param ids - Item ids to erase.
   * @returns Number of items erased.
   */
  eraseItems(ids: string[]): number {
    return this.sync.remove(ids)
  }
}
