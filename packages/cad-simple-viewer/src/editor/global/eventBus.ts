import mitt, { type Emitter } from 'mitt'

import { EditorMessageType } from '../input/ui/EditorMessageType'

/**
 * Type definition for all events that can be emitted through the global event bus.
 *
 * This type maps event names to their corresponding payload types, providing
 * type safety for event emission and listening throughout the application.
 *
 * ## Event Categories
 * - **User Messages**: `message`
 * - **Busy Indicator**: `busy-indicator`
 */
export type EditorBusyIndicatorEventArgs = {
  /** Whether the busy overlay should be visible */
  visible: boolean
  /** Optional message text displayed with the spinner */
  message?: string
}

export type EditorEvents = {
  /** Emitted to display a message to the user */
  message: {
    /** The message text to display */
    message: string
    /** The severity/type of the message */
    type: EditorMessageType
  }
  /** Emitted when the application busy indicator is shown or hidden */
  'busy-indicator': EditorBusyIndicatorEventArgs
}

/**
 * Global event bus for application-wide communication.
 *
 * This event bus enables decoupled communication between different parts of the
 * CAD viewer application. Components can emit events to notify about state changes
 * or request actions, while other components can listen for these events to respond
 * appropriately.
 *
 * The event bus is particularly useful for:
 * - File operation status updates
 * - Error and warning notifications
 * - Cross-component communication
 *
 * @example
 * ```typescript
 * import { eventBus } from './eventBus';
 *
 * // Display a message to the user
 * eventBus.emit('message', {
 *   message: 'File opened successfully',
 *   type: 'success'
 * });
 * ```
 */
export const eventBus: Emitter<EditorEvents> = mitt<EditorEvents>()
