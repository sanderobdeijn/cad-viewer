import * as THREE from 'three'

import { ThreeRendererBatchedGroup } from '../src/batch/ThreeRendererBatchedGroup'
import { RTE_REBASE_THRESHOLD } from '../src/draw/ThreeRendererBatchDrawPolicy'
import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'
import { ThreeRendererPoint } from '../src/object/ThreeRendererPoint'
import { ThreeRendererRenderContext } from '../src/renderer/ThreeRendererRenderContext'
import { ThreeRendererSubEntityTraitsUtil } from '../src/util'

const defaultTraits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()
const dotStyle = { displayMode: 0, displaySize: 0 }
const crossStyle = { displayMode: 2, displaySize: 0 }
const circleCrossStyle = { displayMode: 35, displaySize: 0 }
const largeX = RTE_REBASE_THRESHOLD + 500_000
const largePoint = {
  x: 3_134_356.509824163,
  y: 1_394_770.78992697,
  z: 0
}

function getMaxAbsPositionComponent(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute('position')
  if (!position) {
    return 0
  }
  let maxAbs = 0
  for (let i = 0; i < position.count; i++) {
    maxAbs = Math.max(maxAbs, Math.abs(position.getX(i)))
    maxAbs = Math.max(maxAbs, Math.abs(position.getY(i)))
    maxAbs = Math.max(maxAbs, Math.abs(position.getZ(i)))
  }
  return maxAbs
}

function findLargeCoordinatePointSymbolDrawable(group: ThreeRendererBatchedGroup) {
  let drawable: THREE.LineSegments | undefined
  group.traverse(child => {
    if (drawable) {
      return
    }
    if (
      child instanceof THREE.LineSegments &&
      Math.abs(child.position.x) >= RTE_REBASE_THRESHOLD
    ) {
      drawable = child
    }
  })
  return drawable
}

describe('ThreeRendererPoint wcsBbox', () => {
  it('stores the point location in wcsBbox for dot display mode', () => {
    const point = new ThreeRendererPoint(
      { x: 12, y: 34 },
      defaultTraits,
      dotStyle,
      new ThreeRendererRenderContext()
    )

    expectWcsBboxCloseTo(point.wcsBbox, [12, 34, 0], [12, 34, 0])
  })

  it('includes symbol geometry in wcsBbox for marker display mode', () => {
    const point = new ThreeRendererPoint(
      { x: 100, y: 200 },
      defaultTraits,
      crossStyle,
      new ThreeRendererRenderContext()
    )

    expect(point.wcsBbox.isEmpty()).toBe(false)
    expect(point.wcsBbox.min.x).toBeLessThanOrEqual(100)
    expect(point.wcsBbox.max.x).toBeGreaterThanOrEqual(100)
    expect(point.wcsBbox.min.y).toBeLessThanOrEqual(200)
    expect(point.wcsBbox.max.y).toBeGreaterThanOrEqual(200)
  })
  it('scales marker geometry by displaySize (PDSIZE)', () => {
    const point = new ThreeRendererPoint(
      { x: 0, y: 0 },
      defaultTraits,
      { displayMode: 35, displaySize: 2 },
      new ThreeRendererRenderContext()
    )

    const symbol = point.children.find(
      child => child instanceof THREE.LineSegments
    ) as THREE.LineSegments | undefined

    expect(symbol).toBeDefined()
    expect(getMaxAbsPositionComponent(symbol!.geometry)).toBeCloseTo(
      Math.SQRT2,
      5
    )
    expect(point.wcsBbox.max.x - point.wcsBbox.min.x).toBeCloseTo(
      2 * Math.SQRT2,
      5
    )
  })
})

describe('ThreeRendererPoint large coordinates', () => {
  it('keeps point symbol geometry local and stores world placement on position', () => {
    const point = new ThreeRendererPoint(
      largePoint,
      defaultTraits,
      circleCrossStyle,
      new ThreeRendererRenderContext()
    )

    const symbol = point.children.find(
      child => child instanceof THREE.LineSegments
    ) as THREE.LineSegments | undefined

    expect(symbol).toBeDefined()
    expect(getMaxAbsPositionComponent(symbol!.geometry)).toBeLessThan(2)
    expect(symbol!.position.x).toBeCloseTo(largePoint.x, 6)
    expect(symbol!.position.y).toBeCloseTo(largePoint.y, 6)
  })

  it('keeps wcsBbox in world coordinates when geometry is rebased locally', () => {
    const point = new ThreeRendererPoint(
      { x: largeX, y: 2_000_000 },
      defaultTraits,
      circleCrossStyle,
      new ThreeRendererRenderContext()
    )

    expect(point.wcsBbox.isEmpty()).toBe(false)
    expect(point.wcsBbox.min.x).toBeLessThanOrEqual(largeX)
    expect(point.wcsBbox.max.x).toBeGreaterThanOrEqual(largeX)
    expect(point.wcsBbox.min.y).toBeLessThanOrEqual(2_000_000)
    expect(point.wcsBbox.max.y).toBeGreaterThanOrEqual(2_000_000)
  })

  it('renders large point symbols correctly in a rebased batch', () => {
    const pointEntity = new ThreeRendererPoint(
      largePoint,
      defaultTraits,
      circleCrossStyle,
      new ThreeRendererRenderContext()
    )
    pointEntity.objectId = 'point-large'
    pointEntity.visible = true

    expect(pointEntity.resolveDrawMode()).toBe('batch')

    const group = new ThreeRendererBatchedGroup()
    group.addEntity(pointEntity)

    const drawable = findLargeCoordinatePointSymbolDrawable(group)
    expect(drawable).toBeDefined()
    expect(getMaxAbsPositionComponent(drawable!.geometry)).toBeLessThan(2)
    expect(drawable!.position.x).toBeCloseTo(largePoint.x, 6)
    expect(drawable!.position.y).toBeCloseTo(largePoint.y, 6)
    expect(drawable!.frustumCulled).toBe(false)
  })
})
