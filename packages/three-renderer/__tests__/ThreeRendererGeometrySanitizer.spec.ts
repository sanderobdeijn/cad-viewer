import {
  GeometryCircularArc2d,
  GeometryPoint2d
} from '@mlightcad/geometry-engine'

import { ThreeRendererGeometrySanitizer } from '../src/util/ThreeRendererGeometrySanitizer'

describe('ThreeRendererGeometrySanitizer', () => {
  beforeEach(() => {
    ThreeRendererGeometrySanitizer.resetDiagnosticsForTests()
  })

  it('rejects circular arcs that cannot be drawn', () => {
    const arc = new GeometryCircularArc2d(
      new GeometryPoint2d(10, 20),
      5,
      0,
      Math.PI / 2,
      false
    )
    expect(ThreeRendererGeometrySanitizer.repairCircularArc(arc)).toBe(arc)

    const noRadius = new GeometryCircularArc2d(
      new GeometryPoint2d(0, 0),
      5,
      0,
      1,
      false
    )
    noRadius.radius = 0
    expect(ThreeRendererGeometrySanitizer.repairCircularArc(noRadius)).toBeNull()

    const noCenter = new GeometryCircularArc2d(
      new GeometryPoint2d(0, 0),
      5,
      0,
      1,
      false
    )
    noCenter.center = { x: Number.NaN, y: 0 }
    expect(ThreeRendererGeometrySanitizer.repairCircularArc(noCenter)).toBeNull()
  })

  it('logs entity context when non-finite points are dropped', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const entity = {
      constructor: { typeName: 'Line' },
      objectId: 'ABC123'
    } as never

    ThreeRendererGeometrySanitizer.filterFinitePoints(
      [
        { x: 0, y: 0 },
        { x: Number.NaN, y: 1 }
      ],
      { currentDrawingEntity: entity }
    )

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Line ABC123'))
    warn.mockRestore()
  })
})
