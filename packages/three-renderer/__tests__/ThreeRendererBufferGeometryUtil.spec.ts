import * as THREE from 'three'

import { ThreeRendererBufferGeometryUtil } from '../src/util/ThreeRendererBufferGeometryUtil'

describe('ThreeRendererBufferGeometryUtil finite coordinate helpers', () => {
  it('detects non-finite points', () => {
    expect(ThreeRendererBufferGeometryUtil.isFinitePoint({ x: 0, y: 0 })).toBe(true)
    expect(ThreeRendererBufferGeometryUtil.isFinitePoint({ x: Number.NaN, y: 1 })).toBe(
      false
    )
    expect(ThreeRendererBufferGeometryUtil.isFinitePoint(null)).toBe(false)
    expect(ThreeRendererBufferGeometryUtil.isFinitePoint(undefined)).toBe(false)
  })

  it('avoids THREE.js NaN warnings in safeComputeBoundingBox', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([Number.NaN, 0, 0, 1, 1, 0], 3)
    )

    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    expect(ThreeRendererBufferGeometryUtil.safeComputeBoundingBox(geometry)).toBeNull()
    expect(
      ThreeRendererBufferGeometryUtil.safeComputeBoundingSphere(geometry)
    ).toBeNull()
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('sanitizes indexed line geometry before matrix transform', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, Number.NaN, 1, 0, 2, 2, 0], 3)
    )
    geometry.setIndex(new THREE.Uint16BufferAttribute([0, 1, 0, 2], 1))

    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const matrix = new THREE.Matrix4().makeTranslation(10, 0, 0)
    expect(ThreeRendererBufferGeometryUtil.safeApplyMatrix4(geometry, matrix, 2)).toBe(
      true
    )
    expect(Array.from(geometry.index!.array)).toEqual([0, 2])
    expect(geometry.getAttribute('position').getX(0)).toBe(10)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('rebuilds lineDistance when sanitizing dashed line segments', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [0, 0, 0, Number.NaN, 1, 0, 2, 2, 0, 3, 3, 0],
        3
      )
    )
    geometry.setAttribute(
      'lineDistance',
      new THREE.Float32BufferAttribute([0, 1, 2, 3, 4, 5], 1)
    )

    const matrix = new THREE.Matrix4().makeTranslation(5, 0, 0)
    expect(ThreeRendererBufferGeometryUtil.safeApplyMatrix4(geometry, matrix, 2)).toBe(
      true
    )

    const position = geometry.getAttribute('position')
    const lineDistance = geometry.getAttribute('lineDistance')
    expect(position.count).toBe(2)
    expect(lineDistance.count).toBe(2)
    expect(lineDistance.getX(0)).toBe(0)
    expect(lineDistance.getX(1)).toBeGreaterThan(0)
  })

  it('keeps lineDistance length aligned for odd segment vertex counts', () => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 2, 0, 0], 3)
    )

    ThreeRendererBufferGeometryUtil.recomputeLineDistanceForLineSegments(geometry)

    expect(geometry.getAttribute('position').count).toBe(2)
    expect(geometry.getAttribute('lineDistance').count).toBe(2)
  })

  it('preserves per-segment dash phase when recomputing merged LineSegments', () => {
    // Simulates GroupCompactor merge of three independent 0.5-length entities
    // (each with entity-local phase 0), then addLine's post-transform recompute.
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [0, 0, 0, 0.5, 0, 0, 1, 0, 0, 1.5, 0, 0, 2, 0, 0, 2.5, 0, 0],
        3
      )
    )
    geometry.setAttribute(
      'lineDistance',
      new THREE.Float32BufferAttribute([0, 0.5, 0, 0.5, 0, 0.5], 1)
    )

    ThreeRendererBufferGeometryUtil.recomputeLineDistanceForLineSegments(geometry)

    const ld = geometry.getAttribute('lineDistance')
    expect(Array.from(ld.array as Float32Array)).toEqual([
      0, 0.5, 0, 0.5, 0, 0.5
    ])
  })
})
