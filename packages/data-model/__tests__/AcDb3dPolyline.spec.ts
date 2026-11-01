import { AcGeMatrix3d, AcGePoint3d } from '@mlightcad/geometry-engine'
import { AcDb3dPolyline, AcDbPoly3dType } from '../src/entity'
import { AcDbOsnapMode } from '../src/misc'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

describe('AcDb3dPolyline', () => {
  it('creates a detached clone with a new objectId', () => {
    expectDetachedClone(() => new AcDb3dPolyline(AcDbPoly3dType.SimplePoly, []))
  })
  it('supports public getters/setters and point accessors', () => {
    const polyline = new AcDb3dPolyline(
      AcDbPoly3dType.SimplePoly,
      [
        { x: 1, y: 2, z: 3 },
        { x: 4, y: 5 } as unknown as { x: number; y: number; z: number },
        { x: -1, y: 0, z: 8 }
      ],
      true
    )

    expect(polyline.dxfTypeName).toBe('POLYLINE')
    expect(polyline.polyType).toBe(AcDbPoly3dType.SimplePoly)
    expect(polyline.closed).toBe(true)
    expect(polyline.numberOfVertices).toBe(3)
    expect(polyline.getPointAt(0)).toMatchObject({ x: 1, y: 2, z: 3 })
    expect(polyline.getPointAt(1)).toMatchObject({ x: 4, y: 5, z: 0 })

    polyline.polyType = AcDbPoly3dType.CubicSplinePoly
    polyline.closed = false

    expect(polyline.polyType).toBe(AcDbPoly3dType.CubicSplinePoly)
    expect(polyline.closed).toBe(false)
  })

  it('computes geometric extents and grip/osnap points', () => {
    const polyline = new AcDb3dPolyline(AcDbPoly3dType.SimplePoly, [
      { x: -1, y: 2, z: 3 },
      { x: 4, y: -5 } as unknown as { x: number; y: number; z: number },
      { x: 0, y: 1, z: -2 }
    ])

    const extents = polyline.geometricExtents
    expect(extents.min).toMatchObject({ x: -1, y: -5, z: -2 })
    expect(extents.max).toMatchObject({ x: 4, y: 2, z: 3 })

    const grips = polyline.subGetGripPoints()
    expect(grips).toHaveLength(3)
    expect(grips[0]).toMatchObject({ x: -1, y: 2, z: 3 })
    expect(grips[2]).toMatchObject({ x: 0, y: 1, z: -2 })

    const endPoints: AcGePoint3d[] = []
    polyline.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new AcGePoint3d(),
      new AcGePoint3d(),
      endPoints
    )
    expect(endPoints).toHaveLength(3)
    expect(endPoints[1]).toMatchObject({ x: 4, y: -5, z: 0 })

    const midPoints: AcGePoint3d[] = []
    polyline.subGetOsnapPoints(
      AcDbOsnapMode.MidPoint,
      new AcGePoint3d(),
      new AcGePoint3d(),
      midPoints
    )
    expect(midPoints).toHaveLength(2)
    expect(midPoints[0]).toMatchObject({ x: 1.5, y: -1.5, z: 1.5 })
    expect(midPoints[1]).toMatchObject({ x: 2, y: -2, z: -1 })

    const nearestPoints: AcGePoint3d[] = []
    polyline.subGetOsnapPoints(
      AcDbOsnapMode.Nearest,
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(),
      nearestPoints
    )
    expect(nearestPoints).toHaveLength(1)

    const perpendicularPoints: AcGePoint3d[] = []
    polyline.subGetOsnapPoints(
      AcDbOsnapMode.Perpendicular,
      new AcGePoint3d(1.5, -1.5, 1.5),
      new AcGePoint3d(),
      perpendicularPoints
    )
    expect(perpendicularPoints).toHaveLength(1)
    expect(perpendicularPoints[0].x).toBeCloseTo(1.5, 5)
    expect(perpendicularPoints[0].y).toBeCloseTo(-1.5, 5)
    expect(perpendicularPoints[0].z).toBeCloseTo(1.5, 5)

    const unsupportedPoints: AcGePoint3d[] = []
    polyline.subGetOsnapPoints(
      AcDbOsnapMode.Center,
      new AcGePoint3d(),
      new AcGePoint3d(),
      unsupportedPoints
    )
    expect(unsupportedPoints).toHaveLength(0)
  })

  it('updates geometricExtents when vertices are transformed', () => {
    const polyline = new AcDb3dPolyline(AcDbPoly3dType.SimplePoly, [
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 }
    ])

    expect(polyline.geometricExtents.max).toMatchObject({ x: 2, y: 0, z: 0 })

    polyline.transformBy(new AcGeMatrix3d().makeTranslation(5, 3, 1))

    expect(polyline.geometricExtents.min).toMatchObject({ x: 5, y: 3, z: 1 })
    expect(polyline.geometricExtents.max).toMatchObject({ x: 7, y: 3, z: 1 })
  })

  it('transforms vertices and returns itself for chaining', () => {
    const polyline = new AcDb3dPolyline(AcDbPoly3dType.SimplePoly, [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 2, z: 3 }
    ])

    const result = polyline.transformBy(
      new AcGeMatrix3d().makeTranslation(3, -2, 5)
    )
    expect(result).toBe(polyline)
    expect(polyline.getPointAt(0)).toMatchObject({ x: 3, y: -2, z: 5 })
    expect(polyline.getPointAt(1)).toMatchObject({ x: 4, y: 0, z: 8 })
  })

  it('returns runtime properties that can read and update values', () => {
    const polyline = new AcDb3dPolyline(
      AcDbPoly3dType.SimplePoly,
      [
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 }
      ],
      false
    )

    const geometryGroup = polyline.properties.groups.find(
      group => group.groupName === 'geometry'
    )
    const othersGroup = polyline.properties.groups.find(
      group => group.groupName === 'others'
    )

    expect(geometryGroup).toBeDefined()
    expect(othersGroup).toBeDefined()

    const verticesProp = geometryGroup!.properties.find(
      p => p.name === 'vertices'
    )
    const lengthProp = geometryGroup!.properties.find(p => p.name === 'length')
    const closedProp = othersGroup!.properties.find(p => p.name === 'closed')

    expect(verticesProp?.accessor.get()).toHaveLength(2)
    expect(lengthProp?.accessor.get()).toBeCloseTo(2, 8)
    expect(closedProp?.accessor.get()).toBe(false)

    closedProp?.accessor.set?.(true)
    expect(polyline.closed).toBe(true)
  })

  it('draws using renderer.lines with 3d points', () => {
    const polyline = new AcDb3dPolyline(AcDbPoly3dType.SimplePoly, [
      { x: 1, y: 2 } as unknown as { x: number; y: number; z: number },
      { x: 4, y: 5, z: 6 }
    ])
    const giEntity = { id: 'gi' }
    const renderer = {
      lines: jest.fn(() => giEntity)
    }

    const result = polyline.subWorldDraw(renderer as never)
    expect(result).toBe(giEntity)
    expect(renderer.lines).toHaveBeenCalledTimes(1)
    expect(renderer.lines).toHaveBeenCalledWith([
      expect.objectContaining({ x: 1, y: 2, z: 0 }),
      expect.objectContaining({ x: 4, y: 5, z: 6 })
    ])
  })
})
