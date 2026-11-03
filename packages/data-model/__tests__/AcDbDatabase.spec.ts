import { AcCmColor, AcCmColorMethod } from '@mlightcad/common'
import { GeometryPoint2d } from '@mlightcad/geometry-engine'

import { acdbHostApplicationServices } from '../src/base/AcDbHostApplicationServices'
import { AcDbBlockTableRecord } from '../src/database/AcDbBlockTableRecord'
import { AcDbDatabase } from '../src/database/AcDbDatabase'
import { AcDbLayerTableRecord } from '../src/database/AcDbLayerTableRecord'
import { AcDbSystemVariables } from '../src/database/AcDbSystemVariables'
import { AcDbSysVarManager } from '../src/database/AcDbSysVarManager'
import { AcDbTextStyleTableRecord } from '../src/database/AcDbTextStyleTableRecord'
import { AcDbLine } from '../src/entity/AcDbLine'
import { DEFAULT_TEXT_STYLE } from '../src/misc/AcDbConstants'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

describe('AcDbDatabase', () => {
  it('creates a detached clone with a new objectId', () => {
    expectDetachedClone(() => new AcDbDatabase())
  })

  it('assigns sequential default DWGNAME values to new databases', () => {
    const db1 = new AcDbDatabase()
    const db2 = new AcDbDatabase()

    expect(db1.dwgname).toMatch(/^Drawing\d+\.dwg$/)
    expect(db2.dwgname).toMatch(/^Drawing\d+\.dwg$/)
    expect(db1.dwgname).not.toBe(db2.dwgname)
  })

  it('updates DWGNAME when setDwgName is called', () => {
    const db = new AcDbDatabase()
    const manager = AcDbSysVarManager.instance()

    db.setDwgName('Site Plan.dxf')
    expect(db.dwgname).toBe('Site Plan.dxf')
    expect(manager.getVar(AcDbSystemVariables.DWGNAME, db)).toBe(
      'Site Plan.dxf'
    )
  })

  it('stores and clears thumbnailImage bytes', () => {
    const db = new AcDbDatabase()
    expect(db.thumbnailImage).toBeUndefined()

    const bytes = new Uint8Array([0x42, 0x4d, 0x00, 0x01])
    db.thumbnailImage = bytes
    expect(db.thumbnailImage).toBe(bytes)

    db.thumbnailImage = new Uint8Array()
    expect(db.thumbnailImage).toBeUndefined()

    db.thumbnailImage = bytes
    db.thumbnailImage = undefined
    expect(db.thumbnailImage).toBeUndefined()
  })

  it('reassigns symbol-table handles that collide across tables', () => {
    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db
    const textStyle = new AcDbTextStyleTableRecord({
      name: DEFAULT_TEXT_STYLE,
      font: 'SimKai'
    })
    db.tables.textStyleTable.add(textStyle)

    const layer = new AcDbLayerTableRecord({
      name: '0',
      isOff: false,
      isPlottable: true,
      color: new AcCmColor(AcCmColorMethod.ByACI, 7),
      linetype: 'Continuous'
    })
    layer.objectId = textStyle.objectId
    const preferredLayerId = layer.objectId
    db.tables.layerTable.add(layer)

    expect(layer.objectId).toBe(preferredLayerId)
    expect(textStyle.objectId).not.toBe(layer.objectId)
    expect(db.tables.layerTable.getIdAt(layer.objectId)).toBe(layer)
    expect(db.tables.textStyleTable.getIdAt(textStyle.objectId)).toBe(textStyle)
  })

  it('rewires block entity ownerIds when a BTR handle is displaced', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    acdbHostApplicationServices().workingDatabase = db

    const block = new AcDbBlockTableRecord()
    block.name = 'TITLE_BLOCK'
    block.objectId = 'BTR1'
    db.tables.blockTable.add(block)
    expect(block.objectId).toBe('BTR1')

    const line = new AcDbLine(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(1, 0)
    )
    const otherLine = new AcDbLine(
      new GeometryPoint2d(0, 1),
      new GeometryPoint2d(1, 1)
    )
    block.appendEntity([line, otherLine])
    expect(line.ownerId).toBe('BTR1')
    expect(otherLine.ownerId).toBe('BTR1')

    // A later non-temp object claims BTR1 → BTR is displaced to a generated id.
    const usurper = new AcDbLayerTableRecord({
      name: 'USURPER',
      isOff: false,
      isPlottable: true,
      color: new AcCmColor(AcCmColorMethod.ByACI, 1),
      linetype: 'Continuous'
    })
    usurper.objectId = 'BTR1'
    db.tables.layerTable.add(usurper)

    expect(usurper.objectId).toBe('BTR1')
    expect(block.objectId).not.toBe('BTR1')
    expect(line.ownerId).toBe(block.objectId)
    expect(otherLine.ownerId).toBe(block.objectId)
    expect(db.tables.blockTable.getIdAt(otherLine.ownerId)).toBe(block)
  })

  it('initializes handle seed from hexadecimal HANDSEED values', () => {
    const db = new AcDbDatabase()
    db.initializeHandleSeed('FFFF')
    expect(db.generateHandle()).toBe('FFFF')
  })

  it('generates handles beyond Number.MAX_SAFE_INTEGER without hanging', () => {
    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db
    // Real drawings emit HANDSEED values past float-safe range; numeric
    // increments stall at that magnitude (x + 1 === x), which used to spin
    // generateUniqueHandle forever.
    db.initializeHandleSeed('FFFFF10000002B')
    expect(db.generateHandle()).toBe('FFFFF10000002B')
    expect(db.generateHandle()).toBe('FFFFF10000002C')

    const textStyle = new AcDbTextStyleTableRecord({
      name: 'Standard',
      font: 'txt'
    })
    textStyle.objectId = '11'
    db.tables.textStyleTable.add(textStyle)

    // Force handle regeneration by claiming the style's id from another table.
    const layer = new AcDbLayerTableRecord({ name: '0' })
    layer.objectId = '11'
    db.tables.layerTable.add(layer)

    expect(layer.objectId).toBe('11')
    expect(textStyle.objectId).not.toBe('11')
    expect(db.tables.textStyleTable.getIdAt(textStyle.objectId)).toBe(textStyle)
  })
})
