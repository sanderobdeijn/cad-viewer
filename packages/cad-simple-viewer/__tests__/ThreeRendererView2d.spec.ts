jest.mock('rbush', () => {
  class RBushMock<
    T extends { minX: number; minY: number; maxX: number; maxY: number }
  > {
    private items: T[] = []

    insert(item: T) {
      this.items.push(item)
    }

    load(items: readonly T[]) {
      this.items.push(...items)
    }

    remove(item: T, equals?: (a: T, b: T) => boolean) {
      if (equals) {
        const index = this.items.findIndex(entry => equals(entry, item))
        if (index >= 0) this.items.splice(index, 1)
        return
      }
      const index = this.items.indexOf(item)
      if (index >= 0) this.items.splice(index, 1)
    }

    clear() {
      this.items = []
    }

    search(bbox: { minX: number; minY: number; maxX: number; maxY: number }) {
      return this.items.filter(
        item =>
          !(
            item.maxX < bbox.minX ||
            item.minX > bbox.maxX ||
            item.maxY < bbox.minY ||
            item.minY > bbox.maxY
          )
      )
    }

    collides(bbox: { minX: number; minY: number; maxX: number; maxY: number }) {
      return this.search(bbox).length > 0
    }

    all() {
      return [...this.items]
    }
  }

  return {
    __esModule: true,
    default: RBushMock
  }
})

import { GeometryBox2d } from '@mlightcad/geometry-engine'
import type { ThreeRendererEntity } from '@mlightcad/three-renderer'
import * as THREE from 'three'

import { unionGroupWcsChildBoxes } from '../src/view/ThreeRendererGroupWcsBboxAssert'
import { ThreeRendererLayout } from '../src/view/ThreeRendererLayout'

function createGroupEntity(
  objectId: string,
  wcsBbox: THREE.Box3,
  spatialIndexChildBoxes: Array<{
    minX: number
    minY: number
    maxX: number
    maxY: number
    id: string
  }>
): ThreeRendererEntity {
  const group = new THREE.Group() as unknown as ThreeRendererEntity
  Object.assign(group.userData, {
    objectId,
    ownerId: 'layout-1',
    spatialIndexChildBoxes
  })
  Object.assign(group, {
    objectId,
    ownerId: 'layout-1',
    wcsBbox
  })
  return group
}

describe('ThreeRendererGroupWcsBboxAssert', () => {
  it('skips non-finite child boxes when unioning wcsChildBoxes', () => {
    const group = {
      wcsBbox: new THREE.Box3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 5, 0)
      ),
      wcsChildBoxes: [
        { minX: 0, minY: 0, maxX: 10, maxY: 5, id: 'line-a' },
        {
          minX: Number.POSITIVE_INFINITY,
          minY: Number.POSITIVE_INFINITY,
          maxX: Number.NEGATIVE_INFINITY,
          maxY: Number.NEGATIVE_INFINITY,
          id: 'deferred-text'
        }
      ]
    }

    expect(unionGroupWcsChildBoxes(group).min).toMatchObject({ x: 0, y: 0 })
    expect(unionGroupWcsChildBoxes(group).max).toMatchObject({ x: 10, y: 5 })
  })
})

describe('group WCS spatial index registration', () => {
  it('indexes pre-transformed WCS bounds without applying group.matrix again', () => {
    const groupWcsBbox = new THREE.Box3(
      new THREE.Vector3(100, 200, 0),
      new THREE.Vector3(115, 210, 0)
    )
    const spatialIndexChildBoxes = [
      { minX: 100, minY: 200, maxX: 110, maxY: 200, id: 'line-0' },
      { minX: 105, minY: 205, maxX: 115, maxY: 210, id: 'line-l2' }
    ]

    const entity = createGroupEntity(
      'GROUP-1',
      groupWcsBbox,
      spatialIndexChildBoxes
    )

    const layout = new ThreeRendererLayout()
    layout.addEntity(entity)

    const queryBox = new GeometryBox2d()
    queryBox.min.set(109, 204)
    queryBox.max.set(111, 206)

    const hits = layout.search(queryBox)

    expect(hits).toHaveLength(1)
    expect(hits[0].id).toBe('GROUP-1')
    expect(hits[0].children?.map(item => item.id)).toEqual(['line-l2'])
  })

  it('documents that re-applying group.matrix would double-transform WCS bounds', () => {
    const wcsBbox = new THREE.Box3(
      new THREE.Vector3(100, 200, 0),
      new THREE.Vector3(110, 205, 0)
    )
    const groupMatrix = new THREE.Matrix4().makeTranslation(100, 200, 0)

    const wronglyTransformed = wcsBbox.clone()
    wronglyTransformed.applyMatrix4(groupMatrix)

    expect(wronglyTransformed.min.x).toBeCloseTo(200)
    expect(wcsBbox.min.x).toBeCloseTo(100)
  })
})
