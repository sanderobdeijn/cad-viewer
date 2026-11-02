import {
  GeometryMatrix3d,
  GeometryPoint2d,
  GeometryVector3d
} from '@mlightcad/geometry-engine'

import { acdbHostApplicationServices } from '../src/base'
import { AcDbDatabase } from '../src/database'
import { AcDbRay } from '../src/entity'
import { AcDbOsnapMode } from '../src/misc'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

const createWorkingDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

describe('AcDbRay', () => {
  it('exposes static and DXF type names and open-state flag', () => {
    const ray = new AcDbRay()

    expect(AcDbRay.typeName).toBe('Ray')
    expect(ray.dxfTypeName).toBe('RAY')
    expect(ray.closed).toBe(false)
  })

  it('supports base point and unit direction getter/setter with copy semantics', () => {
    const ray = new AcDbRay()
    const base = new GeometryPoint2d(1, 2)
    const dir = new GeometryPoint2d(0, 1)

    ray.basePoint = base
    ray.unitDir = dir
    base.set(10, 20)
    dir.set(-3, -4)

    expect(ray.basePoint).toMatchObject({ x: 1, y: 2 })
    expect(ray.unitDir).toMatchObject({ x: 0, y: 1 })
  })

  it('returns geometric extents expanded from base point in both direction offsets', () => {
    const ray = new AcDbRay()
    ray.basePoint = new GeometryPoint2d(1, 2)
    ray.unitDir = new GeometryVector3d(0, 2, -1)

    const extents = ray.geometricExtents

    expect(extents.min).toMatchObject({ x: 1, y: -18 })
    expect(extents.max).toMatchObject({ x: 1, y: 22 })
  })

  it('updates geometricExtents when basePoint changes', () => {
    const ray = new AcDbRay()
    ray.basePoint = new GeometryPoint2d(0, 0)
    ray.unitDir = new GeometryVector3d(1, 0, 0)

    expect(ray.geometricExtents.min).toMatchObject({ x: -10, y: 0 })
    expect(ray.geometricExtents.max).toMatchObject({ x: 10, y: 0 })

    ray.basePoint = new GeometryPoint2d(5, 0)

    expect(ray.geometricExtents.min).toMatchObject({ x: -5, y: 0 })
    expect(ray.geometricExtents.max).toMatchObject({ x: 15, y: 0 })
  })

  it('exposes editable geometry properties and updates ray coordinates via accessors', () => {
    const ray = new AcDbRay()
    const geometryGroup = ray.properties.groups.find(
      group => group.groupName === 'geometry'
    )

    expect(ray.properties.type).toBe('Ray')
    expect(geometryGroup).toBeDefined()
    expect(geometryGroup?.properties.map(p => p.name)).toEqual([
      'basePointX',
      'basePointY',
      'unitDirX',
      'unitDirY'
    ])

    const byName = new Map(
      geometryGroup!.properties.map(property => [property.name, property])
    )

    byName.get('basePointX')!.accessor.set!(3.5)
    byName.get('basePointY')!.accessor.set!(-4.25)
    byName.get('unitDirX')!.accessor.set!(-1)
    byName.get('unitDirY')!.accessor.set!(2)

    expect(byName.get('basePointX')!.accessor.get()).toBe(3.5)
    expect(byName.get('basePointY')!.accessor.get()).toBe(-4.25)
    expect(byName.get('unitDirX')!.accessor.get()).toBe(-1)
    expect(byName.get('unitDirY')!.accessor.get()).toBe(2)
    expect(ray.basePoint).toMatchObject({ x: 3.5, y: -4.25 })
    expect(ray.unitDir).toMatchObject({ x: -1, y: 2 })
  })

  it('returns base point as the only grip point', () => {
    const ray = new AcDbRay()
    ray.basePoint = new GeometryPoint2d(6, 7)

    const gripPoints = ray.subGetGripPoints()

    expect(gripPoints).toHaveLength(1)
    expect(gripPoints[0]).toMatchObject({
      x: ray.basePoint.x,
      y: ray.basePoint.y
    })
  })

  it('adds endpoint osnap for EndPoint mode and ignores unsupported modes', () => {
    const ray = new AcDbRay()
    ray.basePoint = new GeometryPoint2d(9, 8)
    ray.unitDir = new GeometryVector3d(1, 0, 0)
    const endpointSnaps: GeometryPoint2d[] = []
    const unsupportedSnaps: GeometryPoint2d[] = []

    ray.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new GeometryPoint2d(),
      new GeometryPoint2d(),
      endpointSnaps
    )
    ray.subGetOsnapPoints(
      AcDbOsnapMode.Center,
      new GeometryPoint2d(),
      new GeometryPoint2d(),
      unsupportedSnaps
    )

    expect(endpointSnaps).toEqual([
      new GeometryPoint2d(ray.basePoint.x, ray.basePoint.y)
    ])
    expect(unsupportedSnaps).toHaveLength(0)
  })

  it('computes nearest and perpendicular osnap points along the ray direction', () => {
    const ray = new AcDbRay()
    ray.basePoint = new GeometryPoint2d(0, 0)
    ray.unitDir = new GeometryVector3d(1, 0, 0)

    const nearestPoints: GeometryPoint2d[] = []
    ray.subGetOsnapPoints(
      AcDbOsnapMode.Nearest,
      new GeometryPoint2d(5, 3),
      new GeometryPoint2d(),
      nearestPoints
    )
    expect(nearestPoints).toHaveLength(1)
    expect(nearestPoints[0]).toMatchObject({ x: 5, y: 0 })

    const behindNearestPoints: GeometryPoint2d[] = []
    ray.subGetOsnapPoints(
      AcDbOsnapMode.Nearest,
      new GeometryPoint2d(-4, 2),
      new GeometryPoint2d(),
      behindNearestPoints
    )
    expect(behindNearestPoints).toHaveLength(1)
    expect(behindNearestPoints[0]).toMatchObject({ x: 0, y: 0 })

    const perpendicularPoints: GeometryPoint2d[] = []
    ray.subGetOsnapPoints(
      AcDbOsnapMode.Perpendicular,
      new GeometryPoint2d(2, 4),
      new GeometryPoint2d(),
      perpendicularPoints
    )
    expect(perpendicularPoints).toHaveLength(1)
    expect(perpendicularPoints[0]).toMatchObject({ x: 2, y: 0 })
  })

  it('transforms base point and direction and returns itself', () => {
    const ray = new AcDbRay()
    ray.basePoint = new GeometryPoint2d(1, 2)
    ray.unitDir = new GeometryVector3d(4, -5, 6)
    const expectedNormalized = new GeometryVector3d(4, -5, 0).normalize()

    const result = ray.transformBy(
      new GeometryMatrix3d().makeTranslation(7, -8, 9)
    )

    expect(result).toBe(ray)
    expect(ray.basePoint).toMatchObject({ x: 8, y: -6 })
    expect(ray.unitDir).toMatchObject({
      x: expectedNormalized.x,
      y: expectedNormalized.y
    })
  })

  it('draws as a line from base point to far point in direction vector', () => {
    const ray = new AcDbRay()
    ray.basePoint = new GeometryPoint2d(1, -2)
    ray.unitDir = new GeometryVector3d(0.5, 0, -1)

    const rendered = { id: 'ray-rendered' }
    const renderer = {
      lines: jest.fn(() => rendered)
    }

    const result = ray.subWorldDraw(renderer as never)

    expect(result).toBe(rendered)
    expect(renderer.lines).toHaveBeenCalledTimes(1)
    expect(renderer.lines).toHaveBeenCalledWith([
      expect.objectContaining({ x: 1, y: -2 }),
      expect.objectContaining({ x: 500001, y: -2 })
    ])
  })
  it('creates a detached clone with a new objectId', () => {
    createWorkingDb()
    expectDetachedClone(() => new AcDbRay())
  })

  it('offsets base point perpendicular to direction', () => {
    const ray = new AcDbRay()
    ray.basePoint = new GeometryPoint2d(0, 0)
    ray.unitDir = new GeometryVector3d(1, 0, 0)
    const [result] = ray.getOffsetCurves(3) as AcDbRay[]
    expect(result.basePoint.y).toBeCloseTo(3)
    expect(result.unitDir.x).toBeCloseTo(1)
  })
})
