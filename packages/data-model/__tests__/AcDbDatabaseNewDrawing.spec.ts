import { AcDbDatabase, AcDbLine } from '../src'

const names = (table: { newIterator: () => Iterable<{ name: string }> }) =>
  [...table.newIterator()].map(record => record.name)

describe('AcDbDatabase.createNewDrawing', () => {
  it('creates a metric drawing with the default tables and layouts', () => {
    const db = new AcDbDatabase()
    db.createNewDrawing()

    expect(names(db.tables.layerTable)).toEqual(['0'])
    expect(names(db.tables.linetypeTable)).toEqual([
      'ByBlock',
      'ByLayer',
      'Continuous'
    ])
    expect(names(db.tables.textStyleTable)).toEqual(['Standard', 'Annotative'])
    expect(names(db.tables.dimStyleTable)).toEqual([
      'Standard',
      'Annotative',
      'ISO-25'
    ])
    expect(db.dimstyle).toBe('ISO-25')
    expect(db.textstyle).toBe('Standard')
    expect(db.clayer).toBe('0')
    expect(db.measurement).toBe(1)
  })

  it('creates one model and two paper layouts bound to their own blocks', () => {
    const db = new AcDbDatabase()
    db.createNewDrawing()

    const layouts = [...db.objects.layout.newIterator()]
    expect(layouts.map(layout => layout.layoutName)).toEqual([
      'Model',
      'Layout1',
      'Layout2'
    ])
    expect(layouts.map(layout => layout.tabOrder)).toEqual([0, 1, 2])
    for (const layout of layouts) {
      const block = db.tables.blockTable.getIdAt(layout.blockTableRecordId)
      expect(block?.layoutId).toBe(layout.objectId)
    }
    expect(names(db.tables.blockTable)).toEqual([
      '*Model_Space',
      '*Paper_Space',
      '*Paper_Space1'
    ])
  })

  it('discards earlier content', () => {
    const db = new AcDbDatabase()
    db.createNewDrawing()
    db.tables.blockTable.modelSpace.appendEntity(new AcDbLine())
    expect([...db.tables.blockTable.modelSpace.newIterator()]).toHaveLength(1)

    db.createNewDrawing()

    expect([...db.tables.blockTable.modelSpace.newIterator()]).toHaveLength(0)
    expect([...db.objects.layout.newIterator()]).toHaveLength(3)
  })

  it('applies drawing options', () => {
    const db = new AcDbDatabase()
    db.createNewDrawing({ circleSides: 200, sysVars: { lwdisplay: true } })

    expect(db.drawCircleSides).toBe(200)
    expect(db.lwdisplay).toBe(true)
  })

  it('dispatches layouts and layers when regenerated', async () => {
    const db = new AcDbDatabase()
    db.createNewDrawing()
    const layouts: string[] = []
    const layers: string[] = []
    db.events.dictObjetSet.addEventListener(args => {
      layouts.push(args.key)
    })
    db.events.layerAppended.addEventListener(args => {
      layers.push(args.layer.name)
    })

    await db.regen()

    expect(layouts).toEqual(
      expect.arrayContaining(['Model', 'Layout1', 'Layout2'])
    )
    expect(layers).toEqual(['0'])
  })
})
