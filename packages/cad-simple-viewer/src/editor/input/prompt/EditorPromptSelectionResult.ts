import { EditorSelectionSet } from '../EditorSelectionSet'
import { EditorPromptResult } from './EditorPromptResult'
import { EditorPromptStatus } from './EditorPromptStatus'

/**
 * Result of a prompt that requests a selection set.
 */
export class EditorPromptSelectionResult extends EditorPromptResult {
  /** Gets the SelectionSet that the user selected. */
  readonly value?: EditorSelectionSet

  constructor(
    status: EditorPromptStatus,
    value?: EditorSelectionSet,
    stringResult?: string
  ) {
    super(status, stringResult)
    this.value = value
  }
}
