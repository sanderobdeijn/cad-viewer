import {
  GeometryCircularArc2d,
  GeometryEllipseArc2d,
  GeometryLine2d,
  GeometryPoint2d,
  GeometryPolyline2d,
  GeometrySpline2d,
  Model
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
      ),
      new GeometrySpline2d(
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 2, y: 0 },
          { x: 3, y: 0 }
        ],
        [0, 0, 0, 0, 1, 1, 1, 1],
        undefined,
        3,
        false
      )
    ]

    expect(model.toString().split('\n')).toEqual([
      'Line start=(0, 0) end=(1.5, 2)',
      'CircularArc center=(1, 2) radius=3 startAngle=0 endAngle=3.141593',
      'EllipseArc center=(0, 0) majorRadius=4 minorRadius=2 rotation=0 startAngle=0 endAngle=3.141593',
      'Polyline vertices=[(0, 0), (1, 1)] closed=true',
      'Spline degree=3 controlPoints=[(0, 0), (1, 0), (2, 0), (3, 0)] closed=false'
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
})
