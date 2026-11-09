import { GeometryPoint2d } from '@mlightcad/geometry-engine'
import * as THREE from 'three'

import { ThreeRendererRenderer } from '../src/renderer/ThreeRendererRenderer'

function createRenderer() {
  const webgl = {
    getSize: (target: THREE.Vector2) => target.set(800, 600)
  } as unknown as THREE.WebGLRenderer
  return new ThreeRendererRenderer(webgl)
}

describe('ThreeRendererRenderer direct capture', () => {
  it('captures lineStrip points from lines() without creating ThreeRendererLine children', () => {
    const renderer = createRenderer()
    renderer.beginDirectCapture()
    const placeholder = renderer.lines([
      { x: 0, y: 0 },
      { x: 5, y: 0 }
    ])
    expect(placeholder.children).toHaveLength(0)

    const payload = renderer.takeDirectCapture()
    expect(payload).toEqual({
      kind: 'lineStrip',
      points: [
        { x: 0, y: 0 },
        { x: 5, y: 0 }
      ]
    })
  })

  it('captures point() payload without creating ThreeRendererPoint children', () => {
    const renderer = createRenderer()
    renderer.beginDirectCapture()
    const point = new GeometryPoint2d(10, 20)
    const placeholder = renderer.point(point, {
      displayMode: 0,
      displaySize: 0
    })
    expect(placeholder.children).toHaveLength(0)

    const payload = renderer.takeDirectCapture()
    expect(payload?.kind).toBe('point')
    if (payload?.kind === 'point') {
      expect(payload.point.x).toBe(10)
      expect(payload.point.y).toBe(20)
      expect(payload.style).toEqual({ displayMode: 0, displaySize: 0 })
    }
  })

  it('captures area() payload without building ThreeRendererPolygon geometry', () => {
    const renderer = createRenderer()
    const loops = [
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 }
      ]
    ]
    const area = {
      getPoints: () => loops,
      tessellate: () => loops,
      buildHierarchy: () => ({ children: [] })
    }

    renderer.beginDirectCapture()
    const placeholder = renderer.area(area as never)
    expect(placeholder.children).toHaveLength(0)

    const payload = renderer.takeDirectCapture()
    expect(payload).toEqual({ kind: 'area', area })
  })

  it('captures lineSegments() payload', () => {
    const renderer = createRenderer()
    const array = new Float32Array([0, 0, 0, 5, 0, 0])
    const indices = new Uint16Array([0, 1])

    renderer.beginDirectCapture()
    renderer.lineSegments(array, 3, indices)

    const payload = renderer.takeDirectCapture()
    expect(payload?.kind).toBe('lineSegments')
    if (payload?.kind === 'lineSegments') {
      expect(payload.array).toBe(array)
      expect(payload.itemSize).toBe(3)
      expect(payload.indices).toBe(indices)
    }
  })

  it('misses capture when a second draw call follows the first', () => {
    const renderer = createRenderer()
    renderer.beginDirectCapture()
    renderer.lines([
      { x: 0, y: 0 },
      { x: 1, y: 0 }
    ])
    renderer.lines([
      { x: 2, y: 0 },
      { x: 3, y: 0 }
    ])
    expect(renderer.takeDirectCapture()).toBeNull()
  })

  it('misses capture when text() is drawn during capture', () => {
    const renderer = createRenderer()
    renderer.beginDirectCapture()
    renderer.text({} as never)
    expect(renderer.takeDirectCapture()).toBeNull()
  })
})
