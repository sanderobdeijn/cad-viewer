import * as THREE from 'three'

import {
  ThreeRendererBatchedGroup,
  disposePreviewSubset
} from '../src/batch/ThreeRendererBatchedGroup'
import { ThreeRendererEntity } from '../src/object/ThreeRendererEntity'
import { ThreeRendererGroup } from '../src/object/ThreeRendererGroup'
import { ThreeRendererLine } from '../src/object/ThreeRendererLine'
import { ThreeRendererRenderContext } from '../src/renderer/ThreeRendererRenderContext'
import { ThreeRendererSubEntityTraitsUtil } from '../src/util'

const defaultTraits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()
const GROUP_ID = 'GROUP-7B33'

function createLine(
  objectId: string,
  start: { x: number; y: number },
  end: { x: number; y: number },
  context: ThreeRendererRenderContext
) {
  const line = new ThreeRendererLine(
    [
      { x: start.x, y: start.y },
      { x: end.x, y: end.y }
    ],
    defaultTraits,
    context,
    false
  )
  line.objectId = objectId
  return line
}

function unionPreviewBox(subset: THREE.Group): THREE.Box3 {
  const box = new THREE.Box3()
  subset.updateMatrixWorld(true)
  subset.traverse(child => {
    const geometry = (child as THREE.Mesh).geometry as
      | THREE.BufferGeometry
      | undefined
    if (!geometry) {
      return
    }
    geometry.computeBoundingBox()
    if (!geometry.boundingBox) {
      return
    }
    const childBox = geometry.boundingBox.clone()
    childBox.applyMatrix4(child.matrixWorld)
    box.union(childBox)
  })
  return box
}

describe('ThreeRendererBatchedGroup preview subset', () => {
  it('preserves world placement when the group is added without decomposition', () => {
    const context = new ThreeRendererRenderContext()
    const titleLine = createLine(
      'line-title',
      { x: -180, y: 28 },
      { x: 0, y: 28 },
      context
    )
    const group = new ThreeRendererGroup([titleLine], context)
    group.matrix.makeTranslation(574, 0, 0)
    group.matrixAutoUpdate = false
    group.updateMatrixWorld(true)
    group.objectId = GROUP_ID
    group.visible = true

    const batchGroup = new ThreeRendererBatchedGroup()
    batchGroup.addEntity(group)

    const subset = batchGroup.createPreviewSubset([GROUP_ID])
    expect(subset).not.toBeNull()

    const previewBox = unionPreviewBox(subset!)
    expect(previewBox.min.x).toBeCloseTo(394, 0)
    expect(previewBox.max.x).toBeCloseTo(574, 0)

    disposePreviewSubset(subset!)
  })
})
