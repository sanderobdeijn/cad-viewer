import { GeometryBox2d } from '@mlightcad/geometry-engine'

import { EditorPromptResult } from './EditorPromptResult'
import { EditorPromptStatus } from './EditorPromptStatus'

/**
 * Result of a prompt that requests a rectangular box.
 */
export class EditorPromptBoxResult extends EditorPromptResult {
  /** Gets the rectangular bounding box that the user specified. */
  readonly value?: GeometryBox2d

  constructor(
    status: EditorPromptStatus,
    value?: GeometryBox2d,
    stringResult?: string
  ) {
    super(status, stringResult)
    this.value = value
  }
}
