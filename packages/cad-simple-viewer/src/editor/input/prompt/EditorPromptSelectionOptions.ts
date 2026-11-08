import { EditorPromptOptions } from './EditorPromptOptions'

/**
 * Represents prompt options for one selection set
 * Mirrors `Autodesk.AutoCAD.EditorInput.PromptSelectionOptions`.
 */
export class EditorPromptSelectionOptions extends EditorPromptOptions<string> {
  /** Whether to force single object selection only */
  private _singleOnly = false


  constructor(message: string, globalKeywords?: string) {
    super(message, globalKeywords)
  }

  /**
   * Gets or sets whether to force single object selection only
   */
  get singleOnly(): boolean {
    return this._singleOnly
  }

  set singleOnly(value: boolean) {
    this._singleOnly = value
  }

}
