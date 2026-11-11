import * as THREE from 'three'

import { ThreeRendererBatchedGroup } from '../src/batch/ThreeRendererBatchedGroup'
import {
  buildLineGeometry,
  buildPointGeometry
} from '../src/object/ThreeRendererLineGeometryBuilder'
import { ThreeRendererLine } from '../src/object/ThreeRendererLine'
import { ThreeRendererRenderContext } from '../src/renderer/ThreeRendererRenderContext'
import { ThreeRendererStyleManager } from '../src/style/ThreeRendererStyleManager'
import { ThreeRendererSubEntityTraitsUtil } from '../src/util'

const defaultTraits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()

describe('ThreeRendererBatchedGroup direct line append', () => {
  it('registers objectId and supports visibility / remove', () => {
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const built = buildLineGeometry(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ],
      material
    )
    expect(built).not.toBeNull()
    if (!built) return
    const group = new ThreeRendererBatchedGroup()

    expect(
      group.appendLineGeometry(
        built.geometry as THREE.BufferGeometry,
        material,
        built.worldOffset,
        {
          objectId: 'line-1',
          visible: true
        }
      )
    ).toBe(true)
    built.geometry.dispose()

    expect(group.hasEntity('line-1')).toBe(true)
    expect(group.setEntityVisible('line-1', false)).toBe(true)
    expect(group.getEntityVisible('line-1')).toBe(false)
    expect(group.removeEntity('line-1')).toBe(true)
    expect(group.hasEntity('line-1')).toBe(false)
  })

  it('skips append when visible is false', () => {
    const material = new THREE.LineBasicMaterial()
    const built = buildLineGeometry(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 }
      ],
      material
    )
    expect(built).not.toBeNull()
    if (!built) return
    const group = new ThreeRendererBatchedGroup()

    expect(
      group.appendLineGeometry(
        built.geometry as THREE.BufferGeometry,
        material,
        built.worldOffset,
        {
          objectId: 'hidden',
          visible: false
        }
      )
    ).toBe(false)
    built.geometry.dispose()
    expect(group.hasEntity('hidden')).toBe(false)
  })

  it('appends point geometry into point batches', () => {
    const material = new THREE.PointsMaterial({ color: 0xff0000 })
    const built = buildPointGeometry({ x: 5, y: 6 }, material)
    const group = new ThreeRendererBatchedGroup()

    expect(
      group.appendPointGeometry(built.geometry, material, built.worldOffset, {
        objectId: 'pt-1',
        position: built.position
      })
    ).toBe(true)
    built.geometry.dispose()

    expect(group.hasEntity('pt-1')).toBe(true)
    expect(group.removeEntity('pt-1')).toBe(true)
    material.dispose()
  })

})
