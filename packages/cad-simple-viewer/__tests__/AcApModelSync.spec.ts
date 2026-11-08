import {
  AcDbAlignedDimension,
  AcDbDatabase,
  acdbHostApplicationServices,
  AcDbLine,
  AcDbPoint,
  AcDbPolyline
} from '@mlightcad/data-model'
import { GeometryPoint2d } from '@mlightcad/geometry-engine'

import { AcApModelSync, itemContentsFor } from '../src/app/AcApModelSync'
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

const distance = (id: string) => ({
  id,
  geometry: { type: 'distance', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }
})

const createDatabase = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

const createLine = (x = 10) =>
  new AcDbLine(new GeometryPoint2d(0, 0), new GeometryPoint2d(x, 0))

const createDimension = () =>
  new AcDbAlignedDimension(
    new GeometryPoint2d(0, 0),
    new GeometryPoint2d(10, 0),
    new GeometryPoint2d(5, 5)
  )

const createSync = (openMode: AcEdOpenMode = AcEdOpenMode.Write) => {
  const db = createDatabase()
  const sync = new AcApModelSync(
    { database: db, openMode },
    () => ({}) as never
  )
  return { db, sync }
}

/** A sync whose document becomes read-only after it is filled. */
const createLockableSync = () => {
  const db = createDatabase()
  const doc = { database: db, openMode: AcEdOpenMode.Write }
  const sync = new AcApModelSync(doc, () => ({}) as never)
  return { db, sync, lock: () => (doc.openMode = AcEdOpenMode.Read) }
}

afterEach(() => {
  mockMeasurements = []
})

describe('AcApModelSync', () => {
  it('starts with an empty drawing', () => {
    const { sync } = createSync()
    expect(sync.model.items).toEqual([])
    sync.dispose()
  })

  it('adds the items that entities describe under new ids', () => {
    const { db, sync } = createSync()
    const listener = jest.fn()
    sync.events.modelChanged.addEventListener(listener)
    const point = new AcDbPoint()
    point.position = new GeometryPoint2d(1, 2)

    const ids = sync.add([createLine(), point, createDimension()])

    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
    expect(withoutIds(sync.model.toString()).split('\n')).toEqual([
      'Line start=(0, 0) end=(10, 0)',
      'Point position=(1, 2)',
      'Dimension type=AlignedDimension xLine1Point=(0, 0) xLine2Point=(10, 0) dimLinePoint=(5, 5) text="10.000"'
    ])
    expect(listener).toHaveBeenCalledTimes(3)
    expect([...db.tables.blockTable.modelSpace.newIterator()]).toHaveLength(0)
    sync.dispose()
  })

  it('keeps its own copy of the geometry it is given', () => {
    const { sync } = createSync()
    const line = createLine()
    const point = new AcDbPoint()
    const dimension = createDimension()

    sync.add([line, point, dimension])

    expect(sync.model.shapes[0]).not.toBe(line.geometry)
    expect(sync.model.points[0]).not.toBe(point.position)
    expect(sync.model.dimensions[0].points.xLine1Point).not.toBe(
      dimension.xLine1Point
    )
    sync.dispose()
  })

  it('describes only shapes, points and dimensions', () => {
    expect(itemContentsFor(createLine())?.kind).toBe('shape')
    expect(itemContentsFor(new AcDbPoint())?.kind).toBe('point')
    expect(itemContentsFor(createDimension())?.kind).toBe('dimension')
  })

  it('returns the same entity for an item until it changes', () => {
    const { db, sync } = createSync()
    const [id] = sync.add(createLine())

    const entity = sync.entity(id)
    expect(entity).toBeInstanceOf(AcDbLine)
    expect(entity!.objectId).toBe(id)
    expect(entity!.ownerId).toBe(db.tables.blockTable.modelSpace.objectId)
    expect(sync.entity(id)).toBe(entity)

    sync.replace(id, createLine(20))
    const changed = sync.entity(id) as AcDbLine
    expect(changed).not.toBe(entity)
    expect(changed.endPoint.x).toBe(20)

    sync.remove([id])
    expect(sync.entity(id)).toBeUndefined()
    sync.dispose()
  })

  it('lists the entities of the ids that exist', () => {
    const { sync } = createSync()
    const ids = sync.add([createLine(), createLine(20)])

    expect(sync.entities([...ids, 'missing'])).toHaveLength(2)
    sync.dispose()
  })

  it('replaces an item and keeps its id', () => {
    const { sync } = createSync()
    const [id] = sync.add(createLine())
    const point = new AcDbPoint()
    point.position = new GeometryPoint2d(3, 4)

    expect(sync.replace(id, point)).toBe(true)
    expect(sync.model.toString()).toBe(`Point id=${id} position=(3, 4)`)
    expect(sync.replace('missing', point)).toBe(false)
    sync.dispose()
  })

  it('edits an item through a copy of its entity', () => {
    const { sync } = createSync()
    const [id] = sync.add(createLine())
    const drawn = sync.entity(id) as AcDbLine

    sync.edit(id, entity => {
      ;(entity as AcDbLine).endPoint = new GeometryPoint2d(30, 0)
    })

    expect(drawn.endPoint.x).toBe(10)
    expect(sync.model.toString()).toBe(`Line id=${id} start=(0, 0) end=(30, 0)`)
    expect(sync.edit('missing', () => {})).toBe(false)
    sync.dispose()
  })

  it('removes items and counts them', () => {
    const { sync } = createSync()
    const ids = sync.add([createLine(), createLine(20)])

    expect(sync.remove([ids[0], 'missing'])).toBe(1)
    expect(sync.model.items.map(item => item.id)).toEqual([ids[1]])
    sync.dispose()
  })

  it('refuses to change a read-only document', () => {
    const { sync, lock } = createLockableSync()
    const [id] = sync.add(createLine())
    lock()

    expect(() => sync.add(createLine())).toThrow('read-only')
    expect(() => sync.replace(id, createLine(20))).toThrow('read-only')
    expect(() => sync.edit(id, () => {})).toThrow('read-only')
    expect(() => sync.remove([id])).toThrow('read-only')
    expect(sync.model.items).toHaveLength(1)
    sync.dispose()
  })

  it('lists measurements after the dimensions', () => {
    const { sync } = createSync()
    sync.add(createDimension())
    const listener = jest.fn()
    sync.events.modelChanged.addEventListener(listener)

    setMeasurements([
      distance('dist-1'),
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

    expect(listener).toHaveBeenCalled()
    expect(withoutIds(sync.model.toString()).split('\n').slice(1)).toEqual([
      'Dimension type=MeasureDistance start=(0, 0) end=(100, 0) text="100 mm"',
      'Dimension type=MeasureArea point1=(0, 0) point2=(1, 0) point3=(1, 1) text="100 mm"'
    ])

    setMeasurements([])
    expect(sync.model.dimensions).toHaveLength(1)
    sync.dispose()
  })

  it('does not draw, change or remove measurements', () => {
    const { sync } = createSync()
    setMeasurements([distance('m1')])

    const [measurement] = sync.model.items
    expect(sync.isMeasurement(measurement.id)).toBe(true)
    expect(sync.createEntity(measurement)).toBeUndefined()
    expect(sync.entity(measurement.id)).toBeUndefined()
    expect(sync.replace(measurement.id, createLine())).toBe(false)
    expect(sync.remove([measurement.id])).toBe(0)
    expect(sync.model.items).toHaveLength(1)
    sync.dispose()
  })

  it('empties the drawing but keeps measurements when asked to resync', () => {
    const { sync } = createSync()
    sync.add(createLine())
    setMeasurements([distance('m1')])

    sync.resync()

    expect(sync.model.shapes).toHaveLength(0)
    expect(sync.model.items.map(item => item.id)).toEqual(['m1'])
    sync.dispose()
  })

  it('builds a new entity that draws an item under its id', () => {
    const { db, sync } = createSync()
    const [id] = sync.add(createLine())

    const entity = sync.createEntity(sync.model.get(id)!)

    expect(entity).toBeInstanceOf(AcDbLine)
    expect(entity).not.toBe(sync.entity(id))
    expect(entity!.objectId).toBe(id)
    expect([...db.tables.blockTable.modelSpace.newIterator()]).toHaveLength(0)
    sync.dispose()
  })

  it('stops following measurements after dispose', () => {
    const { sync } = createSync()

    sync.dispose()
    setMeasurements([distance('m1')])

    expect(sync.model.items).toHaveLength(0)
  })

  describe('applyText', () => {
    const kinds = (sync: AcApModelSync) =>
      sync.model.items.map(item => sync.entity(item.id)!.dxfTypeName)

    it('updates a changed line in place', () => {
      const { sync } = createSync()
      const [id] = sync.add(createLine())

      sync.applyText('Line start=(1, 2) end=(3, 4)')

      expect(sync.model.toString()).toBe(
        `Line id=${id} start=(1, 2) end=(3, 4)`
      )
      sync.dispose()
    })

    it('leaves the drawing alone when nothing changed', () => {
      const { sync } = createSync()
      sync.add(createLine())
      const listener = jest.fn()
      sync.events.modelChanged.addEventListener(listener)

      sync.applyText('  Line start=(0,0)   end=(10, 0)\n\n')

      expect(listener).not.toHaveBeenCalled()
      sync.dispose()
    })

    it('changes nothing when any line is invalid', () => {
      const { sync } = createSync()
      sync.add(createLine())

      expect(() =>
        sync.applyText('Line start=(9, 9) end=(9, 0)\nnonsense')
      ).toThrow('Line 2')

      expect(withoutIds(sync.model.toString())).toBe(
        'Line start=(0, 0) end=(10, 0)'
      )
      sync.dispose()
    })

    it('removes items whose line was removed', () => {
      const { sync } = createSync()
      sync.add([createLine(10), createLine(20)])

      sync.applyText('Line start=(0, 0) end=(20, 0)')

      expect(withoutIds(sync.model.toString())).toBe(
        'Line start=(0, 0) end=(20, 0)'
      )
      sync.applyText('')
      expect(sync.model.items).toEqual([])
      sync.dispose()
    })

    it('creates and then edits every kind of item', () => {
      const { sync } = createSync()
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

      expect(kinds(sync)).toEqual([
        'LINE',
        'ARC',
        'CIRCLE',
        'ELLIPSE',
        'LWPOLYLINE',
        'POINT',
        'DIMENSION'
      ])
      expect(withoutIds(sync.model.toString())).toBe(text)
      const ids = sync.model.items.map(item => item.id)

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
      expect(sync.model.items.map(item => item.id)).toEqual(ids)
      sync.dispose()
    })

    describe('polyline arcs', () => {
      const addArcPolyline = (sync: AcApModelSync) => {
        const polyline = new AcDbPolyline()
        polyline.addVertexAt(0, new GeometryPoint2d(0, 0), 0.5)
        polyline.addVertexAt(1, new GeometryPoint2d(10, 0))
        return sync.add(polyline)[0]
      }
      const bulges = (sync: AcApModelSync) => {
        const [item] = sync.model.items
        const geometry = item.geometry as unknown as {
          vertices: { bulge?: number }[]
        }
        return geometry.vertices.map(vertex => vertex.bulge ?? 0)
      }

      it('shows the arc of each vertex', () => {
        const { sync } = createSync()
        addArcPolyline(sync)

        expect(withoutIds(sync.model.toString())).toBe(
          'Polyline vertices=[(0, 0, bulge=0.5), (10, 0)] closed=false'
        )
        sync.dispose()
      })

      it('keeps an arc when only a vertex position changes', () => {
        const { sync } = createSync()
        addArcPolyline(sync)

        sync.applyText(
          'Polyline vertices=[(0, 0, bulge=0.5), (20, 0)] closed=false'
        )

        expect(bulges(sync)).toEqual([0.5, 0])
        sync.dispose()
      })

      it('changes, adds and removes arcs in place', () => {
        const { sync } = createSync()
        const id = addArcPolyline(sync)

        sync.applyText(
          'Polyline vertices=[(0, 0, bulge=-1), (10, 0)] closed=false'
        )
        expect(bulges(sync)).toEqual([-1, 0])

        sync.applyText(
          'Polyline vertices=[(0, 0), (10, 0, bulge=1), (20, 0)] closed=false'
        )
        expect(bulges(sync)).toEqual([0, 1, 0])
        expect(sync.model.toString()).toBe(
          `Polyline id=${id} vertices=[(0, 0), (10, 0, bulge=1), (20, 0)] closed=false`
        )
        sync.dispose()
      })

      it('keeps an arc on its segment when a vertex is inserted before it', () => {
        const { sync } = createSync()
        addArcPolyline(sync)

        sync.applyText(
          'Polyline vertices=[(-5, 0), (0, 0, bulge=0.5), (10, 0)] closed=false'
        )

        expect(bulges(sync)).toEqual([0, 0.5, 0])
        sync.dispose()
      })

      it('draws a polyline with arcs', () => {
        const { sync } = createSync()

        sync.applyText(
          'Polyline vertices=[(0, 0, bulge=0.5), (10, 0)] closed=false'
        )

        const [item] = sync.model.items
        const entity = sync.entity(item.id) as AcDbPolyline
        const geometry = entity.geometry as unknown as {
          vertices: { bulge?: number }[]
        }
        expect(geometry.vertices[0].bulge).toBe(0.5)
        sync.dispose()
      })
    })

    it('changes the kind of an item and keeps its id', () => {
      const { sync } = createSync()
      const [id] = sync.add(createLine())

      sync.applyText('Point position=(1, 1)')

      expect(sync.model.toString()).toBe(`Point id=${id} position=(1, 1)`)
      expect(kinds(sync)).toEqual(['POINT'])
      sync.dispose()
    })

    it('rejects dimensions it cannot draw', () => {
      const { sync } = createSync()

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
      expect(sync.model.items).toEqual([])
      sync.dispose()
    })

    it('ignores measurement lines and a stale measured value', () => {
      const { sync } = createSync()
      const dimension = createDimension()
      dimension.measurement = 10
      sync.add(dimension)
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

    it('applies a line to the item its id names', () => {
      const { sync } = createSync()
      const [a, b] = sync.add([createLine(10), createLine(10)])

      // Both lines read the same, so only the id says which one changed.
      sync.applyText(
        `Line id=${a} start=(0, 0) end=(10, 0)\nLine id=${b} start=(0, 0) end=(30, 0)`
      )

      expect((sync.entity(a) as AcDbLine).endPoint.x).toBe(10)
      expect((sync.entity(b) as AcDbLine).endPoint.x).toBe(30)
      sync.dispose()
    })

    it('removes the item whose line is removed, by id', () => {
      const { sync } = createSync()
      const [, b] = sync.add([createLine(10), createLine(10)])

      sync.applyText(`Line id=${b} start=(0, 0) end=(10, 0)`)

      expect(sync.model.items.map(item => item.id)).toEqual([b])
      sync.dispose()
    })

    it('changes the kind of the item its id names', () => {
      const { sync } = createSync()
      const [id] = sync.add(createLine())

      sync.applyText(`Point id=${id} position=(1, 1)`)

      expect(sync.model.toString()).toBe(`Point id=${id} position=(1, 1)`)
      sync.dispose()
    })

    it('treats a line with an unknown id as new', () => {
      const { sync } = createSync()

      sync.applyText('Point id=missing position=(1, 1)')

      expect(withoutIds(sync.model.toString())).toBe('Point position=(1, 1)')
      sync.dispose()
    })

    it('does not create a new line again while it is still being typed', () => {
      const { sync } = createSync()

      sync.applyText('Line start=(0, 0) end=(1, 0)')
      sync.applyText('Line start=(0, 0) end=(12, 0)')
      sync.applyText('Line start=(0, 0) end=(12, 0)')

      expect(withoutIds(sync.model.toString())).toBe(
        'Line start=(0, 0) end=(12, 0)'
      )
      sync.dispose()
    })

    it('rejects text that uses an id twice', () => {
      const { sync } = createSync()

      expect(() =>
        sync.applyText('Point id=1 position=(0, 0)\nPoint id=1 position=(1, 1)')
      ).toThrow('id 1 is repeated')
      sync.dispose()
    })

    it('refuses to change a read-only document', () => {
      const { sync } = createSync(AcEdOpenMode.Read)

      expect(() => sync.applyText('Point position=(1, 1)')).toThrow('read-only')
      expect(sync.model.items).toEqual([])
      sync.dispose()
    })
  })
})
