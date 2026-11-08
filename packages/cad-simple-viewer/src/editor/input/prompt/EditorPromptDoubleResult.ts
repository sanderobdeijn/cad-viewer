import { EditorPromptNumericalResult } from './EditorPromptNumericalResult'
import { EditorPromptStatus } from './EditorPromptStatus'

/**
 * Result of a prompt requesting a double precision floating-point value.
 */
export class EditorPromptDoubleResult extends EditorPromptNumericalResult {
  constructor(status: EditorPromptStatus, value?: number) {
    super(status, value)
  }
}
