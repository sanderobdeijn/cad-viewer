import { EditorPromptAngleOptions } from '../prompt/EditorPromptAngleOptions'
import { EditorInputHandler, EditorPointInputContext } from './EditorInputHandler'

/**
 * Validates angular numeric input.
 * Uses degrees. Fully compatible with PromptAngleOptions behavior in AutoCAD.
 */
export class EditorAngleHandler implements EditorInputHandler<number> {
  private options: EditorPromptAngleOptions // same structure as double options

  constructor(options: EditorPromptAngleOptions) {
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
