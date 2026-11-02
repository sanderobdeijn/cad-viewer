import { GeometryPoint2d } from '@mlightcad/geometry-engine'
import { acdbHostApplicationServices } from '../src/base'
import { AcDbBlockTableRecord, AcDbDatabase } from '../src/database'
import { AcDbLine, AcDbRotatedDimension } from '../src/entity'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

const createDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

describe('AcDbRotatedDimension', () => {
  it('creates a detached clone with a new objectId', () => {
    expectDetachedClone(
      () =>
        new AcDbRotatedDimension(
          new GeometryPoint2d(),
          new GeometryPoint2d(1, 0),
          new GeometryPoint2d(0, 1)
        )
    )
  })

  it('returns geometricExtents and updates when dimBlockPosition changes', () => {
    const db = createDb()

    const dimBlock = new AcDbBlockTableRecord()
    dimBlock.name = '*D_ROTATED'
    dimBlock.appendEntity(
      new AcDbLine(new GeometryPoint2d(0, 0), new GeometryPoint2d(3, 0))
    )
    db.tables.blockTable.add(dimBlock)

    const dim = new AcDbRotatedDimension(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(5, 0),
      new GeometryPoint2d(5, 1)
    )
    dim.dimBlockId = '*D_ROTATED'
    dim.dimBlockPosition = new GeometryPoint2d(0, 0)
    db.tables.blockTable.modelSpace.appendEntity(dim)

    expect(dim.geometricExtents.max.x).toBeCloseTo(3)

    dim.dimBlockPosition = new GeometryPoint2d(10, 20)

    expect(dim.geometricExtents.min).toMatchObject({ x: 10, y: 20 })
    expect(dim.geometricExtents.max.x).toBeCloseTo(13)
  })
})
