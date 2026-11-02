import {
  GeometryBox2d,
  GeometryMatrix2d,
  GeometryPoint2d,
  GeometryPoint2dLike
} from '../math'
import { GeometryUtil } from '../util'
import { geometrySignedPolygonArea2d } from '../util/GeometryPolygonAreaUtil'
import type { GeometryTessellateOptions } from './GeometryCurveTessellate'
import { GeometryLoop2d } from './GeometryLoop2d'
import { GeometryPolyline2d } from './GeometryPolyline2d'
import { GeometryShape2d } from './GeometryShape2d'

export interface GeometryIndexNode {
  index: number
  children: GeometryIndexNode[]
}

export type GeometryLoop2dType = GeometryLoop2d | GeometryPolyline2d

/**
 * 2d area defined by one outter loop and multiple inner loops
 */
export class GeometryArea2d extends GeometryShape2d {
  private _loops: Array<GeometryLoop2dType>

  /**
   * Create one 2d area defined by one outter loop and multiple inner loops
   */
  constructor() {
    super()
    this._loops = []
  }

  /**
   * Append one loop to loops of this area. If it is the first loop added, it is the outter loop.
   * Otherwise, it is an inner loop.
   * @param loop Input the loop to append
   */
  add(loop: GeometryLoop2dType) {
    this._loops.push(loop)
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * The loops of this area
   */
  get loops() {
    return this._loops as ReadonlyArray<GeometryLoop2dType>
  }

  /**
   * Outter loop of this area
   */
  get outter() {
    if (this._loops.length > 0) {
      return this._loops[0]
    }
    return undefined
  }

  /**
   * @inheritdoc
   */
  calculateBoundingBox(): GeometryBox2d {
    const outterLoop = this.outter
    if (outterLoop) {
      return outterLoop.box
    } else {
      return new GeometryBox2d()
    }
  }

  /**
   * @inheritdoc
   */
  transform(matrix: GeometryMatrix2d) {
    this._loops.forEach(loop => {
      loop.transform(matrix)
    })
    this._boundingBoxNeedsUpdate = true
    return this
  }

  /**
   * Return a deep-cloned copy of this area.
   */
  clone() {
    const area = new GeometryArea2d()
    this._loops.forEach(loop => {
      area.add(loop.clone())
    })
    return area
  }

  /**
   * Return boundary points of this area
   * @param numPoints Input the nubmer of points returned for arc segmentation
   * @returns Return points
   */
  getPoints(numPoints: number): GeometryPoint2d[][] {
    const pointBoundaries: GeometryPoint2d[][] = []
    for (let index = 0; index < this.loops.length; ++index) {
      const loop = this.loops[index]
      const points: GeometryPoint2d[] = loop.getPoints(
        numPoints
      ) as GeometryPoint2d[]
      pointBoundaries.push(points)
    }
    return pointBoundaries
  }

  /**
   * Sample every loop for display using per-edge chord-height tessellation.
   *
   * @param options - Chord-height tessellation options forwarded to each loop
   */
  tessellate(options?: GeometryTessellateOptions): GeometryPoint2d[][] {
    return this.loops.map(loop => loop.tessellate(options))
  }

  buildHierarchy(options?: GeometryTessellateOptions) {
    const pointBoundaries = this.tessellate(options)
    const boundaryBoxes = this.calculateBoundaryBoxes(pointBoundaries)
    const areaSortIndex: number[] = this.sortBoundaryBoxesByAreas(boundaryBoxes)

    const indexNodeMap = new Map<number, GeometryIndexNode>() // index => IndexNode
    const count = areaSortIndex.length
    for (let i = 0; i < count; i++) {
      indexNodeMap.set(areaSortIndex[i], {
        index: areaSortIndex[i],
        children: []
      })
    }

    const rootNode: GeometryIndexNode = { index: -1, children: [] }
    for (let i = 0; i < count; i++) {
      const index = areaSortIndex[i]
      const boundary = pointBoundaries[index]
      const box = boundaryBoxes[index]
      let j = i + 1
      for (; j < count; j++) {
        const index2 = areaSortIndex[j]
        const boundary2 = pointBoundaries[index2]
        const box2 = boundaryBoxes[index2]
        // Determine whether the boundary is within the boundary2.
        // Use a deterministic sample (first vertex) — randInt made hatch /
        // multi-quad wide-polyline nesting non-deterministic across reloads.
        if (
          box2.containsBox(box) &&
          GeometryUtil.isPointInPolygon(boundary[0], boundary2)
        ) {
          indexNodeMap
            .get(index2)
            ?.children.push(indexNodeMap.get(index) as GeometryIndexNode)
          break
        }
      }
      if (j === count) {
        rootNode.children.push(indexNodeMap.get(index) as GeometryIndexNode)
      }
    }

    return rootNode
  }

  /**
   * Calculate area of this 2d area.
   * Outter loop area minus inner loop areas (holes).
   */
  get area(): number {
    if (this._loops.length === 0) return 0

    let totalArea = 0

    for (let i = 0; i < this._loops.length; i++) {
      const loop = this._loops[i]
      // Sets the number of points used for curve segmentation to 128
      const points = loop.getPoints(128) as GeometryPoint2d[]

      const loopArea = geometrySignedPolygonArea2d(points)

      if (i === 0) {
        // outter loop
        totalArea += Math.abs(loopArea)
      } else {
        // inner loop (hole)
        totalArea -= Math.abs(loopArea)
      }
    }

    return totalArea
  }

  /**
   * Calcuate bounding box of each loop in this area and return an array of their bounding box
   * @param pointBoundaries An array of loop consisted by points
   * @returns Return an array of bounding box
   */
  private calculateBoundaryBoxes(pointBoundaries: GeometryPoint2dLike[][]) {
    const boundaryBoxes: GeometryBox2d[] = []
    pointBoundaries.forEach(points => {
      boundaryBoxes.push(new GeometryBox2d().setFromPoints(points))
    })
    return boundaryBoxes
  }

  /**
   * Sort boundary boxes by its area and return the index of boundary boxes array
   * @param boundaryBoxes An array of boundary bounding box
   * @returns Return an index array of boundary bounding box sorted by its area
   */
  private sortBoundaryBoxesByAreas(boundaryBoxes: GeometryBox2d[]) {
    const boundaryAreas: { area: number; index: number }[] = []
    boundaryBoxes.forEach((box, index) => {
      const size = box.size
      const area = size.width * size.height
      boundaryAreas.push({
        area,
        index
      })
    })
    boundaryAreas.sort((a, b) => {
      return a.area - b.area
    })
    const indices: number[] = []
    boundaryAreas.forEach(a => {
      indices.push(a.index)
    })
    return indices
  }
}
