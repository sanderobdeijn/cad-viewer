import {
  AcGeBox2d,
  AcGeMatrix2d,
  AcGeMatrix3d,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGePoint3dLike,
  AcGeVector2dLike
} from '../math'
import { AcGeCurve2d } from './AcGeCurve2d'
import type { AcGeTessellateOptions } from './AcGeCurveTessellate'
import { AcGeKnotParameterizationType } from './AcGeNurbsCurve'
import { AcGeSpline3d } from './AcGeSpline3d'

const toPoint3dLike = (point: AcGePoint2dLike): AcGePoint3dLike => ({
  x: point.x,
  y: point.y,
  z: 0
})

const toPoint2d = (point: AcGePoint2dLike) => new AcGePoint2d(point.x, point.y)

/**
 * Spline curve in the XY plane.
 *
 * Exposes 2D points only. The NURBS evaluation, fitting and offset sampling are
 * shared with {@link AcGeSpline3d}, which is held with every Z set to 0.
 */
export class AcGeSpline2d extends AcGeCurve2d {
  private _spline: AcGeSpline3d

  constructor(
    controlPoints: AcGePoint2dLike[],
    knots: number[],
    weights?: number[],
    degree?: number,
    closed?: boolean
  )
  constructor(
    fitPoints: AcGePoint2dLike[],
    knotParam: AcGeKnotParameterizationType,
    degree?: number,
    closed?: boolean
  )
  constructor(spline: AcGeSpline3d)
  constructor(a: unknown, b?: unknown, c?: unknown, d?: unknown, e?: unknown) {
    super()
    if (a instanceof AcGeSpline3d) {
      this._spline = a
      return
    }
    const points = (a as AcGePoint2dLike[]).map(toPoint3dLike)
    if (Array.isArray(b)) {
      this._spline = new AcGeSpline3d(
        points,
        b as number[],
        c as number[] | undefined,
        d as number | undefined,
        e as boolean | undefined
      )
    } else {
      this._spline = new AcGeSpline3d(
        points,
        b as AcGeKnotParameterizationType,
        c as number | undefined,
        d as boolean | undefined
      )
    }
  }

  /**
   * Creates a spline from control points, or `null` when they are invalid.
   */
  static fromControlPoints(
    controlPoints: AcGePoint2dLike[],
    knots: number[],
    weights: number[] | undefined,
    degree: number | undefined,
    closed: boolean
  ): AcGeSpline2d | null {
    const spline = AcGeSpline3d.fromControlPoints(
      controlPoints.map(toPoint3dLike),
      knots,
      weights,
      degree,
      closed
    )
    return spline ? new AcGeSpline2d(spline) : null
  }

  /**
   * Creates a spline through fit points, or `null` when they are invalid.
   */
  static fromFitPoints(
    fitPoints: AcGePoint2dLike[],
    knotParam: AcGeKnotParameterizationType,
    degree: number | undefined,
    closed: boolean,
    startTangent?: AcGePoint2dLike | null,
    endTangent?: AcGePoint2dLike | null
  ): AcGeSpline2d | null {
    const spline = AcGeSpline3d.fromFitPoints(
      fitPoints.map(toPoint3dLike),
      knotParam,
      degree,
      closed,
      startTangent ? toPoint3dLike(startTangent) : startTangent,
      endTangent ? toPoint3dLike(endTangent) : endTangent
    )
    return spline ? new AcGeSpline2d(spline) : null
  }

  /** Copy of this spline as an {@link AcGeSpline3d} with Z set to 0. */
  to3d(): AcGeSpline3d {
    return this._spline.clone()
  }

  get degree() {
    return this._spline.degree
  }

  get knotParameterization() {
    return this._spline.knotParameterization
  }

  get controlPoints(): AcGePoint2d[] {
    return this._spline.controlPoints.map(toPoint2d)
  }

  get fitPoints(): AcGePoint2d[] | undefined {
    return this._spline.fitPoints?.map(toPoint2d)
  }

  get knots() {
    return this._spline.knots
  }

  get weights() {
    return this._spline.weights
  }

  override get startPoint(): AcGePoint2d {
    return toPoint2d(this._spline.startPoint)
  }

  override get endPoint(): AcGePoint2d {
    return toPoint2d(this._spline.endPoint)
  }

  override get length() {
    return this._spline.length
  }

  get closed() {
    return this._spline.closed
  }

  set closed(value: boolean) {
    this._spline.closed = value
  }

  get area(): number {
    return this._spline.area
  }

  override getPoint(t: number): AcGePoint2d {
    const knots = this._spline.knots
    const first = knots[0] ?? 0
    const last = knots[knots.length - 1] ?? 1
    return toPoint2d(this._spline.evaluateAt(first + (last - first) * t))
  }

  evaluateAt(t: number): AcGePoint2d {
    return toPoint2d(this._spline.evaluateAt(t))
  }

  nearestPoint(point: AcGePoint2dLike, samples = 64): AcGePoint2d {
    return toPoint2d(this._spline.nearestPoint(toPoint3dLike(point), samples))
  }

  getGripPoints(): AcGePoint2d[] {
    return this._spline.getGripPoints().map(toPoint2d)
  }

  moveGripPointsAt(indices: readonly number[], offset: AcGeVector2dLike) {
    this._spline.moveGripPointsAt(indices, toPoint3dLike(offset))
    this._boundingBoxNeedsUpdate = true
    return this
  }

  override getPoints(numPoints: number = 100): AcGePoint2d[] {
    return this._spline.getPoints(numPoints).map(toPoint2d)
  }

  tessellate(options?: AcGeTessellateOptions): AcGePoint2d[] {
    return this._spline.tessellate(options).map(toPoint2d)
  }

  getOffsetSamplePath2d(offsetDist: number) {
    return this._spline.getOffsetSamplePath2d(offsetDist)
  }

  calculateBoundingBox(): AcGeBox2d {
    const box = this._spline.box
    return new AcGeBox2d(
      { x: box.min.x, y: box.min.y },
      { x: box.max.x, y: box.max.y }
    )
  }

  transform(matrix: AcGeMatrix2d) {
    return this.transform3d(new AcGeMatrix3d().setFromMatrix3(matrix))
  }

  /** Applies a 3D matrix, keeping the XY part of the result. */
  transform3d(matrix: AcGeMatrix3d) {
    const flat = matrix.clone()
    // Zero the Z output row so held points stay at Z = 0.
    flat.elements[2] = 0
    flat.elements[6] = 0
    flat.elements[14] = 0
    this._spline.transform(flat)
    this._boundingBoxNeedsUpdate = true
    return this
  }

  clone() {
    return new AcGeSpline2d(this._spline.clone())
  }
}
