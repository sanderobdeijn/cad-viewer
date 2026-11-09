import type {
  ApplicationNotification,
  ApplicationNotificationCenter,
  ApplicationNotificationInput,
  ApplicationNotificationSource
} from './ApplicationNotificationTypes'

/**
 * In-memory notification store used by the built-in DOM notification UI and as
 * a reference implementation for custom centers.
 */
export class ApplicationNotificationStore implements ApplicationNotificationCenter {
  /** Notifications, newest first. */
  private _items: ApplicationNotification[] = []
  /** Monotonic counter used to allocate notification ids. */
  private _nextId = 1
  /** Observers notified after any mutating change. */
  private readonly _listeners = new Set<() => void>()

  /** All notifications. */
  get notifications(): readonly ApplicationNotification[] {
    return this._items
  }

  /** Number of notifications. */
  get unreadCount(): number {
    return this._items.length
  }

  /**
   * Registers a change listener.
   *
   * @param listener - Callback invoked after list / session mutations.
   * @returns Unsubscribe function.
   */
  subscribe(listener: () => void): () => void {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }

  /**
   * Notifies all {@link subscribe} listeners.
   */
  private emitChange() {
    for (const listener of this._listeners) {
      listener()
    }
  }

  /**
   * Inserts a notification (newest first).
   *
   * @param notification - Entry fields without `id` / `timestamp`.
   * @returns The assigned id.
   */
  add(notification: ApplicationNotificationInput): string {
    const entry: ApplicationNotification = {
      ...notification,
      id: `notification-${this._nextId++}`,
      timestamp: new Date()
    }
    this._items = [entry, ...this._items]
    this.emitChange()
    return entry.id
  }

  /**
   * Adds an `info` notification.
   *
   * @param title - Headline text.
   * @param message - Optional body.
   * @param options - Extra fields merged into the entry.
   * @returns The assigned notification id.
   */
  info(
    title: string,
    message?: string,
    options?: Partial<ApplicationNotification>
  ): string {
    return this.add({ type: 'info', title, message, ...options })
  }

  /**
   * Adds a `warning` notification.
   *
   * @param title - Headline text.
   * @param message - Optional body.
   * @param options - Extra fields merged into the entry.
   * @returns The assigned notification id.
   */
  warning(
    title: string,
    message?: string,
    options?: Partial<ApplicationNotification>
  ): string {
    return this.add({ type: 'warning', title, message, ...options })
  }

  /**
   * Adds an `error` notification (defaults to `persistent: true`).
   *
   * @param title - Headline text.
   * @param message - Optional body.
   * @param options - Extra fields merged into the entry.
   * @returns The assigned notification id.
   */
  error(
    title: string,
    message?: string,
    options?: Partial<ApplicationNotification>
  ): string {
    return this.add({
      type: 'error',
      title,
      message,
      persistent: true,
      ...options
    })
  }

  /**
   * Adds a `success` notification.
   *
   * @param title - Headline text.
   * @param message - Optional body.
   * @param options - Extra fields merged into the entry.
   * @returns The assigned notification id.
   */
  success(
    title: string,
    message?: string,
    options?: Partial<ApplicationNotification>
  ): string {
    return this.add({ type: 'success', title, message, ...options })
  }

  /**
   * Removes a notification by id.
   *
   * @param id - Notification id previously returned by {@link add}.
   */
  remove(id: string): void {
    this.removeWhere(notification => notification.id === id)
  }

  /** Clears all notifications. */
  clear(): void {
    if (this._items.length === 0) return
    this._items = []
    this.emitChange()
  }

  /**
   * Removes notifications matching a predicate.
   *
   * @param predicate - Return `true` for entries that should be removed.
   */
  removeWhere(predicate: (notification: ApplicationNotification) => boolean): void {
    const next = this._items.filter(n => !predicate(n))
    if (next.length === this._items.length) return
    this._items = next
    this.emitChange()
  }

  /**
   * Removes all notifications with the given source.
   *
   * @param source - Producer to clear.
   */
  removeBySource(source: ApplicationNotificationSource): void {
    this.removeWhere(notification => notification.source === source)
  }

  /**
   * Clears listeners and notifications.
   */
  dispose(): void {
    this._listeners.clear()
    this._items = []
  }
}
