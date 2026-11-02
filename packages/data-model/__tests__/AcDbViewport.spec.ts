import {
  AcGeBox3d,
  AcGeMatrix3d,
  AcGePoint2d,
  AcGeVector3d
} from '@mlightcad/geometry-engine'

import { acdbHostApplicationServices } from '../src/base'
import {
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbLayerTableRecord
} from '../src/database'
import { AcDbViewport } from '../src/entity'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

const createDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

describe('AcDbViewport', () => {
  it('creates a detached clone with a new objectId', () => {
    expectDetachedClone(() => new AcDbViewport())
  })

  it('supports default values and all public getters/setters', () => {
    const viewport = new AcDbViewport()

    expect(AcDbViewport.typeName).toBe('Viewport')
    expect(viewport.dxfTypeName).toBe('VIEWPORT')
    expect(viewport.number).toBe(-1)
    expect(viewport.height).toBe(0)
    expect(viewport.width).toBe(0)
    expect(viewport.viewHeight).toBe(0)
    expect(viewport.centerPoint).toMatchObject({ x: 0, y: 0 })
    expect(viewport.viewCenter).toMatchObject({ x: 0, y: 0 })
    expect(viewport.viewTarget).toMatchObject({ x: 0, y: 0 })
    expect(viewport.viewTwistAngle).toBe(0)

    viewport.number = 2
    viewport.height = 8
    viewport.width = 12
    viewport.viewHeight = 24
    viewport.centerPoint = new AcGePoint2d(10, 20)
    viewport.viewCenter = new AcGePoint2d(5, 6)
    viewport.viewTarget = new AcGePoint2d(100, 200)
    viewport.viewTwistAngle = Math.PI / 4

    expect(viewport.number).toBe(2)
    expect(viewport.height).toBe(8)
    expect(viewport.width).toBe(12)
    expect(viewport.viewHeight).toBe(24)
    expect(viewport.centerPoint).toMatchObject({ x: 10, y: 20 })
    expect(viewport.viewCenter).toMatchObject({ x: 5, y: 6 })
    expect(viewport.viewTarget).toMatchObject({ x: 100, y: 200 })
    expect(viewport.viewTwistAngle).toBeCloseTo(Math.PI / 4)
  })

  it('returns geometricExtents and maps itself to AcGiViewport', () => {
    const db = createDb()
    const viewport = new AcDbViewport()
    viewport.number = 3
    viewport.width = 10
    viewport.height = 6
    viewport.viewHeight = 20
    viewport.centerPoint = new AcGePoint2d(2, 4)
    viewport.viewCenter = new AcGePoint2d(1, 1)
    db.tables.blockTable.modelSpace.appendEntity(viewport)

    expect(viewport.geometricExtents).toBeInstanceOf(AcGeBox3d)

    const giViewport = viewport.toGiViewport()
    expect(giViewport.id).toBe(viewport.objectId)
    expect(giViewport.groupId).toBe(db.tables.blockTable.modelSpace.objectId)
    expect(giViewport.number).toBe(3)
    expect(giViewport.width).toBe(10)
    expect(giViewport.height).toBe(6)
    expect(giViewport.viewHeight).toBe(20)
    expect(giViewport.centerPoint).toMatchObject({ x: 2, y: 4 })
    expect(giViewport.viewCenter).toMatchObject({ x: 1, y: 1 })
    expect(giViewport.viewTarget).toMatchObject({ x: 0, y: 0 })
    expect(giViewport.viewTwistAngle).toBe(0)
    expect(giViewport.frozenLayerIds).toEqual([])
    expect(giViewport.frozenLayers).toEqual([])
  })

  it('passes frozen layer ids and resolved names through toGiViewport', () => {
    const db = createDb()
    const layer = new AcDbLayerTableRecord({ name: 'DetailA' })
    db.tables.layerTable.add(layer)

    const viewport = new AcDbViewport()
    viewport.frozenLayerIds = [layer.objectId, 'missing-handle']
    db.tables.blockTable.modelSpace.appendEntity(viewport)

    const giViewport = viewport.toGiViewport()
    expect(giViewport.frozenLayerIds).toEqual([
      layer.objectId,
      'missing-handle'
    ])
    expect(giViewport.frozenLayers).toEqual(['DetailA'])

    const cloned = giViewport.clone()
    expect(cloned.frozenLayerIds).toEqual(giViewport.frozenLayerIds)
    expect(cloned.frozenLayers).toEqual(['DetailA'])
  })

  it('maps DCS view center through viewTarget into WCS viewBox', () => {
    const db = createDb()
    const viewport = new AcDbViewport()
    viewport.width = 420
    viewport.height = 296.6468489892975
    viewport.viewHeight = 8899.405469678924
    viewport.viewCenter = new AcGePoint2d(
      -1108628.2173647524,
      -354100.8830431862
    )
    viewport.viewTarget = new AcGePoint2d(1111867.66380098, 300645.9460363481)
    db.tables.blockTable.modelSpace.appendEntity(viewport)

    const giViewport = viewport.toGiViewport()
    const box = giViewport.viewBox
    const centerX = (box.min.x + box.max.x) / 2
    const centerY = (box.min.y + box.max.y) / 2

    expect(centerX).toBeCloseTo(3239.446436227532, 3)
    expect(centerY).toBeCloseTo(-53454.937006838096, 3)
    expect(box.max.x - box.min.x).toBeCloseTo(giViewport.viewWidth, 3)
    expect(box.max.y - box.min.y).toBeCloseTo(giViewport.viewHeight, 3)
  })

  it('returns geometricExtents and recomputes when centerPoint changes', () => {
    const viewport = new AcDbViewport()
    viewport.width = 10
    viewport.height = 6
    viewport.centerPoint = new AcGePoint2d(10, 20)

    expect(viewport.geometricExtents.min).toMatchObject({ x: 5, y: 17 })
    expect(viewport.geometricExtents.max).toMatchObject({ x: 15, y: 23 })

    viewport.centerPoint = new AcGePoint2d(0, 0)

    expect(viewport.geometricExtents.min).toMatchObject({ x: -5, y: -3 })
    expect(viewport.geometricExtents.max).toMatchObject({ x: 5, y: 3 })
  })

  it('transforms center/size/viewHeight and returns self', () => {
    const viewport = new AcDbViewport()
    viewport.centerPoint = new AcGePoint2d(1, 2)
    viewport.width = 2
    viewport.height = 4
    viewport.viewHeight = 12

    expect(viewport.transformBy(new AcGeMatrix3d().makeScale(3, 2, 1))).toBe(
      viewport
    )
    expect(viewport.centerPoint).toMatchObject({ x: 3, y: 4 })
    expect(viewport.width).toBeCloseTo(6)
    expect(viewport.height).toBeCloseTo(8)
    expect(viewport.viewHeight).toBeCloseTo(24)
  })

  it('keeps viewHeight unchanged when height is zero during transform', () => {
    const viewport = new AcDbViewport()
    viewport.centerPoint = new AcGePoint2d(1, 1)
    viewport.width = 5
    viewport.height = 0
    viewport.viewHeight = 7

    viewport.transformBy(new AcGeMatrix3d().makeScale(2, 9, 1))

    expect(viewport.width).toBeCloseTo(10)
    expect(viewport.height).toBeCloseTo(0)
    expect(viewport.viewHeight).toBe(7)
  })

  describe('subWorldDraw', () => {
    const createRenderer = () => ({
      lines: jest.fn((points: AcGePoint2d[]) => ({ points })),
      group: jest.fn((children: unknown[]) => ({ children }))
    })

    const appendPaperSpaceViewport = (
      db: AcDbDatabase,
      attrs?: Partial<{
        number: number
        layer: string
        centerPoint: AcGePoint2d
        width: number
        height: number
      }>
    ) => {
      const paperSpace = new AcDbBlockTableRecord()
      paperSpace.name = '*Paper_Space0'
      db.tables.blockTable.add(paperSpace)

      const viewport = new AcDbViewport()
      viewport.number = attrs?.number ?? 2
      viewport.layer = attrs?.layer ?? '0'
      viewport.centerPoint = attrs?.centerPoint ?? new AcGePoint2d(10, 20)
      viewport.width = attrs?.width ?? 8
      viewport.height = attrs?.height ?? 6
      paperSpace.appendEntity(viewport)
      return viewport
    }

    it('draws rectangle in paper space for active viewport only', () => {
      const db = createDb()
      const paperSpace = new AcDbBlockTableRecord()
      paperSpace.name = '*Paper_Space0'
      db.tables.blockTable.add(paperSpace)

      const viewport = new AcDbViewport()
      viewport.number = 2
      viewport.centerPoint = new AcGePoint2d(10, 20)
      viewport.width = 8
      viewport.height = 6
      paperSpace.appendEntity(viewport)

      const renderer = createRenderer()

      const drawn = viewport.subWorldDraw(renderer as never)
      expect(renderer.lines).toHaveBeenCalledTimes(4)
      expect(renderer.group).toHaveBeenCalledTimes(1)
      expect(drawn).toBeDefined()

      const firstEdge = renderer.lines.mock.calls[0][0] as AcGePoint2d[]
      expect(firstEdge[0]).toMatchObject({ x: 6, y: 17 })
      expect(firstEdge[1]).toMatchObject({ x: 14, y: 17 })

      const inactive = new AcDbViewport()
      inactive.number = 1
      paperSpace.appendEntity(inactive)
      expect(inactive.subWorldDraw(renderer as never)).toBeUndefined()

      const inModelSpace = new AcDbViewport()
      inModelSpace.number = 2
      db.tables.blockTable.modelSpace.appendEntity(inModelSpace)
      expect(inModelSpace.subWorldDraw(renderer as never)).toBeUndefined()
    })

    it('still draws border on a non-plottable layer when called directly', () => {
      const db = createDb()
      ;(db as unknown as { _drawNoPlotLayers: boolean })._drawNoPlotLayers =
        false
      db.tables.layerTable.add(
        new AcDbLayerTableRecord({ name: 'NPLT', isPlottable: false })
      )

      const viewport = appendPaperSpaceViewport(db, { layer: 'NPLT' })
      const renderer = createRenderer()

      expect(viewport.subWorldDraw(renderer as never)).toBeDefined()
      expect(renderer.lines).toHaveBeenCalledTimes(4)
      expect(renderer.group).toHaveBeenCalledTimes(1)
    })
  })

  describe('worldDraw', () => {
    it('delegates no-plot suppression to AcDbEntity.worldDraw', () => {
      const db = createDb()
      ;(db as unknown as { _drawNoPlotLayers: boolean })._drawNoPlotLayers =
        false
      db.tables.layerTable.add(
        new AcDbLayerTableRecord({ name: 'NPLT', isPlottable: false })
      )

      const paperSpace = new AcDbBlockTableRecord()
      paperSpace.name = '*Paper_Space0'
      db.tables.blockTable.add(paperSpace)

      const viewport = new AcDbViewport()
      viewport.number = 2
      viewport.layer = 'NPLT'
      viewport.centerPoint = new AcGePoint2d(10, 20)
      viewport.width = 8
      viewport.height = 6
      paperSpace.appendEntity(viewport)

      const subWorldDraw = jest.spyOn(viewport, 'subWorldDraw')
      const renderer = {
        subEntityTraits: {},
        lines: jest.fn((points: AcGePoint2d[]) => ({ points })),
        group: jest.fn((children: unknown[]) => ({ children }))
      }

      expect(viewport.worldDraw(renderer as never)).toBeUndefined()
      expect(subWorldDraw).not.toHaveBeenCalled()
    })
  })

  it('returns center and corner grip points', () => {
    const viewport = new AcDbViewport()
    viewport.width = 10
    viewport.height = 6
    viewport.centerPoint = new AcGePoint2d(2, 4)

    const grips = viewport.subGetGripPoints()

    expect(grips).toHaveLength(5)
    expect(grips[0]).toBe(viewport.centerPoint)
    expect(grips[1]).toMatchObject({ x: -3, y: 1 })
    expect(grips[2]).toMatchObject({ x: 7, y: 1 })
    expect(grips[3]).toMatchObject({ x: 7, y: 7 })
    expect(grips[4]).toMatchObject({ x: -3, y: 7 })
  })

  it('moves center and resizes from opposite corner grips', () => {
    const viewport = new AcDbViewport()
    viewport.width = 10
    viewport.height = 6
    viewport.centerPoint = new AcGePoint2d(2, 4)

    viewport.subMoveGripPointsAt([0], new AcGeVector3d(1, 1, 0))
    expect(viewport.centerPoint).toMatchObject({ x: 3, y: 5 })

    viewport.subMoveGripPointsAt([2], new AcGeVector3d(2, 0, 0))
    expect(viewport.width).toBeCloseTo(12)
    expect(viewport.height).toBe(6)
    expect(viewport.centerPoint).toMatchObject({ x: 4, y: 5 })
  })
})
