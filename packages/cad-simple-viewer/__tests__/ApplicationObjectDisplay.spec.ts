import { ApplicationContext } from '../src/app/ApplicationContext'
import { ApplicationDocument } from '../src/app/ApplicationDocument'
import { hideObjects, unisolateObjects } from '../src/app/ApplicationObjectDisplay'

function createMockContext(options: {
  hidden?: Set<string>
  entities?: Map<
    string,
    { visibility: boolean; inScene: boolean; sceneVisible: boolean }
  >
}) {
  const hidden = options.hidden ?? new Set<string>()
  const entities =
    options.entities ??
    new Map<
      string,
      { visibility: boolean; inScene: boolean; sceneVisible: boolean }
    >()

  const doc = {
    isObjectHidden: (id: string) => hidden.has(id),
    addHiddenObject: (id: string) => hidden.add(id),
    takeHiddenObjects: () => {
      const ids = [...hidden]
      hidden.clear()
      return ids
    },
    modelSync: {
      item: (id: string) => (entities.has(id) ? { id } : undefined)
    }
  } as unknown as ApplicationDocument

  const selectionSet = {
    clear: jest.fn()
  }

  const view = {
    selectionSet,
    hasEntity: (id: string) => entities.get(id)?.inScene ?? false,
    setEntitySceneVisible: (id: string, visible: boolean) => {
      const entity = entities.get(id)
      if (!entity?.inScene) {
        return false
      }
      entity.sceneVisible = visible
      return true
    }
  }

  return {
    context: { doc, view } as unknown as ApplicationContext,
    hidden,
    entities,
    selectionSet
  }
}

describe('ApplicationObjectDisplay', () => {
  it('hides visible scene entities without changing database visibility', () => {
    const { context, hidden, entities, selectionSet } = createMockContext({
      entities: new Map([
        ['a', { visibility: true, inScene: true, sceneVisible: true }],
        ['b', { visibility: true, inScene: true, sceneVisible: true }]
      ])
    })

    const count = hideObjects(context, ['a'])

    expect(count).toBe(1)
    expect(hidden.has('a')).toBe(true)
    expect(entities.get('a')?.sceneVisible).toBe(false)
    expect(entities.get('a')?.visibility).toBe(true)
    expect(entities.get('b')?.sceneVisible).toBe(true)
    expect(selectionSet.clear).toHaveBeenCalledTimes(1)
  })

  it('shows session-hidden items again', () => {
    const hidden = new Set<string>(['a', 'b'])
    const { context, entities, selectionSet } = createMockContext({
      hidden,
      entities: new Map([
        ['a', { visibility: true, inScene: true, sceneVisible: false }],
        ['b', { visibility: false, inScene: true, sceneVisible: false }]
      ])
    })

    const count = unisolateObjects(context)

    expect(count).toBe(2)
    expect(hidden.size).toBe(0)
    expect(entities.get('a')?.sceneVisible).toBe(true)
    expect(entities.get('b')?.sceneVisible).toBe(true)
    expect(selectionSet.clear).toHaveBeenCalledTimes(1)
  })
})
