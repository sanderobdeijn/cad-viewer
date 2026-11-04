import { GeometryPoint2d } from '@mlightcad/geometry-engine'
import { AcDbDxfCode, AcDbOpenMode, AcDbResultBuffer } from '../src/base'
import { AcDbDatabase } from '../src/database/AcDbDatabase'
import { AcDbLayerTableRecord } from '../src/database/AcDbLayerTableRecord'
import { AcDbSysVarManager } from '../src/database/AcDbSysVarManager'
import { AcDbLine } from '../src/entity/AcDbLine'
import { AcDbDictionary } from '../src/object/AcDbDictionary'
import { AcDbLayout } from '../src/object/layout/AcDbLayout'

const createLine = (
  start = new GeometryPoint2d(0, 0),
  end = new GeometryPoint2d(10, 0)
) => new AcDbLine(start, end)

describe('AcDbDatabaseTransactionManager', () => {
  it('rolls back entity geometry changes on abort', () => {
    const db = new AcDbDatabase()
    const line = createLine()
    db.tables.blockTable.modelSpace.appendEntity(line)

    const manager = db.transactionManager
    const tr = manager.startTransaction()
    const opened = tr.getObject<AcDbLine>(line.objectId, AcDbOpenMode.kForWrite)
    opened!.endPoint = new GeometryPoint2d(20, 0)

    manager.abortTransaction()

    expect(line.endPoint.x).toBe(10)
  })

  it('rolls back entity append on abort', () => {
    const db = new AcDbDatabase()
    const line = createLine()

    const manager = db.transactionManager
    manager.startTransaction()
    db.tables.blockTable.modelSpace.appendEntity(line)
    expect(db.tables.blockTable.getEntityById(line.objectId)).toBe(line)

    manager.abortTransaction()

    expect(db.tables.blockTable.getEntityById(line.objectId)).toBeUndefined()
  })

  it('returns the same object when opened twice in one transaction', () => {
    const db = new AcDbDatabase()
    const line = createLine()
    db.tables.blockTable.modelSpace.appendEntity(line)

    const tr = db.transactionManager.startTransaction()
    const first = tr.getObject<AcDbLine>(line.objectId, AcDbOpenMode.kForWrite)
    const second = tr.getObject<AcDbLine>(line.objectId, AcDbOpenMode.kForWrite)

    expect(first).toBe(line)
    expect(second).toBe(line)
    db.transactionManager.abortTransaction()
  })

  it('dispatches entity events once on commit', () => {
    const db = new AcDbDatabase()
    const line = createLine()
    let appendCount = 0

    db.events.entityAppended.addEventListener(() => {
      appendCount++
    })

    db.transactionManager.runInTransaction(() => {
      db.tables.blockTable.modelSpace.appendEntity(line)
    })
    expect(appendCount).toBe(1)
  })

  it('rolls back entity removal on abort', () => {
    const db = new AcDbDatabase()
    const line = createLine()
    db.tables.blockTable.modelSpace.appendEntity(line)

    db.transactionManager.startTransaction()
    db.tables.blockTable.modelSpace.removeEntity(line.objectId)
    db.transactionManager.abortTransaction()

    expect(db.tables.blockTable.getEntityById(line.objectId)).toBeDefined()
  })

  it('rolls back the whole transaction when the callback throws', () => {
    const db = new AcDbDatabase()
    const line = createLine()

    expect(() =>
      db.transactionManager.runInTransaction(() => {
        db.tables.blockTable.modelSpace.appendEntity(line)
        throw new Error('failed')
      })
    ).toThrow('failed')

    expect(db.tables.blockTable.getEntityById(line.objectId)).toBeUndefined()
    expect(db.transactionManager.hasTransaction()).toBe(false)
  })

  it('dispatches entityModified on commit without manual event notification', () => {
    const db = new AcDbDatabase()
    const line = createLine()
    db.tables.blockTable.modelSpace.appendEntity(line)

    let modifiedCount = 0
    db.events.entityModified.addEventListener(args => {
      modifiedCount++
      expect(args.entity).toBe(line)
    })

    db.transactionManager.runInTransaction(tr => {
      const opened = tr.getObject<AcDbLine>(
        line.objectId,
        AcDbOpenMode.kForWrite
      )
      opened!.endPoint = new GeometryPoint2d(30, 0)
    })

    expect(modifiedCount).toBe(1)
  })

  it('does not dispatch entityModified when entity is mutated outside a transaction', () => {
    const db = new AcDbDatabase()
    const line = createLine()
    db.tables.blockTable.modelSpace.appendEntity(line)

    let modifiedCount = 0
    db.events.entityModified.addEventListener(() => {
      modifiedCount++
    })

    line.endPoint = new GeometryPoint2d(25, 0)

    expect(modifiedCount).toBe(0)
  })

  it('rolls back committed nested transaction changes on outer abort', () => {
    const db = new AcDbDatabase()
    const line = createLine()
    db.tables.blockTable.modelSpace.appendEntity(line)

    db.transactionManager.startTransaction()
    const inner = db.transactionManager.startTransaction()
    const opened = inner.getObject<AcDbLine>(
      line.objectId,
      AcDbOpenMode.kForWrite
    )
    opened!.endPoint = new GeometryPoint2d(40, 0)
    db.transactionManager.commitTransaction()
    db.transactionManager.abortTransaction()

    expect(line.endPoint.x).toBe(10)
  })

  it('rolls back system variable changes on abort', () => {
    const db = new AcDbDatabase()
    const original = db.orthomode

    db.transactionManager.startTransaction()
    db.orthomode = 1
    db.transactionManager.abortTransaction()

    expect(db.orthomode).toBe(original)
  })

  it('rolls back symbol table additions on abort', () => {
    const db = new AcDbDatabase()
    const layer = new AcDbLayerTableRecord({ name: 'RolledBack' })

    db.transactionManager.startTransaction()
    db.tables.layerTable.add(layer)
    expect(db.tables.layerTable.getAt('RolledBack')).toBe(layer)

    db.transactionManager.abortTransaction()
    expect(db.tables.layerTable.getAt('RolledBack')).toBeUndefined()
  })

  it('rolls back system variable changes made through updateSysVar', () => {
    const db = new AcDbDatabase()
    const original = db.orthomode

    db.transactionManager.startTransaction()
    db.orthomode = 1
    expect(db.orthomode).toBe(1)

    db.transactionManager.abortTransaction()
    expect(db.orthomode).toBe(original)
  })

  it('deduplicates modify records for the same object', () => {
    const db = new AcDbDatabase()
    const line = createLine()
    db.tables.blockTable.modelSpace.appendEntity(line)

    const tr = db.transactionManager.startTransaction()
    const opened = tr.getObject<AcDbLine>(line.objectId, AcDbOpenMode.kForWrite)
    opened!.endPoint = new GeometryPoint2d(20, 0)
    opened!.endPoint = new GeometryPoint2d(30, 0)
    db.transactionManager.abortTransaction()

    expect(line.endPoint.x).toBe(10)
  })

  it('resolves objects through getObjectById', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    const layer = db.tables.layerTable.getAt('0')
    expect(db.getObjectById(db.objectId)).toBe(db)
    expect(db.getObjectById(layer!.objectId)).toBe(layer)
  })

  it('cancels append/remove pairs within one transaction', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    const line = createLine()
    let eventCount = 0
    const onEvent = () => {
      eventCount++
    }
    db.events.entityAppended.addEventListener(onEvent)
    db.events.entityErased.addEventListener(onEvent)

    db.transactionManager.startTransaction()
    db.tables.blockTable.modelSpace.appendEntity(line)
    db.tables.blockTable.modelSpace.removeEntity(line.objectId)
    db.transactionManager.commitTransaction()

    expect(eventCount).toBe(0)
  })

  it('rolls back dictionary setAt on abort', () => {
    const db = new AcDbDatabase()
    const layout = new AcDbLayout()

    db.transactionManager.startTransaction()
    db.objects.layout.setAt('TestLayout', layout)
    expect(db.objects.layout.getAt('TestLayout')).toBe(layout)

    db.transactionManager.abortTransaction()
    expect(db.objects.layout.getAt('TestLayout')).toBeUndefined()
  })

  it('dispatches dictionary events once on commit', () => {
    const db = new AcDbDatabase()
    const layout = new AcDbLayout()
    let setCount = 0

    db.events.dictObjetSet.addEventListener(() => {
      setCount++
    })

    db.transactionManager.runInTransaction(() => {
      db.objects.layout.setAt('L1', layout)
    })
    expect(setCount).toBe(1)
  })

  it('rolls back system variable changes made through setVar', () => {
    const db = new AcDbDatabase()
    const manager = AcDbSysVarManager.instance()
    const original = manager.getVar('dynmode', db) ?? 3
    const next = original === 1 ? 2 : 1

    db.transactionManager.startTransaction()
    manager.setVar('dynmode', next, db)
    expect(manager.getVar('dynmode', db)).toBe(next)

    db.transactionManager.abortTransaction()
    expect(manager.getVar('dynmode', db)).toBe(original)
  })

  it('rolls back isDbVar system variable changes made through setVar', () => {
    const db = new AcDbDatabase()
    const manager = AcDbSysVarManager.instance()
    const original = manager.getVar('orthomode', db) ?? 0
    const next = original === 1 ? 0 : 1

    db.transactionManager.startTransaction()
    manager.setVar('orthomode', next, db)
    expect(manager.getVar('orthomode', db)).toBe(next)

    db.transactionManager.abortTransaction()
    expect(manager.getVar('orthomode', db)).toBe(original)
  })

  it('resolves objects in nested dictionaries through getObjectById', () => {
    const db = new AcDbDatabase()
    const nested = new AcDbDictionary(db)
    db.objects.dictionary.setAt('NESTED', nested)
    const inner = new AcDbDictionary(db)
    nested.setAt('INNER', inner)

    expect(db.getObjectById(inner.objectId)).toBe(inner)
    expect(db.getObjectById(nested.objectId)).toBe(nested)
  })

  it('enforces strictMode for mutations outside transactions', () => {
    const db = new AcDbDatabase()
    db.transactionManager.strictMode = true
    const line = createLine()

    expect(() => {
      db.tables.blockTable.modelSpace.appendEntity(line)
    }).toThrow('outside an active transaction')
  })
})

describe('AcDbObject restoreFrom', () => {
  it('restores cloned state while preserving identity fields', () => {
    const db = new AcDbDatabase()
    const line = createLine()
    db.tables.blockTable.modelSpace.appendEntity(line)

    const snapshot = line.clonePreservingIdentity()
    snapshot.endPoint = new GeometryPoint2d(99, 0)

    line.endPoint = new GeometryPoint2d(50, 0)
    line.restoreFrom(snapshot)

    expect(line.endPoint.x).toBe(99)
    expect(line.objectId).toBe(snapshot.objectId)
    expect(line.database).toBe(db)
  })

  it('restores xdata through restoreFrom', () => {
    const db = new AcDbDatabase()
    const line = createLine()
    db.tables.blockTable.modelSpace.appendEntity(line)

    const snapshot = line.clonePreservingIdentity()
    snapshot.setXData(
      new AcDbResultBuffer([
        { code: AcDbDxfCode.ExtendedDataRegAppName, value: 'MY_APP' },
        { code: AcDbDxfCode.ExtendedDataAsciiString, value: 'changed' }
      ])
    )

    line.removeXData('MY_APP')
    line.restoreFrom(snapshot)

    expect(line.getXData('MY_APP')?.at(1)?.value).toBe('changed')
  })
})
