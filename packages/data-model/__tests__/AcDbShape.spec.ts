import { GeometryMatrix3d, GeometryPoint2d } from '@mlightcad/geometry-engine'

import { acdbHostApplicationServices } from '../src/base'
import { AcDbDatabase } from '../src/database'
import { AcDbShape } from '../src/entity'
import { AcDbOsnapMode } from '../src/misc'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

const createWorkingDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

describe('AcDbShape', () => {
  it('exposes static and DXF type names', () => {
    createWorkingDb()
    const shape = new AcDbShape()

    expect(AcDbShape.typeName).toBe('Shape')
    expect(shape.dxfTypeName).toBe('SHAPE')
    expect(shape.isPlanar).toBe(true)
  })

  it('initializes defaults and supports property accessors', () => {
    createWorkingDb()
    const shape = new AcDbShape()

    expect(shape.position).toMatchObject({ x: 0, y: 0 })
    expect(shape.size).toBe(1)
    expect(shape.name).toBe('')
    expect(shape.rotation).toBe(0)
    expect(shape.widthFactor).toBe(1)
    expect(shape.oblique).toBe(0)
    expect(shape.thickness).toBe(0)
    expect(shape.normal).toMatchObject({ x: 0, y: 0, z: 1 })
    expect(shape.shapeNumber).toBe(0)
    expect(shape.styleName).toBe('')

    shape.name = 'ARROW'
    shape.position = new GeometryPoint2d(100, 200)
    shape.size = 2.5
    shape.rotation = Math.PI / 4
    shape.widthFactor = 1.5
    shape.oblique = Math.PI / 18
    shape.thickness = 0.5
    shape.normal = { x: 0, y: 0, z: 1 }
    shape.shapeNumber = 42
    shape.styleName = 'STANDARD'

    expect(shape.name).toBe('ARROW')
    expect(shape.position).toMatchObject({ x: 100, y: 200 })
    expect(shape.size).toBe(2.5)
    expect(shape.rotation).toBeCloseTo(Math.PI / 4)
    expect(shape.widthFactor).toBe(1.5)
    expect(shape.oblique).toBeCloseTo(Math.PI / 18)
    expect(shape.thickness).toBe(0.5)
    expect(shape.shapeNumber).toBe(42)
    expect(shape.styleName).toBe('STANDARD')
  })

  it('returns geometricExtents and updates when position or size change', () => {
    createWorkingDb()
    const shape = new AcDbShape()
    shape.position = { x: 10, y: 20 }
    shape.size = 4

    expect(shape.geometricExtents.min).toMatchObject({ x: 8, y: 18 })
    expect(shape.geometricExtents.max).toMatchObject({ x: 12, y: 22 })

    shape.position = { x: 0, y: 0 }
    shape.size = 10

    expect(shape.geometricExtents.min).toMatchObject({ x: -5, y: -5 })
    expect(shape.geometricExtents.max).toMatchObject({ x: 5, y: 5 })
  })

  it('returns insertion point for grips and osnap', () => {
    createWorkingDb()
    const shape = new AcDbShape()
    shape.position = { x: 3, y: 4 }

    expect(shape.subGetGripPoints()).toEqual([shape.position])

    const snapPoints: GeometryPoint2d[] = []
    shape.subGetOsnapPoints(
      AcDbOsnapMode.Insertion,
      new GeometryPoint2d(),
      new GeometryPoint2d(),
      snapPoints
    )
    expect(snapPoints).toHaveLength(1)
    expect(snapPoints[0]).toBe(shape.position)
  })

  it('transforms position, size, and orientation', () => {
    createWorkingDb()
    const shape = new AcDbShape()
    shape.position = { x: 1, y: 0 }
    shape.size = 2
    shape.widthFactor = 1
    shape.rotation = 0

    shape.transformBy(new GeometryMatrix3d().makeTranslation(10, 0, 0))

    expect(shape.position).toMatchObject({ x: 11, y: 0 })
  })

  it('supports detached clone', () => {
    createWorkingDb()
    expectDetachedClone(() => new AcDbShape())
  })

  it('passes undefined text style when styleName is empty', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    db.textstyle = 'pipe'
    acdbHostApplicationServices().workingDatabase = db

    const shape = new AcDbShape()
    shape.database = db
    shape.name = '_GV_'
    shape.size = 0.01
    shape.position = new GeometryPoint2d(100, 200)

    const renderer = {
      shape: jest.fn(() => ({ objectId: 'S1' }))
    } as unknown as { shape: jest.Mock }

    shape.subWorldDraw(renderer as never)

    const [, textStyle] = renderer.shape.mock.calls[0]
    expect(textStyle).toBeUndefined()
  })

  it('renders via renderer.shape with shape glyph metadata', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    acdbHostApplicationServices().workingDatabase = db

    const shape = new AcDbShape()
    shape.database = db
    shape.name = 'ARROW'
    shape.shapeNumber = 33
    shape.size = 2.5
    shape.widthFactor = 1.5
    shape.position = new GeometryPoint2d(100, 200)
    shape.rotation = Math.PI / 4
    shape.oblique = Math.PI / 18
    shape.normal = { x: 0, y: 0, z: 1 }
    shape.styleName = 'STANDARD'

    const giEntity = { objectId: 'S1' }
    const renderer = {
      shape: jest.fn(() => giEntity)
    } as unknown as { shape: jest.Mock }

    const result = shape.subWorldDraw(renderer as never, true)

    expect(result).toBe(giEntity)
    expect(renderer.shape).toHaveBeenCalledTimes(1)
    const [shapeData, textStyle, delay] = renderer.shape.mock.calls[0]
    expect(shapeData).toMatchObject({
      name: 'ARROW',
      shapeNumber: 33,
      size: 2.5,
      widthFactor: 1.5,
      position: shape.position,
      rotation: Math.PI / 4
    })
    expect(textStyle).toMatchObject({
      widthFactor: 1.5,
      obliqueAngle: 10
    })
    expect(delay).toBe(true)
  })

  it('passes numeric shape name to renderer as shapeNumber only', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    acdbHostApplicationServices().workingDatabase = db

    const shape = new AcDbShape()
    shape.database = db
    shape.name = '9'
    shape.size = 0.01
    shape.position = new GeometryPoint2d(1, 2)

    const renderer = {
      shape: jest.fn(() => ({ objectId: 'S1' }))
    } as unknown as { shape: jest.Mock }

    shape.subWorldDraw(renderer as never)

    const [shapeData] = renderer.shape.mock.calls[0]
    expect(shapeData.name).toBeUndefined()
    expect(shapeData.shapeNumber).toBe(9)
  })
})
