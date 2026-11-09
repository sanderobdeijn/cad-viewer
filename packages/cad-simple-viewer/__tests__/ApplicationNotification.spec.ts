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

describe('ApplicationNotificationStore', () => {
  it('lists notifications newest first', () => {
    const store = new ApplicationNotificationStore()
    store.warning('A', undefined, { source: 'example' })
    store.warning('B', undefined, { source: 'example' })

    expect(store.notifications.map(n => n.title)).toEqual(['B', 'A'])
  })

  it('removes by id and clears', () => {
    const store = new ApplicationNotificationStore()
    const id = store.info('one')
    store.info('two')
    store.remove(id)
    expect(store.notifications.map(n => n.title)).toEqual(['two'])
    store.clear()
    expect(store.notifications).toHaveLength(0)
  })

  it('dispose clears notifications', () => {
    const store = new ApplicationNotificationStore()
    store.warning('stale')
    store.dispose()
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
