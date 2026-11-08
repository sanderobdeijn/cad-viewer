import { EditorPromptStringOptions } from '../prompt/EditorPromptStringOptions'
import { EditorInputHandler, EditorPointInputContext } from './EditorInputHandler'

/**
 * Validates string input according to {@link EditorPromptStringOptions}.
 * Supports empty string rules and maximum length.
 */
export class EditorStringHandler implements EditorInputHandler<string> {
  private options: EditorPromptStringOptions

  constructor(options: EditorPromptStringOptions) {
    this.options = options
  }

  parse(value: string) {
    if (!this.options.allowSpaces && value.includes(' ')) {
      return null
    }

    if (!this.options.allowEmpty && value.length === 0) {
      return null
    }

    if (this.options.maxLength && value.length > this.options.maxLength) {
      return null
    }

    return value
  }

  parseCommandLine(token: string, _context?: EditorPointInputContext) {
    return this.parse(token)
  }
}
