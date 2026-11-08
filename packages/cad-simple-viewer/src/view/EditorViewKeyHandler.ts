import { ApplicationDocManager } from '../app'
import {
  MEASUREMENT_LAYER,
  runMeasurementEdit
} from '../command/measure/ApplicationMeasurementStore'
import type { ThreeRendererView2d } from './ThreeRendererView2d'

/**
 * Handles global keyboard shortcuts for a CAD view.
 *
 * Shortcuts are suppressed while the user is typing in editable fields, during
 * IME composition, while a command is acquiring input, or while MText is being
 * edited inline.
 */
export class EditorViewKeyHandler {
  constructor(private readonly view: ThreeRendererView2d) {}

  /**
   * Handles a document `keydown` event for global view shortcuts.
   *
   * @returns `true` when the event was consumed and default action prevented.
   */
  handleKeyDown(e: KeyboardEvent): boolean {
    if (this.shouldIgnoreEditableTargetShortcut(e)) {
      return false
    }

    switch (e.code) {
      case 'Escape':
        this.view.selectionSet.clear()
        this.view.htmlTransientManager.deselectAll()
        this.view.isHtmlDirty = true
        return false

      case 'Delete':
      case 'Backspace':
        // Only dispatch erase when no command is currently active.
        // Dispatching erase mid-command (e.g. while LINE awaits the next
        // point) corrupts the active command's input pipeline because
        // sendStringToExecute clears scripted inputs unconditionally.
        if (!this.view.editor.isActive) {
          let removed = false
          const ht = this.view.htmlTransientManager
          if (ht.hasSelection()) {
            const selected = ht.getSelectedGroups()
            const measurements = selected.filter(
              group => group.layer === MEASUREMENT_LAYER
            )
            if (measurements.length > 0) {
              runMeasurementEdit(() => {
                for (const group of measurements) {
                  ht.remove(group.id)
                }
              })
              removed = true
            }
          }
          if (removed) {
            this.view.isHtmlDirty = true
            e.preventDefault()
            return true
          }
          // lookupGlobalCmd applies the current document's open mode, so it
          // returns undefined in read mode and the keypress is
          // silently ignored instead of surfacing an error message.
          if (ApplicationDocManager.instance.lookupGlobalCmd('erase')) {
            ApplicationDocManager.instance.sendStringToExecute('erase')
          }
        }
        return false
    }

    return false
  }

  private shouldIgnoreEditableTargetShortcut(
    e: Pick<KeyboardEvent, 'target' | 'isComposing' | 'keyCode'>
  ): boolean {
    if (e.isComposing || e.keyCode === 229) {
      return true
    }

    const target = e.target as HTMLElement | null
    if (target?.tagName === 'TEXTAREA') {
      return true
    }

    if (target?.isContentEditable) {
      return true
    }

    return target?.tagName === 'INPUT'
  }
}
