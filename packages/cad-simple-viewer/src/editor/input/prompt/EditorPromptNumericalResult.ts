import { EditorPromptResult } from './EditorPromptResult'
import { EditorPromptStatus } from './EditorPromptStatus'

/**
 * Result of a prompt that requests a double or integer numeric value.
 */
export class EditorPromptNumericalResult extends EditorPromptResult {
  /**
   * The numeric value returned by the prompt.
   */
  readonly value?: number

  /**
   * Constructs a new result for a double-value or integer-value prompt.
   *
   * @param status The status of the prompt (OK, Cancel, Error, etc.)
   * @param value The numeric value returned (only meaningful when OK)
   */
  constructor(status: EditorPromptStatus, value?: number) {
    super(status, undefined)
    this.value = value
  }
}
