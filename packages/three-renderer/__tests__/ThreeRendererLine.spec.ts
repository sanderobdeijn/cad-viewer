import * as THREE from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'

import { ThreeRendererBatchedGroup } from '../src/batch/ThreeRendererBatchedGroup'
import type { ThreeRendererBatchDrawPolicy } from '../src/draw/ThreeRendererBatchDrawPolicy'
import { RTE_REBASE_THRESHOLD } from '../src/draw/ThreeRendererBatchDrawPolicy'
import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'
import { ThreeRendererLine } from '../src/object/ThreeRendererLine'
import { ThreeRendererRenderContext } from '../src/renderer/ThreeRendererRenderContext'
import { ThreeRendererStyleManager } from '../src/style/ThreeRendererStyleManager'
import { ThreeRendererSubEntityTraitsUtil } from '../src/util'
import { getSceneDrawableUserData } from '../src/util/ThreeRendererObjectUserData'

const defaultTraits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()
const largeX = RTE_REBASE_THRESHOLD + 500_000

const unbatchPolicy: ThreeRendererBatchDrawPolicy = {
  resolveDrawMode: () => 'unbatch'
}

const batchPolicy: ThreeRendererBatchDrawPolicy = {
  resolveDrawMode: () => 'batch'
}

function findLargeCoordinateLineDrawable(group: ThreeRendererBatchedGroup) {
  let drawable: THREE.Object3D | undefined
  group.traverse(child => {
    if (drawable) {
      return
    }
    if (child instanceof THREE.LineSegments || child instanceof LineSegments2) {
      if (Math.abs(child.position.x) >= RTE_REBASE_THRESHOLD) {
        drawable = child
      }
    }
  })
  return drawable
}

function getMaxAbsPositionComponent(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute('position')
  if (position) {
    let maxAbs = 0
    for (let i = 0; i < position.count; i++) {
      maxAbs = Math.max(maxAbs, Math.abs(position.getX(i)))
      maxAbs = Math.max(maxAbs, Math.abs(position.getY(i)))
      maxAbs = Math.max(maxAbs, Math.abs(position.getZ(i)))
    }
    return maxAbs
  }

  const instanceStart = geometry.getAttribute('instanceStart')
  if (!instanceStart) {
    return 0
  }
  let maxAbs = 0
  for (let i = 0; i < instanceStart.count; i++) {
    maxAbs = Math.max(maxAbs, Math.abs(instanceStart.getX(i)))
    maxAbs = Math.max(maxAbs, Math.abs(instanceStart.getY(i)))
    maxAbs = Math.max(maxAbs, Math.abs(instanceStart.getZ(i)))
  }
  return maxAbs
}

describe('ThreeRendererLine', () => {
  it('marks flat line drawables as noBatch when resolveDrawMode returns unbatch', () => {
    const context = new ThreeRendererRenderContext(new ThreeRendererStyleManager(), unbatchPolicy)
    const line = new ThreeRendererLine(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ],
      defaultTraits,
      context,
      false
    )

    expect(line.resolveDrawMode()).toBe('unbatch')
    const drawable = line.children[0]
    expect(getSceneDrawableUserData(drawable).noBatch).toBe(true)
    expect(getSceneDrawableUserData(line).noBatch).toBeUndefined()
  })

  it('leaves batchable line drawables unmarked when resolveDrawMode returns batch', () => {
    const context = new ThreeRendererRenderContext(new ThreeRendererStyleManager(), batchPolicy)
    const line = new ThreeRendererLine(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ],
      defaultTraits,
      context,
      false
    )

    expect(line.resolveDrawMode()).toBe('batch')
    const drawable = line.children[0] as THREE.Object3D
    expect(getSceneDrawableUserData(drawable).noBatch).toBeUndefined()
  })

  it('keeps geometry local and visible in a rebased batch at large coordinates', () => {
    const context = new ThreeRendererRenderContext()
    const lineEntity = new ThreeRendererLine(
      [
        { x: largeX, y: 2_000_000 },
        { x: largeX + 100, y: 2_000_050 }
      ],
      defaultTraits,
      context
    )
    lineEntity.objectId = 'line-large'
    lineEntity.visible = true

    expect(lineEntity.resolveDrawMode()).toBe('batch')

    const group = new ThreeRendererBatchedGroup()
    group.addEntity(lineEntity)

    const drawable = findLargeCoordinateLineDrawable(group)
    expect(
      drawable instanceof THREE.LineSegments ||
        drawable instanceof LineSegments2
    ).toBe(true)
    if (
      !(
        drawable instanceof THREE.LineSegments ||
        drawable instanceof LineSegments2
      )
    ) {
      return
    }

    expect(drawable.frustumCulled).toBe(false)
    expect(getMaxAbsPositionComponent(drawable.geometry)).toBeLessThan(1000)
    expect(drawable.position.x).toBeCloseTo(largeX + 50, 0)
  })
})

describe('ThreeRendererLine wcsBbox', () => {
  it('stores endpoint bounds in world coordinates', () => {
    const line = new ThreeRendererLine(
      [
        { x: 3, y: 4 },
        { x: 13, y: 14 }
      ],
      defaultTraits,
      new ThreeRendererRenderContext(),
      false
    )

    expectWcsBboxCloseTo(line.wcsBbox, [3, 4, 0], [13, 14, 0])
  })

  it('keeps wcsBbox in world coordinates when geometry is rebased locally', () => {
    const line = new ThreeRendererLine(
      [
        { x: largeX, y: 2_000_000 },
        { x: largeX + 100, y: 2_000_050 }
      ],
      defaultTraits,
      new ThreeRendererRenderContext()
    )

    expectWcsBboxCloseTo(
      line.wcsBbox,
      [largeX, 2_000_000, 0],
      [largeX + 100, 2_000_050, 0],
      0
    )
  })
})
