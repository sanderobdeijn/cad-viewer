import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'
import {
  GraphicsInterfacePointStyle,
  GraphicsInterfaceSubEntityTraits
} from '@mlightcad/graphic-interface'
import * as THREE from 'three'

import type { ThreeRendererDrawMode } from '../draw/ThreeRendererDrawMode'
import { ThreeRendererPointSymbolCreator } from '../geometry/ThreeRendererPointSymbolCreator'
import { ThreeRendererRenderContext } from '../renderer/ThreeRendererRenderContext'
import { ThreeRendererBufferGeometryUtil } from '../util/ThreeRendererBufferGeometryUtil'
import { getSceneDrawableUserData } from '../util/ThreeRendererObjectUserData'
import { ThreeRendererEntity } from './ThreeRendererEntity'

const _vector3 = /*@__PURE__*/ new THREE.Vector3()

export class ThreeRendererPoint extends ThreeRendererEntity {
  /**
   * The flag whether to use one point using THREE.Points
   */
  isShowPoint: boolean
  private _point: GeometryPoint2dLike

  constructor(
    point: GeometryPoint2dLike,
    traits: GraphicsInterfaceSubEntityTraits,
    style: GraphicsInterfacePointStyle,
    context: ThreeRendererRenderContext
  ) {
    super(context)
    this._point = point
    const pointSymbol = ThreeRendererPointSymbolCreator.instance.create(
      style.displayMode,
      point,
      style.displaySize
    )

    this.isShowPoint = pointSymbol.point != null

    // Always create one THREE.Points object. If 'isShowPoint' is true, show it. Otherwise, hide it.
    const geometry =
      pointSymbol.point ??
      new THREE.BufferGeometry().setFromPoints([_vector3.set(0, 0, 0)])
    this.unionWorldBoundingBox(geometry, point)
    const material = this.styleManager.getPointsMaterial(traits)
    const pointObj = new THREE.Points(geometry, material)
    pointObj.position.set(point.x, point.y, 0)
    // Add the flag to check intersection using bounding box of the mesh
    getSceneDrawableUserData(pointObj).bboxIntersectionCheck = true
    pointObj.visible = this.isShowPoint
    this.add(pointObj)

    if (pointSymbol.line) {
      const geometry = pointSymbol.line
      this.unionWorldBoundingBox(geometry, point)
      const material = this.styleManager.getLineMaterial(traits)
      const lineSegmentsObj = new THREE.LineSegments(geometry, material)
      lineSegmentsObj.position.set(point.x, point.y, 0)
      const lineDrawable = getSceneDrawableUserData(lineSegmentsObj)
      // Add the flag to check intersection using bounding box of the mesh
      lineDrawable.bboxIntersectionCheck = true
      // Add this flag so that batched group can handle it with different logic
      lineDrawable.isPoint = true
      lineDrawable.position = { x: point.x, y: point.y }
      this.add(lineSegmentsObj)
    }
    this.finalizeLeafDrawables()
  }

  override resolveDrawMode(): ThreeRendererDrawMode {
    return this.batchDrawPolicy.resolveDrawMode({
      position: this._point
    })
  }

  private unionWorldBoundingBox(
    geometry: THREE.BufferGeometry,
    worldOrigin: GeometryPoint2dLike
  ) {
    const boundingBox = ThreeRendererBufferGeometryUtil.safeComputeBoundingBox(geometry)
    if (!boundingBox) {
      return
    }
    const worldBox = boundingBox.clone()
    worldBox.translate(_vector3.set(worldOrigin.x, worldOrigin.y, 0))
    this.wcsBbox.union(worldBox)
  }
}
