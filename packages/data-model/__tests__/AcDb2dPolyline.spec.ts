import { AcGeMatrix3d, AcGePoint2d } from '@mlightcad/geometry-engine'
import { AcDb2dPolyline, AcDbPoly2dType, AcDbPolyline } from '../src/entity'
import { AcDbOsnapMode } from '../src/misc'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

describe('AcDb2dPolyline', () => {
  it('creates a detached clone with a new objectId', () => {
    expectDetachedClone(() => new AcDb2dPolyline(AcDbPoly2dType.SimplePoly, []))
  })

  it('covers constructor behavior, basic getters and setters', () => {
    const polyline = new AcDb2dPolyline(
      AcDbPoly2dType.SimplePoly,
      [
        { x: 0, y: 0 },
        { x: 2, y: 3 }
      ],
      5,
      true,
      0,
      0,
      [0.5]
    )

    expect(polyline.dxfTypeName).toBe('POLYLINE')
    expect(polyline.numberOfVertices).toBe(2)
    expect(polyline.polyType).toBe(AcDbPoly2dType.SimplePoly)
    expect(polyline.elevation).toBe(5)
    expect(polyline.closed).toBe(true)
    expect(polyline.getPointAt(1)).toEqual({ x: 2, y: 3 })
    expect(polyline.getBulgeAt(0)).toBe(0)

    polyline.polyType = AcDbPoly2dType.CubicSplinePoly
    polyline.elevation = 9
    polyline.closed = false
    expect(polyline.polyType).toBe(AcDbPoly2dType.CubicSplinePoly)
    expect(polyline.elevation).toBe(9)
    expect(polyline.closed).toBe(false)
  })

  it('gets bulges and falls back to 0 when missing/out of range', () => {
    const polyline = new AcDb2dPolyline(
      AcDbPoly2dType.SimplePoly,
      [
        { x: 0, y: 0 },
        { x: 3, y: 0 }
      ],
      0,
      false,
      0,
      0,
      [0.25, -0.5]
    )

    expect(polyline.getBulgeAt(0)).toBe(0.25)
    expect(polyline.getBulgeAt(1)).toBe(-0.5)
    expect(polyline.getBulgeAt(9)).toBe(0)

    const noBulgePolyline = new AcDb2dPolyline(AcDbPoly2dType.SimplePoly, [
      { x: 0, y: 0 }
    ])
    expect(noBulgePolyline.getBulgeAt(0)).toBe(0)
  })

  it('returns geometric extents with elevation', () => {
    const polyline = new AcDb2dPolyline(
      AcDbPoly2dType.SimplePoly,
      [
        { x: -1, y: 2 },
        { x: 3, y: -4 }
      ],
      7
    )

    const ext = polyline.geometricExtents
    expect(ext.min).toMatchObject({ x: -1, y: -4 })
    expect(ext.max).toMatchObject({ x: 3, y: 2 })
  })

  it('returns grip points and osnap points for supported modes', () => {
    const polyline = new AcDb2dPolyline(AcDbPoly2dType.SimplePoly, [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 }
    ])

    const gripPoints = polyline.subGetGripPoints()
    expect(gripPoints).toHaveLength(3)
    expect(gripPoints[0]).toEqual(new AcGePoint2d(0, 0))

    const endpointSnaps: AcGePoint2d[] = []
    polyline.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new AcGePoint2d(),
      new AcGePoint2d(),
      endpointSnaps
    )
    expect(endpointSnaps).toHaveLength(3)

    const midPoints: AcGePoint2d[] = []
    polyline.subGetOsnapPoints(
      AcDbOsnapMode.MidPoint,
      new AcGePoint2d(),
      new AcGePoint2d(),
      midPoints
    )
    expect(midPoints).toHaveLength(2)
    expect(midPoints[0]).toMatchObject({ x: 1, y: 0 })
    expect(midPoints[1]).toMatchObject({ x: 2, y: 1 })

    const nearestPoints: AcGePoint2d[] = []
    polyline.subGetOsnapPoints(
      AcDbOsnapMode.Nearest,
      new AcGePoint2d(1, 1),
      new AcGePoint2d(),
      nearestPoints
    )
    expect(nearestPoints).toHaveLength(1)
    expect(nearestPoints[0]).toMatchObject({ x: 1, y: 0 })

    const perpendicularPoints: AcGePoint2d[] = []
    polyline.subGetOsnapPoints(
      AcDbOsnapMode.Perpendicular,
      new AcGePoint2d(1, 1),
      new AcGePoint2d(),
      perpendicularPoints
    )
    expect(perpendicularPoints).toHaveLength(1)
    expect(perpendicularPoints[0]).toMatchObject({ x: 1, y: 0 })

    const unsupportedPoints: AcGePoint2d[] = []
    polyline.subGetOsnapPoints(
      AcDbOsnapMode.Center,
      new AcGePoint2d(),
      new AcGePoint2d(),
      unsupportedPoints
    )
    expect(unsupportedPoints).toHaveLength(0)
  })

  it('returns grip points at polyline elevation', () => {
    const polyline = new AcDb2dPolyline(
      AcDbPoly2dType.SimplePoly,
      [
        { x: 0, y: 0 },
        { x: 2, y: 0 }
      ],
      5
    )
    const grips = polyline.subGetGripPoints()
    expect(grips).toHaveLength(2)
    expect(grips[0]).toMatchObject({ x: 0, y: 0 })
    expect(grips[1]).toMatchObject({ x: 2, y: 0 })
  })

  it('transforms geometry and flips bulges for mirrored transform', () => {
    const polyline = new AcDb2dPolyline(
      AcDbPoly2dType.SimplePoly,
      [
        { x: 1, y: 2 },
        { x: 3, y: 4 }
      ],
      3,
      false,
      0,
      0,
      [0.25, -0.5]
    )

    const result = polyline.transformBy(new AcGeMatrix3d().makeScale(-1, 1, 1))
    expect(result).toBe(polyline)
    expect(polyline.getPointAt(0)).toEqual({ x: -1, y: 2 })
    expect(polyline.getBulgeAt(0)).toBe(-0.25)
    expect(polyline.getBulgeAt(1)).toBe(0.5)

    polyline.transformBy(new AcGeMatrix3d().makeTranslation(0, 0, 5))
  })

  it('exposes properties groups and property accessors', () => {
    const polyline = new AcDb2dPolyline(AcDbPoly2dType.SimplePoly, [
      { x: 0, y: 0 },
      { x: 3, y: 4 }
    ])

    const props = polyline.properties
    expect(props.type).toBe(polyline.type)

    const geometryGroup = props.groups.find(g => g.groupName === 'geometry')
    const othersGroup = props.groups.find(g => g.groupName === 'others')
    expect(geometryGroup).toBeDefined()
    expect(othersGroup).toBeDefined()

    const verticesProp = geometryGroup!.properties.find(
      p => p.name === 'vertices'
    )
    const elevationProp = geometryGroup!.properties.find(
      p => p.name === 'elevation'
    )
    const lengthProp = geometryGroup!.properties.find(p => p.name === 'length')
    const closedProp = othersGroup!.properties.find(p => p.name === 'closed')

    expect((verticesProp?.accessor.get() as unknown[]).length).toBe(2)
    expect(lengthProp?.accessor.get()).toBe(5)

    elevationProp?.accessor.set?.(11)
    expect(elevationProp?.accessor.get()).toBe(11)

    closedProp?.accessor.set?.(true)
    expect(closedProp?.accessor.get()).toBe(true)
  })

  it('draws through subWorldDraw using sampled points at current elevation', () => {
    const polyline = new AcDb2dPolyline(AcDbPoly2dType.SimplePoly, [
      { x: 0, y: 0 },
      { x: 2, y: 0 }
    ])
    polyline.elevation = 6

    const renderer = {
      lines: jest.fn(() => 'rendered')
    }

    const result = polyline.subWorldDraw(renderer as never)
    expect(result).toBe('rendered')
    expect(renderer.lines).toHaveBeenCalledTimes(1)
    const [points] = renderer.lines.mock.calls[0] as unknown as [AcGePoint2d[]]
    expect(points.length).toBeGreaterThan(1)
  })

  it('offsets a simple 2d polyline path', () => {
    const poly = new AcDb2dPolyline(
      AcDbPoly2dType.SimplePoly,
      [new AcGePoint2d(0, 0), new AcGePoint2d(10, 0)],
      0,
      false
    )
    const [result] = poly.getOffsetCurves(1) as AcDbPolyline[]
    expect(result.numberOfVertices).toBeGreaterThanOrEqual(2)
  })

  it('offsets a 2d polyline path that contains bulge arcs', () => {
    const poly = new AcDb2dPolyline(
      AcDbPoly2dType.SimplePoly,
      [new AcGePoint2d(0, 0), new AcGePoint2d(10, 0)],
      0,
      false,
      0,
      0,
      [1, 0]
    )
    const [result] = poly.getOffsetCurves(1) as AcDbPolyline[]
    let minY = Infinity
    for (let i = 0; i < result.numberOfVertices; i++) {
      minY = Math.min(minY, result.getPoint2dAt(i).y)
    }
    expect(minY).toBeLessThan(-5)
  })

  it('maps OCS grips and draw points to WCS for extrusion (0,0,-1)', () => {
    const polyline = new AcDb2dPolyline(
      AcDbPoly2dType.SimplePoly,
      [new AcGePoint2d(1000, 500), new AcGePoint2d(1100, 520)],
      0,
      false
    )
    polyline.normal = { x: 0, y: 0, z: -1 }

    const grips = polyline.subGetGripPoints()
    expect(grips[0]).toMatchObject({ x: -1000, y: 500 })
    expect(grips[1]).toMatchObject({ x: -1100, y: 520 })

    const extents = polyline.geometricExtents
    expect(extents.min.x).toBeCloseTo(-1100, 8)
    expect(extents.max.x).toBeCloseTo(-1000, 8)

    const snapPoints: AcGePoint2d[] = []
    polyline.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new AcGePoint2d(),
      new AcGePoint2d(),
      snapPoints
    )
    expect(snapPoints[0]).toMatchObject({ x: -1000, y: 500 })

    const renderer = { lines: jest.fn(() => ({})) }
    polyline.subWorldDraw(renderer as never)
    expect(renderer.lines).toHaveBeenCalledWith([
      expect.objectContaining({ x: -1000, y: 500 }),
      expect.objectContaining({ x: -1100, y: 520 })
    ])
  })
})
