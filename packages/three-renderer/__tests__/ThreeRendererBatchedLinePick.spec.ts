import * as THREE from 'three'

import { ThreeRendererBatchedGroup } from '../src/batch/ThreeRendererBatchedGroup'
import { ThreeRendererEntity } from '../src/object/ThreeRendererEntity'
import { ThreeRendererRenderContext } from '../src/renderer/ThreeRendererRenderContext'

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

/** Closed axis-aligned rectangle as discrete line segments (hollow frame). */
function createRectangleLineSegments(): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        // bottom
        0, 0, 0, 100, 0, 0,
        // right
        100, 0, 0, 100, 80, 0,
        // top
        100, 80, 0, 0, 80, 0,
        // left
        0, 80, 0, 0, 0, 0
      ],
      3
    )
  )
  return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial())
}

function createOrthoRaycaster(
  x: number,
  y: number,
  threshold = 2
): THREE.Raycaster {
  const raycaster = new THREE.Raycaster()
  const camera = new THREE.OrthographicCamera(-200, 200, 200, -200, 0.1, 1000)
  camera.position.set(x, y, 100)
  camera.lookAt(x, y, 0)
  camera.updateMatrixWorld(true)
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
  raycaster.params.Line.threshold = threshold
  return raycaster
}

describe('ThreeRendererBatchedLine / ThreeRendererBatchedLine2 pick', () => {
  it('does not select a hollow LineSegments rectangle via its bounding-box interior', () => {
    const group = new ThreeRendererBatchedGroup()
    group.addEntity(createEntity('rect-1', createRectangleLineSegments()))

    const interior = createOrthoRaycaster(50, 40)
    expect(group.isIntersectWith('rect-1', interior)).toBe(false)

    const onEdge = createOrthoRaycaster(50, 0)
    expect(group.isIntersectWith('rect-1', onEdge)).toBe(true)
  })

})
