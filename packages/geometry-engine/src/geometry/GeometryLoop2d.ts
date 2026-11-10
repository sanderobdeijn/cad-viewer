import { GeometryBox2d, GeometryMatrix2d, GeometryPoint2d } from '../math'
import { FLOAT_TOL, TAU } from '../util'
import { GeometryCircularArc2d } from './GeometryCircularArc2d'
import { GeometryCurve2d } from './GeometryCurve2d'
import type { GeometryTessellateOptions } from './GeometryCurveTessellate'
import { GeometryEllipseArc2d } from './GeometryEllipseArc2d'
import { GeometryLine2d } from './GeometryLine2d'

export type GeometryBoundaryEdgeType =
  | GeometryLine2d
  | GeometryCircularArc2d
  | GeometryEllipseArc2d

/**
 * The class representing one closed loop created by connected edges, which can be line, circular arc,
 * or ellipse arc.
 */
export class GeometryLoop2d extends GeometryCurve2d {
  private _curves: Array<GeometryBoundaryEdgeType>

  /**
   * Create one loop by connected curves
   * @param curves Input one array of connected curves
   */
  constructor(curves: Array<GeometryBoundaryEdgeType> = []) {
    super()
    this._curves = curves
  }

  get curves() {
    return this._curves as ReadonlyArray<GeometryBoundaryEdgeType>
  }

  /**
   * Append an edge to this loop
   * @param curve
   */
  add(curve: GeometryBoundaryEdgeType) {
    this._curves.push(curve)
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Start point of this polyline
   */
  get startPoint(): GeometryPoint2d {
    if (this._curves.length > 0) {
      const temp = this._curves[0].startPoint
      return new GeometryPoint2d(temp.x, temp.y)
    }
    throw new Error('Start point does not exist in an empty loop.')
  }

  /**
   * End point of this polyline
   */
  get endPoint(): GeometryPoint2d {
    return this.startPoint
  }

  /**
   * @inheritdoc
   */
  get length() {
    let length = 0
    this._curves.forEach(curve => {
      length += curve.length
    })
    return length
  }

  /**
   * @inheritdoc
   */
  calculateBoundingBox(): GeometryBox2d {
    const points = this.getPoints(100)
    const box2d = new GeometryBox2d()
    box2d.setFromPoints(points)
    return box2d
  }

  /**
   * @inheritdoc
   */
  transform(matrix: GeometryMatrix2d) {
    this._curves.forEach(curve => curve.transform(matrix))

    this._boundingBoxNeedsUpdate = true
    return this
  }

  /**
   * Return a deep-cloned copy of this loop.
   */
  clone() {
    return new GeometryLoop2d(this._curves.map(curve => curve.clone()))
  }

  /**
   * @inheritdoc
   */
  get closed(): boolean {
    return true
  }

  /**
   * Return boundary points of this area
   * @param numPoints Input the nubmer of points returned for arc segmentation
   * @returns Return points
   */
  getPoints(numPoints: number): GeometryPoint2d[] {
    const points: GeometryPoint2d[] = []
    this.curves.forEach(curve => {
      curve.getPoints(numPoints).forEach((point: GeometryPoint2d) => {
        points.push(new GeometryPoint2d(point.x, point.y))
      })
    })
    return points
  }

  /**
   * Sample this loop for display using per-edge chord-height tessellation.
   *
   * Straight edges emit endpoints only. Circular arcs use
   * {@link GeometryCircularArc2d.tessellate}.
   * Elliptical edges choose a segment count from the same chord-height formula.
   *
   * @param options - Chord-height tessellation options
   */
  tessellate(options?: GeometryTessellateOptions): GeometryPoint2d[] {
    const points: GeometryPoint2d[] = []
    this._curves.forEach(curve => {
      tessellateLoopEdge(curve, options).forEach(point => {
        const last = points[points.length - 1]
        if (
          last &&
          (last.x - point.x) ** 2 + (last.y - point.y) ** 2 <=
            FLOAT_TOL * FLOAT_TOL
        ) {
          return
        }
        points.push(new GeometryPoint2d(point.x, point.y))
      })
    })
    return points
  }
}

function tessellateLoopEdge(
  curve: GeometryBoundaryEdgeType,
  options?: GeometryTessellateOptions
): Array<{ x: number; y: number }> {
  if (curve instanceof GeometryLine2d) {
    return curve.getPoints()
  }
  if (curve instanceof GeometryCircularArc2d) {
    return curve.tessellate(options)
  }
  const sweep = curve.closed ? TAU : curve.deltaAngle
  const n = GeometryCircularArc2d.segmentCount(
    Math.max(curve.majorAxisRadius, curve.minorAxisRadius),
    sweep,
    options
  )
  return curve.getPoints(n)
}
