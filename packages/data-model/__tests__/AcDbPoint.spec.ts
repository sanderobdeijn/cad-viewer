import { AcGeMatrix3d, AcGePoint3d } from '@mlightcad/geometry-engine'

import { acdbHostApplicationServices } from '../src/base'
import { AcDbDatabase } from '../src/database'
import { AcDbPoint } from '../src/entity'
import { AcDbOsnapMode } from '../src/misc'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

const createWorkingDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

describe('AcDbPoint', () => {
  it('exposes static and DXF type names', () => {
    createWorkingDb()
    const point = new AcDbPoint()

    expect(AcDbPoint.typeName).toBe('Point')
    expect(point.dxfTypeName).toBe('POINT')
  })

  it('initializes at origin and supports position getter/setter', () => {
    createWorkingDb()
    const point = new AcDbPoint()

    expect(point.position).toMatchObject({ x: 0, y: 0 })

    const source = new AcGePoint3d(1, 2, 3)
    point.position = source
    source.x = 100
    source.y = 200
    source.z = 300

    expect(point.position).toMatchObject({ x: 1, y: 2 })

    point.position = { x: -4, y: 5 }
    expect(point.position).toMatchObject({ x: -4, y: 5 })
  })

  it('returns point-like geometric extents', () => {
    createWorkingDb()
    const point = new AcDbPoint()
    point.position = { x: 7.5, y: -2 }

    const extents = point.geometricExtents
    expect(extents.min).toMatchObject({ x: 7.5, y: -2, z: 0 })
    expect(extents.max).toMatchObject({ x: 7.5, y: -2, z: 0 })
  })

  it('updates geometricExtents when position changes', () => {
    createWorkingDb()
    const point = new AcDbPoint()
    point.position = { x: 1, y: 2 }

    expect(point.geometricExtents.min).toMatchObject({ x: 1, y: 2, z: 0 })

    point.position = { x: 10, y: -5 }

    expect(point.geometricExtents.min).toMatchObject({ x: 10, y: -5, z: 0 })
    expect(point.geometricExtents.max).toMatchObject({ x: 10, y: -5, z: 0 })
  })

  it('adds osnap point only in Node mode', () => {
    createWorkingDb()
    const point = new AcDbPoint()
    point.position = { x: 3, y: 4 }

    const nodePoints: AcGePoint3d[] = []
    point.subGetOsnapPoints(
      AcDbOsnapMode.Node,
      new AcGePoint3d(),
      new AcGePoint3d(),
      nodePoints
    )
    expect(nodePoints).toHaveLength(1)
    expect(nodePoints[0]).toMatchObject({
      x: point.position.x,
      y: point.position.y,
      z: 0
    })

    const unsupportedModePoints: AcGePoint3d[] = []
    point.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new AcGePoint3d(),
      new AcGePoint3d(),
      unsupportedModePoints
    )
    expect(unsupportedModePoints).toHaveLength(0)
  })

  it('returns position as grip point', () => {
    createWorkingDb()
    const point = new AcDbPoint()
    point.position = { x: 7, y: 8 }
    const grips = point.subGetGripPoints()
    expect(grips).toHaveLength(1)
    expect(grips[0]).toMatchObject({
      x: point.position.x,
      y: point.position.y,
      z: 0
    })
  })

  it('exposes geometry properties with editable accessors', () => {
    createWorkingDb()
    const point = new AcDbPoint()
    const geometryGroup = point.properties.groups.find(
      group => group.groupName === 'geometry'
    )

    expect(point.properties.type).toBe('Point')
    expect(point.properties.groups.length).toBe(2)
    expect(geometryGroup).toBeDefined()

    const byName = new Map(
      geometryGroup!.properties.map(property => [property.name, property])
    )

    byName.get('positionX')!.accessor.set!(10)
    byName.get('positionY')!.accessor.set!(-20)

    expect(byName.get('positionX')!.editable).toBe(true)
    expect(byName.get('positionY')!.editable).toBe(true)
    expect(byName.get('positionX')!.accessor.get()).toBe(10)
    expect(byName.get('positionY')!.accessor.get()).toBe(-20)
    expect(point.position).toMatchObject({ x: 10, y: -20 })
  })

  it('transforms by matrix and returns itself', () => {
    createWorkingDb()
    const point = new AcDbPoint()
    point.position = { x: 1, y: 2 }

    const result = point.transformBy(
      new AcGeMatrix3d().makeTranslation(4, -2, 1)
    )

    expect(result).toBe(point)
    expect(point.position).toMatchObject({ x: 5, y: 0 })
  })

  it('draws through renderer.point with database point style', () => {
    const db = createWorkingDb()
    db.pdmode = 34
    db.pdsize = 2.5

    const point = new AcDbPoint()
    point.position = { x: 9, y: 8 }

    const rendered = { id: 'point-rendered' }
    const renderer = {
      point: jest.fn(() => rendered)
    }

    const result = point.subWorldDraw(renderer as never)

    expect(result).toBe(rendered)
    expect(renderer.point).toHaveBeenCalledTimes(1)
    expect(renderer.point).toHaveBeenCalledWith(
      new AcGePoint3d(point.position.x, point.position.y, 0),
      {
        displayMode: 34,
        displaySize: 2.5
      }
    )
  })
  it('creates a detached clone with a new objectId', () => {
    createWorkingDb()
    expectDetachedClone(() => new AcDbPoint())
  })
})
