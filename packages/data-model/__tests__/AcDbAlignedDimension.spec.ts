import {
  AcGeMatrix3d,
  AcGePoint2d,
  AcGeVector3d
} from '@mlightcad/geometry-engine'
import { acdbHostApplicationServices } from '../src/base'
import { AcDbBlockTableRecord, AcDbDatabase } from '../src/database'
import { AcDbAlignedDimension, AcDbLine } from '../src/entity'
import { AcDbOsnapMode } from '../src/misc'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

const createDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

describe('AcDbAlignedDimension', () => {
  it('creates a detached clone with a new objectId', () => {
    expectDetachedClone(
      () =>
        new AcDbAlignedDimension(
          new AcGePoint2d(),
          new AcGePoint2d(1, 0),
          new AcGePoint2d(0, 1)
        )
    )
  })

  it('resolves osnap points through its anonymous dimension block', () => {
    const db = createDb()

    const dimBlock = new AcDbBlockTableRecord()
    dimBlock.name = '*D_TEST'
    const line = new AcDbLine(new AcGePoint2d(1, 2), new AcGePoint2d(4, 2))
    dimBlock.appendEntity(line)
    db.tables.blockTable.add(dimBlock)

    const dim = new AcDbAlignedDimension(
      new AcGePoint2d(0, 0),
      new AcGePoint2d(5, 0),
      new AcGePoint2d(5, 1)
    )
    dim.dimBlockId = '*D_TEST'
    dim.dimBlockPosition = new AcGePoint2d(10, 20)
    db.tables.blockTable.modelSpace.appendEntity(dim)

    const snapsByGsMark: AcGePoint2d[] = []
    dim.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new AcGePoint2d(),
      new AcGePoint2d(),
      snapsByGsMark,
      line.objectId
    )

    expect(snapsByGsMark).toHaveLength(2)
    expect(snapsByGsMark[0]).toMatchObject({ x: 11, y: 22 })
    expect(snapsByGsMark[1]).toMatchObject({ x: 14, y: 22 })

    const snapsWithoutGsMark: AcGePoint2d[] = []
    dim.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new AcGePoint2d(),
      new AcGePoint2d(),
      snapsWithoutGsMark
    )
    expect(snapsWithoutGsMark.length).toBeGreaterThanOrEqual(2)
  })

  it('returns transformed geometric extents from dimension block', () => {
    const db = createDb()

    const dimBlock = new AcDbBlockTableRecord()
    dimBlock.name = '*D_EXTENTS'
    dimBlock.appendEntity(
      new AcDbLine(new AcGePoint2d(1, 2), new AcGePoint2d(4, 6))
    )
    db.tables.blockTable.add(dimBlock)

    const dim = new AcDbAlignedDimension(
      new AcGePoint2d(0, 0),
      new AcGePoint2d(5, 0),
      new AcGePoint2d(5, 1)
    )
    dim.dimBlockId = '*D_EXTENTS'
    dim.dimBlockPosition = new AcGePoint2d(10, 20)
    db.tables.blockTable.modelSpace.appendEntity(dim)

    const extents = dim.geometricExtents
    expect(extents.isEmpty()).toBe(false)
    expect(extents.min).toMatchObject({ x: 11, y: 22 })
    expect(extents.max).toMatchObject({ x: 14, y: 26 })
  })

  it('rotates dimension block geometry with transformBy', () => {
    const db = createDb()

    const dimBlock = new AcDbBlockTableRecord()
    dimBlock.name = '*D_ROTATE'
    dimBlock.appendEntity(
      new AcDbLine(new AcGePoint2d(1, 2), new AcGePoint2d(4, 2))
    )
    db.tables.blockTable.add(dimBlock)

    const dim = new AcDbAlignedDimension(
      new AcGePoint2d(0, 0),
      new AcGePoint2d(5, 0),
      new AcGePoint2d(5, 1)
    )
    dim.dimBlockId = '*D_ROTATE'
    dim.dimBlockPosition = new AcGePoint2d(10, 20)
    db.tables.blockTable.modelSpace.appendEntity(dim)

    const before = dim.geometricExtents
    expect(before.min).toMatchObject({ x: 11, y: 22 })
    expect(before.max).toMatchObject({ x: 14, y: 22 })

    dim.transformBy(new AcGeMatrix3d().makeRotationZ(Math.PI / 2))

    const after = dim.geometricExtents
    expect(after.min.x).toBeCloseTo(-22, 8)
    expect(after.min.y).toBeCloseTo(11, 8)
    expect(after.max.x).toBeCloseTo(-22, 8)
    expect(after.max.y).toBeCloseTo(14, 8)
  })

  it('updates geometricExtents when dimBlockPosition changes', () => {
    const db = createDb()

    const dimBlock = new AcDbBlockTableRecord()
    dimBlock.name = '*D_MOVE'
    dimBlock.appendEntity(
      new AcDbLine(new AcGePoint2d(0, 0), new AcGePoint2d(2, 0))
    )
    db.tables.blockTable.add(dimBlock)

    const dim = new AcDbAlignedDimension(
      new AcGePoint2d(0, 0),
      new AcGePoint2d(5, 0),
      new AcGePoint2d(5, 1)
    )
    dim.dimBlockId = '*D_MOVE'
    dim.dimBlockPosition = new AcGePoint2d(0, 0)
    db.tables.blockTable.modelSpace.appendEntity(dim)

    expect(dim.geometricExtents.max).toMatchObject({ x: 2, y: 0 })

    dim.dimBlockPosition = new AcGePoint2d(10, 20)

    expect(dim.geometricExtents.min).toMatchObject({ x: 10, y: 20 })
    expect(dim.geometricExtents.max).toMatchObject({ x: 12, y: 20 })
  })

  it('returns geometricExtents from definition points when dim block is absent', () => {
    const db = createDb()
    const dim = new AcDbAlignedDimension(
      new AcGePoint2d(0, 0),
      new AcGePoint2d(5, 0),
      new AcGePoint2d(5, 2)
    )
    db.tables.blockTable.modelSpace.appendEntity(dim)

    const extents = dim.geometricExtents
    expect(extents.isEmpty()).toBe(false)
    expect(extents.min).toMatchObject({ x: 0, y: 0 })
    expect(extents.max).toMatchObject({ x: 5, y: 2 })

    dim.dimLinePoint = new AcGePoint2d(5, 8)

    expect(dim.geometricExtents.max.y).toBeCloseTo(8)
  })

  it('includes textPosition in fallback extents when text is placed away from origin', () => {
    const db = createDb()
    const dim = new AcDbAlignedDimension(
      new AcGePoint2d(10, 10),
      new AcGePoint2d(20, 10),
      new AcGePoint2d(20, 12)
    )
    dim.textPosition = new AcGePoint2d(5, 5)
    db.tables.blockTable.modelSpace.appendEntity(dim)

    expect(dim.geometricExtents.min).toMatchObject({ x: 5, y: 5 })
    expect(dim.geometricExtents.max).toMatchObject({ x: 20, y: 12 })
  })

  it('returns definition and text grip points', () => {
    const dim = new AcDbAlignedDimension(
      new AcGePoint2d(0, 0),
      new AcGePoint2d(5, 0),
      new AcGePoint2d(5, 1)
    )
    dim.textPosition = new AcGePoint2d(3, 4)

    const grips = dim.subGetGripPoints()

    expect(grips).toHaveLength(4)
    expect(grips[0]).toBe(dim.xLine1Point)
    expect(grips[1]).toBe(dim.xLine2Point)
    expect(grips[2]).toBe(dim.dimLinePoint)
    expect(grips[3]).toBe(dim.textPosition)
  })

  it('moves definition and text grip points', () => {
    const dim = new AcDbAlignedDimension(
      new AcGePoint2d(0, 0),
      new AcGePoint2d(5, 0),
      new AcGePoint2d(5, 1)
    )
    dim.textPosition = new AcGePoint2d(3, 4)

    dim.subMoveGripPointsAt([0, 3], new AcGeVector3d(1, 2, 0))

    expect(dim.xLine1Point).toMatchObject({ x: 1, y: 2 })
    expect(dim.textPosition).toMatchObject({ x: 4, y: 6 })
  })
})
