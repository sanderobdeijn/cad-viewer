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

const withoutIds = (text: string) => text.replace(/ id=\S+/g, '')

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

const createSync = (
  db: AcDbDatabase,
  openMode: AcEdOpenMode = AcEdOpenMode.Write
) => {
  const sync = new AcApModelSync(
    { database: db, openMode },
    () => ({}) as never
  )
  return { sync }
}

describe('AcApModelSync', () => {
  it('starts with the shapes already in the current space', () => {
    const db = createDatabase()
    db.tables.blockTable.modelSpace.appendEntity(createLine())

    const { sync } = createSync(db)

    expect(withoutIds(sync.model.toString())).toBe(
      'Line start=(0, 0) end=(10, 0)'
    )
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

    expect(withoutIds(sync.model.toString()).split('\n')).toEqual([
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

  it('removes the shape when an entity is erased', () => {
    const db = createDatabase()
    const line = createLine()
    db.tables.blockTable.modelSpace.appendEntity(line)
    const { sync } = createSync(db)

    const manager = db.transactionManager
    manager.runInTransaction(() => {
      db.tables.blockTable.modelSpace.removeEntity(line.objectId)
    })
    expect(sync.model.shapes).toHaveLength(0)
    sync.dispose()
  })

  it('tracks points through append, change and erase', () => {
    const db = createDatabase()
    const { sync } = createSync(db)
    const point = new AcDbPoint()
    point.position = new GeometryPoint2d(1, 2)

    const modelSpace = db.tables.blockTable.modelSpace
    modelSpace.appendEntity(point)
    expect(withoutIds(sync.model.toString())).toBe('Point position=(1, 2)')
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
    expect(withoutIds(sync.model.toString())).toBe('Point position=(3, 4)')

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
    expect(withoutIds(sync.model.toString())).toBe(
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
    expect(withoutIds(sync.model.toString()).split('\n').slice(1)).toEqual([
      'Dimension type=MeasureDistance start=(0, 0) end=(100, 0) text="100 mm"',
      'Dimension type=MeasureArea point1=(0, 0) point2=(1, 0) point3=(1, 1) text="100 mm"'
    ])

    setMeasurements([])
    expect(sync.model.dimensions).toHaveLength(1)
    sync.dispose()
  })

  it('follows only model space', () => {
    const db = createDatabase()
    db.createNewDrawing()
    db.tables.blockTable.modelSpace.appendEntity(createLine())
    const { sync } = createSync(db)

    const paperSpace = [...db.tables.blockTable.newIterator()].find(
      record => record.objectId !== db.tables.blockTable.modelSpace.objectId
    )
    expect(paperSpace).toBeDefined()
    paperSpace!.appendEntity(createLine(50))

    expect(sync.model.shapes).toHaveLength(1)
    sync.dispose()
  })

  it('rebuilds the model when asked to resync', () => {
    const db = createDatabase()
    db.tables.blockTable.modelSpace.appendEntity(createLine())
    const { sync } = createSync(db)
    expect(sync.model.shapes).toHaveLength(1)

    // A new drawing replaces the content without erase events.
    db.createNewDrawing()
    expect(sync.model.shapes).toHaveLength(1)

    sync.resync()
    expect(sync.model.shapes).toHaveLength(0)
    db.tables.blockTable.modelSpace.appendEntity(createLine())
    expect(sync.model.shapes).toHaveLength(1)
    sync.dispose()
  })

  it('builds an entity that draws an item under its id', () => {
    const db = createDatabase()
    const line = createLine()
    db.tables.blockTable.modelSpace.appendEntity(line)
    const { sync } = createSync(db)

    const entity = sync.createEntity(sync.model.items[0])

    expect(entity).toBeInstanceOf(AcDbLine)
    expect(entity!.objectId).toBe(line.objectId)
    expect(entity!.ownerId).toBe(db.tables.blockTable.modelSpace.objectId)
    expect([...db.tables.blockTable.modelSpace.newIterator()]).toHaveLength(1)
    sync.dispose()
  })

  it('does not draw measurements from the model', () => {
    const db = createDatabase()
    const { sync } = createSync(db)
    setMeasurements([
      {
        id: 'm1',
        geometry: {
          type: 'distance',
          start: { x: 0, y: 0 },
          end: { x: 1, y: 0 }
        }
      }
    ])

    const [measurement] = sync.model.items
    expect(sync.isMeasurement(measurement.id)).toBe(true)
    expect(sync.createEntity(measurement)).toBeUndefined()
    setMeasurements([])
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
      expect(withoutIds(sync.model.toString())).toBe(
        'Line start=(1, 2) end=(3, 4)'
      )
      sync.dispose()
    })

    it('leaves the drawing alone when nothing changed', () => {
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

      expect(withoutIds(sync.model.toString())).toBe(
        'Line start=(0, 0) end=(10, 0)'
      )
      sync.dispose()
    })

    it('erases entities whose line was removed', () => {
      const db = createDatabase()
      db.tables.blockTable.modelSpace.appendEntity(createLine(10))
      db.tables.blockTable.modelSpace.appendEntity(createLine(20))
      const { sync } = createSync(db)

      sync.applyText('Line start=(0, 0) end=(20, 0)')

      expect(withoutIds(sync.model.toString())).toBe(
        'Line start=(0, 0) end=(20, 0)'
      )
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
          'POINT'
        ].sort()
      )
      expect(withoutIds(sync.model.toString())).toBe(text)
      const ids = [...db.tables.blockTable.modelSpace.newIterator()].map(
        entity => entity.objectId
      )

      const edited = text
        .replace('end=(10, 5)', 'end=(11, 5)')
        .replace('radius=3 startAngle=0.5', 'radius=4 startAngle=0.5')
        .replace('radius=3 startAngle=0 ', 'radius=4 startAngle=0 ')
        .replace('majorRadius=5', 'majorRadius=6')
        .replace('(1, 1)] closed=true', '(2, 2), (1, 1)] closed=true')
        .replace('position=(5, 5)', 'position=(6, 6)')
        .replace('dimLinePoint=(1, 1) text="x"', 'dimLinePoint=(2, 2) text="y"')

      sync.applyText(edited)

      expect(withoutIds(sync.model.toString())).toBe(edited)
      expect(
        [...db.tables.blockTable.modelSpace.newIterator()].map(
          entity => entity.objectId
        )
      ).toEqual(ids)
      sync.dispose()
    })

    describe('polyline arcs', () => {
      const createArcPolyline = (db: AcDbDatabase) => {
        const polyline = new AcDbPolyline()
        polyline.addVertexAt(0, new GeometryPoint2d(0, 0), 0.5, 2, 3)
        polyline.addVertexAt(1, new GeometryPoint2d(10, 0))
        db.tables.blockTable.modelSpace.appendEntity(polyline)
        return polyline
      }
      const bulges = (db: AcDbDatabase) => {
        const [entity] = db.tables.blockTable.modelSpace.newIterator()
        const geometry = entity.geometry as unknown as {
          vertices: { bulge: number; startWidth?: number }[]
        }
        return geometry.vertices.map(vertex => vertex.bulge)
      }

      it('shows the arc of each vertex', () => {
        const db = createDatabase()
        createArcPolyline(db)
        const { sync } = createSync(db)

        expect(withoutIds(sync.model.toString())).toBe(
          'Polyline vertices=[(0, 0, bulge=0.5), (10, 0)] closed=false'
        )
        sync.dispose()
      })

      it('keeps an arc when only a vertex position changes', () => {
        const db = createDatabase()
        const polyline = createArcPolyline(db)
        const { sync } = createSync(db)

        sync.applyText(
          'Polyline vertices=[(0, 0, bulge=0.5), (20, 0)] closed=false'
        )

        expect(polyline.getPoint2dAt(1).x).toBe(20)
        expect(bulges(db)).toEqual([0.5, 0])
        sync.dispose()
      })

      it('changes, adds and removes arcs in place', () => {
        const db = createDatabase()
        const polyline = createArcPolyline(db)
        const { sync } = createSync(db)

        sync.applyText(
          'Polyline vertices=[(0, 0, bulge=-1), (10, 0)] closed=false'
        )
        expect(bulges(db)).toEqual([-1, 0])

        sync.applyText(
          'Polyline vertices=[(0, 0), (10, 0, bulge=1), (20, 0)] closed=false'
        )
        expect(bulges(db)).toEqual([0, 1, 0])

        const [entity] = db.tables.blockTable.modelSpace.newIterator()
        expect(entity.objectId).toBe(polyline.objectId)
        expect(withoutIds(sync.model.toString())).toBe(
          'Polyline vertices=[(0, 0), (10, 0, bulge=1), (20, 0)] closed=false'
        )
        sync.dispose()
      })

      it('keeps an arc on its segment when a vertex is inserted before it', () => {
        const db = createDatabase()
        createArcPolyline(db)
        const { sync } = createSync(db)

        sync.applyText(
          'Polyline vertices=[(-5, 0), (0, 0, bulge=0.5), (10, 0)] closed=false'
        )

        expect(bulges(db)).toEqual([0, 0.5, 0])
        sync.dispose()
      })

      it('keeps vertex widths when an arc changes', () => {
        const db = createDatabase()
        createArcPolyline(db)
        const { sync } = createSync(db)

        sync.applyText(
          'Polyline vertices=[(0, 0, bulge=1), (10, 0)] closed=false'
        )

        const [entity] = db.tables.blockTable.modelSpace.newIterator()
        const geometry = entity.geometry as unknown as {
          vertices: { startWidth?: number; endWidth?: number }[]
        }
        expect(geometry.vertices[0].startWidth).toBe(2)
        expect(geometry.vertices[0].endWidth).toBe(3)
        sync.dispose()
      })

      it('creates a new polyline with arcs', () => {
        const db = createDatabase()
        const { sync } = createSync(db)

        sync.applyText(
          'Polyline vertices=[(0, 0, bulge=0.5), (10, 0)] closed=false'
        )

        expect(bulges(db)).toEqual([0.5, 0])
        sync.dispose()
      })
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

    it('uses the object id of each entity as its item id', () => {
      const db = createDatabase()
      const line = createLine()
      db.tables.blockTable.modelSpace.appendEntity(line)
      const { sync } = createSync(db)

      expect(sync.model.toString()).toBe(
        `Line id=${line.objectId} start=(0, 0) end=(10, 0)`
      )
      sync.dispose()
    })

    it('applies a line to the entity its id names', () => {
      const db = createDatabase()
      const a = createLine(10)
      const b = createLine(10)
      db.tables.blockTable.modelSpace.appendEntity([a, b])
      const { sync } = createSync(db)

      // Both lines read the same, so only the id says which one changed.
      sync.applyText(
        `Line id=${a.objectId} start=(0, 0) end=(10, 0)\nLine id=${b.objectId} start=(0, 0) end=(30, 0)`
      )

      expect(a.endPoint.x).toBe(10)
      expect(b.endPoint.x).toBe(30)
      sync.dispose()
    })

    it('erases the item whose line is removed, by id', () => {
      const db = createDatabase()
      const a = createLine(10)
      const b = createLine(10)
      db.tables.blockTable.modelSpace.appendEntity([a, b])
      const { sync } = createSync(db)

      sync.applyText(`Line id=${b.objectId} start=(0, 0) end=(10, 0)`)

      const ids = [...db.tables.blockTable.modelSpace.newIterator()].map(
        entity => entity.objectId
      )
      expect(ids).toEqual([b.objectId])
      sync.dispose()
    })

    it('replaces an item whose line changes kind, by id', () => {
      const db = createDatabase()
      const a = createLine()
      a.lineWeight = 30
      db.tables.blockTable.modelSpace.appendEntity(a)
      const { sync } = createSync(db)

      sync.applyText(`Point id=${a.objectId} position=(1, 1)`)

      const [entity] = db.tables.blockTable.modelSpace.newIterator()
      expect(entity.dxfTypeName).toBe('POINT')
      expect(entity.lineWeight).toBe(30)
      sync.dispose()
    })

    it('treats a line with an unknown id as new', () => {
      const db = createDatabase()
      const { sync } = createSync(db)

      sync.applyText('Point id=missing position=(1, 1)')

      expect(withoutIds(sync.model.toString())).toBe('Point position=(1, 1)')
      sync.dispose()
    })

    it('does not create a new line again while it is still being typed', () => {
      const db = createDatabase()
      const { sync } = createSync(db)

      sync.applyText('Line start=(0, 0) end=(1, 0)')
      sync.applyText('Line start=(0, 0) end=(12, 0)')
      sync.applyText('Line start=(0, 0) end=(12, 0)')

      expect(withoutIds(sync.model.toString())).toBe(
        'Line start=(0, 0) end=(12, 0)'
      )
      sync.dispose()
    })

    it('rejects text that uses an id twice', () => {
      const db = createDatabase()
      const { sync } = createSync(db)

      expect(() =>
        sync.applyText('Point id=1 position=(0, 0)\nPoint id=1 position=(1, 1)')
      ).toThrow('id 1 is repeated')
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
      const { sync } = createSync(db, AcEdOpenMode.Read)

      expect(() => sync.applyText('Point position=(1, 1)')).toThrow('read-only')
      expect(lineOf(db)).toEqual([])
      sync.dispose()
    })
  })
})
