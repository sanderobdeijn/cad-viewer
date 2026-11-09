import { GraphicsInterfaceSubEntityTraits } from '@mlightcad/graphic-interface'
import * as THREE from 'three'

import { resolveAnchorFromBox } from '../draw/ThreeRendererBatchDrawPolicy'
import type { ThreeRendererDrawMode } from '../draw/ThreeRendererDrawMode'
import { ThreeRendererRenderContext } from '../renderer/ThreeRendererRenderContext'
import { ThreeRendererBufferGeometryUtil } from '../util'
import { ThreeRendererEntity } from './ThreeRendererEntity'

export class ThreeRendererLineSegments extends ThreeRendererEntity {
  constructor(
    array: Float32Array,
    itemSize: number,
    indices: Uint16Array,
    traits: GraphicsInterfaceSubEntityTraits,
    context: ThreeRendererRenderContext
  ) {
    super(context)

    const material = this.styleManager.getLineMaterial(traits)
    const box = new THREE.Box3()

    for (let i = 0; i < array.length; i += itemSize) {
      box.expandByPoint(_point.set(array[i], array[i + 1], array[i + 2] ?? 0))
    }

    const localOrigin = box.getCenter(new THREE.Vector3())

    const rebased = new Float32Array(array.length)
    for (let i = 0; i < array.length; i += itemSize) {
      rebased[i] = array[i] - localOrigin.x
      rebased[i + 1] = array[i + 1] - localOrigin.y
      rebased[i + 2] = (array[i + 2] ?? 0) - localOrigin.z
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(rebased, itemSize)
    )
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    this.setBoundingBox(geometry, localOrigin)

    const line = new THREE.LineSegments(geometry, material)
    line.position.set(localOrigin.x, localOrigin.y, localOrigin.z)
    this.add(line)
    this.finalizeLeafDrawables()
  }

  override resolveDrawMode(): ThreeRendererDrawMode {
    return this.batchDrawPolicy.resolveDrawMode({
      anchor: resolveAnchorFromBox(this.wcsBbox)
    })
  }

  private setBoundingBox(
    geometry: THREE.BufferGeometry,
    localOrigin: THREE.Vector3
  ) {
    const boundingBox = ThreeRendererBufferGeometryUtil.safeComputeBoundingBox(geometry)
    if (!boundingBox) {
      return
    }
    const worldBox = boundingBox.clone()
    worldBox.translate(localOrigin)
    this.wcsBbox = worldBox
  }
}

const _point = /*@__PURE__*/ new THREE.Vector3()
