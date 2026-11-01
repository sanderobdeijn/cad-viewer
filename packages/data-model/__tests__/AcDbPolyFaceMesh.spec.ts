import { AcGeMatrix3d, AcGePoint3d } from '@mlightcad/geometry-engine'
import { AcDbPolyFaceMesh } from '../src/entity'
import { AcDbOsnapMode } from '../src/misc'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

describe('AcDbPolyFaceMesh', () => {
  it('creates a detached clone with a new objectId', () => {
    expectDetachedClone(
      () =>
        new AcDbPolyFaceMesh(
          [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 }
          ],
          [[1, 2, 3]]
        )
    )
  })

  it('supports type names, counters, closed getter/setter and indexed access', () => {
    const mesh = new AcDbPolyFaceMesh(
      [
        { x: 0, y: 0, z: 1 },
        { x: 2, y: 3 } as unknown as { x: number; y: number; z: number },
        { x: -4, y: 5, z: 6 }
      ],
      [
        [1, 2, 3],
        [2, 3, 1]
      ]
    )

    expect(AcDbPolyFaceMesh.typeName).toBe('PolyFaceMesh')
    expect(mesh.dxfTypeName).toBe('POLYLINE')
    expect(mesh.numberOfVertices).toBe(3)
    expect(mesh.numberOfFaces).toBe(2)
    expect(mesh.closed).toBe(false)

    mesh.closed = true
    expect(mesh.closed).toBe(false)

    expect(mesh.getVertexAt(1).position).toMatchObject({ x: 2, y: 3, z: 0 })
    expect(mesh.getFaceAt(0).vertexIndices).toEqual([1, 2, 3])

    expect(() => mesh.getVertexAt(-1)).toThrow('Vertex index out of bounds')
    expect(() => mesh.getVertexAt(3)).toThrow('Vertex index out of bounds')
    expect(() => mesh.getFaceAt(-1)).toThrow('Face index out of bounds')
    expect(() => mesh.getFaceAt(2)).toThrow('Face index out of bounds')
  })

  it('computes geometric extents for empty and non-empty meshes and returns grip points', () => {
    const emptyMesh = new AcDbPolyFaceMesh([], [])
    expect(emptyMesh.geometricExtents.min).toMatchObject({ x: 0, y: 0, z: 0 })
    expect(emptyMesh.geometricExtents.max).toMatchObject({ x: 0, y: 0, z: 0 })

    const mesh = new AcDbPolyFaceMesh(
      [
        { x: -2, y: 4, z: 3 },
        { x: 6, y: -5 } as unknown as { x: number; y: number; z: number },
        { x: 1, y: 2, z: 10 }
      ],
      [[1, 2, 3]]
    )

    expect(mesh.geometricExtents.min).toMatchObject({ x: -2, y: -5, z: 0 })
    expect(mesh.geometricExtents.max).toMatchObject({ x: 6, y: 4, z: 10 })

    const grips = mesh.subGetGripPoints()
    expect(grips).toHaveLength(3)
    expect(grips[0]).toMatchObject({ x: -2, y: 4, z: 3 })
    expect(grips[1]).toMatchObject({ x: 6, y: -5, z: 0 })
  })

  it('updates geometricExtents when a vertex position changes', () => {
    const mesh = new AcDbPolyFaceMesh(
      [
        { x: 0, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
        { x: 4, y: 3, z: 0 }
      ],
      [[1, 2, 3]]
    )

    expect(mesh.geometricExtents.max).toMatchObject({ x: 4, y: 3, z: 0 })

    mesh.getVertexAt(1).position.set(10, 6, 2)

    expect(mesh.geometricExtents.max).toMatchObject({ x: 10, y: 6, z: 2 })
  })

  it('returns endpoint osnap points only for EndPoint mode', () => {
    const mesh = new AcDbPolyFaceMesh(
      [
        { x: 0, y: 0, z: 1 },
        { x: 2, y: 3, z: 4 }
      ],
      [[1, 2, 1]]
    )

    const endPoints: AcGePoint3d[] = []
    mesh.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new AcGePoint3d(),
      new AcGePoint3d(),
      endPoints
    )
    expect(endPoints).toHaveLength(2)
    expect(endPoints[1]).toMatchObject({ x: 2, y: 3, z: 4 })

    const nonEndPoints: AcGePoint3d[] = []
    mesh.subGetOsnapPoints(
      AcDbOsnapMode.MidPoint,
      new AcGePoint3d(),
      new AcGePoint3d(),
      nonEndPoints
    )
    expect(nonEndPoints).toHaveLength(0)
  })

  it('transforms vertices and returns itself for chaining', () => {
    const mesh = new AcDbPolyFaceMesh(
      [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 2, z: 3 }
      ],
      [[1, 2, 1]]
    )

    const result = mesh.transformBy(
      new AcGeMatrix3d().makeTranslation(5, -1, 2)
    )
    expect(result).toBe(mesh)
    expect(mesh.getVertexAt(0).position).toMatchObject({ x: 5, y: -1, z: 2 })
    expect(mesh.getVertexAt(1).position).toMatchObject({ x: 6, y: 1, z: 5 })
  })

  it('returns geometry properties accessors for vertices and faces', () => {
    const mesh = new AcDbPolyFaceMesh(
      [
        { x: 1, y: 2, z: 3 },
        { x: 4, y: 5, z: 6 }
      ],
      [[1, 2, 1]]
    )

    expect(mesh.properties.type).toBe('PolyFaceMesh')
    const geometryGroup = mesh.properties.groups.find(
      group => group.groupName === 'geometry'
    )
    expect(geometryGroup).toBeDefined()

    const verticesProp = geometryGroup?.properties.find(
      p => p.name === 'vertices'
    )
    const facesProp = geometryGroup?.properties.find(p => p.name === 'faces')

    expect(verticesProp?.accessor.get()).toEqual([
      { x: 1, y: 2, z: 3 },
      { x: 4, y: 5, z: 6 }
    ])
    expect(facesProp?.accessor.get()).toEqual([{ vertexIndices: [1, 2, 1] }])
  })

  it('draws faces as closed edge lines and ignores invalid/short faces', () => {
    const mesh = new AcDbPolyFaceMesh(
      [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 1, y: 1, z: 0 },
        { x: 0, y: 1, z: 0 }
      ],
      [
        [1, 2, 3],
        [1, -3, 4, 99],
        [1, 2]
      ]
    )

    const rendered = { id: 'mesh-rendered' }
    const renderer = {
      lines: jest.fn(() => rendered)
    }

    const result = mesh.subWorldDraw(renderer as never)
    const linesArg = (renderer.lines as jest.Mock).mock
      .calls[0][0] as AcGePoint3d[]

    expect(result).toBe(rendered)
    expect(renderer.lines).toHaveBeenCalledTimes(1)
    expect(linesArg).toHaveLength(12)
    expect(linesArg[0]).toMatchObject({ x: 0, y: 0, z: 0 })
    expect(linesArg[1]).toMatchObject({ x: 1, y: 0, z: 0 })
    expect(linesArg[6]).toMatchObject({ x: 0, y: 0, z: 0 })
    expect(linesArg[7]).toMatchObject({ x: 1, y: 1, z: 0 })
  })
})
