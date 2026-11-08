import { EditorPromptKeywordOptions } from '../prompt/EditorPromptKeywordOptions'
import { EditorInputHandler, EditorPointInputContext } from './EditorInputHandler'

/**
 * Validates keyword input according to {@link EditorPromptKeywordOptions}.
 */
export class EditorKeywordHandler implements EditorInputHandler<string> {
  private options: EditorPromptKeywordOptions

  constructor(options: EditorPromptKeywordOptions) {
    this.options = options
  }

  parse(value: string): string | null {
    const input = value.trim()

    // 1. ENTER / empty input
    if (input.length === 0) {
      return this.options.allowNone ? null : null
      // returning null signals invalid or none;
      // caller can differentiate based on allowNone
    }

    // 2. Try keyword match (case-insensitive)
    const keyword = this.options.keywords.findByName(input)
    if (keyword) {
      // Return canonical keyword name (AutoCAD-style)
      return keyword.globalName
    }

    // 3. Arbitrary input
    if (this.options.allowArbitraryInput) {
      return input
    }

    // 4. Invalid input
    return null
  }

  parseCommandLine(token: string, _context?: EditorPointInputContext) {
    return this.parse(token)
  }
}
