import {
  GeometryCircularArc2d,
  GeometryEllipseArc2d,
  GeometryLine2d,
  GeometryPoint2d,
  GeometryPolyline2d,
  Model
} from '../src'
import { ModelParseError } from '../src/Model'

const withoutIds = (text: string) => text.replace(/ id=\S+/g, '')

describe('Model', () => {
  it('starts without shapes', () => {
    const model = new Model()

    expect(model.shapes).toEqual([])
    expect(model.points).toEqual([])
    expect(model.dimensions).toEqual([])
    expect(withoutIds(model.toString())).toBe('')
  })

  it('describes each kind of shape on its own line', () => {
    const model = new Model()
    for (const geometry of [
      new GeometryLine2d(
        new GeometryPoint2d(0, 0),
        new GeometryPoint2d(1.5, 2)
      ),
      new GeometryCircularArc2d({ x: 1, y: 2 }, 3, 0, Math.PI, false),
      new GeometryEllipseArc2d({ x: 0, y: 0 }, 4, 2, 0, Math.PI, false, 0),
      new GeometryPolyline2d(
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 }
        ],
        true
      )
    ]) {
      model.add({ kind: 'shape', geometry })
    }

    expect(model.toString().split('\n')).toEqual([
      'Line id=1 start=(0, 0) end=(1.5, 2)',
      'CircularArc id=2 center=(1, 2) radius=3 startAngle=0 endAngle=3.141593',
      'EllipseArc id=3 center=(0, 0) majorRadius=4 minorRadius=2 rotation=0 startAngle=0 endAngle=3.141593',
      'Polyline id=4 vertices=[(0, 0), (1, 1)] closed=true'
    ])
  })

  it('lists points and dimensions after the shapes', () => {
    const model = new Model()
    model.add({ kind: 'point', geometry: new GeometryPoint2d(1.5, 2) })
    model.add({
      kind: 'dimension',
      geometry: {
        type: 'RadialDimension',
        points: {
          center: new GeometryPoint2d(0, 0),
          chordPoint: new GeometryPoint2d(5, 0)
        },
        text: '5.000',
        measurement: 5
      }
    })
    model.add({
      kind: 'dimension',
      geometry: {
        type: 'OrdinateDimension',
        points: { definingPoint: new GeometryPoint2d(1, 1) }
      }
    })
    model.add({
      kind: 'shape',
      geometry: new GeometryLine2d(
        new GeometryPoint2d(0, 0),
        new GeometryPoint2d(1, 0)
      )
    })

    expect(model.toString().split('\n')).toEqual([
      'Line id=4 start=(0, 0) end=(1, 0)',
      'Point id=1 position=(1.5, 2)',
      'Dimension id=2 type=RadialDimension center=(0, 0) chordPoint=(5, 0) text="5.000" measurement=5',
      'Dimension id=3 type=OrdinateDimension definingPoint=(1, 1)'
    ])
  })

  describe('items', () => {
    const line = (x: number) =>
      new GeometryLine2d(new GeometryPoint2d(0, 0), new GeometryPoint2d(x, 0))

    it('gives each added item a new id and keeps their order', () => {
      const model = new Model()
      const a = model.add({ kind: 'shape', geometry: line(1) })
      const b = model.add({ kind: 'shape', geometry: line(2), id: 'B' })
      const c = model.add({ kind: 'shape', geometry: line(3) })

      expect([a.id, b.id, c.id]).toEqual(['1', 'B', '2'])
      expect(model.items.map(item => item.id)).toEqual(['1', 'B', '2'])
      expect(model.get('B')?.geometry).toBe(b.geometry)
      expect(() =>
        model.add({ kind: 'shape', geometry: line(4), id: 'B' })
      ).toThrow('already exists')
    })

    it('fires events when items are added, changed and removed', () => {
      const model = new Model()
      const events: string[] = []
      model.events.itemAdded.addEventListener(({ item }) =>
        events.push(`add ${item.id}`)
      )
      model.events.itemModified.addEventListener(({ item }) =>
        events.push(`modify ${item.id}`)
      )
      model.events.itemRemoved.addEventListener(({ item }) =>
        events.push(`remove ${item.id}`)
      )

      const item = model.add({ kind: 'shape', geometry: line(1) })
      model.update({ id: item.id, kind: 'shape', geometry: line(5) })
      model.set({ id: '7', kind: 'point', geometry: new GeometryPoint2d() })
      model.remove(item.id)
      model.clear()

      expect(events).toEqual([
        'add 1',
        'modify 1',
        'add 7',
        'remove 1',
        'remove 7'
      ])
      expect(model.items).toEqual([])
    })

    it('keeps the position of an item when it changes kind', () => {
      const model = new Model()
      model.add({ kind: 'shape', geometry: line(1) })
      model.add({ kind: 'shape', geometry: line(2) })
      model.update({ id: '1', kind: 'shape', geometry: line(9) })

      expect(withoutIds(model.toString()).split('\n')).toEqual([
        'Line start=(0, 0) end=(9, 0)',
        'Line start=(0, 0) end=(2, 0)'
      ])
      expect(() =>
        model.update({ id: 'x', kind: 'shape', geometry: line(1) })
      ).toThrow('No item has id x')
    })
  })

  describe('parse', () => {
    it('keeps the ids written in the text and gives new lines new ids', () => {
      const model = Model.parse(
        'Line start=(0, 0) end=(1, 0)\nLine id=1 start=(0, 0) end=(2, 0)'
      )

      expect(model.toString().split('\n')).toEqual([
        'Line id=1 start=(0, 0) end=(2, 0)',
        'Line id=2 start=(0, 0) end=(1, 0)'
      ])
    })

    it('reads the id of each kind of line', () => {
      expect(
        Model.parseItems(
          'Point id=a.1 position=(1, 1)\nDimension id=d-2 type=X p=(0, 0)\nLine start=(0, 0) end=(1, 0)'
        ).map(item => item.id)
      ).toEqual(['a.1', 'd-2', undefined])
    })

    it('reads back every kind of line it writes', () => {
      const text = [
        'Line start=(0, 0) end=(10, 5)',
        'CircularArc center=(1, 2) radius=3 startAngle=0.5 endAngle=2',
        'CircularArc center=(1, 2) radius=3 startAngle=0 endAngle=0',
        'EllipseArc center=(0, 0) majorRadius=5 minorRadius=2 rotation=0.5 startAngle=0 endAngle=6.283185',
        'Polyline vertices=[(0, 0), (1, 0), (1, 1)] closed=true',
        'Polyline vertices=[(0, 0, bulge=0.5), (1, 0), (1, 1, bulge=-1)] closed=false',
        'Point position=(5, 5)',
        'Dimension type=AlignedDimension xLine1Point=(0, 0) dimLinePoint=(5, 5) text="a b=c" measurement=10'
      ].join('\n')

      expect(withoutIds(Model.parse(text).toString())).toBe(text)
    })

    it('treats a full turn of rounded angles as a full circle', () => {
      const model = Model.parse(
        'CircularArc center=(0, 0) radius=1 startAngle=0 endAngle=6.283185'
      )

      expect((model.shapes[0] as GeometryCircularArc2d).closed).toBe(true)
      expect(withoutIds(model.toString())).toBe(
        'CircularArc center=(0, 0) radius=1 startAngle=0 endAngle=0'
      )
    })

    it('reads polyline arcs into the bulge of each vertex', () => {
      const model = Model.parse(
        'Polyline vertices=[( 0,0 , bulge = 0.25 ), (1, 0)] closed=false'
      )

      const { vertices } = model.shapes[0] as GeometryPolyline2d
      expect(vertices.map(vertex => vertex.bulge)).toEqual([0.25, 0])
      expect(withoutIds(model.toString())).toBe(
        'Polyline vertices=[(0, 0, bulge=0.25), (1, 0)] closed=false'
      )
    })

    it('accepts any spacing and blank lines', () => {
      const model = Model.parse(
        '\n  Line  start=( 0,0 )   end=(1e1,  -.5)\r\n\n'
      )

      expect(withoutIds(model.toString())).toBe(
        'Line start=(0, 0) end=(10, -0.5)'
      )
    })

    it('keeps a text value without a measurement', () => {
      const model = Model.parse('Dimension type=X p=(1, 2) text="say "hi""')

      expect(model.dimensions[0].text).toBe('say "hi"')
      expect(model.dimensions[0].measurement).toBeUndefined()
    })

    it.each([
      ['Line start=(0, 0)', 'end is missing'],
      ['Line start=(0, 0) end=(1', 'end has an incomplete value'],
      ['Line start=(0, 0) end=(1, x)', 'end must be a number'],
      ['Line start=(0, 0) end=(1, 1) extra=2', 'Unknown field extra'],
      ['Line start=(0, 0) start=(1, 1) end=(1, 1)', 'start is repeated'],
      ['Line start=(0, 0) oops', 'Unexpected text "oops"'],
      ['Square side=1', 'Unknown item "Square"'],
      ['Point id=a/b position=(0, 0)', 'id may only use'],
      [
        'CircularArc center=(0, 0) radius=0 startAngle=0 endAngle=1',
        'radius must be greater than 0'
      ],
      ['Polyline vertices=[(0, 0)] closed=false', 'at least 2 points'],
      ['Polyline vertices=[(0, 0), (1, 1)] closed=maybe', 'true or false'],
      ['Polyline vertices=[(0, 0) x (1, 1)] closed=false', 'must be a list'],
      [
        'Polyline vertices=[(0, 0, 1), (1, 1)] closed=false',
        'must list points'
      ],
      [
        'Polyline vertices=[(0, 0, bulge=x), (1, 1)] closed=false',
        'bulge must be a number'
      ],
      ['Spline degree=3', 'Unknown item "Spline"']
    ])('rejects %s', (line, message) => {
      expect(() => Model.parse(line)).toThrow(message)
    })

    it('rejects an id that is used twice', () => {
      expect(() =>
        Model.parse('Point id=1 position=(0, 0)\nPoint id=1 position=(1, 1)')
      ).toThrow('Line 2: id 1 is repeated')
    })

    it('reports the number of the invalid line', () => {
      let error: unknown
      try {
        Model.parse('Point position=(1, 1)\n\nnonsense')
      } catch (caught) {
        error = caught
      }

      expect(error).toBeInstanceOf(ModelParseError)
      expect((error as ModelParseError).line).toBe(3)
      expect((error as ModelParseError).message).toBe(
        'Line 3: Unknown item "nonsense"'
      )
    })
  })
})
