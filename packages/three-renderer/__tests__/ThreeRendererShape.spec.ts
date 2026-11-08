import type { MTextObject } from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

jest.mock('../src/renderer/ThreeRendererMTextRenderer', () => ({
  ThreeRendererMTextRenderer: {
    getInstance: jest.fn()
  }
}))

import { ThreeRendererMTextRenderer } from '../src/renderer/ThreeRendererMTextRenderer'
import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'
import { ThreeRendererShape } from '../src/object/ThreeRendererShape'
import { ThreeRendererRenderContext } from '../src/renderer/ThreeRendererRenderContext'
import { ThreeRendererStyleManager } from '../src/style/ThreeRendererStyleManager'

const privateMethods = ThreeRendererShape.prototype as unknown as {
  computeGeometryBox(this: THREE.Object3D): THREE.Box3
  hasGeometry(object: THREE.Object3D): boolean
  updateSelectionBox(
    this: THREE.Object3D & { wcsBbox: THREE.Box3 },
    rendered: MTextObject
  ): void
}

describe('ThreeRendererShape wcsBbox', () => {
  it('uses rendered child geometry bounds in wcsBbox', () => {
    const host = createGeometryHost()
    host.add(createBoxMesh({ x: 20, y: 30, z: 0 }))

    privateMethods.updateSelectionBox.call(
      host,
      createShapeObject(new THREE.Box3())
    )

    expectWcsBboxCloseTo(host.wcsBbox, [20, 30, 0], [24, 32, 0])
  })

  it('builds wcsBbox from syncRenderShape output', () => {
    const placementRoot = createPlacementRoot({ x: 5, y: 15, z: 0 })
    const rendered = createShapeObject(new THREE.Box3(), placementRoot)
    jest.mocked(ThreeRendererMTextRenderer.getInstance).mockReturnValue({
      syncRenderShape: () => rendered
    } as never)

    const shape = new ThreeRendererShape(
      { name: 'TEST', position: { x: 5, y: 15, z: 0 } } as never,
      { layer: '0', color: 7 } as never,
      {} as never,
      new ThreeRendererRenderContext(new ThreeRendererStyleManager())
    )
    // Constructors no longer auto-draw; geometry is finalized via syncDraw/asyncDraw.
    shape.syncDraw()

    expectWcsBboxCloseTo(shape.wcsBbox, [5, 15, 0], [9, 17, 0])
  })
})

function createGeometryHost() {
  const host = new THREE.Object3D() as THREE.Object3D & {
    wcsBbox: THREE.Box3
    computeGeometryBox: () => THREE.Box3
    hasGeometry: (object: THREE.Object3D) => boolean
  }
  host.wcsBbox = new THREE.Box3()
  host.computeGeometryBox = privateMethods.computeGeometryBox
  host.hasGeometry = privateMethods.hasGeometry
  return host
}

function createShapeObject(
  box: THREE.Box3,
  root: THREE.Object3D = new THREE.Object3D()
): MTextObject {
  const rendered = root as MTextObject
  rendered.box = box
  rendered.createLayoutData = () => ({ lines: [], chars: [] })
  return rendered
}

function createBoxMesh(position: THREE.Vector3Like) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0, 4, 0, 0, 4, 2, 0, 0, 2, 0], 3)
  )
  geometry.setIndex([0, 1, 2, 0, 2, 3])

  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial())
  mesh.position.copy(position as THREE.Vector3)
  return mesh
}

function createPlacementRoot(insertion: THREE.Vector3Like) {
  const placementRoot = new THREE.Group()
  placementRoot.position.set(insertion.x, insertion.y, insertion.z ?? 0)
  placementRoot.add(createBoxMesh({ x: 0, y: 0, z: 0 }))
  placementRoot.updateMatrixWorld(true)
  return placementRoot
}
