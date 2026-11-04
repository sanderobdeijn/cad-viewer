import * as THREE from 'three'

import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrGroup } from '../src/object/AcTrGroup'
import { AcTrLine } from '../src/object/AcTrLine'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../src/util'
import { getSceneDrawableUserData } from '../src/util/AcTrObjectUserData'

const defaultTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()

function createLine(
  objectId: string,
  start: { x: number; y: number },
  end: { x: number; y: number },
  context: AcTrRenderContext,
  layerName = '0'
) {
  const line = new AcTrLine(
    [
      { x: start.x, y: start.y },
      { x: end.x, y: end.y }
    ],
    defaultTraits,
    context,
    false
  )
  line.objectId = objectId
  line.layerName = layerName
  line.userData.layerName = layerName
  return line
}

describe('AcTrGroup wcsBbox', () => {
  it('unions child wcsBbox values into the group wcsBbox', () => {
    const context = new AcTrRenderContext()
    const lineA = createLine('line-a', { x: 0, y: 0 }, { x: 10, y: 0 }, context)
    const lineB = createLine('line-b', { x: 2, y: 5 }, { x: 8, y: 15 }, context)

    const group = new AcTrGroup([lineA, lineB], context)

    expectWcsBboxCloseTo(group.wcsBbox, [0, 0, 0], [10, 15, 0])
  })

  it('stores per-child WCS boxes for spatial indexing', () => {
    const context = new AcTrRenderContext()
    const lineA = createLine('line-a', { x: 0, y: 0 }, { x: 10, y: 0 }, context)
    const lineB = createLine('line-b', { x: 2, y: 5 }, { x: 8, y: 15 }, context)

    const group = new AcTrGroup([lineA, lineB], context)

    expect(group.wcsChildBoxes).toEqual([
      { minX: 0, minY: 0, maxX: 10, maxY: 0, id: 'line-a' },
      { minX: 2, minY: 5, maxX: 8, maxY: 15, id: 'line-b' }
    ])
  })

  it('rebuilds WCS child boxes after deferred geometry is attached', () => {
    const context = new AcTrRenderContext()
    const line = createLine(
      'line-a',
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      context,
      'L2'
    )
    const deferred = createLine(
      'line-deferred',
      { x: 5, y: 5 },
      { x: 15, y: 10 },
      context,
      'L3'
    )
    deferred.wcsBbox.makeEmpty()

    const group = new AcTrGroup([line, deferred], context)

    expect(group.wcsChildBoxes).toHaveLength(1)

    deferred.wcsBbox.set(
      new THREE.Vector3(5, 5, 0),
      new THREE.Vector3(15, 10, 0)
    )
    group.refreshWcsChildBoxesFromChildren()

    expect(group.wcsChildBoxes).toHaveLength(2)
    expect(group.wcsChildBoxes[1]).toMatchObject({
      minX: 5,
      minY: 5,
      maxX: 15,
      maxY: 10,
      id: 'line-deferred'
    })
    expectWcsBboxCloseTo(group.wcsBbox, [0, 0, 0], [15, 10, 0])
  })

  it('preserves existing child boxes when refresh runs after deferred syncDraw', () => {
    const context = new AcTrRenderContext()
    const line = createLine('line-a', { x: 0, y: 0 }, { x: 10, y: 5 }, context)
    const group = new AcTrGroup([line], context)

    // A local wcsBbbox can remain far from WCS.
    // A full refresh from source entities would inflate spatial bounds again.
    line.wcsBbox.set(
      new THREE.Vector3(-4_000_000, 0, 0),
      new THREE.Vector3(-3_999_990, 5, 0)
    )

    group.refreshWcsChildBoxesFromChildren()

    expect(group.wcsChildBoxes[0]).toMatchObject({
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 5,
      id: 'line-a'
    })
    expectWcsBboxCloseTo(group.wcsBbox, [0, 0, 0], [10, 5, 0])
  })
})

describe('AcTrGroup dispose', () => {
  it('clears detached source entities and disposes flattened render children', () => {
    const context = new AcTrRenderContext()
    const line = createLine('line-a', { x: 0, y: 0 }, { x: 10, y: 0 }, context)
    const group = new AcTrGroup([line], context)

    expect(group.getSourceEntities()).toHaveLength(1)
    expect(group.getSourceEntities()[0]).toBe(line)
    expect(group.children).toHaveLength(1)

    const meshChild = group.children[0] as THREE.Object3D & {
      geometry: THREE.BufferGeometry
    }
    const geometryDispose = jest.spyOn(meshChild.geometry, 'dispose')

    group.dispose()

    expect(group.getSourceEntities()).toHaveLength(0)
    expect(geometryDispose).toHaveBeenCalledTimes(1)
    expect(group.children).toHaveLength(0)
  })

  it('syncDraw does not recurse infinitely on empty nested groups', () => {
    const context = new AcTrRenderContext()
    const emptyInnerGroup = new AcTrGroup([], context)
    const outerGroup = new AcTrGroup([emptyInnerGroup], context)

    expect(() => outerGroup.syncDraw()).not.toThrow()
  })
})
