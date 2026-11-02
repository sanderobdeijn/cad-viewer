import { AcGeMatrix3d, AcGePoint2d, AcGePoint3d } from '@mlightcad/geometry-engine'

import {
  AcDbArc,
  AcDbCircle,
  AcDbEllipse,
  AcDbEntity,
  AcDbLine,
  AcDbMLine,
  AcDbPoint,
  AcDbPolyline,
  AcDbRay,
  AcDbSpline
} from '../src/entity'
import { AcDbOsnapMode } from '../src/misc'

const fitPoints = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
  { x: 2, y: 0 },
  { x: 3, y: 1 }
]

const polyline = () => {
  const entity = new AcDbPolyline()
  entity.addVertexAt(0, new AcGePoint2d(0, 0))
  entity.addVertexAt(1, new AcGePoint2d(10, 0))
  return entity
}

const ray = () => {
  const entity = new AcDbRay()
  entity.basePoint = { x: 1, y: 2 }
  entity.unitDir = { x: 1, y: 0 }
  return entity
}

const point = () => {
  const entity = new AcDbPoint()
  entity.position = { x: 1, y: 2 }
  return entity
}

const entities: Array<[string, () => AcDbEntity]> = [
  ['line', () => new AcDbLine({ x: 0, y: 0 }, { x: 10, y: 0 })],
  ['circle', () => new AcDbCircle({ x: 1, y: 2 }, 3)],
  ['arc', () => new AcDbArc({ x: 1, y: 2 }, 3, 0, Math.PI / 2)],
  ['clockwise arc', () => new AcDbArc({ x: 1, y: 2 }, 3, Math.PI / 2, 0, true)],
  [
    'ellipse',
    () => new AcDbEllipse({ x: 1, y: 2 }, { x: 1, y: 0 }, 5, 2, 0, Math.PI * 2)
  ],
  ['spline', () => new AcDbSpline(fitPoints, 'Chord', 3, false)],
  ['polyline', polyline],
  ['ray', ray],
  ['point', point]
]

describe('2D draw entities', () => {
  it.each(entities)('%s has no normal, thickness or elevation', (_n, make) => {
    const entity = make() as unknown as Record<string, unknown>
    expect(entity.normal).toBeUndefined()
    expect(entity.thickness).toBeUndefined()
    expect(entity.elevation).toBeUndefined()
  })

  it.each(entities)('%s lists no Z or normal properties', (_n, make) => {
    const names = make()
      .properties.groups.flatMap(group => group.properties)
      .map(property => property.name)
    expect(names.filter(name => /(Z|normal[XYZ]|elevation)$/.test(name))).toEqual(
      []
    )
  })

  it.each(entities)('%s stays at Z = 0 when moved in Z', (_n, make) => {
    const entity = make()
    entity.transformBy(new AcGeMatrix3d().makeTranslation(1, 1, 50))
    const extents = entity.geometricExtents
    expect(extents.min.z).toBe(0)
    expect(extents.max.z).toBe(0)
    for (const grip of entity.subGetGripPoints()) {
      expect(grip.z).toBe(0)
    }
  })

  it('exposes 2D points on each entity', () => {
    const line = new AcDbLine(new AcGePoint3d(1, 2, 3), new AcGePoint3d(4, 5, 6))
    expect(line.startPoint).not.toHaveProperty('z')
    expect(line.endPoint).not.toHaveProperty('z')
    expect(line.midPoint).not.toHaveProperty('z')
    expect(new AcDbCircle({ x: 0, y: 0 }, 1).center).not.toHaveProperty('z')
    const arc = new AcDbArc({ x: 0, y: 0 }, 1, 0, 1)
    expect(arc.center).not.toHaveProperty('z')
    expect(arc.startPoint).not.toHaveProperty('z')
    const ellipse = new AcDbEllipse(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      2,
      1,
      0,
      Math.PI * 2
    )
    expect(ellipse.center).not.toHaveProperty('z')
    expect(ellipse.majorAxis).not.toHaveProperty('z')
    expect(point().position).not.toHaveProperty('z')
    expect(ray().basePoint).not.toHaveProperty('z')
    expect(ray().unitDir).not.toHaveProperty('z')
    const mline = new AcDbMLine()
    mline.startPosition = new AcGePoint3d(1, 2, 3)
    expect(mline.startPosition).not.toHaveProperty('z')
  })
})

describe('AcDbArc direction', () => {
  it('defaults to counterclockwise and reports polar angles', () => {
    const arc = new AcDbArc({ x: 0, y: 0 }, 5, 0, Math.PI / 2)
    expect(arc.clockwise).toBe(false)
    expect(arc.startPoint.x).toBeCloseTo(5, 8)
    expect(arc.endPoint.y).toBeCloseTo(5, 8)
  })

  it('sweeps clockwise from start to end', () => {
    const arc = new AcDbArc({ x: 0, y: 0 }, 5, Math.PI, Math.PI / 2, true)
    expect(arc.clockwise).toBe(true)
    expect(arc.startAngle).toBeCloseTo(Math.PI, 8)
    expect(arc.endAngle).toBeCloseTo(Math.PI / 2, 8)
    expect(arc.startPoint.x).toBeCloseTo(-5, 8)
    expect(arc.endPoint.y).toBeCloseTo(5, 8)
    expect(arc.midPoint.x).toBeCloseTo(-5 * Math.SQRT1_2, 8)
    expect(arc.midPoint.y).toBeCloseTo(5 * Math.SQRT1_2, 8)
  })

  it('keeps its angles when the direction changes', () => {
    const arc = new AcDbArc({ x: 0, y: 0 }, 5, 0, Math.PI / 2)
    arc.clockwise = true
    expect(arc.clockwise).toBe(true)
    expect(arc.startAngle).toBeCloseTo(0, 8)
    expect(arc.endAngle).toBeCloseTo(Math.PI / 2, 8)
  })

  it('flips direction when mirrored, keeping the drawn points', () => {
    const arc = new AcDbArc({ x: 0, y: 0 }, 5, 0, Math.PI / 2)
    arc.transformBy(new AcGeMatrix3d().makeScale(-1, 1, 1))
    expect(arc.clockwise).toBe(true)
    expect(arc.startPoint.x).toBeCloseTo(-5, 8)
    expect(arc.endPoint.y).toBeCloseTo(5, 8)
  })

  it('moves its end point with a grip, for either direction', () => {
    const arc = new AcDbArc({ x: 0, y: 0 }, 5, Math.PI, Math.PI / 2, true)
    arc.subMoveGripPointsAt([2], { x: 5, y: -5, z: 0 })
    expect(arc.endAngle).toBeCloseTo(0, 8)
    expect(arc.clockwise).toBe(true)
    expect(arc.startPoint.x).toBeCloseTo(-5, 8)
  })

  it('offsets to a larger arc with the same direction', () => {
    const arc = new AcDbArc({ x: 0, y: 0 }, 5, Math.PI, Math.PI / 2, true)
    const [offset] = arc.getOffsetCurves(2) as AcDbArc[]
    expect(offset.radius).toBe(7)
    expect(offset.clockwise).toBe(true)
    expect(offset.startAngle).toBeCloseTo(Math.PI, 8)
  })

  it('snaps to the nearest point on the arc', () => {
    const arc = new AcDbArc({ x: 0, y: 0 }, 5, 0, Math.PI)
    const snaps: AcGePoint3d[] = []
    arc.subGetOsnapPoints(
      AcDbOsnapMode.Nearest,
      new AcGePoint3d(9, 9, 0),
      new AcGePoint3d(),
      snaps
    )
    expect(snaps[0].x).toBeCloseTo(5 * Math.SQRT1_2, 8)
    expect(snaps[0].y).toBeCloseTo(5 * Math.SQRT1_2, 8)
  })
})

describe('AcDbEllipse rotation', () => {
  it('derives its major axis from a rotated direction', () => {
    const ellipse = new AcDbEllipse(
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      5,
      2,
      0,
      Math.PI * 2
    )
    expect(ellipse.majorAxis.x).toBeCloseTo(0, 8)
    expect(ellipse.majorAxis.y).toBeCloseTo(1, 8)
    expect(ellipse.geometricExtents.max.y).toBeCloseTo(5, 6)
    expect(ellipse.geometricExtents.max.x).toBeCloseTo(2, 6)
  })

  it('rotates with a transform', () => {
    const ellipse = new AcDbEllipse(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      5,
      2,
      0,
      Math.PI * 2
    )
    ellipse.transformBy(new AcGeMatrix3d().makeRotationZ(Math.PI / 2))
    expect(ellipse.geometricExtents.max.y).toBeCloseTo(5, 6)
    expect(ellipse.geometricExtents.max.x).toBeCloseTo(2, 6)
  })

  it('can change its major axis after creation', () => {
    const ellipse = new AcDbEllipse(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      5,
      2,
      0,
      Math.PI * 2
    )
    ellipse.majorAxis = { x: 0, y: 1 }
    expect(ellipse.geometricExtents.max.y).toBeCloseTo(5, 6)
  })
})
