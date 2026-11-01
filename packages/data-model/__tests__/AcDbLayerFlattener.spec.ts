import { AcCmColor } from '@mlightcad/common'
import { AcGiLineWeight } from '@mlightcad/graphic-interface'

import {
  acdbAssignWorkingDatabase,
  AcDbAttribute,
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbLayerTableRecord,
  AcDbLine} from '../src'

function aciColor(aci: number) {
  const color = new AcCmColor()
  color.colorIndex = aci
  return color
}

function addLayer(db: AcDbDatabase, name: string, aci: number) {
  const layer = new AcDbLayerTableRecord({
    name,
    color: aciColor(aci),
    linetype: 'DASHED',
    lineWeight: AcGiLineWeight.LineWeight050
  })
  db.tables.layerTable.add(layer)
  return layer
}

function createDb() {
  const db = new AcDbDatabase()
  acdbAssignWorkingDatabase(db)
  db.createDefaultData()
  addLayer(db, 'WALLS', 1)
  return db
}

function line(layer: string, configure?: (entity: AcDbLine) => void) {
  const entity = new AcDbLine({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 0 })
  entity.layer = layer
  entity.color = new AcCmColor().setByLayer()
  entity.lineType = 'ByLayer'
  entity.lineWeight = AcGiLineWeight.ByLayer
  configure?.(entity)
  return entity
}

describe('AcDbLayerFlattener', () => {
  it('leaves only an on, thawed and unlocked layer 0', () => {
    const db = createDb()
    const base = db.tables.layerTable.getAt('0')!
    base.isOff = true
    base.isFrozen = true
    base.isLocked = true

    db.beginLayerFlatten()

    expect([...db.tables.layerTable.newIterator()].map(l => l.name)).toEqual([
      '0'
    ])
    expect(base.isOff).toBe(false)
    expect(base.isFrozen).toBe(false)
    expect(base.isLocked).toBe(false)
  })

  it('bakes the old layer style into model space entities', () => {
    const db = createDb()
    db.beginLayerFlatten()
    const entity = line('WALLS')
    db.tables.blockTable.modelSpace.appendEntity(entity)

    expect(entity.layer).toBe('0')
    expect(entity.color.colorIndex).toBe(1)
    expect(entity.lineType).toBe('DASHED')
    expect(entity.lineWeight).toBe(AcGiLineWeight.LineWeight050)
  })

  it('keeps properties that are not ByLayer', () => {
    const db = createDb()
    db.beginLayerFlatten()
    const entity = line('WALLS', e => {
      e.color = aciColor(3)
      e.lineType = 'CENTER'
      e.lineWeight = AcGiLineWeight.LineWeight025
    })
    db.tables.blockTable.modelSpace.appendEntity(entity)

    expect(entity.color.colorIndex).toBe(3)
    expect(entity.lineType).toBe('CENTER')
    expect(entity.lineWeight).toBe(AcGiLineWeight.LineWeight025)
  })

  it('leaves top-level layer 0 entities ByLayer', () => {
    const db = createDb()
    db.beginLayerFlatten()
    const entity = line('0')
    db.tables.blockTable.modelSpace.appendEntity(entity)

    expect(entity.color.isByLayer).toBe(true)
    expect(entity.lineType).toBe('ByLayer')
  })

  it('makes layer 0 block contents inherit from the INSERT', () => {
    const db = createDb()
    db.beginLayerFlatten()
    const block = new AcDbBlockTableRecord()
    block.name = 'B'
    db.tables.blockTable.add(block)
    const inherited = line('0')
    const authored = line('WALLS')
    block.appendEntity([inherited, authored])

    expect(inherited.color.isByBlock).toBe(true)
    expect(inherited.lineType).toBe('ByBlock')
    expect(inherited.lineWeight).toBe(AcGiLineWeight.ByBlock)
    expect(authored.layer).toBe('0')
    expect(authored.color.colorIndex).toBe(1)
  })

  it('flattens attributes of an INSERT', () => {
    const db = createDb()
    db.beginLayerFlatten()
    const insert = new AcDbBlockReference('B')
    insert.layer = 'WALLS'
    insert.color = new AcCmColor().setByLayer()
    const attrib = new AcDbAttribute()
    attrib.layer = 'WALLS'
    attrib.color = new AcCmColor().setByLayer()
    insert.appendAttributes(attrib)
    db.tables.blockTable.modelSpace.appendEntity(insert)

    expect(insert.layer).toBe('0')
    expect(insert.color.colorIndex).toBe(1)
    expect(attrib.layer).toBe('0')
    expect(attrib.color.colorIndex).toBe(1)
  })

  it('stops flattening and resets the current layer when finished', () => {
    const db = createDb()
    db.clayer = 'WALLS'
    db.beginLayerFlatten()
    db.endLayerFlatten()
    addLayer(db, 'LATER', 2)
    const entity = line('LATER')
    db.tables.blockTable.modelSpace.appendEntity(entity)

    expect(db.clayer).toBe('0')
    expect(entity.layer).toBe('LATER')
  })
})
