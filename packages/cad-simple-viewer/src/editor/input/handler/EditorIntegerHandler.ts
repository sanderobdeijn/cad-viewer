import { EditorPromptIntegerOptions } from '../prompt/EditorPromptIntegerOptions'
import { EditorNumericalHandler } from './EditorNumericalHandler'

/**
 * Handles validation and parsing of integer user input.
 */
export class EditorIntegerHandler extends EditorNumericalHandler {
  declare protected options: EditorPromptIntegerOptions

  constructor(options: EditorPromptIntegerOptions) {
    super(options)
  }

  parse(value: string) {
    const n = super.parse(value)
    if (n == null) {
      return n
    }

    if (!Number.isInteger(n)) {
      return null
    }

    if (this.options.lowerLimit !== undefined && n < this.options.lowerLimit) {
      return null
    }

    if (this.options.upperLimit !== undefined && n > this.options.upperLimit) {
      return null
    }

    return n
  }
}
