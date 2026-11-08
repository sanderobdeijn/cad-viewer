import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { copyArrayContents } from '../src/batch/ThreeRendererBatchedGeometryInfo'
import { ThreeRendererBatchedGroup } from '../src/batch/ThreeRendererBatchedGroup'
import { ThreeRendererBatchedLine } from '../src/batch/ThreeRendererBatchedLine'
import { ThreeRendererBatchedLine2 } from '../src/batch/ThreeRendererBatchedLine2'
import {
  ThreeRendererBatchHighlightState,
  BATCH_SLOT_ID_ATTRIBUTE
} from '../src/batch/highlight'
import { RTE_REBASE_THRESHOLD } from '../src/draw/ThreeRendererBatchDrawPolicy'
import { buildLineGeometry } from '../src/object/ThreeRendererLineGeometryBuilder'
import { ThreeRendererEntity } from '../src/object/ThreeRendererEntity'
import { ThreeRendererLine } from '../src/object/ThreeRendererLine'
import { ThreeRendererRenderContext } from '../src/renderer/ThreeRendererRenderContext'
import { ThreeRendererSubEntityTraitsUtil } from '../src/util'
import {
  HIGHLIGHT_HOVER_COLOR,
  HIGHLIGHT_SELECT_COLOR
} from '../src/util/ThreeRendererMaterialUtil'
import {
  getMaterialRuntimeUserData,
  getObjectUserData
} from '../src/util/ThreeRendererObjectUserData'

const defaultTraits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()

function createBatchedLineEntity(objectId: string) {
  const context = new ThreeRendererRenderContext()
  const line = new ThreeRendererLine(
    [
      { x: 0, y: 0 },
      { x: 100, y: 0 }
    ],
    defaultTraits,
    context,
    false
  )
  const entity = new ThreeRendererEntity(context)
  entity.objectId = objectId
  entity.visible = true
  entity.add(line)
  return entity
}

function findBatchedLine(group: ThreeRendererBatchedGroup): ThreeRendererBatchedLine | undefined {
  let result: ThreeRendererBatchedLine | undefined
  group.traverse(child => {
    if (!result && child instanceof ThreeRendererBatchedLine) {
      result = child
    }
  })
  return result
}

function appendIndexedLine(
  group: ThreeRendererBatchedGroup,
  material: THREE.LineBasicMaterial,
  objectId: string,
  x: number
) {
  const built = buildLineGeometry(
    [
      { x, y: 0 },
      { x: x + 1, y: 0 }
    ],
    material
  )
  expect(built).not.toBeNull()
  if (!built) return
  expect(
    group.appendLineGeometry(
      built.geometry as THREE.BufferGeometry,
      material,
      built.worldOffset,
      { objectId }
    )
  ).toBe(true)
  built.geometry.dispose()
}

describe('ThreeRendererBatchedGroup slot-mask highlight', () => {
  it('writes slotId when batching line geometry', () => {
    const group = new ThreeRendererBatchedGroup()
    group.addEntity(createBatchedLineEntity('line-1'))

    const batchedLine = findBatchedLine(group)
    expect(batchedLine).toBeDefined()
    const slotId = batchedLine!.geometry.getAttribute(BATCH_SLOT_ID_ATTRIBUTE)
    expect(slotId).toBeDefined()
    expect(slotId.getX(0)).toBe(0)
  })

  it('selects batched entities without creating overlay drawables', () => {
    const group = new ThreeRendererBatchedGroup()
    group.addEntity(createBatchedLineEntity('line-1'))

    group.select('line-1')

    const selectedGroup = group.children[1] as THREE.Group
    expect(selectedGroup.children).toHaveLength(0)

    const batchedLine = findBatchedLine(group)!
    expect(batchedLine._highlightState.selectedMask[0]).toBe(1)
  })

  it('selectMany keeps overlay groups empty for batched entities', () => {
    const group = new ThreeRendererBatchedGroup()
    for (let index = 0; index < 100; index++) {
      group.addEntity(createBatchedLineEntity(`line-${index}`))
    }

    group.selectMany(Array.from({ length: 100 }, (_, index) => `line-${index}`))

    const selectedGroup = group.children[1] as THREE.Group
    expect(selectedGroup.children).toHaveLength(0)
    expect(group.entityCount).toBe(100)
  })

  it('clears batched highlight state on unselect', () => {
    const group = new ThreeRendererBatchedGroup()
    group.addEntity(createBatchedLineEntity('line-1'))

    group.select('line-1')
    group.unselect('line-1')

    const batchedLine = findBatchedLine(group)!
    expect(batchedLine._highlightState.selectedMask[0]).toBe(0)
  })

  it('gives each batch a private material clone so highlight masks cannot leak', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff })
    const group = new ThreeRendererBatchedGroup()
    // Far-apart origins force two batch containers from the same style material.
    appendIndexedLine(group, material, 'selected-line', 0)
    appendIndexedLine(group, material, 'other-line', RTE_REBASE_THRESHOLD + 10)

    group.select('selected-line')

    const batches: ThreeRendererBatchedLine[] = []
    group.traverse(child => {
      if (child instanceof ThreeRendererBatchedLine) {
        batches.push(child)
      }
    })
    expect(batches.length).toBeGreaterThanOrEqual(2)

    const selected = batches.find(b =>
      b._highlightState.selectedMask.some(flag => flag === 1)
    )
    const other = batches.find(b => b !== selected)
    expect(selected).toBeDefined()
    expect(other).toBeDefined()
    // Private clones: highlight uniforms live on the material, so siblings must
    // not share one THREE.Material instance.
    expect(selected!.material).not.toBe(other!.material)
    expect(selected!.material).not.toBe(material)
    expect(other!._highlightState.hasAnyHighlight()).toBe(false)
  })

  it('uploads large highlight masks as a 2D texture within GPU limits', () => {
    const state = new ThreeRendererBatchHighlightState()
    state.setAddressableSlotCount(65536)
    state.setHighlight(65535, 'select', true)

    state.uploadMaskTexture()

    expect(state.maskTextureWidth).toBe(4096)
    expect(state.maskTextureHeight).toBe(16)
    expect(state.maskTexture?.image.width).toBe(4096)
    expect(state.maskTexture?.image.height).toBe(16)
  })

  it('sizes mask texture to all addressable slots when only low slots are highlighted', () => {
    const state = new ThreeRendererBatchHighlightState()
    state.setAddressableSlotCount(500)
    state.setHighlight(0, 'select', true)

    state.uploadMaskTexture()

    expect(state.maskTextureWidth).toBe(500)
    expect(state.maskTextureHeight).toBe(1)
    expect(state.selectedMask[499]).toBe(0)
  })

  it('skips redundant mask uploads when highlight state is unchanged', () => {
    const state = new ThreeRendererBatchHighlightState()
    state.setHighlight(0, 'select', true)
    const firstTexture = state.uploadMaskTexture()
    const firstData = firstTexture.image.data as Uint8Array

    const secondTexture = state.uploadMaskTexture()

    expect(secondTexture).toBe(firstTexture)
    expect(secondTexture.image.data).toBe(firstData)
  })

  it('uses hover highlight color for unbatched drawables', () => {
    const group = new ThreeRendererBatchedGroup()
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
    )
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const line = new THREE.Line(geometry, material)
    getObjectUserData(line).noBatch = true

    const entity = new ThreeRendererEntity(new ThreeRendererRenderContext())
    entity.objectId = 'unbatched-hover'
    entity.visible = true
    entity.add(line)
    group.addEntity(entity)

    group.hover('unbatched-hover')

    const clonedLine = [...group.children[0].children].find(
      child => child instanceof THREE.Line
    ) as THREE.Line
    expect(
      (clonedLine.material as THREE.LineBasicMaterial).color.getHex()
    ).toBe(HIGHLIGHT_HOVER_COLOR.getHex())
  })

  it('keeps hover highlight after unselect when both were active', () => {
    const group = new ThreeRendererBatchedGroup()
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
    )
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const line = new THREE.Line(geometry, material)
    getObjectUserData(line).noBatch = true

    const entity = new ThreeRendererEntity(new ThreeRendererRenderContext())
    entity.objectId = 'unbatched-both'
    entity.visible = true
    entity.add(line)
    group.addEntity(entity)

    group.select('unbatched-both')
    group.hover('unbatched-both')
    group.unselect('unbatched-both')

    const clonedLine = [...group.children[0].children].find(
      child => child instanceof THREE.Line
    ) as THREE.Line
    expect(
      (clonedLine.material as THREE.LineBasicMaterial).color.getHex()
    ).toBe(HIGHLIGHT_HOVER_COLOR.getHex())
  })

  it('uses in-place material swap for unbatched drawables', () => {
    const group = new ThreeRendererBatchedGroup()
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 10, 0, 0], 3)
    )
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const line = new THREE.Line(geometry, material)
    getObjectUserData(line).noBatch = true

    const entity = new ThreeRendererEntity(new ThreeRendererRenderContext())
    entity.objectId = 'unbatched-1'
    entity.visible = true
    entity.add(line)
    group.addEntity(entity)

    group.select('unbatched-1')

    const selectedGroup = group.children[1] as THREE.Group
    expect(selectedGroup.children).toHaveLength(0)

    const clonedLine = [...group.children[0].children].find(
      child => child instanceof THREE.Line
    ) as THREE.Line
    expect(clonedLine).toBeDefined()
    expect(getObjectUserData(clonedLine).originalMaterial).toBe(material)
    expect(
      (clonedLine.material as THREE.LineBasicMaterial).color.getHex()
    ).toBe(HIGHLIGHT_SELECT_COLOR.getHex())

    group.unselect('unbatched-1')
    expect(clonedLine.material).toBe(material)
    expect(getObjectUserData(clonedLine).originalMaterial).toBeUndefined()
  })

  it('stores Line2 slotId as an instanced attribute per segment', () => {
    const group = new ThreeRendererBatchedGroup()
    const geometry = new LineSegmentsGeometry()
    geometry.setPositions([0, 0, 0, 100, 0, 0, 100, 0, 0, 160, -20, 0])
    const line2 = new LineSegments2(
      geometry,
      new LineMaterial({
        color: 0xffffff,
        linewidth: 2,
        resolution: new THREE.Vector2(800, 600)
      })
    )
    const entity = new ThreeRendererEntity(new ThreeRendererRenderContext())
    entity.objectId = '927'
    entity.visible = true
    entity.add(line2)
    group.addEntity(entity)

    let batched: ThreeRendererBatchedLine2 | undefined
    group.traverse(child => {
      if (!batched && child instanceof ThreeRendererBatchedLine2) {
        batched = child
      }
    })
    expect(batched).toBeDefined()
    const slotId = batched!.geometry.getAttribute(BATCH_SLOT_ID_ATTRIBUTE)
    expect(slotId).toBeInstanceOf(THREE.InstancedBufferAttribute)
    expect(slotId.getX(0)).toBe(0)
    expect(slotId.getX(1)).toBe(0)
  })

  it('keeps slotIds after indexed-line batch growth', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff })
    const group = new ThreeRendererBatchedGroup()
    const ids: string[] = []
    for (let i = 0; i < 448; i++) {
      ids.push(`line-${i}`)
    }
    ids.push('926', '927')

    for (let i = 0; i < ids.length; i++) {
      const built = buildLineGeometry(
        [
          { x: i, y: 0 },
          { x: i + 1, y: 0 }
        ],
        material
      )
      expect(built).not.toBeNull()
      if (!built) return
      expect(
        group.appendLineGeometry(
          built.geometry as THREE.BufferGeometry,
          material,
          built.worldOffset,
          { objectId: ids[i] }
        )
      ).toBe(true)
      built.geometry.dispose()
    }

    const batchedLine = findBatchedLine(group)!
    const slotId = batchedLine.geometry.getAttribute(BATCH_SLOT_ID_ATTRIBUTE)
    expect(slotId.getX(100)).toBe(50)
    expect(slotId.getX(896)).toBe(448)
    expect(slotId.getX(898)).toBe(449)
  })

  it('copies typed-array views with a non-zero byteOffset', () => {
    const buffer = new ArrayBuffer(16)
    const src = new Float32Array(buffer, 8, 2)
    src[0] = 448
    src[1] = 449
    const target = new Float32Array(4)
    copyArrayContents(src, target)
    expect(Array.from(target)).toEqual([448, 449, 0, 0])
  })
})
