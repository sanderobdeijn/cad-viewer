import { AcCmErrors } from '@mlightcad/common'

import {
  GeometryBox2d,
  GeometryMatrix2d,
  GeometryPoint2d,
  GeometryPoint2dLike,
  GeometryVector2d
} from '../math'
import { FLOAT_TOL, geometryClamp, GeometryMathUtil, TAU } from '../util'
import {
  geometryTryCreateArcByCenterStartChord,
  geometryTryCreateArcByCenterStartEnd,
  geometryTryCreateArcByCenterStartProjectedEnd,
  geometryTryCreateArcByCenterStartSweep,
  geometryTryCreateArcByStartEndAngle,
  geometryTryCreateArcByStartEndDirection,
  geometryTryCreateArcByStartEndRadius,
  geometryTryCreateArcByThreePoints,
  geometryTryCreateCircle,
  geometryTryCreateCircleByDiameter,
  geometryTryCreateCircleByThreePoints,
  geometryTryCreateShorterArc
} from './GeometryCircularArc2dFactory'
import {
  type GeometryCircumcircle2d,
  geometryComputeCircumcircle2d,
  geometryIsBetterDistanceAlign,
  geometryPointLiesOnCircle2d,
  geometryProjectPointOntoCircle2d,
  geometrySameCircle2d
} from './GeometryCircularArcUtil'
import { GeometryCurve2d } from './GeometryCurve2d'
import type {
  GeometryResolvedTessellateOptions,
  GeometryTessellateOptions
} from './GeometryCurveTessellate'

/**
 * Represent a circular arc.
 *
 * The angle system behavior depends on the clockwise property:
 * - If clockwise = false (counterclockwise): Angles are stored in normal mathematical sense
 *   (0° = +X axis, 90° = +Y axis, 180° = -X axis, 270° = -Y axis)
 * - If clockwise = true: Angles are stored in a mirrored system where positive angles go clockwise
 *   (0° = +X axis, 270° = +Y axis, 180° = -X axis, 90° = -Y axis)
 *
 * This means a "90° above X axis" in counterclockwise mode becomes "270°" in clockwise mode.
 */
export class GeometryCircularArc2d extends GeometryCurve2d {
  /**
   * Default tessellation side count for a full circle.
   * Matches the historical `getPoints(100)` sampling path.
   */
  static readonly DEFAULT_CIRCLE_SIDES = 100
  /** Lower bound for {@link GeometryTessellateOptions.circleSides}. */
  static readonly MIN_CIRCLE_SIDES = 8
  /** Upper bound for {@link GeometryTessellateOptions.circleSides} (DXF VPORT range). */
  static readonly MAX_CIRCLE_SIDES = 20000

  private _center!: GeometryPoint2d
  private _radius!: number
  private _startAngle!: number
  private _endAngle!: number
  private _clockwise!: boolean

  constructor(
    p1: GeometryPoint2dLike,
    p2: GeometryPoint2dLike,
    p3: GeometryPoint2dLike
  )
  constructor(
    start: GeometryPoint2dLike,
    end: GeometryPoint2dLike,
    bulge: number
  )
  constructor(
    center: GeometryPoint2dLike,
    radius: number,
    startAngle: number,
    endAngle: number,
    clockwise: boolean
  )
  constructor(a?: unknown, b?: unknown, c?: unknown, d?: unknown, e?: unknown) {
    super()
    const argsLength =
      +(a !== undefined) +
      +(b !== undefined) +
      +(c !== undefined) +
      +(d !== undefined) +
      +(e !== undefined)
    if (argsLength == 3) {
      if (
        typeof a == 'object' &&
        typeof b == 'object' &&
        typeof c == 'object'
      ) {
        this.createByThreePoints(
          a as GeometryPoint2dLike,
          b as GeometryPoint2dLike,
          c as GeometryPoint2dLike
        )
      } else {
        this.createByStartEndPointsAndBulge(
          a as GeometryPoint2dLike,
          b as GeometryPoint2dLike,
          c as number
        )
      }
    } else if (argsLength == 5) {
      const center = a as GeometryPoint2dLike
      this.center = new GeometryPoint2d(center.x, center.y)
      this.radius = b as number
      this._clockwise = e as boolean
      // Store internal angles (unmirrored)
      this._startAngle = this._clockwise
        ? this._mirrorAngle(GeometryMathUtil.normalizeAngle(c as number))
        : GeometryMathUtil.normalizeAngle(c as number)
      this._endAngle = this._clockwise
        ? this._mirrorAngle(GeometryMathUtil.normalizeAngle(d as number))
        : GeometryMathUtil.normalizeAngle(d as number)
    } else {
      throw AcCmErrors.ILLEGAL_PARAMETERS
    }
  }

  /**
   * Create an arc from mathematical (unmirrored) polar angles.
   *
   * `startAngle` / `endAngle` are `atan2` angles in the XY plane (0 = +X,
   * 90° = +Y). This differs from the five-argument constructor, whose angles
   * are mirrored when `clockwise` is true.
   *
   * @param center Input arc center
   * @param radius Input arc radius
   * @param startAngle Input start angle in radians (`atan2`)
   * @param endAngle Input end angle in radians (`atan2`)
   * @param clockwise Input true to sweep clockwise from start to end
   */
  static fromMathAngles(
    center: GeometryPoint2dLike,
    radius: number,
    startAngle: number,
    endAngle: number,
    clockwise: boolean
  ): GeometryCircularArc2d {
    const arc = new GeometryCircularArc2d(
      center,
      radius,
      GeometryMathUtil.normalizeAngle(startAngle),
      GeometryMathUtil.normalizeAngle(endAngle),
      false
    )
    arc._clockwise = clockwise
    arc._boundingBoxNeedsUpdate = true
    return arc
  }

  /**
   * Return the circumcircle of three XY points, or `null` when they are collinear.
   */
  static computeCircumcircle(
    p1: GeometryPoint2dLike,
    p2: GeometryPoint2dLike,
    p3: GeometryPoint2dLike
  ): GeometryCircumcircle2d | null {
    return geometryComputeCircumcircle2d(p1, p2, p3)
  }

  /**
   * Project `point` radially onto the circle `(center, radius)`.
   */
  static projectPoint(
    center: GeometryPoint2dLike,
    radius: number,
    point: GeometryPoint2dLike
  ) {
    return geometryProjectPointOntoCircle2d(center, radius, point)
  }

  /**
   * True when `point` lies on the circle `(center, radius)` within a radial
   * tolerance (default `max(1e-6, radius * 1e-5)`).
   */
  static pointLiesOnCircle(
    point: GeometryPoint2dLike,
    center: GeometryPoint2dLike,
    radius: number,
    eps?: number
  ): boolean {
    return geometryPointLiesOnCircle2d(point, center, radius, eps)
  }

  /**
   * True when two circles share the same center and radius within `eps`
   * (default `1e-8`).
   */
  static sameCircle(
    center1: GeometryPoint2dLike,
    radius1: number,
    center2: GeometryPoint2dLike,
    radius2: number,
    eps?: number
  ): boolean {
    return geometrySameCircle2d(center1, radius1, center2, radius2, eps)
  }

  /**
   * Lexicographic pick among nearest-point candidates: smaller `distSq` wins;
   * on a near-tie, larger `align` wins.
   */
  static isBetterDistanceAlign(
    distSq: number,
    align: number,
    bestDistSq: number,
    bestAlign: number
  ): boolean {
    return geometryIsBetterDistanceAlign(distSq, align, bestDistSq, bestAlign)
  }

  /**
   * Create the unique arc from `start` through `through` to `end`.
   *
   * The through point selects the major or minor sweep, including arcs greater
   * than 180°. Return `null` when the points are collinear.
   *
   * @param reverseDirection Input true to take the complementary sweep
   */
  static tryCreateByThreePoints(
    start: GeometryPoint2dLike,
    through: GeometryPoint2dLike,
    end: GeometryPoint2dLike,
    reverseDirection: boolean = false
  ): GeometryCircularArc2d | null {
    return geometryTryCreateArcByThreePoints(
      start,
      through,
      end,
      reverseDirection
    )
  }

  /**
   * Create a full circle from center and radius.
   */
  static tryCreateCircle(center: GeometryPoint2dLike, radius: number) {
    return geometryTryCreateCircle(center, radius)
  }

  /**
   * Create a full circle whose diameter is the segment `p1`–`p2`.
   */
  static tryCreateCircleByDiameter(
    p1: GeometryPoint2dLike,
    p2: GeometryPoint2dLike
  ) {
    return geometryTryCreateCircleByDiameter(p1, p2)
  }

  /**
   * Create a full circle through three non-collinear points.
   */
  static tryCreateCircleByThreePoints(
    p1: GeometryPoint2dLike,
    p2: GeometryPoint2dLike,
    p3: GeometryPoint2dLike
  ) {
    return geometryTryCreateCircleByThreePoints(p1, p2, p3)
  }

  /**
   * Create the shorter arc from `start` to `end` on the circle at `center`.
   */
  static tryCreateShorterArc(
    start: GeometryPoint2dLike,
    end: GeometryPoint2dLike,
    center: GeometryPoint2dLike
  ) {
    return geometryTryCreateShorterArc(start, end, center)
  }

  /**
   * Create an arc from center, start, and end with an explicit orientation.
   */
  static tryCreateByCenterStartEnd(
    center: GeometryPoint2dLike,
    start: GeometryPoint2dLike,
    end: GeometryPoint2dLike,
    clockwise: boolean
  ) {
    return geometryTryCreateArcByCenterStartEnd(center, start, end, clockwise)
  }

  /**
   * Create a center-start arc whose end is the radial projection of `rawEnd`.
   */
  static tryCreateByCenterStartProjectedEnd(
    center: GeometryPoint2dLike,
    start: GeometryPoint2dLike,
    rawEnd: GeometryPoint2dLike,
    clockwise: boolean
  ) {
    return geometryTryCreateArcByCenterStartProjectedEnd(
      center,
      start,
      rawEnd,
      clockwise
    )
  }

  /**
   * Create a center-start arc from a signed included angle.
   * Positive sweep is counterclockwise.
   */
  static tryCreateByCenterStartSweep(
    center: GeometryPoint2dLike,
    start: GeometryPoint2dLike,
    sweepRad: number
  ) {
    return geometryTryCreateArcByCenterStartSweep(center, start, sweepRad)
  }

  /**
   * Create a center-start arc from a signed chord length.
   */
  static tryCreateByCenterStartChord(
    center: GeometryPoint2dLike,
    start: GeometryPoint2dLike,
    chordLength: number
  ) {
    return geometryTryCreateArcByCenterStartChord(center, start, chordLength)
  }

  /**
   * Create a start-end arc from a signed included angle.
   * Positive sweep is counterclockwise.
   */
  static tryCreateByStartEndAngle(
    start: GeometryPoint2dLike,
    end: GeometryPoint2dLike,
    sweepRad: number
  ) {
    return geometryTryCreateArcByStartEndAngle(start, end, sweepRad)
  }

  /**
   * Create a start-end arc from a tangent direction at the start point.
   */
  static tryCreateByStartEndDirection(
    start: GeometryPoint2dLike,
    end: GeometryPoint2dLike,
    directionRad: number
  ) {
    return geometryTryCreateArcByStartEndDirection(start, end, directionRad)
  }

  /**
   * Create a start-end arc from a signed radius.
   * Positive radius is counterclockwise.
   */
  static tryCreateByStartEndRadius(
    start: GeometryPoint2dLike,
    end: GeometryPoint2dLike,
    radius: number
  ) {
    return geometryTryCreateArcByStartEndRadius(start, end, radius)
  }

  /**
   * Create arc by three points
   * @param p1 Input the start point
   * @param p2 Input one point between the start point and the end point
   * @param p3 Input the end point
   */
  private createByThreePoints(
    p1: GeometryPoint2dLike,
    p2: GeometryPoint2dLike,
    p3: GeometryPoint2dLike
  ) {
    const arc = geometryTryCreateArcByThreePoints(p1, p2, p3)
    if (!arc) throw AcCmErrors.ILLEGAL_PARAMETERS
    this.center = arc.center
    this.radius = arc.radius
    this._clockwise = arc._clockwise
    this._startAngle = arc._startAngle
    this._endAngle = arc._endAngle
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Create circular arc by two points and one bugle factor
   * @param from Input start point
   * @param to Input end point
   * @param bulge Input the bulge factor used to indicate how much of an arc segment is present at this
   * vertex. The bulge factor is the tangent of one fourth the included angle for an arc segment, made
   * negative if the arc goes clockwise from the start point to the endpoint. A bulge of 0 indicates a
   * straight segment, and a bulge of 1 is a semicircle. Get more details from the following links.
   * - https://ezdxf.readthedocs.io/en/stable/dxfentities/lwpolyline.html
   * - https://www.afralisp.net/archive/lisp/Bulges1.htm
   */
  private createByStartEndPointsAndBulge(
    from: GeometryPoint2dLike,
    to: GeometryPoint2dLike,
    bulge: number
  ) {
    let theta: number
    let a: GeometryVector2d
    let b: GeometryVector2d

    if (bulge < 0) {
      theta = Math.atan(-bulge) * 4
      a = new GeometryVector2d(from)
      b = new GeometryVector2d(to)
    } else {
      // Default is counter-clockwise
      theta = Math.atan(bulge) * 4
      a = new GeometryVector2d(to)
      b = new GeometryVector2d(from)
    }

    const ab = new GeometryVector2d().subVectors(b, a)
    const lengthAB = ab.length()
    const c = new GeometryVector2d().addVectors(a, ab.multiplyScalar(0.5))

    // Distance from center of arc to line between form and to points
    const lengthCD = Math.abs(lengthAB / 2 / Math.tan(theta / 2))
    const normAB = ab.normalize()

    // Calculate perpendicular vector: counter-clockwise for positive bulge, clockwise for negative bulge
    const angle = bulge < 0 ? -Math.PI / 2 : Math.PI / 2
    const normPerp = new GeometryVector2d(
      normAB.x * Math.cos(angle) - normAB.y * Math.sin(angle),
      normAB.y * Math.cos(angle) + normAB.x * Math.sin(angle)
    )

    let d: GeometryVector2d
    if (theta < Math.PI) {
      // d is the center of the arc
      if (bulge < 0) {
        d = c.add(normPerp.multiplyScalar(lengthCD))
      } else {
        d = c.add(normPerp.multiplyScalar(-lengthCD))
      }
    } else {
      // d is the center of the arc
      if (bulge < 0) {
        d = c.add(normPerp.multiplyScalar(-lengthCD))
      } else {
        d = c.add(normPerp.multiplyScalar(lengthCD))
      }
    }

    // Add points between start start and eng angle relative
    // to the center point
    if (bulge < 0) {
      this._startAngle = Math.atan2(a.y - d.y, a.x - d.x)
      this._endAngle = Math.atan2(b.y - d.y, b.x - d.x)
    } else {
      this._startAngle = Math.atan2(b.y - d.y, b.x - d.x)
      this._endAngle = Math.atan2(a.y - d.y, a.x - d.x)
    }
    this._clockwise = bulge < 0
    this.center = d
    this.radius = b.sub(d).length()
  }

  /**
   * Center of circular arc
   */
  get center(): GeometryPoint2d {
    return this._center
  }
  set center(value: GeometryPoint2dLike) {
    this._center = new GeometryPoint2d(value.x, value.y)
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Radius of circular arc
   */
  get radius(): number {
    return this._radius
  }
  set radius(value: number) {
    this._radius = value
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Start angle in radians of circular arc in the range 0 to 2 * PI.
   * If clockwise=true, angles are mirrored (0 = +X, 270° = +Y, 180° = -X, 90° = -Y).
   * If clockwise=false, angles are in normal mathematical sense (0 = +X, 90° = +Y, 180° = -X, 270° = -Y).
   */
  get startAngle(): number {
    return this._clockwise
      ? this._mirrorAngle(this._startAngle)
      : this._startAngle
  }
  set startAngle(value: number) {
    this._startAngle = this._clockwise
      ? this._mirrorAngle(GeometryMathUtil.normalizeAngle(value))
      : GeometryMathUtil.normalizeAngle(value)
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * End angle in radians of circular arc in the range 0 to 2 * PI.
   * If clockwise=true, angles are mirrored (0 = +X, 270° = +Y, 180° = -X, 90° = -Y).
   * If clockwise=false, angles are in normal mathematical sense (0 = +X, 90° = +Y, 180° = -X, 270° = -Y).
   */
  get endAngle(): number {
    return this._clockwise ? this._mirrorAngle(this._endAngle) : this._endAngle
  }
  set endAngle(value: number) {
    const normalizedValue =
      this.startAngle == 0 && value == TAU
        ? value
        : GeometryMathUtil.normalizeAngle(value)
    this._endAngle = this._clockwise
      ? this._mirrorAngle(normalizedValue)
      : normalizedValue
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Mirror an angle for clockwise mode: 0° stays 0°, 90° becomes 270°, 180° stays 180°, 270° becomes 90°
   * @param angle Input angle in radians
   * @returns Mirrored angle in radians
   */
  private _mirrorAngle(angle: number): number {
    // Convert to degrees for easier calculation
    const degrees = (angle * 180) / Math.PI
    // Mirror: 0°→0°, 90°→270°, 180°→180°, 270°→90°
    const mirroredDegrees = (360 - degrees) % 360
    return (mirroredDegrees * Math.PI) / 180
  }

  /**
   * Get the internal (unmirrored) angle for calculations
   * @param angle Input angle (may be mirrored)
   * @returns Internal angle for calculations
   */
  private _getInternalAngle(angle: number): number {
    return this._clockwise ? this._mirrorAngle(angle) : angle
  }

  /**
   * Angle between endAngle and startAngle in range 0 to 2*PI
   */
  get deltaAngle() {
    const internalStartAngle = this._getInternalAngle(this.startAngle)
    const internalEndAngle = this._getInternalAngle(this.endAngle)
    return this.clockwise
      ? GeometryMathUtil.normalizeAngle(internalStartAngle - internalEndAngle)
      : GeometryMathUtil.normalizeAngle(internalEndAngle - internalStartAngle)
  }

  /**
   * Rotation direction of the arc.
   */
  get clockwise() {
    return this._clockwise
  }
  set clockwise(value: boolean) {
    this._clockwise = value
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * Start point of circular arc
   */
  get startPoint(): GeometryPoint2d {
    return this.getPointAtAngle(this.startAngle)
  }

  /**
   * End point of circular arc
   */
  get endPoint(): GeometryPoint2d {
    return this.getPointAtAngle(this.endAngle)
  }

  /**
   * Middle point of circular arc
   */
  get midPoint(): GeometryPoint2d {
    const internalStartAngle = this._getInternalAngle(this.startAngle)
    const internalMidAngle = this._clockwise
      ? GeometryMathUtil.normalizeAngle(
          internalStartAngle - this.deltaAngle / 2
        )
      : GeometryMathUtil.normalizeAngle(
          internalStartAngle + this.deltaAngle / 2
        )
    const midAngle = this._clockwise
      ? this._mirrorAngle(internalMidAngle)
      : internalMidAngle
    return this.getPointAtAngle(midAngle)
  }

  /**
   * The area enclosed by this curve. Open arcs return `0`.
   */
  get area(): number {
    return this.closed ? Math.PI * this.radius * this.radius : 0
  }

  /**
   * Returns a concentric copy with radius adjusted by `offsetDist`.
   *
   * @param offsetDist - Signed offset distance in drawing units
   * @returns Offset arc, or `null` when the resulting radius is not positive
   */
  offset(offsetDist: number): GeometryCircularArc2d | null {
    const radius = this.radius + offsetDist
    if (radius <= 0) return null
    return new GeometryCircularArc2d(
      this.center.clone(),
      radius,
      this._startAngle,
      this._endAngle,
      this.clockwise
    )
  }

  /**
   * Return true if its start point is identical to its end point. Otherwise, return false.
   */
  get closed() {
    const internalStartAngle = this._getInternalAngle(this.startAngle)
    const internalEndAngle = this._getInternalAngle(this.endAngle)
    return (Math.abs(internalEndAngle - internalStartAngle) / Math.PI) % 2 == 0
  }

  /**
   * @inheritdoc
   */
  calculateBoundingBox(): GeometryBox2d {
    const points = [this.startPoint, this.endPoint]

    const criticalAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]
    for (const angle of criticalAngles) {
      const internalAngle = this._getInternalAngle(angle)
      if (
        GeometryMathUtil.isBetweenAngle(
          internalAngle,
          this._getInternalAngle(this.startAngle),
          this._getInternalAngle(this.endAngle),
          this.clockwise
        )
      ) {
        points.push(this.getPointAtAngle(angle))
      }
    }

    const xValues = points.map(p => p.x)
    const yValues = points.map(p => p.y)

    return new GeometryBox2d(
      new GeometryPoint2d(Math.min(...xValues), Math.min(...yValues)),
      new GeometryPoint2d(Math.max(...xValues), Math.max(...yValues))
    )
  }

  /**
   * Get length of circular arc
   */
  get length() {
    if (this.closed) return TAU * this.radius
    return Math.abs(this.deltaAngle * this.radius)
  }

  /**
   * @inheritdoc
   */
  transform(_matrix: GeometryMatrix2d) {
    const matrix = _matrix
    const transformedCenter = this.center.clone().applyMatrix2d(matrix)
    const transformedStart = this.startPoint.clone().applyMatrix2d(matrix)

    if (this.closed) {
      this.center = transformedCenter
      this.radius = transformedCenter.distanceTo(transformedStart)
      this._startAngle = Math.atan2(
        transformedStart.y - transformedCenter.y,
        transformedStart.x - transformedCenter.x
      )
      this._endAngle = this._startAngle
      this._clockwise =
        matrix.determinant() < 0 ? !this._clockwise : this._clockwise
      this._boundingBoxNeedsUpdate = true
      return this
    }

    const transformedMid = this.midPoint.clone().applyMatrix2d(matrix)
    const transformedEnd = this.endPoint.clone().applyMatrix2d(matrix)
    const transformedArc = new GeometryCircularArc2d(
      transformedStart,
      transformedMid,
      transformedEnd
    )
    const clockwise =
      matrix.determinant() < 0 ? !this.clockwise : this.clockwise
    const toPublicAngle = (angle: number) => {
      const normalized = GeometryMathUtil.normalizeAngle(angle)
      return clockwise ? this._mirrorAngle(normalized) : normalized
    }

    this.center = transformedArc.center
    this.radius = transformedArc.radius
    this.clockwise = clockwise
    this.startAngle = toPublicAngle(
      Math.atan2(
        transformedStart.y - transformedArc.center.y,
        transformedStart.x - transformedArc.center.x
      )
    )
    this.endAngle = toPublicAngle(
      Math.atan2(
        transformedEnd.y - transformedArc.center.y,
        transformedEnd.x - transformedArc.center.x
      )
    )
    this._boundingBoxNeedsUpdate = true
    return this
  }

  /**
   * @inheritdoc
   */
  clone() {
    // The stored angles are `atan2` angles. The five-argument constructor
    // mirrors its angles for a clockwise arc, so build the copy as
    // counter-clockwise and set the direction afterwards.
    const arc = new GeometryCircularArc2d(
      this.center.clone(),
      this.radius,
      this._startAngle,
      this._endAngle,
      false
    )
    arc._clockwise = this._clockwise
    arc._boundingBoxNeedsUpdate = true
    return arc
  }

  /**
   * Calculate a point on the ellipse at a given angle.
   * @param angle Input the angle in radians where the point is to be calculated.
   * @returns Return the 2d coordinates of the point on the circular arc.
   */
  getPointAtAngle(angle: number): GeometryPoint2d {
    const internalAngle = this._getInternalAngle(angle)
    const x = this.center.x + this.radius * Math.cos(internalAngle)
    const y = this.center.y + this.radius * Math.sin(internalAngle)
    return new GeometryPoint2d(x, y)
  }

  /**
   * Returns quadrant snap points (0°, 90°, 180°, 270°) that lie on this arc.
   * For a full circle, all four points are returned.
   */
  getQuadrantPoints(): GeometryPoint2d[] {
    const points: GeometryPoint2d[] = []
    const internalStart = this._getInternalAngle(this.startAngle)
    const internalEnd = this._getInternalAngle(this.endAngle)
    const criticalAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]
    for (const angle of criticalAngles) {
      const internalAngle = this._getInternalAngle(angle)
      if (
        GeometryMathUtil.isBetweenAngle(
          internalAngle,
          internalStart,
          internalEnd,
          this.clockwise
        )
      ) {
        points.push(this.getPointAtAngle(angle))
      }
    }
    return points
  }

  /**
   * Returns the nearest point on this arc (or full circle) to the given point.
   *
   * @param point - Query point in WCS (XY).
   */
  nearestPoint(point: GeometryPoint2dLike): GeometryPoint2d {
    const p = new GeometryPoint2d(point.x, point.y)
    const dx = p.x - this.center.x
    const dy = p.y - this.center.y
    const dist = Math.hypot(dx, dy)
    if (dist < 1e-12) {
      return this.startPoint.clone()
    }

    const theta = Math.atan2(dy, dx)
    const publicAngle = this.clockwise
      ? this._mirrorAngle(GeometryMathUtil.normalizeAngle(theta))
      : GeometryMathUtil.normalizeAngle(theta)
    const internalAngle = this._getInternalAngle(publicAngle)
    const internalStart = this._getInternalAngle(this.startAngle)
    const internalEnd = this._getInternalAngle(this.endAngle)

    if (
      GeometryMathUtil.isBetweenAngle(
        internalAngle,
        internalStart,
        internalEnd,
        this.clockwise
      )
    ) {
      return this.getPointAtAngle(publicAngle)
    }

    const dStart = p.distanceToSquared(this.startPoint)
    const dEnd = p.distanceToSquared(this.endPoint)
    return dStart <= dEnd ? this.startPoint.clone() : this.endPoint.clone()
  }

  /**
   * How much `query - onCurve` points into this circular arc.
   *
   * Zero when `onCurve` is not an endpoint (within a relative tolerance), or
   * when `query` coincides with `onCurve`. A positive value means `query` lies
   * on this arc's interior side of `onCurve` — useful when two arcs share a
   * vertex and nearest-point distances are equal.
   */
  inwardAlignment(
    onCurve: GeometryPoint2dLike,
    query: GeometryPoint2dLike
  ): number {
    const mx = query.x - onCurve.x
    const my = query.y - onCurve.y
    if (mx * mx + my * my < 1e-24) return 0

    const r = this.radius > 0 ? this.radius : 1
    const endTolSq = Math.max(1e-16, 1e-12 * r * r)
    const atStart = this.startPoint.distanceToSquared(onCurve) <= endTolSq
    const atEnd = this.endPoint.distanceToSquared(onCurve) <= endTolSq
    if (!atStart && !atEnd) return 0

    const pts = this.getPoints(8)
    if (pts.length < 3) return 0
    const inward = atStart && !atEnd ? pts[1]! : pts[pts.length - 2]!
    const ix = inward.x - onCurve.x
    const iy = inward.y - onCurve.y
    const ilen = Math.hypot(ix, iy)
    if (!(ilen > 1e-18)) return 0
    return (mx * ix + my * iy) / ilen
  }

  /**
   * Returns perpendicular snap point(s) on this arc from the given point.
   */
  perpendicularPoints(point: GeometryPoint2dLike): GeometryPoint2d[] {
    const p = new GeometryPoint2d(point.x, point.y)
    const dx = p.x - this.center.x
    const dy = p.y - this.center.y
    const dist = Math.hypot(dx, dy)
    if (dist < 1e-12) return []

    const nx = dx / dist
    const ny = dy / dist
    const candidates = [
      new GeometryPoint2d(
        this.center.x + nx * this.radius,
        this.center.y + ny * this.radius
      ),
      new GeometryPoint2d(
        this.center.x - nx * this.radius,
        this.center.y - ny * this.radius
      )
    ]

    const result: GeometryPoint2d[] = []
    const internalStart = this._getInternalAngle(this.startAngle)
    const internalEnd = this._getInternalAngle(this.endAngle)

    for (const candidate of candidates) {
      const theta = Math.atan2(
        candidate.y - this.center.y,
        candidate.x - this.center.x
      )
      const publicAngle = this.clockwise
        ? this._mirrorAngle(GeometryMathUtil.normalizeAngle(theta))
        : GeometryMathUtil.normalizeAngle(theta)
      const internalAngle = this._getInternalAngle(publicAngle)
      if (
        this.closed ||
        GeometryMathUtil.isBetweenAngle(
          internalAngle,
          internalStart,
          internalEnd,
          this.clockwise
        )
      ) {
        result.push(candidate)
      }
    }

    return result
  }

  /**
   * Returns tangent snap point(s) from the given point to this arc.
   */
  tangentPoints(point: GeometryPoint2dLike): GeometryPoint2d[] {
    const result: GeometryPoint2d[] = []
    const dx = point.x - this.center.x
    const dy = point.y - this.center.y
    const d = Math.hypot(dx, dy)
    const r = this.radius
    if (d < r) return result

    const alpha = Math.acos(r / d)
    const baseAngle = Math.atan2(dy, dx)
    const angles = [baseAngle + alpha, baseAngle - alpha]
    const internalStart = this._getInternalAngle(this.startAngle)
    const internalEnd = this._getInternalAngle(this.endAngle)

    for (const theta of angles) {
      const publicAngle = this.clockwise
        ? this._mirrorAngle(GeometryMathUtil.normalizeAngle(theta))
        : GeometryMathUtil.normalizeAngle(theta)
      const internalAngle = this._getInternalAngle(publicAngle)
      if (
        this.closed ||
        GeometryMathUtil.isBetweenAngle(
          internalAngle,
          internalStart,
          internalEnd,
          this.clockwise
        )
      ) {
        result.push(this.getPointAtAngle(publicAngle))
      }
    }

    return result
  }

  /**
   * Divide this arc into the specified nubmer of points and return those points as an array of points.
   * @param numPoints Input the nubmer of points returned
   * @returns Return an array of points
   */
  getPoints(numPoints: number = 100): GeometryPoint2d[] {
    const points: GeometryPoint2d[] = []
    let deltaAngle = this.deltaAngle
    let internalStartAngle = this._getInternalAngle(this.startAngle)
    if (this.closed) {
      deltaAngle = TAU
      internalStartAngle = 0
    }
    if (this.clockwise) {
      for (let i = 0; i <= numPoints; i++) {
        const internalAngle = internalStartAngle - deltaAngle * (i / numPoints)
        const angle = this._clockwise
          ? this._mirrorAngle(internalAngle)
          : internalAngle
        const point = this.getPointAtAngle(angle)
        points.push(new GeometryPoint2d(point.x, point.y))
      }
    } else {
      for (let i = 0; i <= numPoints; i++) {
        const internalAngle = internalStartAngle + deltaAngle * (i / numPoints)
        const angle = this._clockwise
          ? this._mirrorAngle(internalAngle)
          : internalAngle
        const point = this.getPointAtAngle(angle)
        points.push(new GeometryPoint2d(point.x, point.y))
      }
    }
    return points
  }

  /**
   * Sample this arc to a polyline whose chord height is bounded by `options`.
   *
   * Uses a closed-form segment count, then {@link getPoints}. A full circle
   * with default options still uses 100 segments; a short arc uses fewer.
   *
   * @param options - Chord-height tessellation options
   */
  tessellate(options?: GeometryTessellateOptions): GeometryPoint2d[] {
    const sweep = this.closed ? TAU : this.deltaAngle
    const numPoints = GeometryCircularArc2d.segmentCount(this.radius, sweep, {
      ...options,
      minSegments: options?.minSegments ?? (this.closed ? 8 : 3)
    })
    return this.getPoints(numPoints)
  }

  /**
   * Clamp a VIEWRES-like side count into the legal VPORT range.
   *
   * @param circleSides - Raw side count; non-finite values fall back to the default
   */
  static resolveCircleSides(circleSides?: number): number {
    if (circleSides == null || !Number.isFinite(circleSides)) {
      return GeometryCircularArc2d.DEFAULT_CIRCLE_SIDES
    }
    return geometryClamp(
      Math.round(circleSides),
      GeometryCircularArc2d.MIN_CIRCLE_SIDES,
      GeometryCircularArc2d.MAX_CIRCLE_SIDES
    )
  }

  /**
   * Fill in `circleSides` and `maxSegments`, leaving per-curve deviation and
   * `minSegments` for the caller to resolve.
   */
  static resolveTessellateOptions(
    options?: GeometryTessellateOptions
  ): GeometryResolvedTessellateOptions {
    const circleSides = GeometryCircularArc2d.resolveCircleSides(
      options?.circleSides
    )
    const maxSegments = Math.max(
      1,
      Math.round(options?.maxSegments ?? circleSides)
    )
    return {
      deviation: options?.deviation,
      circleSides,
      minSegments: options?.minSegments,
      maxSegments
    }
  }

  /**
   * Chord height of a full circle tessellated into `circleSides` equal segments.
   *
   * `s = r * (1 - cos(π / n))`. Used as the default world-space deviation so a
   * full circle still uses about `circleSides` segments.
   */
  static chordDeviationFromRadius(
    radius: number,
    circleSides: number = GeometryCircularArc2d.DEFAULT_CIRCLE_SIDES
  ): number {
    const r = Math.abs(radius)
    const n = GeometryCircularArc2d.resolveCircleSides(circleSides)
    if (r <= FLOAT_TOL) {
      return FLOAT_TOL
    }
    return Math.max(FLOAT_TOL, r * (1 - Math.cos(Math.PI / n)))
  }

  /**
   * Number of equal circular-arc segments whose chord height is at most the
   * requested deviation.
   *
   * For the default deviation this equals `ceil(|sweep| / τ * circleSides)`,
   * so a full circle keeps the historical 100-segment look while a short arc
   * uses proportionally fewer evaluations.
   *
   * @param radius - Arc radius in world units
   * @param sweep - Signed or unsigned included angle in radians
   * @param options - Tessellation options
   * @returns Segment count in `[minSegments, maxSegments]`
   */
  static segmentCount(
    radius: number,
    sweep: number,
    options?: GeometryTessellateOptions
  ): number {
    const resolved = GeometryCircularArc2d.resolveTessellateOptions(options)
    const sweepAbs = Math.abs(sweep)
    const isFullCircle = sweepAbs >= TAU - 1e-8
    const minSegments = Math.max(
      1,
      Math.round(resolved.minSegments ?? (isFullCircle ? 8 : 3))
    )
    const maxSegments = Math.max(minSegments, resolved.maxSegments)
    const r = Math.abs(radius)

    if (r <= FLOAT_TOL || sweepAbs <= FLOAT_TOL) {
      return minSegments
    }

    const deviation =
      resolved.deviation ??
      GeometryCircularArc2d.chordDeviationFromRadius(r, resolved.circleSides)
    const ratio = 1 - deviation / r
    if (!Number.isFinite(ratio) || ratio >= 1) {
      return maxSegments
    }
    if (ratio <= -1) {
      return minSegments
    }

    const theta = 2 * Math.acos(ratio)
    if (theta <= FLOAT_TOL) {
      return maxSegments
    }
    return geometryClamp(Math.ceil(sweepAbs / theta), minSegments, maxSegments)
  }
}
