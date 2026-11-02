import {
  GeometryBox3d,
  GeometryMatrix3d,
  GeometryPoint2d,
  GeometryVector3d
} from '@mlightcad/geometry-engine'
import {
  AcGiMTextAttachmentPoint,
  AcGiMTextFlowDirection
} from '@mlightcad/graphic-interface'

import { acdbHostApplicationServices } from '../src/base'
import { AcDbDatabase } from '../src/database'
import { AcDbMText } from '../src/entity'
import { AcDbOsnapMode, DEFAULT_TEXT_STYLE } from '../src/misc'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

const createWorkingDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

describe('AcDbMText', () => {
  it('creates a detached clone with a new objectId', () => {
    createWorkingDb()
    expectDetachedClone(() => new AcDbMText())
  })

  it('supports public getters and setters', () => {
    createWorkingDb()
    const mtext = new AcDbMText()

    expect(AcDbMText.typeName).toBe('MText')
    expect(mtext.dxfTypeName).toBe('MTEXT')

    mtext.contents = 'line1\nline2'
    mtext.height = 2.5
    mtext.width = 12
    mtext.rotation = Math.PI / 3
    mtext.lineSpacingStyle = 2
    mtext.lineSpacingFactor = 1.25
    mtext.backgroundFill = true
    mtext.backgroundFillColor = 0x123456
    mtext.backgroundFillTransparency = 250
    mtext.backgroundScaleFactor = 1.8
    mtext.styleName = 'CustomStyle'
    mtext.location = { x: 1, y: 2 }
    mtext.attachmentPoint = AcGiMTextAttachmentPoint.BottomRight
    mtext.direction = { x: 2, y: 3, z: 4 }
    mtext.drawingDirection = AcGiMTextFlowDirection.TOP_TO_BOTTOM

    expect(mtext.contents).toBe('line1\nline2')
    expect(mtext.height).toBeCloseTo(2.5)
    expect(mtext.width).toBeCloseTo(12)
    expect(mtext.rotation).toBeCloseTo(Math.PI / 3)
    expect(mtext.lineSpacingStyle).toBe(2)
    expect(mtext.lineSpacingFactor).toBeCloseTo(1.25)
    expect(mtext.backgroundFill).toBe(true)
    expect(mtext.backgroundFillColor).toBe(0x123456)
    expect(mtext.backgroundFillTransparency).toBe(250)
    expect(mtext.backgroundScaleFactor).toBeCloseTo(1.8)
    expect(mtext.styleName).toBe('CustomStyle')
    expect(mtext.location).toMatchObject({ x: 1, y: 2 })
    expect(mtext.attachmentPoint).toBe(AcGiMTextAttachmentPoint.BottomRight)
    expect(mtext.direction).toMatchObject({ x: 2, y: 3 })
    expect(mtext.drawingDirection).toBe(AcGiMTextFlowDirection.TOP_TO_BOTTOM)
    expect(mtext.geometricExtents).toBeInstanceOf(GeometryBox3d)
  })

  it('returns geometricExtents and recomputes when location changes', () => {
    createWorkingDb()
    const mtext = new AcDbMText()
    mtext.contents = 'X'
    mtext.height = 2
    mtext.location = { x: 0, y: 0 }

    expect(mtext.geometricExtents.min.y).toBeCloseTo(-2)
    expect(mtext.geometricExtents.max.x).toBeCloseTo(2)

    mtext.location = { x: 10, y: 10 }

    expect(mtext.geometricExtents.min.x).toBeCloseTo(10)
    expect(mtext.geometricExtents.min.y).toBeCloseTo(8)
    expect(mtext.geometricExtents.max.x).toBeCloseTo(12)
    expect(mtext.geometricExtents.max.y).toBeCloseTo(10)
  })

  it('includes multi-line height from line spacing factor in geometricExtents', () => {
    createWorkingDb()
    const mtext = new AcDbMText()
    mtext.contents = 'A\nB'
    mtext.height = 2
    mtext.lineSpacingFactor = 1
    mtext.location = { x: 0, y: 0 }

    expect(mtext.geometricExtents.min.y).toBeCloseTo(-(2 + (5 / 3) * 2))
    expect(mtext.geometricExtents.max.y).toBeCloseTo(0)
  })

  it('floors At Least spacing at text height and keeps Exact factor spacing', () => {
    createWorkingDb()
    const mtext = new AcDbMText()
    mtext.contents = 'A\nB'
    mtext.height = 2
    mtext.lineSpacingFactor = 0.25
    mtext.lineSpacingStyle = 1
    mtext.location = { x: 0, y: 0 }

    expect(mtext.geometricExtents.min.y).toBeCloseTo(-4)

    mtext.lineSpacingStyle = 2
    expect(mtext.geometricExtents.min.y).toBeCloseTo(-(2 + 0.25 * (5 / 3) * 2))
  })

  it('prefers extentsWidth over reference width in geometricExtents', () => {
    createWorkingDb()
    const mtext = new AcDbMText()
    mtext.contents = 'Short'
    mtext.height = 2
    mtext.width = 5
    mtext.extentsWidth = 20
    mtext.location = { x: 0, y: 0 }

    expect(mtext.geometricExtents.max.x).toBeCloseTo(20)
  })

  it('scales extentsWidth when transformed along the text direction', () => {
    createWorkingDb()
    const mtext = new AcDbMText()
    mtext.extentsWidth = 10
    mtext.direction = { x: 1, y: 0, z: 0 }

    mtext.transformBy(new GeometryMatrix3d().makeScale(2, 1, 1))

    expect(mtext.extentsWidth).toBeCloseTo(20)
  })

  it('returns insertion osnap point only for insertion mode', () => {
    createWorkingDb()
    const mtext = new AcDbMText()
    mtext.location = { x: 9, y: 8 }

    const insertionPoints: GeometryPoint2d[] = []
    mtext.subGetOsnapPoints(
      AcDbOsnapMode.Insertion,
      new GeometryPoint2d(),
      new GeometryPoint2d(),
      insertionPoints
    )
    expect(insertionPoints).toEqual([mtext.location])

    const unsupportedPoints: GeometryPoint2d[] = []
    mtext.subGetOsnapPoints(
      AcDbOsnapMode.Center,
      new GeometryPoint2d(),
      new GeometryPoint2d(),
      unsupportedPoints
    )
    expect(unsupportedPoints).toHaveLength(0)
  })

  it('returns location as grip point', () => {
    createWorkingDb()
    const mtext = new AcDbMText()
    mtext.location = new GeometryPoint2d(6, 7)
    const grips = mtext.subGetGripPoints()
    expect(grips).toHaveLength(1)
    expect(grips[0]).toBe(mtext.location)
  })

  it('transforms location, direction, width and height with non-zero direction', () => {
    createWorkingDb()
    const mtext = new AcDbMText()
    mtext.location = { x: 1, y: 2 }
    mtext.direction = { x: 1, y: 0, z: 0 }
    mtext.width = 5
    mtext.height = 7

    const matrix = new GeometryMatrix3d().makeScale(2, 3, 1)

    expect(mtext.transformBy(matrix)).toBe(mtext)
    expect(mtext.location).toMatchObject({ x: 2, y: 6 })
    expect(mtext.direction).toMatchObject({ x: 1, y: 0 })
    expect(mtext.rotation).toBeCloseTo(0)
    expect(mtext.width).toBeCloseTo(10)
    expect(mtext.height).toBeCloseTo(21)
  })

  it('falls back to rotation when direction is zero and skips scale updates for zero axes', () => {
    createWorkingDb()
    const mtext = new AcDbMText()
    mtext.direction = { x: 0, y: 0, z: 0 }
    mtext.rotation = Math.PI / 2
    mtext.width = 4
    mtext.height = 6

    mtext.transformBy(new GeometryMatrix3d().makeScale(2, 3, 1))
    expect(mtext.direction.x).toBeCloseTo(0, 5)
    expect(mtext.direction.y).toBeCloseTo(1, 5)
    expect(mtext.width).toBeCloseTo(12)
    expect(mtext.height).toBeCloseTo(12)

    mtext.width = 8
    mtext.height = 9
    const directionBefore = mtext.direction.clone()
    mtext.transformBy(new GeometryMatrix3d().makeScale(0, 0, 1))
    expect(mtext.direction).toEqual(directionBefore)
    expect(mtext.width).toBeCloseTo(8)
    expect(mtext.height).toBeCloseTo(9)
  })

  it('uses fallback y direction when computed yDir length is zero', () => {
    createWorkingDb()
    const mtext = new AcDbMText()
    const lengthSqSpy = jest
      .spyOn(GeometryVector3d.prototype, 'lengthSq')
      .mockReturnValue(0)

    try {
      expect(mtext.transformBy(new GeometryMatrix3d())).toBe(mtext)
    } finally {
      lengthSqSpy.mockRestore()
    }
  })

  it('exposes text and geometry runtime properties and accessors', () => {
    createWorkingDb()
    const mtext = new AcDbMText()
    const properties = mtext.properties

    expect(properties.type).toBe('MText')
    expect(properties.groups.map(g => g.groupName)).toEqual([
      'general',
      'text',
      'geometry'
    ])

    const valueMap: Record<string, number | string> = {
      contents: 'updated text',
      styleName: 'AnotherStyle',
      attachmentPoint: AcGiMTextAttachmentPoint.MiddleCenter,
      drawingDirection: AcGiMTextFlowDirection.BY_STYLE,
      textHeight: 3.2,
      rotation: Math.PI / 4,
      lineSpacingFactor: 1.1,
      definedWidth: 16,
      directionX: 4,
      directionY: 5,
      directionZ: 6,
      locationX: 7,
      locationY: 8,
      locationZ: 9
    }

    for (const groupName of ['text', 'geometry']) {
      const group = properties.groups.find(g => g.groupName === groupName)
      expect(group).toBeDefined()
      for (const prop of group!.properties) {
        prop.accessor.get()
        if (prop.editable && prop.accessor.set) {
          prop.accessor.set(valueMap[prop.name] ?? 0)
        }
        prop.accessor.get()
      }
    }

    expect(mtext.contents).toBe('updated text')
    expect(mtext.styleName).toBe('AnotherStyle')
    expect(mtext.attachmentPoint).toBe(AcGiMTextAttachmentPoint.MiddleCenter)
    expect(mtext.drawingDirection).toBe(AcGiMTextFlowDirection.BY_STYLE)
    expect(mtext.height).toBeCloseTo(3.2)
    expect(mtext.rotation).toBeCloseTo(Math.PI / 4)
    expect(mtext.lineSpacingFactor).toBeCloseTo(1.1)
    expect(mtext.width).toBeCloseTo(16)
    expect(mtext.direction).toMatchObject({ x: 4, y: 5 })
    expect(mtext.location).toMatchObject({ x: 7, y: 8 })
  })

  it('draws mtext and resolves text style via styleName/db.textstyle/default fallback', () => {
    const db = createWorkingDb()
    const mtext = new AcDbMText()
    const drawResult = { id: 'mtext-drawn' }
    const renderer = {
      mtext: jest.fn(() => drawResult)
    }

    mtext.styleName = DEFAULT_TEXT_STYLE
    expect(mtext.subWorldDraw(renderer as never, true)).toBe(drawResult)
    expect(renderer.mtext).toHaveBeenLastCalledWith(
      expect.objectContaining({
        text: mtext.contents,
        height: mtext.height,
        width: mtext.width
      }),
      expect.any(Object),
      true
    )

    mtext.styleName = '__missing_style__'
    db.textstyle = DEFAULT_TEXT_STYLE
    expect(mtext.subWorldDraw(renderer as never)).toBe(drawResult)

    db.textstyle = '__missing_textstyle__'
    expect(mtext.subWorldDraw(renderer as never)).toBe(drawResult)
    expect(renderer.mtext).toHaveBeenCalledTimes(3)
  })

  it('recreates a default text style when the table was cleared', () => {
    const db = createWorkingDb()
    const mtext = new AcDbMText()
    mtext.styleName = '__missing_style__'
    db.textstyle = '__missing_textstyle__'
    db.tables.textStyleTable.removeAll()

    const renderer = { mtext: jest.fn(() => ({})) }
    expect(() => mtext.subWorldDraw(renderer as never)).not.toThrow()
    expect(renderer.mtext).toHaveBeenCalled()
    expect(db.tables.textStyleTable.getAt('Standard')).toBeDefined()
  })
})
