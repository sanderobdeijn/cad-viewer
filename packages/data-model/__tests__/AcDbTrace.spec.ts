import {
  GeometryArea2d,
  GeometryMatrix3d,
  GeometryPoint2d
} from '@mlightcad/geometry-engine'
import { AcDbTrace } from '../src/entity'
import { AcDbOsnapMode } from '../src/misc'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

describe('AcDbTrace', () => {
  it('creates a detached clone with a new objectId', () => {
    expectDetachedClone(() => new AcDbTrace())
  })

  it('exposes type names and default values', () => {
    const trace = new AcDbTrace()

    expect(AcDbTrace.typeName).toBe('Trace')
    expect(trace.dxfTypeName).toBe('TRACE')
    expect(trace.elevation).toBe(0)
    expect(trace.thickness).toBe(0)
    expect(trace.closed).toBe(true)
  })

  it('supports elevation/thickness and point accessors', () => {
    const trace = new AcDbTrace()
    trace.elevation = 12
    trace.thickness = 2.5

    trace.setPointAt(0, { x: 1, y: 2, z: 3 })
    trace.setPointAt(1, { x: 4, y: 5, z: 6 })
    trace.setPointAt(2, { x: 7, y: 8, z: 9 })
    trace.setPointAt(3, { x: 10, y: 11, z: 12 })

    expect(trace.elevation).toBe(12)
    expect(trace.thickness).toBe(2.5)
    expect(trace.getPointAt(0)).toMatchObject({ x: 1, y: 2 })
    expect(trace.getPointAt(3)).toMatchObject({ x: 10, y: 11 })
    expect(trace.getPointAt(-100)).toBe(trace.getPointAt(0))
    expect(trace.getPointAt(100)).toBe(trace.getPointAt(3))
  })

  it('handles setPointAt out-of-range branches', () => {
    const trace = new AcDbTrace()

    trace.setPointAt(3, { x: 3, y: 3, z: 3 })
    trace.setPointAt(10, { x: 9, y: 9, z: 9 })
    expect(trace.getPointAt(3)).toMatchObject({ x: 9, y: 9 })

    expect(() => trace.setPointAt(-1, { x: 1, y: 1, z: 1 })).toThrow()
  })

  it('computes geometric extents, grip points and osnap points', () => {
    const trace = new AcDbTrace()
    trace.setPointAt(0, { x: -2, y: -1, z: 0 })
    trace.setPointAt(1, { x: 3, y: -1, z: 1 })
    trace.setPointAt(2, { x: 4, y: 5, z: 2 })
    trace.setPointAt(3, { x: -1, y: 6, z: 3 })

    const extents = trace.geometricExtents
    expect(extents.min).toMatchObject({ x: -2, y: -1 })
    expect(extents.max).toMatchObject({ x: 4, y: 6 })

    const grips = trace.subGetGripPoints()
    expect(grips).toHaveLength(4)
    expect(grips[0]).toBe(trace.getPointAt(0))

    const endpointSnaps: GeometryPoint2d[] = []
    trace.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new GeometryPoint2d(),
      new GeometryPoint2d(),
      endpointSnaps
    )
    expect(endpointSnaps).toHaveLength(4)

    const otherSnaps: GeometryPoint2d[] = []
    trace.subGetOsnapPoints(
      AcDbOsnapMode.Center,
      new GeometryPoint2d(),
      new GeometryPoint2d(),
      otherSnaps
    )
    expect(otherSnaps).toHaveLength(0)

    const midPoints: GeometryPoint2d[] = []
    trace.subGetOsnapPoints(
      AcDbOsnapMode.MidPoint,
      new GeometryPoint2d(),
      new GeometryPoint2d(),
      midPoints
    )
    expect(midPoints).toHaveLength(4)

    const nearestPoints: GeometryPoint2d[] = []
    trace.subGetOsnapPoints(
      AcDbOsnapMode.Nearest,
      new GeometryPoint2d(0.5, -1),
      new GeometryPoint2d(),
      nearestPoints
    )
    expect(nearestPoints).toHaveLength(1)
    expect(nearestPoints[0].x).toBeCloseTo(0.5)
    expect(nearestPoints[0].y).toBeCloseTo(-1)

    const perpendicularPoints: GeometryPoint2d[] = []
    trace.subGetOsnapPoints(
      AcDbOsnapMode.Perpendicular,
      new GeometryPoint2d(0.5, 10),
      new GeometryPoint2d(),
      perpendicularPoints
    )
    expect(perpendicularPoints).toHaveLength(1)
  })

  it('updates geometricExtents when a corner point changes', () => {
    const trace = new AcDbTrace()
    trace.setPointAt(0, { x: 0, y: 0, z: 0 })
    trace.setPointAt(1, { x: 4, y: 0, z: 0 })
    trace.setPointAt(2, { x: 4, y: 3, z: 0 })
    trace.setPointAt(3, { x: 0, y: 3, z: 0 })

    expect(trace.geometricExtents.max).toMatchObject({ x: 4, y: 3 })

    trace.setPointAt(1, { x: 10, y: 0, z: 0 })

    expect(trace.geometricExtents.max).toMatchObject({ x: 10, y: 3 })
  })

  it('orders DXF solid corners as a perimeter loop when drawing', () => {
    const trace = new AcDbTrace()
    trace.setPointAt(0, { x: 0, y: 0, z: 0 })
    trace.setPointAt(1, { x: 10, y: 0, z: 0 })
    trace.setPointAt(2, { x: 0, y: 5, z: 0 })
    trace.setPointAt(3, { x: 10, y: 5, z: 0 })

    let capturedArea: GeometryArea2d | undefined
    const renderer = {
      subEntityTraits: {},
      area: jest.fn((area: GeometryArea2d) => {
        capturedArea = area
        return { id: 'trace-area' }
      })
    }

    trace.subWorldDraw(renderer as never)

    expect(renderer.area).toHaveBeenCalledTimes(1)
    const boundary = capturedArea!.getPoints(4)[0]
    expect(boundary).toHaveLength(5)
    expect(boundary.map(point => [point.x, point.y])).toEqual([
      [0, 0],
      [10, 0],
      [10, 5],
      [0, 5],
      [0, 0]
    ])
  })

  it('transforms itself and draws as filled area', () => {
    const trace = new AcDbTrace()
    trace.setPointAt(0, { x: 0, y: 0, z: 1 })
    trace.setPointAt(1, { x: 2, y: 0, z: 1 })
    trace.setPointAt(2, { x: 2, y: 1, z: 1 })
    trace.setPointAt(3, { x: 0, y: 1, z: 1 })

    expect(
      trace.transformBy(new GeometryMatrix3d().makeTranslation(5, -2, 3))
    ).toBe(trace)
    expect(trace.getPointAt(0)).toMatchObject({ x: 5, y: -2 })

    const rendered = { id: 'trace-area' }
    const renderer = {
      subEntityTraits: {},
      area: jest.fn(() => rendered)
    }

    expect(trace.subWorldDraw(renderer as never)).toBe(rendered)
    expect(renderer.area).toHaveBeenCalledTimes(1)
  })

  it('computes quadrilateral area', () => {
    const trace = new AcDbTrace()
    trace.setPointAt(0, new GeometryPoint2d(0, 0))
    trace.setPointAt(1, new GeometryPoint2d(10, 0))
    trace.setPointAt(2, new GeometryPoint2d(0, 5))
    trace.setPointAt(3, new GeometryPoint2d(10, 5))
    expect(trace.area).toBeCloseTo(50, 8)
  })
})
