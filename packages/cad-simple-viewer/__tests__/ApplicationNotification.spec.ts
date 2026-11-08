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
    store.warning('A fonts', undefined, { source: 'font-missed' })
    store.setActiveSession('doc-2')
    store.warning('B fonts', undefined, { source: 'font-missed' })

    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].title).toBe('B fonts')
    expect(store.notifications[0].sessionId).toBe('doc-2')

    store.setActiveSession('doc-1')
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].title).toBe('A fonts')
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
  it('collapses multiple font-missed notifications into one group', () => {
    const groups = applicationGroupNotifications([
      makeNotification({
        id: '1',
        title: 'Font A',
        source: 'font-missed',
        fontNames: ['A']
      }),
      makeNotification({
        id: '2',
        title: 'Other',
        type: 'info'
      }),
      makeNotification({
        id: '3',
        title: 'Font B',
        source: 'font-missed',
        fontNames: ['B'],
        type: 'error'
      })
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0].key).toBe('font-missed')
    expect(groups[0].collapsible).toBe(true)
    expect(groups[0].items).toHaveLength(2)
    expect(groups[0].type).toBe('error')
    expect(groups[1].key).toBe('single:2')
    expect(groups[1].collapsible).toBe(false)
  })

  it('keeps a single groupable notification as a flat item', () => {
    const groups = applicationGroupNotifications([
      makeNotification({
        id: '1',
        title: 'Fonts',
        source: 'font-missed'
      })
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].collapsible).toBe(false)
    expect(groups[0].source).toBe('font-missed')
  })
})
