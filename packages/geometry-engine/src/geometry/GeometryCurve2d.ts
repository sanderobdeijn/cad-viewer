import { GeometryPoint2d } from '../math/GeometryPoint2d'
import { FLOAT_TOL,geometryClamp } from '../util'
import { GeometryShape2d } from './GeometryShape2d'

/**
 * Abstract base class for all 2d curves. Any class that is derived from this class represents
 * a 2d curve.
 */
export abstract class GeometryCurve2d extends GeometryShape2d {
  protected arcLengthDivisions: number

  constructor() {
    super()
    this.arcLengthDivisions = 100
  }

  /**
   * Return true if its start point is identical to its end point. Otherwise, return false.
   */
  abstract get closed(): boolean

  /**
   * Start point of this curve. If the curve is closed, coordinates of start point will be equal to coordinates
   * of end point.
   */
  get startPoint() {
    return this.getPoint(0)
  }

  /**
   * End point of this curve. If the curve is closed, coordinates of start point will be equal to coordinates
   * of end point.
   */
  get endPoint() {
    return this.getPoint(1)
  }

  /**
   * Length of this curve.
   */
  get length() {
    return this.getLength()
  }

  /**
   * Return the point for a given position on the curve according to the arc length.
   * @param t Input a position on the curve according to the arc length. Must be in the range [0, 1].
   * @returns Return the point for a given position on the curve according to the arc length.
   */
  getPoint(_t: number): GeometryPoint2d {
    throw new Error('GeometryCurve2d: .getPoint() not implemented.')
  }

  /**
   * Return a point for a given position on the curve according to the arc length.
   * @param u Input a position on the curve according to the arc length. Must be in the range [0, 1].
   * @returns Return a point for a given position on the curve according to the arc length.
   */
  getPointAt(u: number) {
    const t = this.getUtoTmapping(u)
    return this.getPoint(t)
  }

  /**
   * Return a set of divisions + 1 points using `getPoint(t)`.
   * @param divisions Input number of pieces to divide the curve into. Default is 5.
   * @returns Return a set of divisions + 1 points using `getPoint(t)`
   */
  getPoints(divisions = 5) {
    const points = []

    for (let d = 0; d <= divisions; d++) {
      points.push(this.getPoint(d / divisions))
    }

    return points
  }

  /**
   * Return a set of divisions + 1 equi-spaced points using `getPointAt(u)`.
   * @param divisions Input number of pieces to divide the curve into. Default is 5.
   * @returns Return a set of divisions + 1 equi-spaced points using `getPointAt(u)`.
   */
  getSpacedPoints(divisions = 5) {
    const points = []

    for (let d = 0; d <= divisions; d++) {
      points.push(this.getPointAt(d / divisions))
    }

    return points
  }

  /**
   * Get total curve arc length.
   * @returns Return total curve arc length.
   */
  getLength() {
    const lengths = this.getLengths()
    return lengths[lengths.length - 1]
  }

  /**
   * Get list of cumulative segment lengths.
   * @param divisions Input number of pieces to divide the curve into.
   * @returns Return list of cumulative segment lengths.
   */
  getLengths(divisions = this.arcLengthDivisions) {
    const cache = []
    let current,
      last = this.getPoint(0)
    let sum = 0

    cache.push(0)

    for (let p = 1; p <= divisions; p++) {
      current = this.getPoint(p / divisions)
      sum += current.distanceTo(last)
      cache.push(sum)
      last = current
    }
    return cache
  }

  /**
   * Given `u` in the range (0 .. 1), returns t also in the range ( 0 .. 1 ). `u` and `t` can then be used to
   * give you points which are equidistant from the ends of the curve, using `getPoint`.
   */
  getUtoTmapping(u: number, distance?: number) {
    const arcLengths = this.getLengths()

    let i = 0
    const il = arcLengths.length

    let targetArcLength // The targeted u distance value to get

    if (distance) {
      targetArcLength = distance
    } else {
      targetArcLength = u * arcLengths[il - 1]
    }

    // binary search for the index with largest value smaller than target u distance

    let low = 0,
      high = il - 1,
      comparison

    while (low <= high) {
      i = Math.floor(low + (high - low) / 2) // less likely to overflow, though probably not issue here, JS doesn't really have integers, all numbers are floats

      comparison = arcLengths[i] - targetArcLength

      if (comparison < 0) {
        low = i + 1
      } else if (comparison > 0) {
        high = i - 1
      } else {
        high = i
        break
        // DONE
      }
    }

    i = high

    if (arcLengths[i] === targetArcLength) {
      return i / (il - 1)
    }

    // we could get finer grain at lengths, or use simple interpolation between two points

    const lengthBefore = arcLengths[i]
    const lengthAfter = arcLengths[i + 1]

    const segmentLength = lengthAfter - lengthBefore

    // determine where we are between the 'before' and 'after' points

    const segmentFraction = (targetArcLength - lengthBefore) / segmentLength

    // add that fractional amount to t

    const t = (i + segmentFraction) / (il - 1)

    return t
  }

  /**
   * Return a unit vector tangent at `t`. If the derived curve does not implement its tangent derivation,
   * two points a small delta apart will be used to find its gradient which seems to give a reasonable
   * approximation.
   * @param t Input a position on the curve. Must be in the range [ 0, 1 ].
   * @returns Return a unit vector tangent at `t`.
   */
  getTangent(t: number) {
    const delta = 0.0001
    let t1 = t - delta
    let t2 = t + delta

    // Capping in case of danger

    if (t1 < 0) t1 = 0
    if (t2 > 1) t2 = 1

    const pt1 = this.getPoint(t1)
    const pt2 = this.getPoint(t2)

    const tangent = new GeometryPoint2d()
    tangent.copy(pt2).sub(pt1).normalize()
    return tangent
  }

  /**
   * Return tangent at a point which is equidistant to the ends of the curve from the point given in
   * `getTangent`.
   * @param u Input a position on the curve according to the arc length. Must be in the range [0, 1].
   * @returns Return tangent at a point which is equidistant to the ends of the curve from the point
   * given in `getTangent`.
   */
  getTangentAt(u: number) {
    const t = this.getUtoTmapping(u)
    return this.getTangent(t)
  }

  /**
   * Return a deep-cloned copy of this curve.
   */
  abstract clone(): GeometryCurve2d

  /**
   * Sample a parametric 2d curve by coarse uniform samples plus chord-height
   * refinement, with a hard evaluation budget of `maxSegments`.
   *
   * Midpoints that already meet the deviation still consume the budget so a
   * highly curved curve cannot exceed the historical `getPoints(100)` cost.
   */
  protected static tessellateParametricCurve(
    startParam: number,
    endParam: number,
    evaluate: (t: number) => GeometryPoint2d,
    options: {
      deviation: number
      minSegments: number
      maxSegments: number
    }
  ): GeometryPoint2d[] {
    const maxEvals = Math.max(2, Math.round(options.maxSegments))
    const minSegments = Math.max(1, Math.round(options.minSegments))
    const deviationSq =
      Math.max(0, options.deviation) * Math.max(0, options.deviation)

    if (!Number.isFinite(startParam) || !Number.isFinite(endParam)) {
      return [evaluate(0)]
    }
    if (Math.abs(endParam - startParam) <= FLOAT_TOL) {
      return [evaluate(startParam)]
    }

    const minPoints = Math.min(maxEvals, Math.max(2, minSegments + 1))
    const coarseCount = Math.min(maxEvals, Math.max(minPoints, 8))
    let params = uniformParameters(startParam, endParam, coarseCount)
    const points: GeometryPoint2d[] = []
    for (let i = 0; i < params.length; i++) {
      points.push(evaluate(params[i]))
    }
    let evalCount = points.length

    for (let pass = 0; pass < 8 && evalCount < maxEvals; pass++) {
      const insertions: { index: number; t: number; point: GeometryPoint2d }[] =
        []
      for (let i = 0; i < params.length - 1; i++) {
        if (evalCount >= maxEvals) {
          break
        }
        const midT = (params[i] + params[i + 1]) / 2
        const mid = evaluate(midT)
        evalCount++
        if (
          distSqPointToSegment2d(mid, points[i], points[i + 1]) > deviationSq
        ) {
          insertions.push({ index: i, t: midT, point: mid })
        }
      }
      if (insertions.length === 0) {
        break
      }
      const merged = mergeParametricInsertions(params, points, insertions)
      params = merged.params
      points.length = 0
      for (let i = 0; i < merged.points.length; i++) {
        points.push(merged.points[i])
      }
    }

    return points
  }
}

function distSqPointToSegment2d(
  point: GeometryPoint2d,
  a: GeometryPoint2d,
  b: GeometryPoint2d
): number {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const apx = point.x - a.x
  const apy = point.y - a.y
  const abLenSq = abx * abx + aby * aby
  if (abLenSq <= FLOAT_TOL * FLOAT_TOL) {
    return apx * apx + apy * apy
  }
  const t = geometryClamp((apx * abx + apy * aby) / abLenSq, 0, 1)
  const dx = apx - abx * t
  const dy = apy - aby * t
  return dx * dx + dy * dy
}

function uniformParameters(
  start: number,
  end: number,
  count: number
): number[] {
  if (count <= 1) {
    return [start]
  }
  const params: number[] = []
  for (let i = 0; i < count; i++) {
    params.push(
      i === count - 1 ? end : start + ((end - start) * i) / (count - 1)
    )
  }
  return params
}

function mergeParametricInsertions(
  params: number[],
  points: GeometryPoint2d[],
  insertions: { index: number; t: number; point: GeometryPoint2d }[]
): { params: number[]; points: GeometryPoint2d[] } {
  const nextParams: number[] = []
  const nextPoints: GeometryPoint2d[] = []
  let ins = 0
  for (let i = 0; i < params.length; i++) {
    nextParams.push(params[i])
    nextPoints.push(points[i])
    while (ins < insertions.length && insertions[ins].index === i) {
      nextParams.push(insertions[ins].t)
      nextPoints.push(insertions[ins].point)
      ins++
    }
  }
  return { params: nextParams, points: nextPoints }
}
