import { GeometryMatrix3d, GeometryPoint2d } from '@mlightcad/geometry-engine'
import { AcDb2dVertex, AcDb2dVertexType } from '../src/entity'
import { AcDbOsnapMode } from '../src/misc'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

describe('AcDb2dVertex', () => {
  it('exposes expected type names and default values', () => {
    const vertex = new AcDb2dVertex()

    expect(AcDb2dVertex.typeName).toBe('2dVertex')
    expect(vertex.dxfTypeName).toBe('VERTEX')
    expect(vertex.position).toMatchObject({ x: 0, y: 0 })
    expect(vertex.bulge).toBe(0)
    expect(vertex.startWidth).toBe(0)
    expect(vertex.endWidth).toBe(0)
    expect(vertex.vertexType).toBe(AcDb2dVertexType.Vertex)
  })

  it('supports all public setters and getters', () => {
    const vertex = new AcDb2dVertex()

    vertex.position = { x: 1.5, y: -2.25 }
    vertex.bulge = 0.5
    vertex.startWidth = 2.2
    vertex.endWidth = 3.3
    vertex.vertexType = AcDb2dVertexType.CurveFitVertex

    expect(vertex.position).toMatchObject({ x: 1.5, y: -2.25 })
    expect(vertex.bulge).toBe(0.5)
    expect(vertex.startWidth).toBe(2.2)
    expect(vertex.endWidth).toBe(3.3)
    expect(vertex.vertexType).toBe(AcDb2dVertexType.CurveFitVertex)
  })

  it('returns a point-like extents box centered on position', () => {
    const vertex = new AcDb2dVertex()
    vertex.position = { x: 6, y: 7 }

    const extents = vertex.geometricExtents

    expect(extents.min).toMatchObject({ x: 6, y: 7 })
    expect(extents.max).toMatchObject({ x: 6, y: 7 })
  })

  it('updates geometricExtents when position changes', () => {
    const vertex = new AcDb2dVertex()
    vertex.position = { x: 1, y: 2 }

    expect(vertex.geometricExtents.min).toMatchObject({ x: 1, y: 2 })

    vertex.position = { x: 9, y: -4 }

    expect(vertex.geometricExtents.min).toMatchObject({ x: 9, y: -4 })
    expect(vertex.geometricExtents.max).toMatchObject({ x: 9, y: -4 })
  })

  it('returns one grip point and one osnap point at vertex position', () => {
    const vertex = new AcDb2dVertex()
    vertex.position = { x: 9, y: 10 }

    const grips = vertex.subGetGripPoints()
    expect(grips).toHaveLength(1)
    expect(grips[0]).toBe(vertex.position)

    const snapPoints: GeometryPoint2d[] = []
    vertex.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(1, 1),
      snapPoints
    )
    expect(snapPoints).toHaveLength(1)
    expect(snapPoints[0]).toBe(vertex.position)

    const nodeSnaps: GeometryPoint2d[] = []
    vertex.subGetOsnapPoints(
      AcDbOsnapMode.Node,
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(1, 1),
      nodeSnaps
    )
    expect(nodeSnaps).toHaveLength(1)

    const unsupportedSnaps: GeometryPoint2d[] = []
    vertex.subGetOsnapPoints(
      AcDbOsnapMode.MidPoint,
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(1, 1),
      unsupportedSnaps
    )
    expect(unsupportedSnaps).toHaveLength(0)
  })

  it('transforms position and returns itself', () => {
    const vertex = new AcDb2dVertex()
    vertex.position = { x: 1, y: 2 }

    const matrix = new GeometryMatrix3d().makeTranslation(4, -5, 6)
    const result = vertex.transformBy(matrix)

    expect(result).toBe(vertex)
    expect(vertex.position).toMatchObject({ x: 5, y: -3 })
  })

  it('returns undefined from subWorldDraw because parent polyline draws it', () => {
    const vertex = new AcDb2dVertex()

    expect(vertex.subWorldDraw({} as never)).toBeUndefined()
  })

  it('clone creates a detached clone with a new objectId', () => {
    expectDetachedClone(() => new AcDb2dVertex())
  })
})
