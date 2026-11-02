import { GeometryPoint2d } from '@mlightcad/geometry-engine'
import { AcCmColor } from '@mlightcad/common'
import { acdbHostApplicationServices } from '../src/base'
import { AcDbDatabase } from '../src/database'
import { AcDbLayerTableRecord } from '../src/database/AcDbLayerTableRecord'
import {
  AcDbAttribute,
  AcDbBlockReference,
  AcDbMText,
  AcDbTextVerticalMode
} from '../src/entity'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

const setWorkingDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

describe('AcDbAttribute', () => {
  it('has expected type metadata', () => {
    const attribute = new AcDbAttribute()

    expect(AcDbAttribute.typeName).toBe('Attrib')
    expect(attribute.dxfTypeName).toBe('ATTRIB')
  })

  it('toggles attribute flags via boolean accessors', () => {
    const attribute = new AcDbAttribute()

    expect(attribute.isInvisible).toBe(false)
    attribute.isInvisible = true
    expect(attribute.isInvisible).toBe(true)
    attribute.isInvisible = false
    expect(attribute.isInvisible).toBe(false)

    expect(attribute.isConst).toBe(false)
    attribute.isConst = true
    expect(attribute.isConst).toBe(true)
    attribute.isConst = false
    expect(attribute.isConst).toBe(false)

    expect(attribute.isVerifiable).toBe(false)
    attribute.isVerifiable = true
    expect(attribute.isVerifiable).toBe(true)
    attribute.isVerifiable = false
    expect(attribute.isVerifiable).toBe(false)

    expect(attribute.isPreset).toBe(false)
    attribute.isPreset = true
    expect(attribute.isPreset).toBe(true)
    attribute.isPreset = false
    expect(attribute.isPreset).toBe(false)

    expect(attribute.isConstMTextAttribute).toBe(false)
    attribute.isConstMTextAttribute = true
    expect(attribute.isConstMTextAttribute).toBe(true)
    attribute.isConstMTextAttribute = false
    expect(attribute.isConstMTextAttribute).toBe(false)
  })

  it('supports scalar properties', () => {
    const attribute = new AcDbAttribute()

    attribute.tag = 'TAG_A'
    attribute.fieldLength = 64
    attribute.lockPositionInBlock = true
    attribute.isReallyLocked = true

    expect(attribute.tag).toBe('TAG_A')
    expect(attribute.fieldLength).toBe(64)
    expect(attribute.lockPositionInBlock).toBe(true)
    expect(attribute.isReallyLocked).toBe(true)
  })

  it('updates mtext and multiline flags automatically', () => {
    const attribute = new AcDbAttribute()
    const mtext = new AcDbMText()

    expect(attribute.mtext).toBeUndefined()
    expect(attribute.isMTextAttribute).toBe(false)

    attribute.mtext = mtext
    expect(attribute.mtext).toBe(mtext)
    expect(attribute.isMTextAttribute).toBe(true)

    attribute.isMTextAttribute = false
    expect(attribute.isMTextAttribute).toBe(false)

    attribute.mtext = undefined
    expect(attribute.mtext).toBeUndefined()
    expect(attribute.isMTextAttribute).toBe(false)
  })

  it('clone creates a detached clone with a new objectId', () => {
    expectDetachedClone(() => new AcDbAttribute())
  })

  it('returns geometricExtents and recomputes when position changes', () => {
    setWorkingDb()
    const attribute = new AcDbAttribute()
    attribute.textString = 'A'
    attribute.height = 2
    attribute.verticalMode = AcDbTextVerticalMode.BASELINE
    attribute.position = new GeometryPoint2d(1, 2)

    expect(attribute.geometricExtents.min).toMatchObject({ x: 1, y: 2 })
    expect(attribute.geometricExtents.max.x).toBeCloseTo(3)

    attribute.position = new GeometryPoint2d(8, 9)

    expect(attribute.geometricExtents.min).toMatchObject({ x: 8, y: 9 })
    expect(attribute.geometricExtents.max.x).toBeCloseTo(10)
  })

  it('resolves ByBlock color from the owning INSERT, not CECOLOR', () => {
    const db = setWorkingDb()
    const viewportLayer = new AcDbLayerTableRecord()
    viewportLayer.name = 'Viewport'
    viewportLayer.color = new AcCmColor()
    viewportLayer.color.setForeground()
    db.tables.layerTable.add(viewportLayer)

    const insert = new AcDbBlockReference('BLOCK')
    insert.layer = 'Viewport'
    db.tables.blockTable.modelSpace.appendEntity(insert)

    const attribute = new AcDbAttribute()
    attribute.color.setByBlock()
    insert.appendAttributes(attribute)

    expect(attribute.database).toBe(db)
    expect(attribute.resolvedColor.isForeground).toBe(true)
  })

  it('resolves ByLayer color from the attribute layer, not the INSERT layer', () => {
    const db = setWorkingDb()
    const viewportLayer = new AcDbLayerTableRecord()
    viewportLayer.name = 'Viewport'
    viewportLayer.color = new AcCmColor()
    viewportLayer.color.setForeground()
    db.tables.layerTable.add(viewportLayer)

    const cartoucheLayer = new AcDbLayerTableRecord()
    cartoucheLayer.name = 'CARTOUCHE'
    cartoucheLayer.color = new AcCmColor()
    cartoucheLayer.color.colorIndex = 40
    db.tables.layerTable.add(cartoucheLayer)

    const insert = new AcDbBlockReference('BLOCK')
    insert.layer = 'Viewport'
    db.tables.blockTable.modelSpace.appendEntity(insert)

    const attribute = new AcDbAttribute()
    attribute.layer = 'CARTOUCHE'
    attribute.color.setByLayer()
    insert.appendAttributes(attribute)

    expect(attribute.database).toBe(db)
    expect(attribute.resolvedColor.colorIndex).toBe(40)
    expect(attribute.resolvedColor.isForeground).toBe(false)
  })
})
