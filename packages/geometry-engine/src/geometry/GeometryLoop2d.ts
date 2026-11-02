import { GeometryBox2d, GeometryMatrix2d, GeometryPoint2d } from '../math'
import { FLOAT_TOL, GeometryMathUtil, TAU } from '../util'
import { GeometryCircularArc2d } from './GeometryCircularArc2d'
import { GeometryCurve2d } from './GeometryCurve2d'
import type { GeometryTessellateOptions } from './GeometryCurveTessellate'
import { GeometryEllipseArc2d } from './GeometryEllipseArc2d'
import { GeometryLine2d } from './GeometryLine2d'
import { GeometrySpline2d } from './GeometrySpline2d'

export type GeometryBoundaryEdgeType =
  | GeometryLine2d
  | GeometryCircularArc2d
  | GeometrySpline2d
  | GeometryEllipseArc2d

/**
 * The class representing one closed loop created by connected edges, which can be line, circular arc,
 * ellipse arc, or spline.
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
   * Build loops from a list of boundary edges.
   *
   * This method greedily connects the nearest edge endpoints to form one or more
   * closed loops. If a loop cannot be closed within the given tolerance, it will
   * still return the best-effort loop with the collected edges.
   *
   * @param edges Input edges
   * @param tolerance Distance tolerance to treat two points as connected
   * @returns Loops constructed from the input edges
   */
  static buildFromEdges(
    edges: ReadonlyArray<GeometryBoundaryEdgeType>,
    tolerance = 1e-3
  ): GeometryLoop2d[] {
    if (edges.length === 0) return []

    // Work on a mutable copy so we can consume edges as we form loops.
    const remaining = [...edges]
    const loops: GeometryLoop2d[] = []
    const toleranceSq = tolerance * tolerance

    // Squared-distance check to avoid repeated sqrt calls.
    const isClose = (a: GeometryPoint2d, b: GeometryPoint2d) => {
      const dx = a.x - b.x
      const dy = a.y - b.y
      return dx * dx + dy * dy <= toleranceSq
    }

    while (remaining.length > 0) {
      const loopEdges: GeometryBoundaryEdgeType[] = []
      const current = remaining.shift() as GeometryBoundaryEdgeType
      loopEdges.push(current)

      const start = GeometryLoop2d.getEdgeStartPoint(current)
      let end = GeometryLoop2d.getEdgeEndPoint(current)

      // If the first edge is already closed, keep it as a single-edge loop.
      if (!isClose(start, end)) {
        while (remaining.length > 0) {
          // Find the closest edge endpoint to the current end point.
          const match = GeometryLoop2d.findConnectingEdge(
            remaining,
            end,
            toleranceSq
          )
          if (match.index < 0) break

          let next = remaining.splice(match.index, 1)[0]
          // Reverse the edge direction if its end is closer than its start.
          if (match.reverse) {
            next = GeometryLoop2d.reverseEdge(next)
          }
          loopEdges.push(next)
          end = GeometryLoop2d.getEdgeEndPoint(next)

          // Stop once we close the loop back to the original start.
          if (isClose(end, start)) break
        }
      }

      loops.push(new GeometryLoop2d(loopEdges))
    }

    return loops
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
   * The number of edges in this loop
   */
  get numberOfEdges() {
    return this._curves.length
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
   * Straight edges emit endpoints only. Circular arcs and splines use
   * {@link GeometryCircularArc2d.tessellate} / {@link GeometrySpline2d.tessellate}.
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

  private static findConnectingEdge(
    edges: GeometryBoundaryEdgeType[],
    target: GeometryPoint2d,
    toleranceSq: number
  ) {
    let bestIndex = -1
    let bestReverse = false
    let bestDistance = Number.POSITIVE_INFINITY

    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i]
      const start = GeometryLoop2d.getEdgeStartPoint(edge)
      const end = GeometryLoop2d.getEdgeEndPoint(edge)

      // Distance from target to edge start.
      const dxStart = target.x - start.x
      const dyStart = target.y - start.y
      const distStart = dxStart * dxStart + dyStart * dyStart

      if (distStart < bestDistance) {
        bestDistance = distStart
        bestIndex = i
        bestReverse = false
      }

      // Distance from target to edge end.
      const dxEnd = target.x - end.x
      const dyEnd = target.y - end.y
      const distEnd = dxEnd * dxEnd + dyEnd * dyEnd

      if (distEnd < bestDistance) {
        bestDistance = distEnd
        bestIndex = i
        bestReverse = true
      }
    }

    // If the closest edge is still too far away, report no match.
    if (bestDistance > toleranceSq) {
      return { index: -1, reverse: false }
    }
    return { index: bestIndex, reverse: bestReverse }
  }

  /**
   * Get the start point of an edge as a 2D point.
   * @param edge Input edge
   * @returns Start point
   */
  private static getEdgeStartPoint(edge: GeometryBoundaryEdgeType) {
    const start = edge.startPoint as GeometryPoint2d
    return new GeometryPoint2d(start.x, start.y)
  }

  /**
   * Get the end point of an edge as a 2D point.
   * @param edge Input edge
   * @returns End point
   */
  private static getEdgeEndPoint(edge: GeometryBoundaryEdgeType) {
    const end = edge.endPoint as GeometryPoint2d
    return new GeometryPoint2d(end.x, end.y)
  }

  /**
   * Reverse an edge so its start/end direction is flipped.
   * @param edge Input edge
   * @returns Reversed edge
   */
  private static reverseEdge(
    edge: GeometryBoundaryEdgeType
  ): GeometryBoundaryEdgeType {
    if (edge instanceof GeometryLine2d) {
      return new GeometryLine2d(edge.endPoint, edge.startPoint)
    }
    if (edge instanceof GeometryCircularArc2d) {
      return GeometryLoop2d.reverseCircularArcEdge(edge)
    }
    if (edge instanceof GeometryEllipseArc2d) {
      return new GeometryEllipseArc2d(
        edge.center,
        edge.majorAxisRadius,
        edge.minorAxisRadius,
        edge.endAngle,
        edge.startAngle,
        !edge.clockwise,
        edge.rotation
      )
    }
    if (edge instanceof GeometrySpline2d) {
      // Reverse spline by reversing control points and knot vector.
      return GeometryLoop2d.reverseSplineEdge(edge)
    }
    return edge
  }

  /**
   * Reverse a circular arc while preserving physical endpoints.
   *
   * `GeometryCircularArc2d` uses mirrored public angles when `clockwise` is true, so simply
   * swapping `startAngle`/`endAngle` and flipping `clockwise` produces a reflected
   * complementary arc. Rebuild from physical endpoint angles instead.
   */
  private static reverseCircularArcEdge(
    edge: GeometryCircularArc2d
  ): GeometryCircularArc2d {
    const start = edge.startPoint
    const end = edge.endPoint
    const newClockwise = !edge.clockwise
    // New start is the old end; new end is the old start.
    const physicalStartAngle = Math.atan2(
      end.y - edge.center.y,
      end.x - edge.center.x
    )
    const physicalEndAngle = Math.atan2(
      start.y - edge.center.y,
      start.x - edge.center.x
    )
    // Match GeometryCircularArc2d clockwise public-angle convention (mirror ≈ negation).
    const toPublicAngle = (angle: number) => {
      const normalized = GeometryMathUtil.normalizeAngle(angle)
      return newClockwise
        ? GeometryMathUtil.normalizeAngle(-normalized)
        : normalized
    }
    return new GeometryCircularArc2d(
      edge.center,
      edge.radius,
      toPublicAngle(physicalStartAngle),
      toPublicAngle(physicalEndAngle),
      newClockwise
    )
  }

  /**
   * Reverse a spline edge by mirroring its knots and control points.
   * @param edge Input spline edge
   * @returns Reversed spline edge
   */
  private static reverseSplineEdge(edge: GeometrySpline2d) {
    // Mirror knot values around the midpoint and reverse the order.
    const controlPoints = [...edge.controlPoints].reverse()
    const knots = edge.knots
    const knotStart = knots[0]
    const knotEnd = knots[knots.length - 1]
    const reversedKnots = knots
      .map(knot => knotStart + knotEnd - knot)
      .reverse()
    const weights = edge.weights
    const reversedWeights =
      weights.length > 0 ? [...weights].reverse() : undefined
    return new GeometrySpline2d(
      controlPoints,
      reversedKnots,
      reversedWeights,
      edge.degree,
      edge.closed
    )
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
  if (curve instanceof GeometrySpline2d) {
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
