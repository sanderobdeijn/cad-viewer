import {
  GeometryBox2d,
  GeometryMatrix2d,
  GeometryPoint2d,
  GeometryPoint2dLike,
  GeometryVector2d
} from '../math'
import { GeometryCurve2d } from './GeometryCurve2d'

/**
 * The class represents one 2d line geometry specified by its start point and end point.
 */
export class GeometryLine2d extends GeometryCurve2d {
  private _start: GeometryPoint2d
  private _end: GeometryPoint2d
  /**
   * This constructor initializes the line object to use start as the start point, and end
   * as the endpoint. Both points must be in WCS coordinates. The ids of the
   * points are kept.
   */
  constructor(start: GeometryPoint2dLike, end: GeometryPoint2dLike) {
    super()
    this._start = GeometryPoint2d.from(start)
    this._end = GeometryPoint2d.from(end)
  }

  /**
   * The line's startpoint in WCS coordinates
   * @returns Return the line's startpoint in WCS coordinates.
   */
  get startPoint(): GeometryPoint2d {
    return this._start
  }
  set startPoint(value: GeometryPoint2dLike) {
    this._start.copy(value)
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * The line's endpoint in WCS coordinates
   * @returns Return the line's endpoint in WCS coordinates.
   */
  get endPoint(): GeometryPoint2d {
    return this._end
  }
  set endPoint(value: GeometryPoint2dLike) {
    this._end.copy(value)
    this._boundingBoxNeedsUpdate = true
  }

  /** Middle point of the line. */
  get midPoint(): GeometryPoint2d {
    return new GeometryPoint2d(
      (this._start.x + this._end.x) / 2,
      (this._start.y + this._end.y) / 2
    )
  }

  /**
   * Returns the line offset to the left of its direction by `offsetDist`.
   */
  offset(offsetDist: number): GeometryLine2d {
    const dx = this._end.x - this._start.x
    const dy = this._end.y - this._start.y
    const length = Math.hypot(dx, dy)
    if (length === 0) return this.clone()
    const nx = (-dy / length) * offsetDist
    const ny = (dx / length) * offsetDist
    return new GeometryLine2d(
      { x: this._start.x + nx, y: this._start.y + ny },
      { x: this._end.x + nx, y: this._end.y + ny }
    )
  }

  /**
   * Convert line to a point array with start point and end point.
   * @returns Return an array of point
   */
  getPoints(): GeometryPoint2d[] {
    return [this.startPoint, this.endPoint]
  }

  /**
   * Normalized direction vector of this line
   */
  get direction() {
    return new GeometryVector2d(this._end).sub(this._start).normalize()
  }

  /**
   * Finds the point on the infinite line that is perpendicular to the given point.
   * @param point Input one point
   * @returns Return the point on the line that is the closest to the given point.
   */
  perpPoint(point: GeometryPoint2dLike) {
    const direction = this.direction
    const length =
      (point.x - this._start.x) * direction.x +
      (point.y - this._start.y) * direction.y
    return new GeometryPoint2d(this._start).addScaledVector(direction, length)
  }

  /**
   * Extend this line with the specified length
   * @param length Input the length of extension
   * @param inversed Input true to extend past the start point, or false to extend past the end point
   */
  extend(length: number, inversed: boolean = false) {
    const direction = this.direction
    if (inversed) {
      this._start = this._start.clone().addScaledVector(
        direction,
        -length
      )
    } else {
      this._end = this._end.clone().addScaledVector(
        direction,
        length
      )
    }
    this._boundingBoxNeedsUpdate = true
    return this
  }

  /**
   * @inheritdoc
   */
  get length() {
    return this.startPoint.distanceTo(this.endPoint)
  }

  /**
   * @inheritdoc
   */
  calculateBoundingBox(): GeometryBox2d {
    const min = new GeometryPoint2d(
      Math.min(this._start.x, this._end.x),
      Math.min(this._start.y, this._end.y)
    )
    const max = new GeometryPoint2d(
      Math.max(this._start.x, this._end.x),
      Math.max(this._start.y, this._end.y)
    )
    return new GeometryBox2d(min, max)
  }

  /**
   * @inheritdoc
   */
  transform(matrix: GeometryMatrix2d) {
    this._start.applyMatrix2d(matrix)
    this._end.applyMatrix2d(matrix)
    this._boundingBoxNeedsUpdate = true
    return this
  }

  /**
   * @inheritdoc
   */
  get closed(): boolean {
    return false
  }

  /**
   * @inheritdoc
   */
  copy(value: GeometryLine2d) {
    this.startPoint = value.startPoint
    this.endPoint = value.endPoint
    this._boundingBoxNeedsUpdate = true
    return this
  }

  /**
   * @inheritdoc
   */
  clone() {
    return new GeometryLine2d(this._start.clone(), this._end.clone())
  }

  /**
   * Projects a point onto the infinite line containing this segment, then clamps
   * to the segment endpoints.
   *
   * @param pt - Point to project (WCS, XY).
   * @returns Closest point on the segment.
   */
  project(pt: GeometryPoint2dLike): GeometryPoint2d {
    const dx = this._end.x - this._start.x
    const dy = this._end.y - this._start.y
    const lenSq = dx * dx + dy * dy
    if (lenSq < 1e-18) {
      return this._start.clone()
    }
    let t = ((pt.x - this._start.x) * dx + (pt.y - this._start.y) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
    return new GeometryPoint2d(this._start.x + t * dx, this._start.y + t * dy)
  }

  /**
   * Returns the nearest point on this segment to the given point.
   *
   * @param point - Query point in WCS.
   * @returns Same as {@link GeometryLine2d.project}.
   */
  nearestPoint(point: GeometryPoint2dLike): GeometryPoint2d {
    return this.project(point)
  }
}
