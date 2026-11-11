import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'
import { GraphicsInterfaceSubEntityTraits } from '@mlightcad/graphic-interface'
import * as THREE from 'three'

import { resolveAnchorFromBox } from '../draw/ThreeRendererBatchDrawPolicy'
import type { ThreeRendererDrawMode } from '../draw/ThreeRendererDrawMode'
import { ThreeRendererRenderContext } from '../renderer/ThreeRendererRenderContext'
import { ThreeRendererEntity } from './ThreeRendererEntity'

/**
 * A filled, simple closed polygon, such as a dimension arrowhead.
 *
 * The boundary is triangulated with earcut. Vertices are stored relative to
 * the boundary's bounding-box centre, in float64 before the float32 upload, so
 * fills stay precise at large drawing coordinates.
 */
export class ThreeRendererFill extends ThreeRendererEntity {
  constructor(
    points: GeometryPoint2dLike[],
    traits: GraphicsInterfaceSubEntityTraits,
    context: ThreeRendererRenderContext
  ) {
    super(context)

    const boundary = points.filter(
      point => Number.isFinite(point.x) && Number.isFinite(point.y)
    )
    const first = boundary[0]
    const last = boundary[boundary.length - 1]
    if (first && last && first.x === last.x && first.y === last.y) {
      boundary.pop()
    }
    if (boundary.length < 3) {
      return
    }

    const box = new THREE.Box3()
    for (const point of boundary) {
      box.expandByPoint(new THREE.Vector3(point.x, point.y, 0))
    }
    const origin = box.getCenter(new THREE.Vector3())
    const contour = boundary.map(
      point => new THREE.Vector2(point.x - origin.x, point.y - origin.y)
    )
    const triangles = THREE.ShapeUtils.triangulateShape(contour, [])
    if (triangles.length === 0) {
      return
    }

    const positions = new Float32Array(contour.length * 3)
    contour.forEach((point, i) => {
      positions[i * 3] = point.x
      positions[i * 3 + 1] = point.y
    })
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    // The fill material culls back faces, so wind every triangle
    // counter-clockwise (facing the camera) whatever the boundary's winding.
    geometry.setIndex(
      triangles.flatMap(([a, b, c]) =>
        THREE.ShapeUtils.area([contour[a], contour[b], contour[c]]) < 0
          ? [a, c, b]
          : [a, b, c]
      )
    )
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()

    this.wcsBbox = box
    const mesh = new THREE.Mesh(
      geometry,
      this.styleManager.getFillMaterial(traits)
    )
    mesh.position.copy(origin)
    this.add(mesh)
    this.finalizeLeafDrawables()
  }

  override resolveDrawMode(): ThreeRendererDrawMode {
    return this.batchDrawPolicy.resolveDrawMode({
      anchor: resolveAnchorFromBox(this.wcsBbox)
    })
  }
}
