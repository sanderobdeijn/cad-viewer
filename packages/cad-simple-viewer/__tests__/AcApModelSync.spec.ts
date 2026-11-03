import {
  AcCmEventManager,
  AcDbAlignedDimension,
  AcDbCircle,
  AcDbDatabase,
  acdbHostApplicationServices,
  AcDbLine,
  AcDbOpenMode,
  AcDbPoint,
  GeometryPoint2d
} from '@mlightcad/data-model'

import { AcApModelSync } from '../src/app/AcApModelSync'

let mockMeasurements: unknown[] = []
const mockListeners = new Set<() => void>()

jest.mock('../src/command/measure/AcApMeasurementStore', () => ({
  listLayoutMeasurements: () => mockMeasurements,
  getMeasurementValueText: () => '100 mm',
  subscribeMeasurements: (listener: () => void) => {
    mockListeners.add(listener)
    return () => mockListeners.delete(listener)
  }
}))

const setMeasurements = (measurements: unknown[]) => {
  mockMeasurements = measurements
  mockListeners.forEach(listener => listener())
}

const createDatabase = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

const createLine = (x = 10) =>
  new AcDbLine(new GeometryPoint2d(0, 0), new GeometryPoint2d(x, 0))

const createSync = (db: AcDbDatabase) => {
  const documentActivated = new AcCmEventManager<{ doc: unknown }>()
  const manager = {
    curDocument: { database: db },
    curView: {},
    events: { documentActivated }
  }
  const sync = new AcApModelSync(
    manager as unknown as ConstructorParameters<typeof AcApModelSync>[0]
  )
  return { sync, documentActivated }
}

describe('AcApModelSync', () => {
  it('starts with the shapes already in the current space', () => {
    const db = createDatabase()
    db.tables.blockTable.modelSpace.appendEntity(createLine())

    const { sync } = createSync(db)

    expect(sync.model.toString()).toBe('Line start=(0, 0) end=(10, 0)')
    sync.dispose()
  })

  it('adds a shape when an entity is appended and notifies listeners', () => {
    const db = createDatabase()
    const { sync } = createSync(db)
    const listener = jest.fn()
    sync.events.modelChanged.addEventListener(listener)

    db.tables.blockTable.modelSpace.appendEntity(createLine())

    expect(sync.model.shapes).toHaveLength(1)
    expect(listener).toHaveBeenCalledTimes(1)
    sync.dispose()
  })

  it('replaces the shape when an entity is modified', () => {
    const db = createDatabase()
    const line = createLine()
    db.tables.blockTable.modelSpace.appendEntity(line)
    db.tables.blockTable.modelSpace.appendEntity(createLine(30))
    const { sync } = createSync(db)

    const manager = db.transactionManager
    const tr = manager.startTransaction()
    const opened = tr.getObject<AcDbLine>(line.objectId, AcDbOpenMode.kForWrite)
    opened!.endPoint = new GeometryPoint2d(20, 0)
    manager.commitTransaction()

    expect(sync.model.toString().split('\n')).toEqual([
      'Line start=(0, 0) end=(20, 0)',
      'Line start=(0, 0) end=(30, 0)'
    ])
    sync.dispose()
  })

  it('keeps its own copy of each shape', () => {
    const db = createDatabase()
    const line = createLine()
    db.tables.blockTable.modelSpace.appendEntity(line)

    const { sync } = createSync(db)

    expect(sync.model.shapes[0]).not.toBe(line.geometry)
    sync.dispose()
  })

  it('removes the shape when an entity is erased and restores it on undo', () => {
    const db = createDatabase()
    const line = createLine()
    db.tables.blockTable.modelSpace.appendEntity(line)
    const { sync } = createSync(db)

    const manager = db.transactionManager
    manager.runUndoable('Erase Line', () => {
      db.tables.blockTable.modelSpace.removeEntity(line.objectId)
    })
    expect(sync.model.shapes).toHaveLength(0)

    manager.undo()
    expect(sync.model.shapes).toHaveLength(1)
    sync.dispose()
  })

  it('tracks points through append, change and erase', () => {
    const db = createDatabase()
    const { sync } = createSync(db)
    const point = new AcDbPoint()
    point.position = new GeometryPoint2d(1, 2)

    const modelSpace = db.tables.blockTable.modelSpace
    modelSpace.appendEntity(point)
    expect(sync.model.toString()).toBe('Point position=(1, 2)')
    expect(sync.model.points[0]).not.toBe(point.position)
    expect(sync.model.shapes).toHaveLength(0)

    const manager = db.transactionManager
    const tr = manager.startTransaction()
    const opened = tr.getObject<AcDbPoint>(
      point.objectId,
      AcDbOpenMode.kForWrite
    )
    opened!.position = new GeometryPoint2d(3, 4)
    manager.commitTransaction()
    expect(sync.model.toString()).toBe('Point position=(3, 4)')

    modelSpace.removeEntity(point.objectId)
    expect(sync.model.points).toHaveLength(0)
    sync.dispose()
  })

  it('tracks dimensions through append and erase', () => {
    const db = createDatabase()
    const { sync } = createSync(db)
    const dimension = new AcDbAlignedDimension(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(10, 0),
      new GeometryPoint2d(5, 5)
    )

    const modelSpace = db.tables.blockTable.modelSpace
    modelSpace.appendEntity(dimension)
    expect(sync.model.toString()).toBe(
      'Dimension type=AlignedDimension xLine1Point=(0, 0) xLine2Point=(10, 0) dimLinePoint=(5, 5) text="10.000"'
    )
    expect(sync.model.dimensions[0].points.xLine1Point).not.toBe(
      dimension.xLine1Point
    )

    modelSpace.removeEntity(dimension.objectId)
    expect(sync.model.dimensions).toHaveLength(0)
    sync.dispose()
  })

  it('lists measurements after the dimensions', () => {
    const db = createDatabase()
    const { sync } = createSync(db)
    db.tables.blockTable.modelSpace.appendEntity(
      new AcDbAlignedDimension(
        new GeometryPoint2d(0, 0),
        new GeometryPoint2d(10, 0),
        new GeometryPoint2d(5, 5)
      )
    )
    const listener = jest.fn()
    sync.events.modelChanged.addEventListener(listener)

    setMeasurements([
      {
        id: 'dist-1',
        geometry: {
          type: 'distance',
          start: { x: 0, y: 0 },
          end: { x: 100, y: 0 }
        }
      },
      {
        id: 'area-1',
        geometry: {
          type: 'area',
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 }
          ]
        }
      }
    ])

    expect(listener).toHaveBeenCalledTimes(1)
    expect(sync.model.toString().split('\n').slice(1)).toEqual([
      'Dimension type=MeasureDistance start=(0, 0) end=(100, 0) text="100 mm"',
      'Dimension type=MeasureArea point1=(0, 0) point2=(1, 0) point3=(1, 1) text="100 mm"'
    ])

    setMeasurements([])
    expect(sync.model.dimensions).toHaveLength(1)
    sync.dispose()
  })

  it('switches to the database of the activated document', () => {
    const first = createDatabase()
    const { sync, documentActivated } = createSync(first)

    const second = createDatabase()
    second.tables.blockTable.modelSpace.appendEntity(
      new AcDbCircle(new GeometryPoint2d(0, 0), 5)
    )
    documentActivated.dispatch({ doc: { database: second } })
    expect(sync.model.shapes).toHaveLength(1)

    first.tables.blockTable.modelSpace.appendEntity(createLine())
    expect(sync.model.shapes).toHaveLength(1)
    sync.dispose()
  })

  it('follows the layout on screen', () => {
    const db = createDatabase()
    db.tables.blockTable.modelSpace.appendEntity(createLine())
    const { sync } = createSync(db)
    expect(sync.model.shapes).toHaveLength(1)

    const layoutManager = acdbHostApplicationServices().layoutManager
    layoutManager.events.layoutSwitched.dispatch({
      layout: { blockTableRecordId: 'not-in-this-drawing' }
    } as never)
    expect(sync.model.shapes).toHaveLength(0)

    layoutManager.events.layoutSwitched.dispatch({
      layout: { blockTableRecordId: db.tables.blockTable.modelSpace.objectId }
    } as never)
    expect(sync.model.shapes).toHaveLength(1)
    sync.dispose()
  })

  it('stops following changes after dispose', () => {
    const db = createDatabase()
    const { sync } = createSync(db)

    sync.dispose()
    db.tables.blockTable.modelSpace.appendEntity(createLine())

    expect(sync.model.shapes).toHaveLength(0)
  })
})
