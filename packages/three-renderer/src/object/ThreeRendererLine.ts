import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'
import { GraphicsInterfaceSubEntityTraits } from '@mlightcad/graphic-interface'
import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { resolveAnchorFromBox } from '../draw/ThreeRendererBatchDrawPolicy'
import type { ThreeRendererDrawMode } from '../draw/ThreeRendererDrawMode'
import { ThreeRendererRenderContext } from '../renderer/ThreeRendererRenderContext'
import { getSceneDrawableUserData } from '../util'
import { ThreeRendererEntity } from './ThreeRendererEntity'
import { buildLineGeometry } from './ThreeRendererLineGeometryBuilder'

export class ThreeRendererLine extends ThreeRendererEntity {
  public geometry: THREE.BufferGeometry | LineSegmentsGeometry

  constructor(
    points: GeometryPoint2dLike[],
    traits: GraphicsInterfaceSubEntityTraits,
    context: ThreeRendererRenderContext,
    basicMaterialOnly: boolean = false
  ) {
    super(context)

    if (points.length < 2) {
      this.geometry = new THREE.BufferGeometry()
      return
    }

    const material = this.styleManager.getLineMaterial(
      traits,
      basicMaterialOnly
    )
    const built = buildLineGeometry(points, material)
    if (!built) {
      this.geometry = new THREE.BufferGeometry()
      return
    }

    this.geometry = built.geometry
    this.wcsBbox = built.wcsBbox

    if (built.kind === 'fat') {
      const line = new LineSegments2(
        built.geometry as LineSegmentsGeometry,
        material as LineMaterial
      )
      line.position.copy(built.worldOffset)
      getSceneDrawableUserData(line).styleMaterialId = material.id
      this.add(line)
      this.finalizeLeafDrawables()
      return
    }

    const line = new THREE.LineSegments(
      built.geometry as THREE.BufferGeometry,
      material
    )
    line.position.copy(built.worldOffset)
    this.add(line)
    this.finalizeLeafDrawables()
  }

  override resolveDrawMode(): ThreeRendererDrawMode {
    return this.batchDrawPolicy.resolveDrawMode({
      anchor: resolveAnchorFromBox(this.wcsBbox)
    })
  }
}
