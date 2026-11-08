import { GeometryBox2d, GeometryPoint2d } from '@mlightcad/geometry-engine'
import * as THREE from 'three'

import { ThreeRendererEntity } from '../src/object/ThreeRendererEntity'
import { ThreeRendererLine } from '../src/object/ThreeRendererLine'
import { ThreeRendererEntityPreview } from '../src/renderer/ThreeRendererEntityPreview'
import { ThreeRendererRenderContext } from '../src/renderer/ThreeRendererRenderContext'
import { ThreeRendererSubEntityTraitsUtil } from '../src/util'

const defaultTraits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()

function createLine(
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
  line.updateMatrixWorld(true)
  return line
}

function getVisibleWorldExtents(camera: THREE.OrthographicCamera) {
  const worldWidth = (camera.right - camera.left) / camera.zoom
  const worldHeight = (camera.top - camera.bottom) / camera.zoom

  return {
    worldWidth,
    worldHeight,
    minX: camera.position.x - worldWidth / 2,
    maxX: camera.position.x + worldWidth / 2,
    minY: camera.position.y - worldHeight / 2,
    maxY: camera.position.y + worldHeight / 2
  }
}

function getVisibleWorldExtentsFromBox2d(box: GeometryBox2d) {
  return {
    minX: box.min.x,
    minY: box.min.y,
    maxX: box.max.x,
    maxY: box.max.y
  }
}

describe('ThreeRendererEntityPreview', () => {
  it('computeObjectBounds2d unions drawable geometry bounds', () => {
    const context = new ThreeRendererRenderContext()
    const entity = new ThreeRendererEntity(context)
    entity.add(createLine({ x: 10, y: 20 }, { x: 110, y: 70 }, context))

    const bounds = ThreeRendererEntityPreview.computeObjectBounds2d(entity, 1)

    expect(bounds).not.toBeNull()
    const visible = getVisibleWorldExtentsFromBox2d(bounds!)
    expect(visible.minX).toBeCloseTo(10, 5)
    expect(visible.minY).toBeCloseTo(20, 5)
    expect(visible.maxX).toBeCloseTo(110, 5)
    expect(visible.maxY).toBeCloseTo(70, 5)
  })

  it('fitExportCamera matches export framing rules', () => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    const bounds = new GeometryBox2d(
      new GeometryPoint2d(10, 20),
      new GeometryPoint2d(110, 70)
    )

    ThreeRendererEntityPreview.fitExportCamera(camera, bounds, 800, 400)

    const visible = getVisibleWorldExtents(camera)
    expect(camera.position.x).toBeCloseTo(60)
    expect(camera.position.y).toBeCloseTo(45)
    expect(visible.worldWidth).toBeCloseTo(100, 5)
    expect(visible.worldHeight).toBeCloseTo(50, 5)
  })
})
