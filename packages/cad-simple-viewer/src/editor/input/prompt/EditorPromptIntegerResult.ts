import { EditorPromptNumericalResult } from './EditorPromptNumericalResult'
import { EditorPromptStatus } from './EditorPromptStatus'

/**
 * Result of a prompt requesting an integer value.
 */
export class EditorPromptIntegerResult extends EditorPromptNumericalResult {
  constructor(status: EditorPromptStatus, value?: number) {
    super(status, value)
  }
}
