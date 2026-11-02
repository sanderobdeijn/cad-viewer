import {
  AcDbEntity,
  GeometryCircularArc2d,
  GeometryPoint2d
} from '@mlightcad/data-model'

import { AcTrGeometrySanitizer } from '../src/util/AcTrGeometrySanitizer'

describe('AcTrGeometrySanitizer', () => {
  beforeEach(() => {
    AcTrGeometrySanitizer.resetDiagnosticsForTests()
  })

  it('rejects circular arcs that cannot be drawn', () => {
    const arc = new GeometryCircularArc2d(
      new GeometryPoint2d(10, 20),
      5,
      0,
      Math.PI / 2,
      false
    )
    expect(AcTrGeometrySanitizer.repairCircularArc(arc)).toBe(arc)

    const noRadius = new GeometryCircularArc2d(
      new GeometryPoint2d(0, 0),
      5,
      0,
      1,
      false
    )
    noRadius.radius = 0
    expect(AcTrGeometrySanitizer.repairCircularArc(noRadius)).toBeNull()

    const noCenter = new GeometryCircularArc2d(
      new GeometryPoint2d(0, 0),
      5,
      0,
      1,
      false
    )
    noCenter.center = { x: Number.NaN, y: 0 }
    expect(AcTrGeometrySanitizer.repairCircularArc(noCenter)).toBeNull()
  })

  it('logs entity context when non-finite points are dropped', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const entity = {
      constructor: { typeName: 'ProxyEntity' },
      objectId: 'ABC123',
      layer: '0'
    } as unknown as AcDbEntity

    AcTrGeometrySanitizer.filterFinitePoints(
      [
        { x: 0, y: 0 },
        { x: Number.NaN, y: 1 }
      ],
      { currentDrawingEntity: entity }
    )

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('ProxyEntity ABC123')
    )
    warn.mockRestore()
  })
})
