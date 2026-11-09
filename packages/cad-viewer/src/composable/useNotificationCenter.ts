import {
  applicationGroupNotifications,
  type ApplicationNotification,
  type ApplicationNotificationAction,
  type ApplicationNotificationGroup,
  type ApplicationNotificationSource
} from '@mlightcad/cad-simple-viewer'
import { computed, ref } from 'vue'

/**
 * @deprecated Prefer {@link ApplicationNotificationSource} from cad-simple-viewer.
 */
export type NotificationSource = ApplicationNotificationSource

/**
 * Vue notification entry. Structurally compatible with {@link ApplicationNotification}.
 */
export type Notification = ApplicationNotification

export type NotificationGroup = ApplicationNotificationGroup

export type NotificationAction = ApplicationNotificationAction

/**
 * Groups notifications for the Vue notification center panel.
 */
export function groupNotifications(
  notifications: Notification[]
): NotificationGroup[] {
  return applicationGroupNotifications(notifications)
}

/**
 * Singleton service that stores notifications.
 *
 * {@link useNotificationCenter} exposes the list as Vue refs so the panel and
 * status-bar badge update.
 */
class NotificationCenter {
  private items = ref<Notification[]>([])
  private nextId = 1

  get allNotifications() {
    return computed(() => this.items.value)
  }

  get unreadCount() {
    return computed(() => this.items.value.length)
  }

  get hasNotifications() {
    return computed(() => this.items.value.length > 0)
  }

  /** Clears every notification and resets ids when the viewer unmounts. */
  dispose() {
    this.items.value = []
    this.nextId = 1
  }

  add(notification: Omit<Notification, 'id' | 'timestamp'>) {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${this.nextId++}`,
      timestamp: new Date()
    }

    this.items.value = [newNotification, ...this.items.value]
    return newNotification.id
  }

  remove(id: string) {
    this.removeWhere(notification => notification.id === id)
  }

  clear() {
    this.items.value = []
  }

  clearAll() {
    this.clear()
  }

  removeWhere(predicate: (notification: Notification) => boolean) {
    this.items.value = this.items.value.filter(n => !predicate(n))
  }

  removeBySource(source: NotificationSource) {
    this.removeWhere(notification => notification.source === source)
  }

  info(title: string, message?: string, options?: Partial<Notification>) {
    return this.add({
      type: 'info',
      title,
      message,
      ...options
    })
  }

  warning(title: string, message?: string, options?: Partial<Notification>) {
    return this.add({
      type: 'warning',
      title,
      message,
      ...options
    })
  }

  error(title: string, message?: string, options?: Partial<Notification>) {
    return this.add({
      type: 'error',
      title,
      message,
      persistent: true,
      ...options
    })
  }

  success(title: string, message?: string, options?: Partial<Notification>) {
    return this.add({
      type: 'success',
      title,
      message,
      ...options
    })
  }
}

const notificationCenter = new NotificationCenter()

/**
 * Composable that exposes the Vue notification center used by cad-viewer UI.
 *
 * Registered as the host override via {@link registerCadViewerNotificationCenter}
 * so the shared cad-simple-viewer event bridge writes into this store.
 */
export function useNotificationCenter() {
  return {
    notifications: notificationCenter.allNotifications,
    unreadCount: notificationCenter.unreadCount,
    hasNotifications: notificationCenter.hasNotifications,
    dispose: notificationCenter.dispose.bind(notificationCenter),
    add: notificationCenter.add.bind(notificationCenter),
    remove: notificationCenter.remove.bind(notificationCenter),
    clear: notificationCenter.clear.bind(notificationCenter),
    clearAll: notificationCenter.clearAll.bind(notificationCenter),
    removeWhere: notificationCenter.removeWhere.bind(notificationCenter),
    removeBySource: notificationCenter.removeBySource.bind(notificationCenter),
    info: notificationCenter.info.bind(notificationCenter),
    warning: notificationCenter.warning.bind(notificationCenter),
    error: notificationCenter.error.bind(notificationCenter),
    success: notificationCenter.success.bind(notificationCenter)
  }
}
