import {
  GeometryMatrix3d,
  GeometryPoint2d,
  GeometryVector3d
} from '@mlightcad/geometry-engine'
import { acdbHostApplicationServices } from '../src/base'
import { AcDbDatabase } from '../src/database'
import { AcDbLine } from '../src/entity'
import { AcDbOsnapMode } from '../src/misc'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

const createWorkingDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

describe('AcDbLine', () => {
  it('exposes expected type names', () => {
    const line = new AcDbLine(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(1, 2)
    )

    expect(AcDbLine.typeName).toBe('Line')
    expect(line.dxfTypeName).toBe('LINE')
    expect(line.closed).toBe(false)
  })

  it('supports start/end point setters and derived geometric getters', () => {
    const line = new AcDbLine(
      new GeometryPoint2d(-1, 10),
      new GeometryPoint2d(3, 2)
    )

    line.startPoint = { x: 2, y: 6 }
    line.endPoint = { x: 10, y: 14 }

    expect(line.startPoint).toMatchObject({ x: 2, y: 6 })
    expect(line.endPoint).toMatchObject({ x: 10, y: 14 })
    expect(line.midPoint).toMatchObject({ x: 6, y: 10 })

    const extents = line.geometricExtents
    expect(extents.min).toMatchObject({ x: 2, y: 6 })
    expect(extents.max).toMatchObject({ x: 10, y: 14 })
  })

  it('exposes editable geometry properties through accessors', () => {
    const line = new AcDbLine(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(3, 4)
    )
    const geometryGroup = line.properties.groups.find(
      g => g.groupName === 'geometry'
    )

    expect(line.properties.type).toBe('Line')
    expect(geometryGroup).toBeDefined()
    expect(geometryGroup?.properties.map(p => p.name)).toEqual([
      'startX',
      'startY',
      'endX',
      'endY',
      'length'
    ])

    const startX = geometryGroup?.properties.find(p => p.name === 'startX')
    const startY = geometryGroup?.properties.find(p => p.name === 'startY')
    const endX = geometryGroup?.properties.find(p => p.name === 'endX')
    const endY = geometryGroup?.properties.find(p => p.name === 'endY')
    const length = geometryGroup?.properties.find(p => p.name === 'length')

    startX?.accessor.set?.(1.5)
    startY?.accessor.set?.(-2.5)
    endX?.accessor.set?.(4.5)
    endY?.accessor.set?.(5.5)

    expect(startX?.accessor.get()).toBe(1.5)
    expect(startY?.accessor.get()).toBe(-2.5)
    expect(endX?.accessor.get()).toBe(4.5)
    expect(endY?.accessor.get()).toBe(5.5)
    expect(length?.editable).toBe(false)
    expect(length?.accessor.get()).toBeCloseTo(
      Math.sqrt((4.5 - 1.5) * (4.5 - 1.5) + (5.5 - -2.5) * (5.5 - -2.5))
    )
  })

  it('returns grip points in midpoint-start-end order', () => {
    const line = new AcDbLine(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(8, 2)
    )

    const gripPoints = line.subGetGripPoints()

    expect(gripPoints).toHaveLength(3)
    expect(gripPoints[0]).toMatchObject({ x: 4, y: 1 })
    expect(gripPoints[1]).toMatchObject({
      x: line.startPoint.x,
      y: line.startPoint.y
    })
    expect(gripPoints[2]).toMatchObject({
      x: line.endPoint.x,
      y: line.endPoint.y
    })
  })

  it('moves grip points by index', () => {
    const line = new AcDbLine(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(10, 0)
    )

    line.subMoveGripPointsAt([0], new GeometryVector3d(1, 2, 3))
    expect(line.startPoint).toMatchObject({ x: 1, y: 2 })
    expect(line.endPoint).toMatchObject({ x: 11, y: 2 })

    line.subMoveGripPointsAt([1], new GeometryVector3d(-1, 0, 0))
    expect(line.startPoint).toMatchObject({ x: 0, y: 2 })
    expect(line.endPoint).toMatchObject({ x: 11, y: 2 })

    line.subMoveGripPointsAt([2], new GeometryVector3d(0, 1, 0))
    expect(line.endPoint).toMatchObject({ x: 11, y: 3 })
  })

  it('computes osnap points for all supported modes', () => {
    const line = new AcDbLine(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(10, 0)
    )
    const endPoints: GeometryPoint2d[] = []
    line.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new GeometryPoint2d(1, 1),
      new GeometryPoint2d(),
      endPoints
    )
    expect(endPoints).toEqual([
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(10, 0)
    ])

    const midPoints: GeometryPoint2d[] = []
    line.subGetOsnapPoints(
      AcDbOsnapMode.MidPoint,
      new GeometryPoint2d(1, 1),
      new GeometryPoint2d(),
      midPoints
    )
    expect(midPoints).toHaveLength(1)
    expect(midPoints[0]).toMatchObject({ x: 5, y: 0 })

    const nearestPoints: GeometryPoint2d[] = []
    line.subGetOsnapPoints(
      AcDbOsnapMode.Nearest,
      new GeometryPoint2d(2, 3),
      new GeometryPoint2d(),
      nearestPoints
    )
    expect(nearestPoints).toEqual([new GeometryPoint2d(2, 0)])

    const perpendicularPoints: GeometryPoint2d[] = []
    line.subGetOsnapPoints(
      AcDbOsnapMode.Perpendicular,
      new GeometryPoint2d(4, 3),
      new GeometryPoint2d(),
      perpendicularPoints
    )
    expect(perpendicularPoints).toEqual([new GeometryPoint2d(4, 0)])

    const tangentPoints: GeometryPoint2d[] = []
    line.subGetOsnapPoints(
      AcDbOsnapMode.Tangent,
      new GeometryPoint2d(1, 1),
      new GeometryPoint2d(),
      tangentPoints
    )
    expect(tangentPoints).toHaveLength(0)

    const unsupportedPoints: GeometryPoint2d[] = []
    line.subGetOsnapPoints(
      AcDbOsnapMode.Center,
      new GeometryPoint2d(1, 1),
      new GeometryPoint2d(),
      unsupportedPoints
    )
    expect(unsupportedPoints).toHaveLength(0)
  })

  it('transforms itself and draws via renderer.lines', () => {
    const line = new AcDbLine(
      new GeometryPoint2d(1, 2),
      new GeometryPoint2d(4, 5)
    )
    const matrix = new GeometryMatrix3d().makeTranslation(10, -3, 2)
    const drawResult = { id: 'line-rendered' }
    const renderer = {
      lines: jest.fn(() => drawResult)
    }

    expect(line.transformBy(matrix)).toBe(line)
    expect(line.startPoint).toMatchObject({ x: 11, y: -1 })
    expect(line.endPoint).toMatchObject({ x: 14, y: 2 })

    expect(line.subWorldDraw(renderer as never)).toBe(drawResult)
    expect(renderer.lines).toHaveBeenCalledTimes(1)
    expect(renderer.lines).toHaveBeenCalledWith([
      expect.objectContaining({ x: 11, y: -1 }),
      expect.objectContaining({ x: 14, y: 2 })
    ])
  })
  it('creates a detached clone with a new objectId', () => {
    createWorkingDb()
    expectDetachedClone(
      () => new AcDbLine(new GeometryPoint2d(), new GeometryPoint2d(1, 1))
    )
  })

  it('offsets a horizontal line upward by distance 2', () => {
    const line = new AcDbLine(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(10, 0)
    )
    const [result] = line.getOffsetCurves(2) as AcDbLine[]
    expect(result.startPoint.y).toBeCloseTo(2)
    expect(result.endPoint.y).toBeCloseTo(2)
  })

  it('offsets a horizontal line downward with negative distance', () => {
    const line = new AcDbLine(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(10, 0)
    )
    const [result] = line.getOffsetCurves(-2) as AcDbLine[]
    expect(result.startPoint.y).toBeCloseTo(-2)
    expect(result.endPoint.y).toBeCloseTo(-2)
  })

  it('returns 1 for point above a horizontal line in getOffsetSideAtPoint', () => {
    const line = new AcDbLine(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(10, 0)
    )
    expect(line.getOffsetSideAtPoint(new GeometryPoint2d(5, 3))).toBe(1)
  })

  it('returns -1 for point below a horizontal line in getOffsetSideAtPoint', () => {
    const line = new AcDbLine(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(10, 0)
    )
    expect(line.getOffsetSideAtPoint(new GeometryPoint2d(5, -3))).toBe(-1)
  })

  it('returns 0 area', () => {
    const line = new AcDbLine(new GeometryPoint2d(), new GeometryPoint2d(10, 0))
    expect(line.area).toBe(0)
  })
})
