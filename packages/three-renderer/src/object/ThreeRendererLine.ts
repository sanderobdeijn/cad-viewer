import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'
import { GraphicsInterfaceSubEntityTraits } from '@mlightcad/graphic-interface'
import * as THREE from 'three'

import { resolveAnchorFromBox } from '../draw/ThreeRendererBatchDrawPolicy'
import type { ThreeRendererDrawMode } from '../draw/ThreeRendererDrawMode'
import { ThreeRendererRenderContext } from '../renderer/ThreeRendererRenderContext'
import { ThreeRendererEntity } from './ThreeRendererEntity'
import { buildLineGeometry } from './ThreeRendererLineGeometryBuilder'

export class ThreeRendererLine extends ThreeRendererEntity {
  public geometry: THREE.BufferGeometry

  constructor(
    points: GeometryPoint2dLike[],
    traits: GraphicsInterfaceSubEntityTraits,
    context: ThreeRendererRenderContext
  ) {
    super(context)

    if (points.length < 2) {
      this.geometry = new THREE.BufferGeometry()
      return
    }

    const material = this.styleManager.getLineMaterial(traits)
    const built = buildLineGeometry(points, material)
    if (!built) {
      this.geometry = new THREE.BufferGeometry()
      return
    }

    this.geometry = built.geometry
    this.wcsBbox = built.wcsBbox

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
