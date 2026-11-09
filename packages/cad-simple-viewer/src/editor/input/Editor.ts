import { CommonEventManager } from '@mlightcad/common'

import { ApplicationDocManager } from '../../app'
import { EditorCommand } from '../command'
import { EditorBaseView } from '../view/EditorBaseView'
import { EditorCorsorType, EditorCursorManager } from './EditorCursorManager'
import { EditorInputModifiers } from './EditorInputModifiers'
import { EditorInputToggles } from './EditorInputToggles'
import { EditorSelectionSet } from './EditorSelectionSet'
import {
  EditorPromptAngleOptions,
  EditorPromptBoxOptions,
  EditorPromptBoxResult,
  EditorPromptDistanceOptions,
  EditorPromptDoubleOptions,
  EditorPromptDoubleResult,
  EditorPromptEntityOptions,
  EditorPromptEntityResult,
  EditorPromptIntegerOptions,
  EditorPromptIntegerResult,
  EditorPromptKeywordOptions,
  EditorPromptPointOptions,
  EditorPromptPointResult,
  EditorPromptResult,
  EditorPromptSelectionOptions,
  EditorPromptSelectionResult,
  EditorPromptStatus,
  EditorPromptStringOptions
} from './prompt'
import { EditorInputManager, EditorMessageType } from './ui'

/**
 * Event arguments for command lifecycle events.
 *
 * Contains the command instance that triggered the event.
 */
export interface EditorCommandEventArgs {
  /** The command instance involved in the event */
  command: EditorCommand
}

/**
 * Advanced input handler for CAD operations providing high-level user interaction methods.
 *
 * This class serves as a wrapper for all types of user input including:
 * - Point input (mouse clicks, coordinates)
 * - Entity selection (single or multiple entities)
 * - String, number, angle, and distance input
 * - Cursor management and visual feedback
 *
 * The editor abstracts away low-level mouse and keyboard events, providing a clean API
 * for command implementations. Instead of listening to raw DOM events, commands should
 * use the methods provided by this class.
 *
 * @example
 * ```typescript
 * // Get user input for a point
 * const point = await editor.getPoint();
 * console.log('User clicked at:', point);
 *
 * // Get entity selection
 * const selection = await editor.getSelection();
 * console.log('Selected entities:', selection.ids);
 *
 * // Change cursor appearance
 * editor.setCursor(EditorCorsorType.Crosshair);
 * ```
 */
export class Editor {
  /** Previously set cursor type for restoration */
  private _previousCursor?: EditorCorsorType
  /** Currently active cursor type */
  private _currentCursor?: EditorCorsorType
  /** Manager for cursor appearance and behavior */
  private _cursorManager: EditorCursorManager
  /** Manager for mouse and keyboard input */
  private _inputManager: EditorInputManager
  /** The view this editor is associated with */
  protected _view: EditorBaseView

  /**
   * Editor events
   */
  public readonly events = {
    /** Fired just before the command starts executing */
    commandWillStart: new CommonEventManager<EditorCommandEventArgs>(),
    /** Fired after the command finishes executing */
    commandEnded: new CommonEventManager<EditorCommandEventArgs>()
  }

  /**
   * Creates a new editor instance for the specified view.
   *
   * @param view - The view that this editor will handle input for
   */
  constructor(view: EditorBaseView) {
    this._view = view
    this._cursorManager = new EditorCursorManager(view)
    this._inputManager = new EditorInputManager(view, this.events)
  }

  /** Input manager for prompts. */
  get inputManager() {
    return this._inputManager
  }

  /**
   * The flag to indicate whether it is currently in an “input acquisition” mode (e.g., point
   * selection, distance/angle prompt, string prompt, etc.),
   */
  get isActive() {
    return this._inputManager.isActive
  }
  /**
   * Whether the current input session explicitly allows entity selection.
   */
  get isEntitySelectionActive() {
    return this._inputManager.isEntitySelectionActive
  }

  /**
   * Current modifier key state (Ctrl/Shift/Alt/Meta) during input sessions.
   */
  getInputModifiers(): EditorInputModifiers {
    return this._inputManager.modifiers
  }

  /**
   * Toggle-style input states (e.g. Ctrl-press flip) during input sessions.
   */
  getInputToggles(): EditorInputToggles {
    return this._inputManager.toggles
  }

  /** Reset toggle-style inputs to their default state. */
  resetInputToggles() {
    this._inputManager.resetToggles()
  }

  /**
   * Programmatically cancels the currently active input prompt, if any.
   *
   * Delegates to {@link EditorInputManager.cancelActiveInput}. Used by the
   * command dispatcher to enforce command exclusivity: when a new command is
   * started while another is still waiting for user input, the previous
   * prompt is aborted with the canonical `'cancelled'` status before the new
   * command runs.
   */
  cancelActiveInput() {
    this._inputManager.cancelActiveInput()
  }

  /**
   * Tears down the input manager (command line, accessories).
   *
   * Safe to call more than once.
   */
  dispose() {
    this.cancelActiveInput()
    this._inputManager.dispose()
  }

  /**
   * Queues scripted command-line inputs for subsequent getXXX prompts.
   * One entry equals one Enter-confirmed input.
   */
  enqueueScriptInputs(inputs: string[]) {
    this._inputManager.enqueueScriptInputs(inputs)
  }

  /** Clears any queued scripted inputs. */
  clearScriptInputs() {
    this._inputManager.clearScriptInputs()
  }

  /** Returns whether any scripted inputs remain queued. */
  hasScriptInputs() {
    return this._inputManager.hasScriptInputs()
  }

  /**
   * Removes and returns all remaining scripted inputs.
   */
  drainScriptInputs() {
    return this._inputManager.drainScriptInputs()
  }

  /**
   * Displays a typed message in the command-line message panel.
   *
   * @param message - Message text to render
   * @param type - Message severity controlling the rendered style
   * @param msgKey - Optional localization key associated with the message
   */
  showMessage(
    message: string,
    type: EditorMessageType = 'info',
    msgKey?: string
  ) {
    this._inputManager.showMessage(message, type, msgKey)
  }

  /**
   * Returns the next queued scripted input without consuming it.
   */
  peekScriptInput() {
    return this._inputManager.peekScriptInput()
  }

  /**
   * Consumes and returns the next queued scripted input.
   */
  consumeScriptInput() {
    return this._inputManager.consumeScriptInput()
  }

  /**
   * Gets the currently active cursor type.
   *
   * @returns The current cursor type, or undefined if none is set
   */
  get currentCursor() {
    return this._currentCursor
  }

  /**
   * Restores the previously set cursor.
   *
   * This is useful for temporarily changing the cursor and then reverting
   * to the previous state.
   */
  restoreCursor() {
    if (this._previousCursor != null) {
      this.setCursor(this._previousCursor)
    }
  }

  /**
   * Sets the cursor appearance for the view.
   *
   * The previous cursor type is stored for potential restoration.
   *
   * @param cursorType - The cursor type to set
   *
   * @example
   * ```typescript
   * editor.setCursor(EditorCorsorType.Crosshair);  // For precise point input
   * editor.setCursor(EditorCorsorType.Grab);       // For pan operations
   * ```
   */
  setCursor(cursorType: EditorCorsorType) {
    this._cursorManager.setCursor(cursorType)
    this._previousCursor = this._currentCursor
    this._currentCursor = cursorType
  }

  /**
   * Temporarily sets a new cursor for the duration of a function execution.
   *
   * This method saves the current cursor, sets the new cursor, executes the provided function,
   * and then restores the original cursor regardless of whether the function succeeds or fails.
   *
   * @param cursorType - The cursor type to use temporarily
   * @param action - The function to execute with the temporary cursor
   * @returns The result of the executed function
   *
   * @example
   * ```typescript
   * // Temporarily set grab cursor for a pan operation
   * await editor.withCursor(EditorCorsorType.Grab, async () => {
   *   // Perform pan operation
   *   await this.performPan();
   * });
   * // Cursor is automatically restored to previous state
   * ```
   */
  async withCursor<T>(
    cursorType: EditorCorsorType,
    action: () => Promise<T> | T
  ): Promise<T> {
    const originalCursor = this._currentCursor
    this.setCursor(cursorType)

    try {
      return await Promise.resolve(action())
    } finally {
      if (originalCursor !== undefined) {
        this.setCursor(originalCursor)
      } else {
        this.restoreCursor()
      }
    }
  }

  /**
   * Sets the cursor color for the crosshair cursor
   *
   * @param color - The color for the cursor
   */
  setCursorColor(color: string) {
    this._cursorManager.setCursorColor(color)
  }

  /**
   * Syncs crosshair colour with the canvas background.
   */
  syncCursorBackground(backgroundColor: number) {
    this._cursorManager.syncBackgroundColor(backgroundColor)
  }

  /**
   * Prompts the user to input a point by clicking on the view or inputting
   * one coordinate value.
   *
   * This method returns a promise that resolves after the user clicks
   * on the view or inputs one valid coordinate value, providing the
   * world coordinates of the click point.
   *
   * @returns Promise that resolves to the input point coordinates
   */
  async getPoint(
    options: EditorPromptPointOptions
  ): Promise<EditorPromptPointResult> {
    return await this._inputManager.getPoint(options)
  }

  /**
   * Prompts the user to input an angle by clicking on the view or input
   * one number.
   *
   * This method returns a promise that resolves after the user clicks
   * on the view or inputs one valid angle value.
   *
   * @returns Promise that resolves to the input angle value.
   */
  async getAngle(
    options: EditorPromptAngleOptions
  ): Promise<EditorPromptDoubleResult> {
    return await this._inputManager.getAngle(options)
  }

  /**
   * Prompts the user to input a distance by clicking on the view or input
   * one number.
   *
   * This method returns a promise that resolves after the user clicks
   * on the view or inputs one valid distance value.
   *
   * @returns Promise that resolves to the input distance value.
   */
  async getDistance(
    options: EditorPromptDistanceOptions
  ): Promise<EditorPromptDoubleResult> {
    return await this._inputManager.getDistance(options)
  }

  /**
   * Prompts the user to input a double value.
   *
   * @returns Promise that resolves to the input double value.
   */
  async getDouble(
    options: EditorPromptDoubleOptions
  ): Promise<EditorPromptDoubleResult> {
    return await this._inputManager.getDouble(options)
  }

  /**
   * Prompts the user to input an integer value.
   *
   * @returns Promise that resolves to the input integer value.
   */
  async getInteger(
    options: EditorPromptIntegerOptions
  ): Promise<EditorPromptIntegerResult> {
    return await this._inputManager.getInteger(options)
  }

  /**
   * Prompts the user to input a string.
   *
   * @returns Promise that resolves to the input one string.
   */
  async getString(options: EditorPromptStringOptions): Promise<EditorPromptResult> {
    return await this._inputManager.getString(options)
  }

  /**
   * Prompts the user to input a keyword.
   *
   * @returns Promise that resolves to the input one keyword.
   */
  async getKeywords(
    options: EditorPromptKeywordOptions
  ): Promise<EditorPromptResult> {
    return await this._inputManager.getKeywords(options)
  }

  /**
   * Prompts the user to input a keyword.
   *
   * @returns Promise that resolves to the input one keyword.
   */
  async getEntity(
    options: EditorPromptEntityOptions
  ): Promise<EditorPromptEntityResult> {
    return await this._inputManager.getEntity(options)
  }

  /**
   * Prompts the user to select entities using box selection.
   *
   * This method allows the user to drag a selection box to select
   * multiple entities at once. The selection behavior follows CAD
   * conventions (left-to-right for window, right-to-left for crossing).
   *
   * @returns Promise that resolves to the selection set containing selected entity IDs
   */
  async getSelection(
    options: EditorPromptSelectionOptions
  ): Promise<EditorPromptSelectionResult> {
    return await this._inputManager.getSelection(options)
  }

  /**
   * Prompts the user to specify a rectangular bounding box (two corners).
   *
   * @returns Promise that resolves to rectangular bounding box.
   */
  async getBox(options: EditorPromptBoxOptions): Promise<EditorPromptBoxResult> {
    return await this._inputManager.getBox(options)
  }

  /**
   * Selects every item of the drawing.
   *
   * This method does not modify the current view selection set directly.
   * Instead, it returns an independent {@link EditorPromptSelectionResult}.
   *
   * @returns Selection result containing the ids of all drawing items
   */
  selectAll(): EditorPromptSelectionResult {
    try {
      const sync = ApplicationDocManager.instance.curDocument.modelSync
      const ids = sync.model.items
        .map(item => item.id)
        .filter(id => !sync.isMeasurement(id))
      return new EditorPromptSelectionResult(
        EditorPromptStatus.OK,
        new EditorSelectionSet(ids)
      )
    } catch {
      return new EditorPromptSelectionResult(EditorPromptStatus.Error)
    }
  }
}
