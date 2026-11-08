import { EditorCommand } from './EditorCommand'
import { EditorCommandGroup } from './EditorCommandStack'

/**
 * Represents the type of item returned by command iterator.
 */
export interface EditorCommandIteratorItem {
  commandGroup: string
  command: EditorCommand
}
/**
 * This class allows you to traverse the chain of command groups that are registered with AutoCAD and
 * obtain information about the groups and the EditorCommand objects within them.
 */
export class EditorCommandIterator implements IterableIterator<EditorCommandIteratorItem> {
  private _index: number
  private _commands: EditorCommandIteratorItem[]

  constructor(commandGroups: EditorCommandGroup[]) {
    this._index = 0
    this._commands = []
    commandGroups.forEach(group => {
      const commandGroup = group.groupName
      group.commandsByGlobalName.forEach(command => {
        this._commands.push({
          command,
          commandGroup
        })
      })
    })
  }

  [Symbol.iterator](): IterableIterator<EditorCommandIteratorItem> {
    return this
  }

  /**
   * Return command object the iterator currently points to. If the iterator is at the beginning, then the
   * first object is returned. If the iterator has already gone past the last entry, then null is returned.
   */
  get command() {
    return this._index < this._commands.length
      ? this._commands[this._index].command
      : null
  }

  /**
   * Return the name of the command object the iterator currently points to. If the iterator is at the
   * beginning, then the first object is returned. If the iterator has already gone past the last entry,
   * then null is returned.
   */
  get commandGroup() {
    return this._index < this._commands.length
      ? this._commands[this._index].commandGroup
      : null
  }

  /**
   * Increment the iterator to the next entry.
   * @returns Return the next entry
   */
  next(): IteratorResult<EditorCommandIteratorItem, null> {
    while (this._index < this._commands.length) {
      const value = this._commands[this._index]
      this._index += 1
      return { value: value, done: false }
    }
    return { value: null, done: true }
  }
}
