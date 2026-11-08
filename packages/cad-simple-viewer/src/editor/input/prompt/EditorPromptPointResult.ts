import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'

import { EditorPromptResult } from './EditorPromptResult'
import { EditorPromptStatus } from './EditorPromptStatus'

/**
 * Result of a prompt that requests a **point**.
 *
 * This mirrors `Autodesk.AutoCAD.EditorInput.PromptPointResult`.
 */
export class EditorPromptPointResult extends EditorPromptResult {
  /**
   * The 2D point returned by the prompt.
   * Corresponds to .NET's `PromptPointResult.Value`.
   *
   * Valid only when `status === EditorPromptStatus.OK`.
   */
  readonly value?: GeometryPoint2dLike

  /**
   * Constructs a new result for a point prompt.
   *
   * @param status The status of the prompt (OK, Cancel, Error, etc.)
   * @param value The point returned (valid only on OK)
   */
  constructor(status: EditorPromptStatus, value?: GeometryPoint2dLike) {
    super(status, undefined)
    this.value = value
  }
}
