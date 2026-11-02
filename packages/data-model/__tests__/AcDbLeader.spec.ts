import {
  AcGeMatrix3d,
  AcGePoint2d,
  AcGeVector3d
} from '@mlightcad/geometry-engine'
import { AcGiMTextAttachmentPoint } from '@mlightcad/graphic-interface'

import { acdbHostApplicationServices } from '../src/base'
import { AcDbDatabase } from '../src/database'
import {
  AcDbLeader,
  AcDbLeaderAnnotationType,
  AcDbMText,
  AcDbPolyline
} from '../src/entity'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'
import { AcDbOsnapMode } from '../src/misc'

const createWorkingDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

const createRenderer = () => ({
  lines: jest.fn((points: unknown[]) => ({ kind: 'lines', points }))
})

describe('AcDbLeader', () => {
  it('exposes type names and public getters/setters', () => {
    const leader = new AcDbLeader()

    expect(AcDbLeader.typeName).toBe('Leader')
    expect(leader.dxfTypeName).toBe('LEADER')

    expect(leader.isSplined).toBe(false)
    expect(leader.hasArrowHead).toBe(false)
    expect(leader.hasHookLine).toBe(false)
    expect(leader.numVertices).toBe(0)
    expect(leader.vertices).toEqual([])
    expect(leader.dimensionStyle).toBe('')
    expect(leader.annoType).toBe(AcDbLeaderAnnotationType.NoAnnotation)
    expect(leader.closed).toBe(false)

    leader.isSplined = true
    leader.hasArrowHead = true
    leader.hasHookLine = true
    leader.dimensionStyle = 'Standard'
    leader.annoType = AcDbLeaderAnnotationType.MText
    leader.closed = true

    expect(leader.isSplined).toBe(true)
    expect(leader.hasArrowHead).toBe(true)
    expect(leader.hasHookLine).toBe(true)
    expect(leader.dimensionStyle).toBe('Standard')
    expect(leader.annoType).toBe(AcDbLeaderAnnotationType.MText)
    expect(leader.closed).toBe(false)
  })

  it('supports appendVertex, numVertices and returns cloned vertices', () => {
    const leader = new AcDbLeader()
    leader.appendVertex(new AcGePoint2d(0, 0))
    leader.appendVertex(new AcGePoint2d(2, 1))

    expect(leader.numVertices).toBe(2)
    expect(leader.vertices).toHaveLength(2)

    const exported = leader.vertices
    exported[0].x = 999
    expect(leader.vertices[0].x).toBe(0)
  })

  it('returns all leader vertices as grip points', () => {
    const leader = new AcDbLeader()
    leader.appendVertex(new AcGePoint2d(0, 0))
    leader.appendVertex(new AcGePoint2d(5, 5))
    leader.appendVertex(new AcGePoint2d(10, 5))
    const grips = leader.subGetGripPoints()
    expect(grips).toHaveLength(3)
    expect(grips[0]).toMatchObject({ x: 0, y: 0 })
    expect(grips[2]).toMatchObject({ x: 10, y: 5 })
  })

  it('supports setVertexAt and vertexAt with range checking', () => {
    const leader = new AcDbLeader()
    leader.appendVertex(new AcGePoint2d(0, 0))

    expect(leader.setVertexAt(0, new AcGePoint2d(5, 5))).toBe(leader)
    expect(leader.vertexAt(0)).toMatchObject({ x: 5, y: 5 })

    expect(() => leader.setVertexAt(-1, new AcGePoint2d(9, 8))).toThrow(
      'The vertex index is out of range!'
    )
    expect(() => leader.vertexAt(-1)).toThrow(
      'The vertex index is out of range!'
    )
  })

  it('returns geometric extents for non-splined and splined leader', () => {
    const leader = new AcDbLeader()
    leader.appendVertex(new AcGePoint2d(-1, 3))
    leader.appendVertex(new AcGePoint2d(4, -2))

    const extents = leader.geometricExtents
    expect(extents.min).toMatchObject({ x: -1, y: -2 })
    expect(extents.max).toMatchObject({ x: 4, y: 3 })

    leader.appendVertex(new AcGePoint2d(6, 1))
    leader.appendVertex(new AcGePoint2d(8, 0))
    leader.isSplined = true
    leader.subWorldDraw(createRenderer() as never)

    const splineExtents = leader.geometricExtents
    expect(splineExtents.isEmpty()).toBe(false)
  })

  it('updates geometricExtents when a vertex is moved', () => {
    const leader = new AcDbLeader()
    leader.appendVertex(new AcGePoint2d(0, 0))
    leader.appendVertex(new AcGePoint2d(4, 0))

    expect(leader.geometricExtents.max.x).toBeCloseTo(4)

    leader.setVertexAt(1, new AcGePoint2d(4, 8))

    expect(leader.geometricExtents.max.y).toBeCloseTo(8)
  })

  it('draws polyline/spline branches in subWorldDraw', () => {
    const rendererA = createRenderer()
    const leaderA = new AcDbLeader()
    leaderA.appendVertex(new AcGePoint2d(0, 0))
    const drawA = leaderA.subWorldDraw(rendererA as never)
    expect(rendererA.lines).toHaveBeenCalledTimes(1)
    expect(drawA).toMatchObject({ kind: 'lines' })
    expect((rendererA.lines.mock.calls[0] as unknown[][])[0]).toHaveLength(1)

    const rendererB = createRenderer()
    const leaderB = new AcDbLeader()
    leaderB.appendVertex(new AcGePoint2d(0, 0))
    leaderB.isSplined = true
    leaderB.subWorldDraw(rendererB as never)
    expect((rendererB.lines.mock.calls[0] as unknown[][])[0]).toHaveLength(1)

    const rendererC = createRenderer()
    const leaderC = new AcDbLeader()
    leaderC.appendVertex(new AcGePoint2d(0, 0))
    leaderC.appendVertex(new AcGePoint2d(2, 1))
    leaderC.appendVertex(new AcGePoint2d(4, 0))
    leaderC.appendVertex(new AcGePoint2d(6, 1))
    leaderC.isSplined = true
    leaderC.subWorldDraw(rendererC as never)
    const splinedPoints = (rendererC.lines.mock.calls[0] as unknown[][])[0]
    expect(splinedPoints.length).toBeGreaterThan(1)
    expect(splinedPoints.length).toBeLessThanOrEqual(100)
  })

  it('extends straight leaders with a horizontal hook line segment', () => {
    const leader = new AcDbLeader()
    leader.appendVertex(new AcGePoint2d(0, 0))
    leader.appendVertex(new AcGePoint2d(10, 5))
    leader.hasHookLine = true
    leader.isHookLineSameDirection = true
    leader.textWidth = 4
    leader.horizontalDirection = new AcGeVector3d(1, 0, 0)

    const renderer = createRenderer()
    leader.subWorldDraw(renderer as never)
    const points = (
      renderer.lines.mock.calls[0] as unknown[][]
    )[0] as AcGePoint2d[]
    expect(points).toHaveLength(3)
    expect(points[2]).toMatchObject({ x: 15, y: 5 })
  })

  it('prefers associated MTEXT extents width for hook line length', () => {
    const db = createWorkingDb()
    const mtext = new AcDbMText()
    mtext.location = new AcGePoint2d(10, 8)
    mtext.height = 5
    mtext.extentsWidth = 18
    db.tables.blockTable.modelSpace.appendEntity(mtext)

    const leader = new AcDbLeader()
    db.tables.blockTable.modelSpace.appendEntity(leader)
    leader.appendVertex(new AcGePoint2d(0, 0))
    leader.appendVertex(new AcGePoint2d(10, 5))
    leader.hasHookLine = true
    leader.isHookLineSameDirection = true
    leader.textWidth = 9.51
    leader.annoType = AcDbLeaderAnnotationType.MText
    leader.horizontalDirection = new AcGeVector3d(1, 0, 0)

    const renderer = createRenderer()
    leader.subWorldDraw(renderer as never)
    const points = (
      renderer.lines.mock.calls[0] as unknown[][]
    )[0] as AcGePoint2d[]
    expect(points[2]).toMatchObject({ x: 28, y: 5 })
  })

  it('draws hook line when textWidth is zero but MTEXT bounds define the span', () => {
    const db = createWorkingDb()
    const mtext = new AcDbMText()
    mtext.location = new AcGePoint2d(10, 8)
    mtext.height = 5
    mtext.extentsWidth = 20
    db.tables.blockTable.modelSpace.appendEntity(mtext)

    const leader = new AcDbLeader()
    db.tables.blockTable.modelSpace.appendEntity(leader)
    leader.appendVertex(new AcGePoint2d(0, 0))
    leader.appendVertex(new AcGePoint2d(10, 6))
    leader.hasHookLine = true
    leader.textWidth = 0
    leader.isHookLineSameDirection = true
    leader.horizontalDirection = new AcGeVector3d(1, 0, 0)

    const renderer = createRenderer()
    leader.subWorldDraw(renderer as never)
    const points = (
      renderer.lines.mock.calls[0] as unknown[][]
    )[0] as AcGePoint2d[]
    expect(points).toHaveLength(3)
    expect(points[2]).toMatchObject({ x: 30, y: 6 })
  })

  it('draws hook line from associated MTEXT bounds when hasHookLine is false', () => {
    const db = createWorkingDb()
    const mtext = new AcDbMText()
    mtext.location = new AcGePoint2d(10, 8)
    mtext.height = 5
    mtext.extentsWidth = 16
    db.tables.blockTable.modelSpace.appendEntity(mtext)

    const leader = new AcDbLeader()
    db.tables.blockTable.modelSpace.appendEntity(leader)
    leader.appendVertex(new AcGePoint2d(0, 0))
    leader.appendVertex(new AcGePoint2d(10, 6))
    leader.hasHookLine = false
    leader.textWidth = 0
    leader.isHookLineSameDirection = true
    leader.horizontalDirection = new AcGeVector3d(1, 0, 0)

    const renderer = createRenderer()
    leader.subWorldDraw(renderer as never)
    const points = (
      renderer.lines.mock.calls[0] as unknown[][]
    )[0] as AcGePoint2d[]
    expect(points).toHaveLength(3)
    expect(points[2]).toMatchObject({ x: 26, y: 6 })
  })

  it('extends hook line in the negative horizontal direction', () => {
    const leader = new AcDbLeader()
    leader.appendVertex(new AcGePoint2d(0, 0))
    leader.appendVertex(new AcGePoint2d(10, 5))
    leader.hasHookLine = true
    leader.isHookLineSameDirection = false
    leader.textWidth = 4
    leader.horizontalDirection = new AcGeVector3d(1, 0, 0)

    const renderer = createRenderer()
    leader.subWorldDraw(renderer as never)
    const points = (
      renderer.lines.mock.calls[0] as unknown[][]
    )[0] as AcGePoint2d[]
    expect(points[2]).toMatchObject({ x: 5, y: 5 })
  })

  it('resolves MTEXT by associatedAnnotation handle before spatial search', () => {
    const db = createWorkingDb()
    const farMtext = new AcDbMText()
    farMtext.location = new AcGePoint2d(100, 100)
    farMtext.height = 5
    farMtext.extentsWidth = 50
    db.tables.blockTable.modelSpace.appendEntity(farMtext)

    const nearMtext = new AcDbMText()
    nearMtext.location = new AcGePoint2d(10, 8)
    nearMtext.height = 5
    nearMtext.extentsWidth = 10
    db.tables.blockTable.modelSpace.appendEntity(nearMtext)

    const leader = new AcDbLeader()
    db.tables.blockTable.modelSpace.appendEntity(leader)
    leader.appendVertex(new AcGePoint2d(0, 0))
    leader.appendVertex(new AcGePoint2d(10, 5))
    leader.associatedAnnotation = farMtext.objectId
    leader.hasHookLine = true
    leader.isHookLineSameDirection = true
    leader.textWidth = 0
    leader.horizontalDirection = new AcGeVector3d(1, 0, 0)

    const renderer = createRenderer()
    leader.subWorldDraw(renderer as never)
    const points = (
      renderer.lines.mock.calls[0] as unknown[][]
    )[0] as AcGePoint2d[]
    expect(points[2].x).toBeGreaterThan(100)
    expect(points[2].x).not.toBeCloseTo(20)
  })

  it('includes hook line endpoint in geometricExtents', () => {
    const leader = new AcDbLeader()
    leader.appendVertex(new AcGePoint2d(0, 0))
    leader.appendVertex(new AcGePoint2d(10, 5))
    leader.hasHookLine = true
    leader.isHookLineSameDirection = true
    leader.textWidth = 4
    leader.horizontalDirection = new AcGeVector3d(1, 0, 0)

    expect(leader.geometricExtents.max.x).toBeCloseTo(15)
    expect(leader.geometricExtents.max.y).toBeCloseTo(5)
  })

  it('associates rotated MTEXT using oriented local coordinates', () => {
    const db = createWorkingDb()
    const decoy = new AcDbMText()
    decoy.location = new AcGePoint2d(20, 5)
    decoy.height = 4
    decoy.extentsWidth = 30
    db.tables.blockTable.modelSpace.appendEntity(decoy)

    const rotated = new AcDbMText()
    rotated.location = new AcGePoint2d(10, 10)
    rotated.rotation = Math.PI / 2
    rotated.direction = new AcGeVector3d(0, 1, 0)
    rotated.height = 4
    rotated.extentsWidth = 20
    rotated.attachmentPoint = AcGiMTextAttachmentPoint.TopLeft
    db.tables.blockTable.modelSpace.appendEntity(rotated)

    const leader = new AcDbLeader()
    db.tables.blockTable.modelSpace.appendEntity(leader)
    leader.appendVertex(new AcGePoint2d(0, 0))
    leader.appendVertex(new AcGePoint2d(12, 20))
    leader.hasHookLine = true
    leader.isHookLineSameDirection = true
    leader.textWidth = 0
    leader.horizontalDirection = new AcGeVector3d(1, 0, 0)

    const renderer = createRenderer()
    leader.subWorldDraw(renderer as never)
    const points = (
      renderer.lines.mock.calls[0] as unknown[][]
    )[0] as AcGePoint2d[]
    expect(points).toHaveLength(3)
    expect(points[2].x).toBeCloseTo(14)
    expect(points[2].y).toBeCloseTo(20)
  })

  it('transforms vertices and keeps working for splined geometry', () => {
    const leader = new AcDbLeader()
    leader.appendVertex(new AcGePoint2d(0, 0))
    leader.appendVertex(new AcGePoint2d(1, 0))

    const matrix = new AcGeMatrix3d().makeTranslation(10, -2, 3)
    expect(leader.transformBy(matrix)).toBe(leader)
    expect(leader.vertices[0]).toMatchObject({ x: 10, y: -2 })
    expect(leader.vertices[1]).toMatchObject({ x: 11, y: -2 })

    leader.appendVertex(new AcGePoint2d(12, -1))
    leader.appendVertex(new AcGePoint2d(14, -2))
    leader.isSplined = true
    leader.subWorldDraw(createRenderer() as never)
    expect(
      leader.transformBy(new AcGeMatrix3d().makeTranslation(1, 1, 0))
    ).toBe(leader)

    const renderer = createRenderer()
    leader.subWorldDraw(renderer as never)
    const sampled = (renderer.lines.mock.calls[0] as unknown[][])[0]
    expect(sampled.length).toBeGreaterThan(1)
    expect(sampled.length).toBeLessThanOrEqual(100)
  })

  it('creates a detached clone with a new objectId', () => {
    expectDetachedClone(() => new AcDbLeader())
  })

  it('offsets straight leader vertices as a polyline path', () => {
    const leader = new AcDbLeader()
    leader.appendVertex(new AcGePoint2d(0, 0))
    leader.appendVertex(new AcGePoint2d(10, 0))
    leader.appendVertex(new AcGePoint2d(10, 5))
    const [result] = leader.getOffsetCurves(2) as AcDbPolyline[]
    expect(result.numberOfVertices).toBeGreaterThanOrEqual(2)
  })

  it('computes osnap points for straight and splined leaders', () => {
    const leader = new AcDbLeader()
    leader.appendVertex(new AcGePoint2d(0, 0))
    leader.appendVertex(new AcGePoint2d(4, 0))
    leader.appendVertex(new AcGePoint2d(4, 3))

    const endPoints: AcGePoint2d[] = []
    leader.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new AcGePoint2d(),
      new AcGePoint2d(),
      endPoints
    )
    expect(endPoints).toHaveLength(3)

    const midPoints: AcGePoint2d[] = []
    leader.subGetOsnapPoints(
      AcDbOsnapMode.MidPoint,
      new AcGePoint2d(),
      new AcGePoint2d(),
      midPoints
    )
    expect(midPoints).toHaveLength(2)
    expect(midPoints[0]).toMatchObject({ x: 2, y: 0 })
    expect(midPoints[1]).toMatchObject({ x: 4, y: 1.5 })

    const straightNearestPoints: AcGePoint2d[] = []
    leader.subGetOsnapPoints(
      AcDbOsnapMode.Nearest,
      new AcGePoint2d(4, 2),
      new AcGePoint2d(),
      straightNearestPoints
    )
    expect(straightNearestPoints).toHaveLength(1)
    expect(straightNearestPoints[0]).toMatchObject({ x: 4, y: 2 })

    const perpendicularPoints: AcGePoint2d[] = []
    leader.subGetOsnapPoints(
      AcDbOsnapMode.Perpendicular,
      new AcGePoint2d(4, 2),
      new AcGePoint2d(),
      perpendicularPoints
    )
    expect(perpendicularPoints).toHaveLength(1)
    expect(perpendicularPoints[0]).toMatchObject({ x: 4, y: 2 })

    leader.appendVertex(new AcGePoint2d(6, 1))
    leader.appendVertex(new AcGePoint2d(8, 0))
    leader.isSplined = true

    const splineEndPoints: AcGePoint2d[] = []
    leader.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new AcGePoint2d(),
      new AcGePoint2d(),
      splineEndPoints
    )
    expect(splineEndPoints).toHaveLength(2)
    expect(splineEndPoints[0]).toMatchObject({ x: 0, y: 0 })
    expect(splineEndPoints[1]).toMatchObject({ x: 8, y: 0 })

    const nearestPoints: AcGePoint2d[] = []
    leader.subGetOsnapPoints(
      AcDbOsnapMode.Nearest,
      new AcGePoint2d(4, 2),
      new AcGePoint2d(),
      nearestPoints
    )
    expect(nearestPoints).toHaveLength(1)
  })
})
