import { EditorPromptNumericalOptions } from '../prompt/EditorPromptNumericalOptions'
import { EditorInputHandler, EditorPointInputContext } from './EditorInputHandler'

/**
 * Handles validation and parsing of numerical user input.
 */
export class EditorNumericalHandler implements EditorInputHandler<number> {
  protected options: EditorPromptNumericalOptions

  constructor(options: EditorPromptNumericalOptions) {
    this.options = options
  }

  parse(value: string) {
    const n = Number(value)

    if (isNaN(n)) {
      return null
    }

    if (!this.options.allowNegative && n < 0) {
      return null
    }

    if (!this.options.allowZero && n === 0) {
      return null
    }

    return n
  }

  parseCommandLine(token: string, _context?: EditorPointInputContext) {
    const trimmed = token.trim()
    if (!trimmed) return null
    return this.parse(trimmed)
  }
}
