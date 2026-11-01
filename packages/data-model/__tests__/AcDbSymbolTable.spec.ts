
import { AcDbDatabase } from '../src/database/AcDbDatabase'
import { AcDbSymbolTable } from '../src/database/AcDbSymbolTable'
import { AcDbSymbolTableRecord } from '../src/database/AcDbSymbolTableRecord'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'
import { setupWorkingDatabase } from '../test-utils/entityTestUtils'

class LowercaseSymbolTable extends AcDbSymbolTable<AcDbSymbolTableRecord> {
  protected override normalizeName(name: string) {
    return name.toLowerCase()
  }
}

describe('AcDbSymbolTable', () => {
  it('creates a detached clone with a new objectId', () => {
    expectDetachedClone(
      () => new AcDbSymbolTable<AcDbSymbolTableRecord>(new AcDbDatabase())
    )
  })

  it('adds, queries, iterates and removes records by name/id', () => {
    const db = setupWorkingDatabase()
    const table = new AcDbSymbolTable<AcDbSymbolTableRecord>(db)
    const recA = new AcDbSymbolTableRecord({ name: 'A' })
    const recB = new AcDbSymbolTableRecord({ name: 'B' })
    recA.objectId = 'AA'
    recB.objectId = 'AA'

    table.add(recA)
    table.add(recB)

    expect(recA.objectId).toBe('AA')
    expect(recB.objectId).not.toBe('AA')
    expect(recA.database).toBe(db)
    expect(recA.ownerId).toBe(table.objectId)
    expect(table.numEntries).toBe(2)
    expect(table.has('A')).toBe(true)
    expect(table.has('a')).toBe(true)
    expect(table.has(' A ')).toBe(true)
    expect(table.getAt('A')).toBe(recA)
    expect(table.getIdAt(recA.objectId)).toBe(recA)
    expect(table.getOwnerIdAt(recA.objectId)).toBe(recA)
    expect(table.hasId(recA.objectId)).toBe(true)

    const names = Array.from(table.newIterator()).map(item => item.name)
    expect(names).toEqual(['A', 'B'])

    expect(table.remove('A')).toBe(true)
    expect(table.remove('A')).toBe(false)
    expect(table.removeId(recB.objectId)).toBe(true)
    expect(table.removeId(recB.objectId)).toBe(false)
    expect(table.getAt('B')).toBeUndefined()
    expect(table.numEntries).toBe(0)

    table.add(new AcDbSymbolTableRecord({ name: 'C' }))
    expect(table.numEntries).toBe(1)
    table.removeAll()
    expect(table.numEntries).toBe(0)
  })

  it('skips unnamed records in name lookup but keeps them by id', () => {
    const db = setupWorkingDatabase()
    const table = new AcDbSymbolTable<AcDbSymbolTableRecord>(db)
    const named = new AcDbSymbolTableRecord({ name: 'Standard' })
    const unnamed = new AcDbSymbolTableRecord({ name: '' })
    named.objectId = 'named-id'
    unnamed.objectId = 'unnamed-id'

    table.add(named)
    table.add(unnamed)

    expect(table.numEntries).toBe(1)
    expect(table.has('')).toBe(false)
    expect(table.hasId('unnamed-id')).toBe(true)
    expect(table.getIdAt('unnamed-id')).toBe(unnamed)
    expect(Array.from(table.newIterator()).map(item => item.name)).toEqual([
      'Standard'
    ])
    expect(
      Array.from(table.newIterator(true)).map(item => item.objectId)
    ).toEqual(['named-id', 'unnamed-id'])

    expect(table.removeId('unnamed-id')).toBe(true)
    expect(table.hasId('unnamed-id')).toBe(false)
  })

  it('treats undefined/null names as missing in getAt/has/remove', () => {
    const db = setupWorkingDatabase()
    const table = new AcDbSymbolTable<AcDbSymbolTableRecord>(db)
    table.add(new AcDbSymbolTableRecord({ name: 'A' }))

    expect(table.getAt(undefined as unknown as string)).toBeUndefined()
    expect(table.getAt(null as unknown as string)).toBeUndefined()
    expect(table.has(undefined as unknown as string)).toBe(false)
    expect(table.remove(undefined as unknown as string)).toBe(false)
    expect(table.getAt('A')?.name).toBe('A')
  })

  it('applies normalized names when subclass overrides normalizeName', () => {
    const db = new AcDbDatabase()
    const table = new LowercaseSymbolTable(db)
    const rec = new AcDbSymbolTableRecord({ name: 'MiXeD' })
    table.add(rec)

    expect(table.has('mixed')).toBe(true)
    expect(table.has('MIXED')).toBe(true)
    expect(table.getAt('mixed')).toBe(rec)
    expect(table.remove('MIXED')).toBe(true)
    expect(table.hasId(rec.objectId)).toBe(false)
    expect(table.getAt('mixed')).toBeUndefined()
  })
})
