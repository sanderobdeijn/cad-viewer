import { AcGeMatrix3d, AcGePoint2d } from '@mlightcad/geometry-engine'
import { acdbHostApplicationServices } from '../src/base'
import { AcDbDatabase } from '../src/database'
import { AcDbArc } from '../src/entity'
import { AcDbOsnapMode } from '../src/misc'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

const createWorkingDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

describe('AcDbArc', () => {
  it('creates a detached clone with a new objectId', () => {
    createWorkingDb()
    expectDetachedClone(() => new AcDbArc(new AcGePoint2d(), 1, 0, Math.PI))
  })

  it('supports public geometric getters and setters', () => {
    createWorkingDb()
    const arc = new AcDbArc(new AcGePoint2d(1, 2), 2, 0, Math.PI / 2)

    expect(arc.dxfTypeName).toBe('ARC')
    expect(arc.center).toBeInstanceOf(AcGePoint2d)
    expect(arc.radius).toBe(2)
    expect(arc.startAngle).toBe(0)
    expect(arc.endAngle).toBeCloseTo(Math.PI / 2)

    arc.center = new AcGePoint2d(3, 4)
    arc.radius = 5
    arc.startAngle = Math.PI / 4
    arc.endAngle = Math.PI

    expect(arc.center.x).toBeCloseTo(3)
    expect(arc.center.y).toBeCloseTo(4)
    expect(arc.radius).toBe(5)
    expect(arc.startAngle).toBeCloseTo(Math.PI / 4)
    expect(arc.endAngle).toBeCloseTo(Math.PI)

    expect(arc.startPoint).toBeInstanceOf(AcGePoint2d)
    expect(arc.endPoint).toBeInstanceOf(AcGePoint2d)
    expect(arc.midPoint).toBeInstanceOf(AcGePoint2d)
    expect(arc.geometricExtents).toBeDefined()
    expect(typeof arc.closed).toBe('boolean')
  })

  it('returns geometricExtents and updates when center or radius change', () => {
    createWorkingDb()
    const arc = new AcDbArc(new AcGePoint2d(0, 0), 3, 0, Math.PI / 2)

    expect(arc.geometricExtents.min.x).toBeCloseTo(0, 5)
    expect(arc.geometricExtents.min.y).toBeCloseTo(0, 5)
    expect(arc.geometricExtents.max.x).toBeCloseTo(3, 5)
    expect(arc.geometricExtents.max.y).toBeCloseTo(3, 5)

    arc.center = new AcGePoint2d(10, 10)
    arc.radius = 2

    expect(arc.geometricExtents.min.x).toBeCloseTo(10, 5)
    expect(arc.geometricExtents.min.y).toBeCloseTo(10, 5)
    expect(arc.geometricExtents.max.x).toBeCloseTo(12, 5)
    expect(arc.geometricExtents.max.y).toBeCloseTo(12, 5)
  })

  it('exposes runtime properties and accessors', () => {
    createWorkingDb()
    const arc = new AcDbArc(new AcGePoint2d(0, 0), 3, 0, Math.PI / 2)
    const properties = arc.properties

    expect(properties.type).toBe('Arc')
    expect(properties.groups.length).toBe(2)

    const geometryGroup = properties.groups.find(
      group => group.groupName === 'geometry'
    )
    expect(geometryGroup).toBeDefined()

    const radiusProp = geometryGroup!.properties.find(p => p.name === 'radius')
    expect(radiusProp?.editable).toBe(true)
    radiusProp?.accessor.set?.(10)
    expect(arc.radius).toBe(10)
    expect(radiusProp?.accessor.get()).toBe(10)

    const centerXProp = geometryGroup!.properties.find(
      p => p.name === 'centerX'
    )
    centerXProp?.accessor.set?.(7)
    expect(arc.center.x).toBe(7)

    const arcLengthProp = geometryGroup!.properties.find(
      p => p.name === 'arcLength'
    )
    expect(arcLengthProp?.editable).toBe(false)
    expect(typeof arcLengthProp?.accessor.get()).toBe('number')

    const propertyValues: Record<string, number> = {
      centerX: 11,
      centerY: 12,
      centerZ: 13,
      radius: 14,
      startAngle: Math.PI / 6,
      endAngle: Math.PI / 3,
      normalX: 0,
      normalY: 0,
      normalZ: 1
    }

    for (const prop of geometryGroup!.properties) {
      prop.accessor.get()
      if (prop.editable && prop.accessor.set) {
        prop.accessor.set(propertyValues[prop.name] ?? 0)
      }
      prop.accessor.get()
    }

    expect(arc.center.x).toBeCloseTo(11)
    expect(arc.center.y).toBeCloseTo(12)
    expect(arc.radius).toBeCloseTo(14)
    expect(arc.startAngle).toBeCloseTo(Math.PI / 6)
    expect(arc.endAngle).toBeCloseTo(Math.PI / 3)
  })

  it('returns grip points for center/start/end', () => {
    createWorkingDb()
    const arc = new AcDbArc(new AcGePoint2d(0, 0), 2, 0, Math.PI / 2)
    const gripPoints = arc.subGetGripPoints()

    expect(gripPoints).toHaveLength(3)
    expect(gripPoints[0]).toMatchObject({
      x: arc.center.x,
      y: arc.center.y
    })
    expect(gripPoints[1]).toMatchObject({
      x: arc.startPoint.x,
      y: arc.startPoint.y
    })
    expect(gripPoints[2]).toMatchObject({
      x: arc.endPoint.x,
      y: arc.endPoint.y
    })
  })

  it('computes osnap points for all supported modes', () => {
    createWorkingDb()
    const arc = new AcDbArc(new AcGePoint2d(0, 0), 5, 0, Math.PI)
    const endPoints: AcGePoint2d[] = []
    arc.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new AcGePoint2d(9, 9),
      new AcGePoint2d(),
      endPoints
    )
    expect(endPoints).toHaveLength(2)

    const midPoints: AcGePoint2d[] = []
    arc.subGetOsnapPoints(
      AcDbOsnapMode.MidPoint,
      new AcGePoint2d(9, 9),
      new AcGePoint2d(),
      midPoints
    )
    expect(midPoints).toHaveLength(1)

    const nearestPoints: AcGePoint2d[] = []
    arc.subGetOsnapPoints(
      AcDbOsnapMode.Nearest,
      new AcGePoint2d(9, 9),
      new AcGePoint2d(),
      nearestPoints
    )
    expect(nearestPoints).toHaveLength(1)
    expect(nearestPoints[0].x).toBeCloseTo(5 / Math.SQRT2, 8)
    expect(nearestPoints[0].y).toBeCloseTo(5 / Math.SQRT2, 8)

    const perpendicularPoints: AcGePoint2d[] = []
    arc.subGetOsnapPoints(
      AcDbOsnapMode.Perpendicular,
      new AcGePoint2d(10, 0),
      new AcGePoint2d(),
      perpendicularPoints
    )
    expect(perpendicularPoints).toHaveLength(1)
    expect(perpendicularPoints[0]).toMatchObject({ x: 5, y: 0 })

    const tangentPoints: AcGePoint2d[] = []
    arc.subGetOsnapPoints(
      AcDbOsnapMode.Tangent,
      new AcGePoint2d(9, 9),
      new AcGePoint2d(),
      tangentPoints
    )
    expect(tangentPoints.length).toBeGreaterThan(0)
    for (const point of tangentPoints) {
      // The radius meets the line from the pick point at a right angle.
      expect(point.x * (point.x - 9) + point.y * (point.y - 9)).toBeCloseTo(
        0,
        6
      )
    }

    const centerPoints: AcGePoint2d[] = []
    arc.subGetOsnapPoints(
      AcDbOsnapMode.Center,
      new AcGePoint2d(9, 9),
      new AcGePoint2d(),
      centerPoints
    )
    expect(centerPoints).toHaveLength(1)
    expect(centerPoints[0]).toMatchObject({
      x: arc.center.x,
      y: arc.center.y
    })

    const unsupportedPoints: AcGePoint2d[] = []
    arc.subGetOsnapPoints(
      AcDbOsnapMode.Node,
      new AcGePoint2d(9, 9),
      new AcGePoint2d(),
      unsupportedPoints
    )
    expect(unsupportedPoints).toHaveLength(0)
  })

  it('transforms itself and draws with renderer', () => {
    createWorkingDb()
    const arc = new AcDbArc(new AcGePoint2d(1, 2), 2, 0, Math.PI / 2)
    const matrix = new AcGeMatrix3d().makeTranslation(10, -2, 1)

    expect(arc.transformBy(matrix)).toBe(arc)
    expect(arc.center.x).toBeCloseTo(11)
    expect(arc.center.y).toBeCloseTo(0)

    const drawResult = { id: 'arc-rendered' }
    const renderer = {
      circularArc: jest.fn(() => drawResult)
    }

    expect(arc.subWorldDraw(renderer as never)).toBe(drawResult)
    expect(renderer.circularArc).toHaveBeenCalledTimes(1)
  })

  it('increases radius when offsetting outward', () => {
    const arc = new AcDbArc(new AcGePoint2d(0, 0), 5, 0, Math.PI)
    const [result] = arc.getOffsetCurves(2) as AcDbArc[]
    expect(result.radius).toBeCloseTo(7)
  })

  it('returns empty array when inward offset collapses radius', () => {
    const arc = new AcDbArc(new AcGePoint2d(0, 0), 2, 0, Math.PI)
    expect(arc.getOffsetCurves(-3)).toEqual([])
  })

  it('returns 0 area for open arc', () => {
    const arc = new AcDbArc(new AcGePoint2d(), 5, 0, Math.PI / 2)
    expect(arc.area).toBe(0)
  })
})
