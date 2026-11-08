import * as THREE from 'three'

import {
  ThreeRendererBatchedGroup,
  disposePreviewSubset
} from '../src/batch/ThreeRendererBatchedGroup'
import { ThreeRendererEntity } from '../src/object/ThreeRendererEntity'
import { ThreeRendererRenderContext } from '../src/renderer/ThreeRendererRenderContext'
import {
  getHighlightUserData,
  getSceneDrawableUserData
} from '../src/util/ThreeRendererObjectUserData'

function createEntity(
  objectId: string,
  ...drawables: THREE.Object3D[]
): ThreeRendererEntity {
  const entity = new ThreeRendererEntity(new ThreeRendererRenderContext())
  entity.objectId = objectId
  entity.visible = true
  for (const drawable of drawables) {
    entity.add(drawable)
  }
  return entity
}

function createLineSegments(
  start: THREE.Vector3Like,
  end: THREE.Vector3Like
): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [start.x, start.y, start.z ?? 0, end.x, end.y, end.z ?? 0],
      3
    )
  )
  geometry.setIndex([0, 1])
  const line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial())
  line.position.set(start.x, start.y, start.z ?? 0)
  line.updateMatrixWorld(true)
  return line
}

describe('ThreeRendererBatchedGroup preview subset', () => {
  it('extracts batched line geometry into a preview subset', () => {
    const group = new ThreeRendererBatchedGroup()
    const line = createLineSegments({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 })
    group.addEntity(createEntity('line-1', line))

    const subset = group.createPreviewSubset(['line-1'])
    expect(subset).not.toBeNull()
    expect(subset!.children.length).toBeGreaterThan(0)
    expect(getHighlightUserData(subset!.children[0]).previewDrawable).toBe(true)

    disposePreviewSubset(subset!)
    expect(group.hasEntity('line-1')).toBe(true)
    expect(group.stats.summary.entityCount).toBe(1)
  })

  it('extracts unbatched geometry into a preview subset', () => {
    const group = new ThreeRendererBatchedGroup()
    const line = createLineSegments({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 })
    getSceneDrawableUserData(line).noBatch = true
    group.addEntity(createEntity('line-unbatched', line))

    const subset = group.createPreviewSubset(['line-unbatched'])
    expect(subset).not.toBeNull()
    expect(subset!.children.length).toBe(1)

    disposePreviewSubset(subset!)
    expect(group.hasEntity('line-unbatched')).toBe(true)
  })

  it('returns null when no entity ids match', () => {
    const group = new ThreeRendererBatchedGroup()
    const line = createLineSegments({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 })
    group.addEntity(createEntity('line-1', line))

    expect(group.createPreviewSubset(['missing-id'])).toBeNull()
  })

  it('extracts multiple entities in one subset', () => {
    const group = new ThreeRendererBatchedGroup()
    group.addEntity(
      createEntity(
        'line-1',
        createLineSegments({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 })
      )
    )
    group.addEntity(
      createEntity(
        'line-2',
        createLineSegments({ x: 0, y: 5, z: 0 }, { x: 5, y: 5, z: 0 })
      )
    )

    const subset = group.createPreviewSubset(['line-1', 'line-2'])
    expect(subset).not.toBeNull()
    expect(subset!.children.length).toBe(2)
  })

  it('returns null when one of multiple entity ids cannot be extracted', () => {
    const group = new ThreeRendererBatchedGroup()
    group.addEntity(
      createEntity(
        'line-1',
        createLineSegments({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 })
      )
    )

    expect(group.createPreviewSubset(['line-1', 'missing-id'])).toBeNull()
    expect(group.hasEntity('line-1')).toBe(true)
  })

  it('skips entity ids that cannot be extracted when missingEntity is skip', () => {
    const group = new ThreeRendererBatchedGroup()
    group.addEntity(
      createEntity(
        'line-1',
        createLineSegments({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 })
      )
    )

    const subset = group.createPreviewSubset(['line-1', 'missing-id'], {
      missingEntity: 'skip'
    })
    expect(subset).not.toBeNull()
    expect(subset!.children.length).toBe(1)
    expect(group.hasEntity('line-1')).toBe(true)

    disposePreviewSubset(subset!)
  })

  it('disposes each cloned material only once', () => {
    const group = new ThreeRendererBatchedGroup()
    const line = createLineSegments({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 })
    getSceneDrawableUserData(line).noBatch = true
    group.addEntity(createEntity('line-unbatched', line))

    const subset = group.createPreviewSubset(['line-unbatched'])
    expect(subset).not.toBeNull()

    const materialDisposeSpy = jest.spyOn(THREE.Material.prototype, 'dispose')
    disposePreviewSubset(subset!)
    expect(materialDisposeSpy).toHaveBeenCalledTimes(1)
    materialDisposeSpy.mockRestore()
  })

  it('does not dispose shared batched geometry buffers', () => {
    const group = new ThreeRendererBatchedGroup()
    const line = createLineSegments({ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 })
    group.addEntity(createEntity('line-1', line))

    const subset = group.createPreviewSubset(['line-1'])
    expect(subset).not.toBeNull()

    const geometryDisposeSpy = jest.spyOn(
      THREE.BufferGeometry.prototype,
      'dispose'
    )
    disposePreviewSubset(subset!)
    expect(geometryDisposeSpy).not.toHaveBeenCalled()
    geometryDisposeSpy.mockRestore()
  })
})
