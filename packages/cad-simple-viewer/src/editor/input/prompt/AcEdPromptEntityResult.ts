import { AcDbObjectId, GeometryPoint2dLike } from '@mlightcad/data-model'

import { AcEdPromptResult } from './AcEdPromptResult'
import { AcEdPromptStatus } from './AcEdPromptStatus'

/**
 * Result of a prompt that asks the user to pick a single entity.
 */
export class AcEdPromptEntityResult extends AcEdPromptResult {
  /** Gets the entity that the user picked. */
  readonly objectId?: AcDbObjectId
  /** Gets the point that was used to pick the entity. */
  readonly pickedPoint?: GeometryPoint2dLike

  constructor(
    status: AcEdPromptStatus,
    objectId?: AcDbObjectId,
    pickedPoint?: GeometryPoint2dLike
  ) {
    super(status)
    this.objectId = objectId
    this.pickedPoint = pickedPoint
  }
}
