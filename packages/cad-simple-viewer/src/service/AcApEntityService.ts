import {
  AcDbEntity,
  AcDbObjectId,
  GeometryMatrix3d,
  GeometryPoint2dLike
} from '@mlightcad/data-model'

import type { AcApModelSync } from '../app/AcApModelSync'
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
 * document's model, seen through the entities that draw them.
 */
export class AcApEntityService {
  private readonly sync: AcApModelSync

  /**
   * Creates an entity service bound to a document's model.
   *
   * @param sync - The model whose items will be changed.
   */
  constructor(sync: AcApModelSync) {
    this.sync = sync
  }

  /**
   * Returns the entities that draw the items with the given ids.
   *
   * @param ids - Item ids to look up.
   * @returns Entities for the ids that exist.
   */
  getEntitiesByIds(ids: AcDbObjectId[]): AcDbEntity[] {
    return this.sync.entities(ids)
  }

  /**
   * Applies a transform matrix to the items drawn by entities.
   *
   * @param entities - Entities to transform.
   * @param matrix - Transform to apply via {@link AcDbEntity.transformBy}.
   * @returns Number of items transformed.
   */
  transformEntities(entities: AcDbEntity[], matrix: GeometryMatrix3d): number {
    let count = 0
    entities.forEach(entity => {
      if (this.sync.edit(entity.objectId, copy => copy.transformBy(matrix))) {
        count++
      }
    })
    return count
  }

  /**
   * Translates entities by a displacement vector.
   *
   * @param entities - Entities to move.
   * @param displacement - Translation vector in WCS.
   * @returns Number of items translated.
   */
  translateEntities(
    entities: AcDbEntity[],
    displacement: GeometryPoint2dLike
  ): number {
    const matrix = new GeometryMatrix3d().makeTranslation(
      displacement.x,
      displacement.y,
      0
    )
    return this.transformEntities(entities, matrix)
  }

  /**
   * Rotates entities around a base point.
   *
   * @param entities - Entities to rotate.
   * @param basePoint - Rotation origin in WCS.
   * @param angleRad - Rotation angle in radians.
   * @returns Number of items rotated.
   */
  rotateEntities(
    entities: AcDbEntity[],
    basePoint: GeometryPoint2dLike,
    angleRad: number
  ): number {
    const matrix = createRotationMatrix(basePoint, angleRad)
    return this.transformEntities(entities, matrix)
  }

  /**
   * Clones entities, transforms them, and optionally adds them to the drawing.
   *
   * @param sourceEntities - Entities to clone.
   * @param matrix - Transform applied to each clone.
   * @param options - Append behavior.
   * @returns Transformed clone instances.
   */
  cloneAndTransform(
    sourceEntities: AcDbEntity[],
    matrix: GeometryMatrix3d,
    options: AcApCloneAndTransformOptions = {}
  ): AcDbEntity[] {
    const append = options.append ?? true
    const clones = sourceEntities
      .map(entity => entity.clone())
      .filter((entity): entity is AcDbEntity => !!entity)

    clones.forEach(entity => entity.transformBy(matrix))

    if (append && clones.length > 0) {
      this.sync.add(clones)
    }

    return clones
  }

  /**
   * Erases items by id.
   *
   * @param objectIds - Item ids to erase.
   * @returns Number of items erased.
   */
  eraseEntities(objectIds: AcDbObjectId[]): number {
    return this.sync.remove(objectIds)
  }
}
