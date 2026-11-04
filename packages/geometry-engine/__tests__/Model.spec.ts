import {
  GeometryCircularArc2d,
  GeometryEllipseArc2d,
  GeometryLine2d,
  GeometryPoint2d,
  GeometryPolyline2d,
  Model,
  ModelParseError
} from '../src'

describe('Model', () => {
  it('starts without shapes', () => {
    const model = new Model()

    expect(model.shapes).toEqual([])
    expect(model.points).toEqual([])
    expect(model.dimensions).toEqual([])
    expect(model.toString()).toBe('')
  })

  it('describes each kind of shape on its own line', () => {
    const model = new Model()
    model.shapes = [
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
    ]

    expect(model.toString().split('\n')).toEqual([
      'Line start=(0, 0) end=(1.5, 2)',
      'CircularArc center=(1, 2) radius=3 startAngle=0 endAngle=3.141593',
      'EllipseArc center=(0, 0) majorRadius=4 minorRadius=2 rotation=0 startAngle=0 endAngle=3.141593',
      'Polyline vertices=[(0, 0), (1, 1)] closed=true'
    ])
  })

  it('lists points and dimensions after the shapes', () => {
    const model = new Model()
    model.shapes = [
      new GeometryLine2d(new GeometryPoint2d(0, 0), new GeometryPoint2d(1, 0))
    ]
    model.points = [new GeometryPoint2d(1.5, 2)]
    model.dimensions = [
      {
        type: 'RadialDimension',
        points: {
          center: new GeometryPoint2d(0, 0),
          chordPoint: new GeometryPoint2d(5, 0)
        },
        text: '5.000',
        measurement: 5
      },
      {
        type: 'OrdinateDimension',
        points: { definingPoint: new GeometryPoint2d(1, 1) }
      }
    ]

    expect(model.toString().split('\n')).toEqual([
      'Line start=(0, 0) end=(1, 0)',
      'Point position=(1.5, 2)',
      'Dimension type=RadialDimension center=(0, 0) chordPoint=(5, 0) text="5.000" measurement=5',
      'Dimension type=OrdinateDimension definingPoint=(1, 1)'
    ])
  })

  describe('parse', () => {
    it('reads back every kind of line it writes', () => {
      const text = [
        'Line start=(0, 0) end=(10, 5)',
        'CircularArc center=(1, 2) radius=3 startAngle=0.5 endAngle=2',
        'CircularArc center=(1, 2) radius=3 startAngle=0 endAngle=0',
        'EllipseArc center=(0, 0) majorRadius=5 minorRadius=2 rotation=0.5 startAngle=0 endAngle=6.283185',
        'Polyline vertices=[(0, 0), (1, 0), (1, 1)] closed=true',
        'Point position=(5, 5)',
        'Dimension type=AlignedDimension xLine1Point=(0, 0) dimLinePoint=(5, 5) text="a b=c" measurement=10'
      ].join('\n')

      expect(Model.parse(text).toString()).toBe(text)
    })

    it('treats a full turn of rounded angles as a full circle', () => {
      const model = Model.parse(
        'CircularArc center=(0, 0) radius=1 startAngle=0 endAngle=6.283185'
      )

      expect((model.shapes[0] as GeometryCircularArc2d).closed).toBe(true)
      expect(model.toString()).toBe(
        'CircularArc center=(0, 0) radius=1 startAngle=0 endAngle=0'
      )
    })

    it('accepts any spacing and blank lines', () => {
      const model = Model.parse(
        '\n  Line  start=( 0,0 )   end=(1e1,  -.5)\r\n\n'
      )

      expect(model.toString()).toBe('Line start=(0, 0) end=(10, -0.5)')
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
      [
        'CircularArc center=(0, 0) radius=0 startAngle=0 endAngle=1',
        'radius must be greater than 0'
      ],
      ['Polyline vertices=[(0, 0)] closed=false', 'at least 2 points'],
      ['Polyline vertices=[(0, 0), (1, 1)] closed=maybe', 'true or false'],
      ['Polyline vertices=[(0, 0) x (1, 1)] closed=false', 'must be a list'],
      ['Spline degree=3', 'Unknown item "Spline"']
    ])('rejects %s', (line, message) => {
      expect(() => Model.parse(line)).toThrow(message)
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
