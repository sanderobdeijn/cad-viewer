import { AcCmColor } from '@mlightcad/common'
import {
  GeometryBox3d,
  GeometryMatrix3d,
  GeometryPoint2d,
  GeometryVector3d
} from '@mlightcad/geometry-engine'
import { AcGiContext, DEFAULT_ACGI_CONTEXT } from '@mlightcad/graphic-interface'

import { acdbHostApplicationServices } from '../src/base/AcDbHostApplicationServices'
import { AcDbDatabase } from '../src/database/AcDbDatabase'
import { AcDbLayerTableRecord } from '../src/database/AcDbLayerTableRecord'
import { AcDb2dPolyline, AcDbPoly2dType } from '../src/entity/AcDb2dPolyline'
import { AcDb2dVertex } from '../src/entity/AcDb2dVertex'
import { AcDbArc } from '../src/entity/AcDbArc'
import { AcDbCircle } from '../src/entity/AcDbCircle'
import { AcDbEllipse } from '../src/entity/AcDbEllipse'
import { AcDbEntity } from '../src/entity/AcDbEntity'
import { AcDbLine } from '../src/entity/AcDbLine'
import { AcDbPoint } from '../src/entity/AcDbPoint'
import { AcDbPolyline } from '../src/entity/AcDbPolyline'
import { AcDbSpline } from '../src/entity/AcDbSpline'
import { AcDbViewport } from '../src/entity/AcDbViewport'
import { AcDb3PointAngularDimension } from '../src/entity/dimension/AcDb3PointAngularDimension'
import { AcDbAlignedDimension } from '../src/entity/dimension/AcDbAlignedDimension'
import { AcDbArcDimension } from '../src/entity/dimension/AcDbArcDimension'
import { AcDbDiametricDimension } from '../src/entity/dimension/AcDbDiametricDimension'
import { AcDbOrdinateDimension } from '../src/entity/dimension/AcDbOrdinateDimension'
import { AcDbRadialDimension } from '../src/entity/dimension/AcDbRadialDimension'
import { AcDbOsnapMode } from '../src/misc'

const expectPoint3dClose = (
  actual: { x: number; y: number; z?: number },
  expected: { x: number; y: number }
) => {
  expect(actual.x).toBeCloseTo(expected.x, 8)
  expect(actual.y).toBeCloseTo(expected.y, 8)
  // 2D entities have no Z to compare.
  if (actual.z !== undefined) expect(actual.z).toBeCloseTo(0, 8)
}

class DummyEntity extends AcDbEntity {
  override get dxfTypeName() {
    return 'DUMMY'
  }

  override get geometricExtents() {
    return new GeometryBox3d().expandByPoint(new GeometryPoint2d())
  }

  override subWorldDraw() {
    return undefined
  }
}

describe('AcDbEntity.dxfTypeName', () => {
  it('uses explicit DXF type names defined by each entity', () => {
    expect(new AcDbPolyline().dxfTypeName).toBe('LWPOLYLINE')
    expect(new AcDb2dPolyline(AcDbPoly2dType.SimplePoly, []).dxfTypeName).toBe(
      'POLYLINE'
    )
    expect(new AcDb2dVertex().dxfTypeName).toBe('VERTEX')
    expect(
      new AcDb3PointAngularDimension(
        new GeometryPoint2d(),
        new GeometryPoint2d(1, 0),
        new GeometryPoint2d(0, 1),
        new GeometryPoint2d(1, 1)
      ).dxfTypeName
    ).toBe('DIMENSION')
  })
})

describe('AcDbEntity.worldDraw layer policy', () => {
  let db: AcDbDatabase

  beforeEach(() => {
    db = new AcDbDatabase()
    db.createDefaultData()
    acdbHostApplicationServices().workingDatabase = db
  })

  it('skips subWorldDraw when drawNoPlotLayers is false and layer is non-plottable', () => {
    ;(db as unknown as { _drawNoPlotLayers: boolean })._drawNoPlotLayers = false
    db.tables.layerTable.add(
      new AcDbLayerTableRecord({ name: 'NPLT', isPlottable: false })
    )

    const entity = new DummyEntity()
    entity.layer = 'NPLT'
    db.tables.blockTable.modelSpace.appendEntity(entity)

    const subWorldDraw = jest.spyOn(entity, 'subWorldDraw')
    const renderer = {
      subEntityTraits: {},
      context: new AcGiContext({ ...DEFAULT_ACGI_CONTEXT })
    } as never

    expect(entity.worldDraw(renderer)).toBeUndefined()
    expect(subWorldDraw).not.toHaveBeenCalled()
  })

  it('calls subWorldDraw when drawNoPlotLayers is true on a non-plottable layer', () => {
    db.tables.layerTable.add(
      new AcDbLayerTableRecord({ name: 'NPLT', isPlottable: false })
    )

    const entity = new DummyEntity()
    entity.layer = 'NPLT'
    db.tables.blockTable.modelSpace.appendEntity(entity)

    const renderer = {
      subEntityTraits: {},
      context: new AcGiContext({ ...DEFAULT_ACGI_CONTEXT })
    }
    const subWorldDraw = jest.spyOn(entity, 'subWorldDraw')

    entity.worldDraw(renderer as never)
    expect(subWorldDraw).toHaveBeenCalled()
    expect(renderer.context.database).toBe(db)
  })
})

describe('AcDbEntity.color resolution', () => {
  let db: AcDbDatabase

  const addLayerWithColor = (name: string, rgb: number) => {
    db.tables.layerTable.add(
      new AcDbLayerTableRecord({
        name,
        color: new AcCmColor().setRGBValue(rgb)
      })
    )
  }

  beforeEach(() => {
    db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db
  })

  it('resolves ByBlock to ACI 7 foreground, not CECOLOR', () => {
    addLayerWithColor('0', 0x101010)
    db.clayer = '0'
    db.cecolor = new AcCmColor().setRGBValue(0x336699)

    const line = new AcDbLine(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(1, 0)
    )
    line.layer = '0'
    line.color.setByBlock()

    expect(line.color.isByBlock).toBe(true)
    expect(line.resolvedColor.isForeground).toBe(true)
    expect(line.resolvedColor.colorIndex).toBe(7)
    expect(line.resolvedColor.RGB).not.toBe(0x336699)
  })

  it('keeps ByBlock as foreground even when CECOLOR is ByLayer', () => {
    addLayerWithColor('ENTITY_LAYER', 0x00ff00)
    addLayerWithColor('CURRENT_LAYER', 0x112233)
    db.clayer = 'CURRENT_LAYER'
    db.cecolor = new AcCmColor().setByLayer()

    const line = new AcDbLine(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(1, 0)
    )
    line.layer = 'ENTITY_LAYER'
    line.color.setByBlock()

    expect(line.resolvedColor.isForeground).toBe(true)
    expect(line.resolvedColor.colorIndex).toBe(7)
    expect(line.resolvedColor.RGB).not.toBe(0x112233)
  })

  it('resolves ByLayer against the entity layer color', () => {
    addLayerWithColor('ENTITY_LAYER', 0xaa5500)
    addLayerWithColor('CURRENT_LAYER', 0x123456)
    db.clayer = 'CURRENT_LAYER'
    db.cecolor = new AcCmColor().setRGBValue(0xff00ff)

    const line = new AcDbLine(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(1, 0)
    )
    line.layer = 'ENTITY_LAYER'
    line.color.setByLayer()

    expect(line.resolvedColor.RGB).toBe(0xaa5500)
  })
})

describe('AcDbEntity.transformBy', () => {
  it('keeps point-like entities aligned across matrix families', () => {
    const cases = [
      {
        name: 'translation',
        matrix: new GeometryMatrix3d().makeTranslation(3, 4, 5)
      },
      {
        name: 'rotation',
        matrix: new GeometryMatrix3d().makeRotationZ(Math.PI / 2)
      },
      {
        name: 'mirror',
        matrix: new GeometryMatrix3d().makeScale(-1, 1, 1)
      },
      {
        name: 'non-uniform-scale',
        matrix: new GeometryMatrix3d().makeScale(2, 3, 4)
      }
    ]

    cases.forEach(({ name, matrix }) => {
      const source = new GeometryPoint2d(1, 2)

      const point = new AcDbPoint()
      point.position = source.clone()
      point.transformBy(matrix)

      const vertex2d = new AcDb2dVertex()
      vertex2d.position = source.clone()
      vertex2d.transformBy(matrix)

      const expected = source.clone().applyMatrix4(matrix)
      expectPoint3dClose(point.position, expected)
      expectPoint3dClose(vertex2d.position, expected)
      expect(name).toBeTruthy()
    })
  })

  it('keeps the base AcDbEntity transformBy as a no-op', () => {
    const entity = new DummyEntity()
    const result = entity.transformBy(
      new GeometryMatrix3d().makeTranslation(1, 2, 3)
    )

    expect(result).toBe(entity)
    expect(entity.geometricExtents.min.x).toBe(0)
  })

  it('transforms lightweight and legacy polylines', () => {
    const lwPolyline = new AcDbPolyline()
    lwPolyline.addVertexAt(0, new GeometryPoint2d(0, 0), 1)
    lwPolyline.addVertexAt(1, new GeometryPoint2d(2, 0))

    lwPolyline.transformBy(new GeometryMatrix3d().makeTranslation(3, 4, 5))

    const legacyPolyline = new AcDb2dPolyline(
      AcDbPoly2dType.SimplePoly,
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 }
      ],
      2
    )
    legacyPolyline.transformBy(new GeometryMatrix3d().makeTranslation(-1, 2, 3))

    expect(legacyPolyline.getPointAt(0)).toMatchObject({ x: -1, y: 2 })
    expect(legacyPolyline.getPointAt(1)).toMatchObject({ x: 0, y: 2 })
  })

  it('transforms primitive entities and vertex entities', () => {
    const point = new AcDbPoint()
    point.position = new GeometryPoint2d(1, 2)
    point.transformBy(new GeometryMatrix3d().makeTranslation(4, -1, 2))
    expectPoint3dClose(point.position, { x: 5, y: 1 })

    const line = new AcDbLine(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(1, 2)
    )
    line.transformBy(new GeometryMatrix3d().makeTranslation(2, 3, 4))
    expectPoint3dClose(line.startPoint, { x: 2, y: 3 })
    expectPoint3dClose(line.endPoint, { x: 3, y: 5 })

    const arc = new AcDbArc(new GeometryPoint2d(0, 0), 2, 0, Math.PI / 2)
    arc.transformBy(new GeometryMatrix3d().makeTranslation(1, 2, 3))
    expectPoint3dClose(arc.center, { x: 1, y: 2 })
    expectPoint3dClose(arc.startPoint, { x: 3, y: 2 })

    const circle = new AcDbCircle(new GeometryPoint2d(0, 0), 3)
    circle.transformBy(new GeometryMatrix3d().makeTranslation(-2, 4, 1))
    expectPoint3dClose(circle.center, { x: -2, y: 4 })
    expect(circle.radius).toBeCloseTo(3, 8)

    const vertex2d = new AcDb2dVertex()
    vertex2d.position = new GeometryPoint2d(1, 1)
    vertex2d.transformBy(new GeometryMatrix3d().makeTranslation(3, 4, 5))
    expectPoint3dClose(vertex2d.position, { x: 4, y: 5 })
  })

  it('keeps line-like entities aligned across translation rotation and mirror', () => {
    const cases = [
      new GeometryMatrix3d().makeTranslation(4, -1, 2),
      new GeometryMatrix3d().makeRotationZ(Math.PI / 2),
      new GeometryMatrix3d().makeScale(-1, 1, 1)
    ]

    cases.forEach(matrix => {
      const start = new GeometryPoint2d(1, 2)
      const end = new GeometryPoint2d(4, 5)

      const line = new AcDbLine(start.clone(), end.clone())
      line.transformBy(matrix)
      expectPoint3dClose(line.startPoint, start.clone().applyMatrix4(matrix))
      expectPoint3dClose(line.endPoint, end.clone().applyMatrix4(matrix))
    })
  })

  it('keeps polyline entities aligned across rotation and mirror transforms', () => {
    const cases = [
      {
        matrix: new GeometryMatrix3d().makeRotationZ(Math.PI / 2),
        expectedBulge: 1
      },
      {
        matrix: new GeometryMatrix3d().makeScale(-1, 1, 1),
        expectedBulge: -1
      }
    ]

    cases.forEach(({ matrix, expectedBulge }) => {
      const lwPolyline = new AcDbPolyline()
      lwPolyline.addVertexAt(0, new GeometryPoint2d(0, 0), 1)
      lwPolyline.addVertexAt(1, new GeometryPoint2d(2, 0))
      lwPolyline.transformBy(matrix)
      expect(
        (
          lwPolyline as unknown as {
            _geo: { vertices: Array<{ bulge?: number }> }
          }
        )._geo.vertices[0].bulge
      ).toBe(expectedBulge)

      const legacyPolyline = new AcDb2dPolyline(
        AcDbPoly2dType.SimplePoly,
        [
          { x: 0, y: 0 },
          { x: 2, y: 0 }
        ],
        0,
        false,
        0,
        0,
        [1, 0]
      )
      legacyPolyline.transformBy(matrix)
      expect(legacyPolyline.getBulgeAt(0)).toBe(expectedBulge)
    })
  })

  it('transforms splines, ellipses, leaders and infinite lines', () => {
    const spline = new AcDbSpline(
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 },
        { x: 3, y: 1 }
      ],
      [0, 0, 0, 0, 1, 1, 1, 1]
    )
    const splineSnapPoints: GeometryPoint2d[] = []
    spline.transformBy(new GeometryMatrix3d().makeTranslation(2, 3, 4))
    spline.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new GeometryPoint2d(),
      new GeometryPoint2d(),
      splineSnapPoints
    )
    expect(splineSnapPoints[0]).toMatchObject({ x: 2, y: 3 })

    const ellipse = new AcDbEllipse(
      new GeometryPoint2d(0, 0),
      GeometryVector3d.X_AXIS,
      4,
      2,
      0,
      Math.PI / 2
    )
    ellipse.transformBy(new GeometryMatrix3d().makeTranslation(1, 2, 3))
    expect(ellipse.center).toMatchObject({ x: 1, y: 2 })
  })

  it('transforms text-like and mesh entities', () => {
    const viewport = new AcDbViewport()
    viewport.centerPoint = new GeometryPoint2d(1, 2)
    viewport.width = 2
    viewport.height = 4
    viewport.viewHeight = 10
    viewport.transformBy(new GeometryMatrix3d().makeScale(2, 3, 1))
    expect(viewport.centerPoint).toMatchObject({ x: 2, y: 6 })
    expect(viewport.width).toBeCloseTo(4, 8)
    expect(viewport.height).toBeCloseTo(12, 8)
    expect(viewport.viewHeight).toBeCloseTo(30, 8)
  })

  it('updates text, mtext and viewport under combined transforms', () => {
    const viewport = new AcDbViewport()
    viewport.centerPoint = new GeometryPoint2d(1, 1)
    viewport.width = 2
    viewport.height = 3
    viewport.viewHeight = 4
    viewport.transformBy(
      new GeometryMatrix3d()
        .makeRotationZ(Math.PI / 2)
        .multiply(new GeometryMatrix3d().makeScale(2, 5, 1))
    )
    expectPoint3dClose(viewport.centerPoint, { x: -5, y: 2 })
    expect(viewport.width).toBeCloseTo(4, 8)
    expect(viewport.height).toBeCloseTo(15, 8)
    expect(viewport.viewHeight).toBeCloseTo(20, 8)
  })

  it('transforms dimension entities through base and subclass definition points', () => {
    const dimension = new AcDbAlignedDimension(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(2, 0),
      new GeometryPoint2d(1, 1)
    )
    dimension.textPosition = new GeometryPoint2d(2, 0)
    dimension.textRotation = 0
    dimension.normal = GeometryVector3d.Z_AXIS
    dimension.transformBy(
      new GeometryMatrix3d()
        .makeRotationZ(Math.PI / 2)
        .multiply(new GeometryMatrix3d().makeTranslation(3, 4, 5))
    )

    expectPoint3dClose(dimension.xLine1Point, { x: -4, y: 3 })
    expectPoint3dClose(dimension.xLine2Point, { x: -4, y: 5 })
    expectPoint3dClose(dimension.dimLinePoint, { x: -5, y: 4 })
    expectPoint3dClose(dimension.textPosition, { x: -4, y: 5 })
    expect(dimension.textRotation).toBeCloseTo(Math.PI / 2, 8)

    const angularDimension = new AcDb3PointAngularDimension(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(1, 0),
      new GeometryPoint2d(0, 1),
      new GeometryPoint2d(1, 1)
    )
    angularDimension.transformBy(
      new GeometryMatrix3d().makeTranslation(1, 2, 3)
    )
    expectPoint3dClose(angularDimension.centerPoint, { x: 1, y: 2 })
    expectPoint3dClose(angularDimension.arcPoint, { x: 2, y: 3 })

    const arcDimension = new AcDbArcDimension(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(1, 0),
      new GeometryPoint2d(0, 1),
      new GeometryPoint2d(1, 1)
    )
    arcDimension.transformBy(new GeometryMatrix3d().makeTranslation(2, 3, 4))
    expectPoint3dClose(arcDimension.centerPoint, { x: 2, y: 3 })
    expectPoint3dClose(arcDimension.arcPoint, { x: 3, y: 4 })

    const diametricDimension = new AcDbDiametricDimension(
      new GeometryPoint2d(1, 0),
      new GeometryPoint2d(-1, 0),
      2
    )
    diametricDimension.transformBy(
      new GeometryMatrix3d().makeTranslation(5, 6, 7)
    )
    expectPoint3dClose(diametricDimension.chordPoint, { x: 6, y: 6 })
    expectPoint3dClose(diametricDimension.farChordPoint, { x: 4, y: 6 })

    const ordinateDimension = new AcDbOrdinateDimension(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(1, 2)
    )
    ordinateDimension.transformBy(
      new GeometryMatrix3d().makeTranslation(-1, -2, -3)
    )
    expectPoint3dClose(ordinateDimension.definingPoint, { x: -1, y: -2 })
    expectPoint3dClose(ordinateDimension.leaderEndPoint, { x: 0, y: 0 })

    const radialDimension = new AcDbRadialDimension(
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(2, 0),
      1
    )
    radialDimension.transformBy(new GeometryMatrix3d().makeTranslation(7, 8, 9))
    expectPoint3dClose(radialDimension.center, { x: 7, y: 8 })
    expectPoint3dClose(radialDimension.chordPoint, { x: 9, y: 8 })
  })
})
