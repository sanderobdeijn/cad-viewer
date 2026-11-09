import { ApplicationNotificationStore } from '../src/app/notification/ApplicationNotificationStore'
import {
  applicationGroupNotifications,
  type ApplicationNotification
} from '../src/app/notification/ApplicationNotificationTypes'

function makeNotification(
  partial: Partial<ApplicationNotification> & Pick<ApplicationNotification, 'id' | 'title'>
): ApplicationNotification {
  return {
    type: 'warning',
    timestamp: new Date(),
    ...partial
  }
}

describe('ApplicationNotificationStore (per-session)', () => {
  it('keeps separate lists per session and exposes only the active one', () => {
    const store = new ApplicationNotificationStore()
    store.setActiveSession('doc-1')
    store.warning('A', undefined, { source: 'example' })
    store.setActiveSession('doc-2')
    store.warning('B', undefined, { source: 'example' })

    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].title).toBe('B')
    expect(store.notifications[0].sessionId).toBe('doc-2')

    store.setActiveSession('doc-1')
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].title).toBe('A')
  })

  it('clear() only clears the active session', () => {
    const store = new ApplicationNotificationStore()
    store.setActiveSession('doc-1')
    store.info('one')
    store.setActiveSession('doc-2')
    store.info('two')
    store.clear()

    expect(store.notifications).toHaveLength(0)
    store.setActiveSession('doc-1')
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].title).toBe('one')
  })

  it('clearSession drops a closed document bucket', () => {
    const store = new ApplicationNotificationStore()
    store.setActiveSession('doc-1')
    store.info('one')
    store.clearSession('doc-1')
    expect(store.notifications).toHaveLength(0)
  })

  it('dispose clears all buckets so remounted session ids start empty', () => {
    const store = new ApplicationNotificationStore()
    store.setActiveSession('doc-1')
    store.warning('stale')
    store.dispose()

    store.setActiveSession('doc-1')
    expect(store.notifications).toHaveLength(0)
    expect(store.info('fresh')).not.toBe('')
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].title).toBe('fresh')
  })

  it('ignores add when no active session and no sessionId', () => {
    const store = new ApplicationNotificationStore()
    expect(store.info('orphan')).toBe('')
    expect(store.notifications).toHaveLength(0)
  })
})

describe('applicationGroupNotifications', () => {
  it('collapses notifications that share a source into one group', () => {
    const groups = applicationGroupNotifications([
      makeNotification({
        id: '1',
        title: 'A',
        source: 'example'
      }),
      makeNotification({
        id: '2',
        title: 'Other',
        type: 'info'
      }),
      makeNotification({
        id: '3',
        title: 'B',
        source: 'example',
        type: 'error'
      })
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0].key).toBe('example')
    expect(groups[0].collapsible).toBe(true)
    expect(groups[0].items).toHaveLength(2)
    expect(groups[0].type).toBe('error')
    expect(groups[1].key).toBe('single:2')
    expect(groups[1].collapsible).toBe(false)
  })

  it('keeps a single notification with a source as a flat item', () => {
    const groups = applicationGroupNotifications([
      makeNotification({
        id: '1',
        title: 'A',
        source: 'example'
      })
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].collapsible).toBe(false)
    expect(groups[0].source).toBe('example')
  })
})
