import {
  AcCmEventManager,
  AcDbAlignedDimension,
  AcDbCircle,
  AcDbDatabase,
  acdbHostApplicationServices,
  AcDbLine,
  AcDbOpenMode,
  AcDbPoint,
  AcDbPolyline,
  GeometryPoint2d
} from '@mlightcad/data-model'

import { AcApModelSync } from '../src/app/AcApModelSync'
import { AcEdOpenMode } from '../src/editor/view/AcEdOpenMode'

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

  describe('applyText', () => {
    const lineOf = (db: AcDbDatabase) =>
      [...db.tables.blockTable.modelSpace.newIterator()].map(
        entity => entity.dxfTypeName
      )

    it('updates a changed line in place and keeps its look', () => {
      const db = createDatabase()
      const line = createLine()
      line.layer = '0'
      line.lineWeight = 30
      db.tables.blockTable.modelSpace.appendEntity(line)
      const { sync } = createSync(db)

      sync.applyText('Line start=(1, 2) end=(3, 4)')

      const [entity] = db.tables.blockTable.modelSpace.newIterator()
      expect(entity.objectId).toBe(line.objectId)
      expect(entity.lineWeight).toBe(30)
      expect(sync.model.toString()).toBe('Line start=(1, 2) end=(3, 4)')
      sync.dispose()
    })

    it('undoes the whole edit in one step', () => {
      const db = createDatabase()
      db.tables.blockTable.modelSpace.appendEntity(createLine(10))
      db.tables.blockTable.modelSpace.appendEntity(createLine(20))
      const { sync } = createSync(db)
      const before = sync.model.toString()

      sync.applyText(
        'Line start=(0, 0) end=(99, 0)\nCircularArc center=(0, 0) radius=5 startAngle=0 endAngle=1\nPoint position=(7, 7)'
      )
      expect(sync.model.shapes).toHaveLength(2)
      expect(sync.model.points).toHaveLength(1)

      db.transactionManager.undo()
      expect(sync.model.toString()).toBe(before)
      sync.dispose()
    })

    it('leaves the drawing and undo stack alone when nothing changed', () => {
      const db = createDatabase()
      db.tables.blockTable.modelSpace.appendEntity(createLine())
      const { sync } = createSync(db)
      const listener = jest.fn()
      sync.events.modelChanged.addEventListener(listener)

      sync.applyText('  Line start=(0,0)   end=(10, 0)\n\n')

      expect(listener).not.toHaveBeenCalled()
      sync.dispose()
    })

    it('changes nothing when any line is invalid', () => {
      const db = createDatabase()
      db.tables.blockTable.modelSpace.appendEntity(createLine())
      const { sync } = createSync(db)

      expect(() =>
        sync.applyText('Line start=(9, 9) end=(9, 0)\nnonsense')
      ).toThrow('Line 2')

      expect(sync.model.toString()).toBe('Line start=(0, 0) end=(10, 0)')
      sync.dispose()
    })

    it('erases entities whose line was removed', () => {
      const db = createDatabase()
      db.tables.blockTable.modelSpace.appendEntity(createLine(10))
      db.tables.blockTable.modelSpace.appendEntity(createLine(20))
      const { sync } = createSync(db)

      sync.applyText('Line start=(0, 0) end=(20, 0)')

      expect(sync.model.toString()).toBe('Line start=(0, 0) end=(20, 0)')
      sync.applyText('')
      expect(lineOf(db)).toEqual([])
      sync.dispose()
    })

    it('creates and then edits every kind of entity', () => {
      const db = createDatabase()
      const { sync } = createSync(db)
      const text = [
        'Line start=(0, 0) end=(10, 5)',
        'CircularArc center=(1, 2) radius=3 startAngle=0.5 endAngle=2',
        'CircularArc center=(1, 2) radius=3 startAngle=0 endAngle=0',
        'EllipseArc center=(0, 0) majorRadius=5 minorRadius=2 rotation=0.5 startAngle=0 endAngle=6.283185',
        'Polyline vertices=[(0, 0), (1, 0), (1, 1)] closed=true',
        'Spline degree=3 controlPoints=[(0, 0), (1, 2), (3, 2), (4, 0)] closed=false',
        'Point position=(5, 5)',
        'Dimension type=AlignedDimension xLine1Point=(0, 0) xLine2Point=(1, 0) dimLinePoint=(1, 1) text="x"'
      ].join('\n')

      sync.applyText(text)

      expect(lineOf(db).sort()).toEqual(
        [
          'ARC',
          'CIRCLE',
          'DIMENSION',
          'ELLIPSE',
          'LINE',
          'LWPOLYLINE',
          'POINT',
          'SPLINE'
        ].sort()
      )
      expect(sync.model.toString()).toBe(text)
      const ids = [...db.tables.blockTable.modelSpace.newIterator()].map(
        entity => entity.objectId
      )

      const edited = text
        .replace('end=(10, 5)', 'end=(11, 5)')
        .replace('radius=3 startAngle=0.5', 'radius=4 startAngle=0.5')
        .replace('radius=3 startAngle=0 ', 'radius=4 startAngle=0 ')
        .replace('majorRadius=5', 'majorRadius=6')
        .replace('(1, 1)] closed=true', '(2, 2), (1, 1)] closed=true')
        .replace('(4, 0)] closed=false', '(5, 0)] closed=false')
        .replace('position=(5, 5)', 'position=(6, 6)')
        .replace('dimLinePoint=(1, 1) text="x"', 'dimLinePoint=(2, 2) text="y"')

      sync.applyText(edited)

      expect(sync.model.toString()).toBe(edited)
      expect(
        [...db.tables.blockTable.modelSpace.newIterator()].map(
          entity => entity.objectId
        )
      ).toEqual(ids)
      sync.dispose()
    })

    it('keeps polyline arcs when only a vertex position changes', () => {
      const db = createDatabase()
      const polyline = new AcDbPolyline()
      polyline.addVertexAt(0, new GeometryPoint2d(0, 0), 0.5)
      polyline.addVertexAt(1, new GeometryPoint2d(10, 0))
      db.tables.blockTable.modelSpace.appendEntity(polyline)
      const { sync } = createSync(db)

      sync.applyText('Polyline vertices=[(0, 0), (20, 0)] closed=false')

      const [entity] = db.tables.blockTable.modelSpace.newIterator()
      expect((entity as AcDbPolyline).getPoint2dAt(1).x).toBe(20)
      expect(
        (entity.geometry as unknown as { vertices: { bulge: number }[] })
          .vertices[0].bulge
      ).toBe(0.5)
      sync.dispose()
    })

    it('replaces an entity that changes kind and keeps its look', () => {
      const db = createDatabase()
      const line = createLine()
      line.lineWeight = 30
      db.tables.blockTable.modelSpace.appendEntity(line)
      const { sync } = createSync(db)

      sync.applyText('Point position=(1, 1)')

      const [entity] = db.tables.blockTable.modelSpace.newIterator()
      expect(lineOf(db)).toEqual(['POINT'])
      expect(entity.lineWeight).toBe(30)
      sync.dispose()
    })

    it('rejects dimensions it cannot create', () => {
      const db = createDatabase()
      const { sync } = createSync(db)

      expect(() => sync.applyText('Dimension type=Other a=(0, 0)')).toThrow(
        'Unknown dimension type'
      )
      expect(() =>
        sync.applyText('Dimension type=RadialDimension center=(0, 0)')
      ).toThrow('needs chordPoint')
      expect(() =>
        sync.applyText(
          'Dimension type=RadialDimension center=(0, 0) chordPoint=(1, 1) z=(2, 2)'
        )
      ).toThrow('has no z')
      expect(lineOf(db)).toEqual([])
      sync.dispose()
    })

    it('ignores measurement lines and a stale measured value', () => {
      const db = createDatabase()
      const dimension = new AcDbAlignedDimension(
        new GeometryPoint2d(0, 0),
        new GeometryPoint2d(10, 0),
        new GeometryPoint2d(5, 5)
      )
      dimension.measurement = 10
      db.tables.blockTable.modelSpace.appendEntity(dimension)
      const { sync } = createSync(db)
      const listener = jest.fn()
      sync.events.modelChanged.addEventListener(listener)

      const stale = sync.model
        .toString()
        .replace('measurement=10', 'measurement=999')
      expect(stale).toContain('measurement=999')

      sync.applyText(
        `${stale}
Dimension type=MeasureDistance start=(0, 0) end=(1, 1)`
      )

      expect(listener).not.toHaveBeenCalled()
      sync.dispose()
    })

    it('adds new entities to the layout on screen', () => {
      const db = createDatabase()
      const { sync } = createSync(db)

      sync.applyText('Point position=(1, 1)')

      const [point] = db.tables.blockTable.modelSpace.newIterator()
      expect(point.ownerId).toBe(db.currentSpaceId)
      sync.dispose()
    })

    it('refuses to change a read-only document', () => {
      const db = createDatabase()
      const manager = {
        curDocument: { database: db, openMode: AcEdOpenMode.Read },
        curView: {},
        events: { documentActivated: new AcCmEventManager<{ doc: unknown }>() }
      }
      const sync = new AcApModelSync(
        manager as unknown as ConstructorParameters<typeof AcApModelSync>[0]
      )

      expect(() => sync.applyText('Point position=(1, 1)')).toThrow('read-only')
      expect(lineOf(db)).toEqual([])
      sync.dispose()
    })
  })
})
