import { GeometryMatrix3d } from '@mlightcad/geometry-engine'
import * as THREE from 'three'

import { ThreeRendererEntity } from '../src/object/ThreeRendererEntity'
import { ThreeRendererGroup } from '../src/object/ThreeRendererGroup'
import { ThreeRendererLine } from '../src/object/ThreeRendererLine'
import { ThreeRendererTransientManager } from '../src/object/ThreeRendererTransientManager'
import { ThreeRendererRenderContext } from '../src/renderer/ThreeRendererRenderContext'
import { ThreeRendererSubEntityTraitsUtil } from '../src/util'
import { ThreeRendererMatrixUtil } from '../src/util/ThreeRendererMatrixUtil'

const defaultTraits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()

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

describe('ThreeRendererTransientManager.applyTransforms', () => {
  it('composes preview deltas with the transient baseline matrix', () => {
    const scene = new THREE.Scene()
    const manager = new ThreeRendererTransientManager(scene)
    const context = new ThreeRendererRenderContext()
    const line = createLine(
      'line-title',
      { x: -180, y: 28 },
      { x: 0, y: 28 },
      context
    )
    const group = new ThreeRendererGroup([line], context)
    group.matrix.makeTranslation(574, 0, 0)
    group.matrixAutoUpdate = false
    group.updateMatrixWorld(true)
    group.objectId = 'GROUP-7B33'

    manager.add(group)
    const baseline = group.matrix.clone()

    const rotation = ThreeRendererMatrixUtil.createMatrix4(
      new GeometryMatrix3d().makeRotationZ(Math.PI / 4)
    )
    manager.applyTransforms([{ id: group.objectId, matrix: rotation }])

    const expected = new THREE.Matrix4().copy(rotation).multiply(baseline)
    expect(group.matrix.equals(expected)).toBe(true)

    manager.dispose()
  })
})
