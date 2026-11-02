import { GeometryPoint2d } from '@mlightcad/data-model'

import {
  fillLoopHasSelfIntersection,
  resolveSelfIntersectingFillLoop
} from '../src/object/AcTrFillLoopRepair'

/**
 * Self-intersecting hatch foot from DWG handle 14AE (simplified, no arc):
 * a vertical strip with a left-hand ledge whose long left edge crosses the
 * bottom ledge — AutoCAD stores this without a T-junction vertex.
 */
function hatch14AeFootLoop() {
  return [
    new GeometryPoint2d(1439.03, 691.02),
    new GeometryPoint2d(1439.03, 628.96),
    new GeometryPoint2d(1418.03, 628.96),
    new GeometryPoint2d(1418.03, 627.46),
    new GeometryPoint2d(1435.03, 627.46),
    new GeometryPoint2d(1435.03, 688.53),
    new GeometryPoint2d(1439.03, 691.02)
  ]
}

describe('AcTrFillLoopRepair', () => {
  it('detects the T-junction self-intersection in hatch 14AE-style foot', () => {
    expect(fillLoopHasSelfIntersection(hatch14AeFootLoop())).toBe(true)
  })

  it('leaves a simple rectangle unchanged', () => {
    const rect = [
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(10, 0),
      new GeometryPoint2d(10, 5),
      new GeometryPoint2d(0, 5)
    ]
    expect(fillLoopHasSelfIntersection(rect)).toBe(false)
    const regions = resolveSelfIntersectingFillLoop(rect)
    expect(regions).toHaveLength(1)
    expect(regions[0]).toHaveLength(4)
  })

  it('decomposes the self-intersecting foot into simple even-odd regions', () => {
    const regions = resolveSelfIntersectingFillLoop(hatch14AeFootLoop())
    expect(regions.length).toBeGreaterThan(1)
    for (const region of regions) {
      expect(fillLoopHasSelfIntersection(region)).toBe(false)
      expect(region.length).toBeGreaterThanOrEqual(3)
    }

    // Notch interior stays filled; concave exterior left of the upright does not.
    expect(regions.some(region => pointInPoly(1425, 628.2, region))).toBe(true)
    expect(regions.some(region => pointInPoly(1437, 650, region))).toBe(true)
    expect(regions.some(region => pointInPoly(1425, 640, region))).toBe(false)
  })
})

function pointInPoly(
  x: number,
  y: number,
  poly: Array<{ x: number; y: number }>
): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x
    const yi = poly[i].y
    const xj = poly[j].x
    const yj = poly[j].y
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}
