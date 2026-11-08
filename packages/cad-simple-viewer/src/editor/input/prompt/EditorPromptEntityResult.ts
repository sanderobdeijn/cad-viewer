import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'

import { EditorPromptResult } from './EditorPromptResult'
import { EditorPromptStatus } from './EditorPromptStatus'

/**
 * Result of a prompt that asks the user to pick a single entity.
 */
export class EditorPromptEntityResult extends EditorPromptResult {
  /** Gets the entity that the user picked. */
  readonly objectId?: string
  /** Gets the point that was used to pick the entity. */
  readonly pickedPoint?: GeometryPoint2dLike

  constructor(
    status: EditorPromptStatus,
    objectId?: string,
    pickedPoint?: GeometryPoint2dLike
  ) {
    super(status)
    this.objectId = objectId
    this.pickedPoint = pickedPoint
  }
}
