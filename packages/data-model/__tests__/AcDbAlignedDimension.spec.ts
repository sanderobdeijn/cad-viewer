import {
  GeometryMatrix3d,
  GeometryPoint2d,
  GeometryVector3d
} from '@mlightcad/geometry-engine'
import { AcGiRenderer } from '@mlightcad/graphic-interface'

import { acdbHostApplicationServices } from '../src/base'
import { AcDbDatabase } from '../src/database'
import { AcDbAlignedDimension } from '../src/entity'
import { AcDbOsnapMode } from '../src/misc'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

const createDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

describe('AcDbAlignedDimension', () => {
  it('creates a detached clone with a new objectId', () => {
    expectDetachedClone(
      () =>
        new AcDbAlignedDimension(
          new GeometryPoint2d(),
          new GeometryPoint2d(1, 0),
          new GeometryPoint2d(0, 1)
        )
    )
  })

  const createDimension = () =>
    new AcDbAlignedDimension(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(5, 0),
      new GeometryPoint2d(5, 1)
    )

  const createRenderer = () =>
    ({
      lines: jest.fn(() => ({})),
      area: jest.fn(() => ({})),
      mtext: jest.fn(() => ({})),
      group: jest.fn(items => items)
    }) as unknown as AcGiRenderer

  it('draws its lines, arrows and label', () => {
    createDb()
    const dim = createDimension()
    dim.dimensionText = '5.000'
    const renderer = createRenderer()

    const drawables = dim.subWorldDraw(renderer) as unknown as unknown[]

    expect(renderer.lines).toHaveBeenCalledTimes(3)
    expect(renderer.area).toHaveBeenCalledTimes(2)
    expect(renderer.mtext).toHaveBeenCalledTimes(1)
    expect(jest.mocked(renderer.mtext).mock.calls[0][0]).toMatchObject({
      text: '5.000',
      height: 10,
      position: { x: 2.5, y: 1 }
    })
    expect(drawables).toHaveLength(6)
  })

  it('draws no label without dimension text', () => {
    createDb()
    const dim = createDimension()
    dim.dimensionText = null
    const renderer = createRenderer()

    dim.subWorldDraw(renderer)

    expect(renderer.lines).toHaveBeenCalledTimes(3)
    expect(renderer.mtext).not.toHaveBeenCalled()
  })

  it('points its arrows along the dimension line', () => {
    createDb()
    const renderer = createRenderer()

    createDimension().subWorldDraw(renderer)

    const tips = jest
      .mocked(renderer.area)
      .mock.calls.map(([area]) => area.loops[0].getPoints(4)[0])
    expect(tips[0].x).toBeCloseTo(0, 8)
    expect(tips[0].y).toBeCloseTo(1, 8)
    expect(tips[1].x).toBeCloseTo(5, 8)
    expect(tips[1].y).toBeCloseTo(1, 8)
  })

  it('resolves osnap points through its lines', () => {
    const dim = createDimension()
    const snaps: GeometryPoint2d[] = []

    dim.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new GeometryPoint2d(),
      new GeometryPoint2d(),
      snaps
    )

    const hasSnap = (x: number, y: number) =>
      snaps.some(p => Math.abs(p.x - x) < 1e-8 && Math.abs(p.y - y) < 1e-8)
    expect(hasSnap(0, 1)).toBe(true)
    expect(hasSnap(5, 1)).toBe(true)
  })

  it('includes its arrows and label in its geometric extents', () => {
    const dim = createDimension()
    dim.dimensionText = null
    const without = dim.geometricExtents
    // Arrows are 10 long, so they reach past the 5 long dimension line.
    expect(without.max.x).toBeCloseTo(10, 8)
    expect(without.min.x).toBeCloseTo(-5, 8)

    dim.dimensionText = '5.000'
    expect(dim.geometricExtents.max.y).toBeGreaterThan(without.max.y)
  })

  it('moves its geometry with transformBy', () => {
    const dim = createDimension()
    dim.transformBy(new GeometryMatrix3d().makeRotationZ(Math.PI / 2))

    const snaps: GeometryPoint2d[] = []
    dim.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new GeometryPoint2d(),
      new GeometryPoint2d(),
      snaps
    )

    expect(
      snaps.some(p => Math.abs(p.x + 1) < 1e-8 && Math.abs(p.y) < 1e-8)
    ).toBe(true)
    expect(
      snaps.some(p => Math.abs(p.x + 1) < 1e-8 && Math.abs(p.y - 5) < 1e-8)
    ).toBe(true)
  })

  it('returns geometricExtents that follow its definition points', () => {
    const dim = new AcDbAlignedDimension(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(5, 0),
      new GeometryPoint2d(5, 2)
    )
    dim.dimensionText = null

    const extents = dim.geometricExtents
    expect(extents.isEmpty()).toBe(false)
    expect(extents.max.y).toBeGreaterThanOrEqual(2)

    dim.dimLinePoint = new GeometryPoint2d(5, 30)

    expect(dim.geometricExtents.max.y).toBeGreaterThanOrEqual(30)
  })

  it('includes textPosition in extents when text is placed away from origin', () => {
    const dim = new AcDbAlignedDimension(
      new GeometryPoint2d(10, 10),
      new GeometryPoint2d(20, 10),
      new GeometryPoint2d(20, 12)
    )
    dim.dimensionText = null
    dim.textPosition = new GeometryPoint2d(-50, -60)

    expect(dim.geometricExtents.min).toMatchObject({ x: -50, y: -60 })
  })

  it('returns definition and text grip points', () => {
    const dim = new AcDbAlignedDimension(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(5, 0),
      new GeometryPoint2d(5, 1)
    )
    dim.textPosition = new GeometryPoint2d(3, 4)

    const grips = dim.subGetGripPoints()

    expect(grips).toHaveLength(4)
    expect(grips[0]).toBe(dim.xLine1Point)
    expect(grips[1]).toBe(dim.xLine2Point)
    expect(grips[2]).toBe(dim.dimLinePoint)
    expect(grips[3]).toBe(dim.textPosition)
  })

  it('moves definition and text grip points', () => {
    const dim = new AcDbAlignedDimension(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(5, 0),
      new GeometryPoint2d(5, 1)
    )
    dim.textPosition = new GeometryPoint2d(3, 4)

    dim.subMoveGripPointsAt([0, 3], new GeometryVector3d(1, 2, 0))

    expect(dim.xLine1Point).toMatchObject({ x: 1, y: 2 })
    expect(dim.textPosition).toMatchObject({ x: 4, y: 6 })
  })
})
