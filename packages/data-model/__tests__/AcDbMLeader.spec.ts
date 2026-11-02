import { AcCmColor, AcCmColorMethod } from '@mlightcad/common'
import { GeometryPoint2d, GeometryVector3d } from '@mlightcad/geometry-engine'
import {
  AcGiLineWeight,
  AcGiSubEntityTraits,
  DEFAULT_ACGI_CONTEXT
} from '@mlightcad/graphic-interface'

import { acdbHostApplicationServices } from '../src/base'
import {
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbLinetypeTableRecord
} from '../src/database'
import { AcDbLine, AcDbMLeader, AcDbMLeaderContentType } from '../src/entity'
import {
  AcDbOsnapMode,
  AcDbRenderingCache,
  acdbDecodeMLeaderStyleRawColor
} from '../src/misc'
import { AcDbMLeaderStyle } from '../src/object'

const createWorkingDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

const createRenderer = () => {
  const renderer = {
    context: DEFAULT_ACGI_CONTEXT,
    subEntityTraits: {
      color: new AcCmColor(),
      lineType: {
        type: 'UserSpecified',
        name: 'CONTINUOUS',
        standardFlag: 0,
        description: '',
        totalPatternLength: 0
      },
      lineTypeScale: 1,
      lineWeight: undefined,
      transparency: undefined,
      thickness: 0,
      layer: '0',
      drawOrder: 0
    },
    lines: jest.fn((points: unknown[]) => {
      return { kind: 'lines', points }
    }),
    group: jest.fn((entities: unknown[]) => ({ kind: 'group', entities })),
    point: jest.fn(),
    circularArc: jest.fn(),
    ellipticalArc: jest.fn(),
    lineSegments: jest.fn(),
    area: jest.fn(),
    mtext: jest.fn(),
    image: jest.fn(),
    setFontMapping: jest.fn()
  }
  return renderer
}

const createSimpleLeader = (db: AcDbDatabase) => {
  const mleader = new AcDbMLeader()
  const leaderIndex = mleader.addLeader()
  mleader.addLeaderLine(leaderIndex, [
    new GeometryPoint2d(0, 0),
    new GeometryPoint2d(5, 0)
  ])
  db.tables.blockTable.modelSpace.appendEntity(mleader)
  return mleader
}

describe('AcDbMLeader arrowhead rendering', () => {
  it('ensures database default mleader style exists when appending a new MLEADER', () => {
    const db = createWorkingDb()
    db.cmleaderstyle = 'AUTO_MLEADER_STYLE'

    const mleader = createSimpleLeader(db)
    const style = db.objects.mleaderStyle.getAt('AUTO_MLEADER_STYLE')

    expect(style).toBeDefined()
    expect(mleader.mleaderStyleId).toBe(style?.objectId)
    expect(style?.maxLeaderSegmentsPoints).toBe(2)
    expect(style?.leaderLineColor.isByBlock).toBe(true)
    expect(style?.textColor.isByBlock).toBe(true)
    expect(style?.blockColor.isByBlock).toBe(true)
    expect(style?.alignSpace).toBe(4)
    expect(style?.breakSize).toBe(3.75)
    expect(style?.enableBlockRotation).toBe(true)
    expect(style?.unknown1).toBe(2)
    expect(style?.unknown2).toBe(false)
  })

  it('uses CMLEADERSTYLE as default style for newly appended MLeader entities', () => {
    const db = createWorkingDb()
    const baseStyle = new AcDbMLeaderStyle()
    db.objects.mleaderStyle.setAt('BASE', baseStyle)
    const activeStyle = new AcDbMLeaderStyle()
    db.objects.mleaderStyle.setAt('ACTIVE', activeStyle)
    db.cmleaderstyle = 'ACTIVE'

    const mleader = createSimpleLeader(db)
    expect(mleader.mleaderStyleId).toBe(activeStyle.objectId)
  })

  it('renders closed-filled arrows when style arrowhead id is default 0', () => {
    const db = createWorkingDb()
    const mleader = createSimpleLeader(db)

    const style = new AcDbMLeaderStyle()
    style.arrowheadId = '0'
    db.objects.mleaderStyle.setAt(style.objectId, style)
    mleader.mleaderStyleId = style.objectId

    const renderer = createRenderer()
    mleader.worldDraw(renderer as never)

    expect(renderer.lines).toHaveBeenCalledTimes(1)
    expect(renderer.area).toHaveBeenCalledTimes(1)
  })

  it('renders arrowhead from referenced block record handle', () => {
    const db = createWorkingDb()
    const mleader = createSimpleLeader(db)

    const arrowBlock = new AcDbBlockTableRecord()
    arrowBlock.name = 'ARROW_BLOCK'
    db.tables.blockTable.add(arrowBlock)
    mleader.arrowheadId = arrowBlock.objectId

    const renderer = createRenderer()
    const cacheResult = { kind: 'arrow-block' }
    const drawSpy = jest
      .spyOn(AcDbRenderingCache.instance, 'draw')
      .mockReturnValue(cacheResult as never)

    mleader.worldDraw(renderer as never)

    expect(drawSpy).toHaveBeenCalledTimes(1)
    expect(drawSpy.mock.calls[0][1]).toBe(arrowBlock)
    expect(renderer.lines).toHaveBeenCalledTimes(1)
    expect(renderer.area).not.toHaveBeenCalled()

    drawSpy.mockRestore()
  })

  it('trims leader line start when block arrow occupies the tip area', () => {
    const db = createWorkingDb()
    const mleader = createSimpleLeader(db)

    const arrowBlock = new AcDbBlockTableRecord()
    arrowBlock.name = 'TRIM_ARROW_BLOCK'
    arrowBlock.origin = new GeometryPoint2d(0, 0)
    arrowBlock.appendEntity(
      new AcDbLine(new GeometryPoint2d(-0.5, 0), new GeometryPoint2d(0.5, 0))
    )
    db.tables.blockTable.add(arrowBlock)
    mleader.arrowheadId = arrowBlock.objectId

    const renderer = createRenderer()
    const drawSpy = jest
      .spyOn(AcDbRenderingCache.instance, 'draw')
      .mockReturnValue({ kind: 'arrow-block' } as never)

    mleader.worldDraw(renderer as never)

    const linePoints = renderer.lines.mock.calls[0][0] as GeometryPoint2d[]
    expect(linePoints[0].x).toBeCloseTo(2)
    expect(linePoints[0].y).toBeCloseTo(0)
    expect(linePoints[1].x).toBeCloseTo(5)
    expect(drawSpy).toHaveBeenCalledTimes(1)

    drawSpy.mockRestore()
  })

  it('does not render arrows when arrowhead type resolves to _NONE', () => {
    const db = createWorkingDb()
    const mleader = createSimpleLeader(db)
    mleader.arrowheadId = '_NONE'

    const renderer = createRenderer()
    mleader.worldDraw(renderer as never)

    expect(renderer.lines).toHaveBeenCalledTimes(1)
    expect(renderer.area).not.toHaveBeenCalled()
  })

  it('prefers explicit entity text ACI color over style when override bit is clear', () => {
    const db = createWorkingDb()
    const mleader = createSimpleLeader(db)
    mleader.contents = 'yellow non-standard line'
    mleader.textLocation = new GeometryPoint2d(5, 2)
    mleader.contentType = AcDbMLeaderContentType.MTextContent

    // Real AutoCAD files (e.g. mleader-sytle.dxf) write ACI text color in
    // CONTEXT_DATA / common section while leaving the text-color override bit
    // unset in propertyOverrideFlag (0x44400).
    mleader.textColor = acdbDecodeMLeaderStyleRawColor(-1023410174) // ACI 2
    mleader.propertyOverrideFlag = 279552

    const style = new AcDbMLeaderStyle()
    style.textColor = new AcCmColor().setByBlock()
    db.objects.mleaderStyle.setAt(style.objectId, style)
    mleader.mleaderStyleId = style.objectId

    const renderer = createRenderer()
    let mtextRgb = -1
    renderer.mtext.mockImplementation(() => {
      mtextRgb = renderer.context.resolveSubEntityTraitsRgb(
        renderer.subEntityTraits as unknown as AcGiSubEntityTraits
      )
      return { kind: 'mtext' }
    })

    mleader.worldDraw(renderer as never)

    // ACI 2 = yellow
    expect(mtextRgb).toBe(0xffff00)
  })

  it('applies style leader/text color when entity raw color is unresolved ByBlock', () => {
    const db = createWorkingDb()
    const mleader = createSimpleLeader(db)
    mleader.contents = 'Color by style'
    mleader.textLocation = new GeometryPoint2d(5, 2)

    // Simulate DXF payload that writes entity raw color fields as ByBlock.
    mleader.leaderLineColor = new AcCmColor().setByBlock()
    mleader.textColor = new AcCmColor().setByBlock()

    const style = new AcDbMLeaderStyle()
    style.leaderLineColor = new AcCmColor(AcCmColorMethod.ByColor, 0xff0000)
    style.textColor = new AcCmColor(AcCmColorMethod.ByColor, 0x00aa00)
    db.objects.mleaderStyle.setAt(style.objectId, style)
    mleader.mleaderStyleId = style.objectId

    const renderer = createRenderer()
    const lineRgbLog: number[] = []
    let mtextRgb = -1
    renderer.lines.mockImplementation((points: unknown[]) => {
      lineRgbLog.push(
        renderer.context.resolveSubEntityTraitsRgb(
          renderer.subEntityTraits as unknown as AcGiSubEntityTraits
        )
      )
      return { kind: 'lines', points }
    })
    renderer.mtext.mockImplementation(() => {
      mtextRgb = renderer.context.resolveSubEntityTraitsRgb(
        renderer.subEntityTraits as unknown as AcGiSubEntityTraits
      )
      return { kind: 'mtext' }
    })

    mleader.worldDraw(renderer as never)

    expect(lineRgbLog[0]).toBe(0xff0000)
    expect(mtextRgb).toBe(0x00aa00)
  })

  it('forwards the delay flag to nested MText rendering', () => {
    const db = createWorkingDb()
    const mleader = createSimpleLeader(db)
    mleader.contents = 'Delayed text'
    mleader.textLocation = new GeometryPoint2d(5, 2)

    const renderer = createRenderer()
    mleader.worldDraw(renderer as never, true)

    expect(renderer.mtext).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Delayed text' }),
      expect.anything(),
      true
    )
  })

  it('applies style leader linetype id and lineweight to rendered leader line', () => {
    const db = createWorkingDb()
    const mleader = createSimpleLeader(db)

    const customLinetype = new AcDbLinetypeTableRecord({
      name: 'ML_TEST_DASHED',
      standardFlag: 0,
      description: 'test',
      totalPatternLength: 0.6,
      pattern: [
        { elementLength: 0.3, elementTypeFlag: 0 },
        { elementLength: -0.3, elementTypeFlag: 0 }
      ]
    })
    db.tables.linetypeTable.add(customLinetype)

    const style = new AcDbMLeaderStyle()
    style.leaderLineTypeId = customLinetype.objectId
    style.leaderLineWeight = AcGiLineWeight.LineWeight040
    db.objects.mleaderStyle.setAt(style.objectId, style)
    mleader.mleaderStyleId = style.objectId

    const renderer = createRenderer()
    let lineTypeName = ''
    let lineWeight: AcGiLineWeight | undefined
    renderer.lines.mockImplementation((points: unknown[]) => {
      lineTypeName = renderer.subEntityTraits.lineType.name
      lineWeight = renderer.subEntityTraits.lineWeight
      return { kind: 'lines', points }
    })

    mleader.worldDraw(renderer as never)

    expect(lineTypeName).toBe('ML_TEST_DASHED')
    expect(lineWeight).toBe(AcGiLineWeight.LineWeight040)
  })

  it('uses style dogleg settings when entity has no dogleg override', () => {
    const db = createWorkingDb()
    const mleader = new AcDbMLeader()
    const leaderIndex = mleader.addLeader({
      lastLeaderLinePoint: new GeometryPoint2d(5, 0),
      lastLeaderLinePointSet: true
    })
    mleader.addLeaderLine(leaderIndex, [
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(5, 0)
    ])
    db.tables.blockTable.modelSpace.appendEntity(mleader)

    const style = new AcDbMLeaderStyle()
    style.doglegEnabled = true
    style.doglegLength = 3
    db.objects.mleaderStyle.setAt(style.objectId, style)
    mleader.mleaderStyleId = style.objectId

    const renderer = createRenderer()
    mleader.worldDraw(renderer as never)

    expect(renderer.lines).toHaveBeenCalledTimes(2)
  })

  it('computes osnap points on leader lines and content insertion', () => {
    const mleader = new AcDbMLeader()
    mleader.contentBasePosition = new GeometryPoint2d(10, 5)
    const leaderIndex = mleader.addLeader({
      lastLeaderLinePoint: new GeometryPoint2d(5, 0),
      lastLeaderLinePointSet: true
    })
    mleader.addLeaderLine(leaderIndex, [
      new GeometryPoint2d(0, 0),
      new GeometryPoint2d(5, 0)
    ])

    const endPoints: GeometryPoint2d[] = []
    mleader.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new GeometryPoint2d(),
      new GeometryPoint2d(),
      endPoints
    )
    expect(endPoints.length).toBeGreaterThanOrEqual(2)

    const insertionSnaps: GeometryPoint2d[] = []
    mleader.subGetOsnapPoints(
      AcDbOsnapMode.Insertion,
      new GeometryPoint2d(),
      new GeometryPoint2d(),
      insertionSnaps
    )
    expect(insertionSnaps).toHaveLength(1)
    expect(insertionSnaps[0]).toMatchObject({ x: 10, y: 5 })

    const midPoints: GeometryPoint2d[] = []
    mleader.subGetOsnapPoints(
      AcDbOsnapMode.MidPoint,
      new GeometryPoint2d(2, 1),
      new GeometryPoint2d(),
      midPoints
    )
    expect(midPoints).toHaveLength(1)
    expect(midPoints[0]).toMatchObject({ x: 2.5, y: 0 })

    const nearestPoints: GeometryPoint2d[] = []
    mleader.subGetOsnapPoints(
      AcDbOsnapMode.Nearest,
      new GeometryPoint2d(2, 1),
      new GeometryPoint2d(),
      nearestPoints
    )
    expect(nearestPoints).toHaveLength(1)
    expect(nearestPoints[0]).toMatchObject({ x: 2, y: 0 })

    const perpendicularPoints: GeometryPoint2d[] = []
    mleader.subGetOsnapPoints(
      AcDbOsnapMode.Perpendicular,
      new GeometryPoint2d(2, 1),
      new GeometryPoint2d(),
      perpendicularPoints
    )
    expect(perpendicularPoints).toHaveLength(1)
    expect(perpendicularPoints[0]).toMatchObject({ x: 2, y: 0 })
  })
})

describe('AcDbMLeader geometricExtents', () => {
  it('returns geometricExtents and updates when leader vertices change', () => {
    const db = createWorkingDb()
    const mleader = createSimpleLeader(db)

    const before = mleader.geometricExtents
    expect(before.isEmpty()).toBe(false)
    expect(before.min.x).toBeCloseTo(0)
    expect(before.max.x).toBeCloseTo(5)

    mleader.addLeaderLine(0, [
      new GeometryPoint2d(5, 0),
      new GeometryPoint2d(5, 12)
    ])

    const after = mleader.geometricExtents
    expect(after.max.y).toBeCloseTo(12)
    expect(after.max.y).toBeGreaterThan(before.max.y)
  })
})

describe('AcDbMLeader dxfInFields CONTEXT_DATA', () => {
  it('passes width 0 for auto-sized MLeader text so CJK labels do not soft-wrap', () => {
    // Handle 1549: textWidth=0 with fullwidth "（配焊）". A fabricated wrap
    // column of length×height was narrower than TrueType advances and broke
    // the closing parenthesis onto the next line.
    const db = createWorkingDb()
    const mleader = createSimpleLeader(db)
    mleader.contentType = AcDbMLeaderContentType.MTextContent
    mleader.hasMText = true
    mleader.textHeight = 15.75
    mleader.textWidth = 0
    mleader.mtextContent = {
      text: '（配焊）',
      anchorPoint: new GeometryPoint2d(1342, 623)
    }

    const renderer = createRenderer()
    mleader.subWorldDraw(renderer as any, false)

    expect(renderer.mtext).toHaveBeenCalled()
    const mtextArg = (renderer.mtext as jest.Mock).mock.calls[0][0]
    expect(mtextArg.text).toBe('（配焊）')
    expect(mtextArg.width).toBe(0)
    expect(mtextArg.height).toBe(15.75)
  })

  it('extends dogleg landing to contentBasePosition even when doglegLength is undersized', () => {
    // Handle 1549: doglegLength≈2.7 but contentBase is ~70 units away under
    // "（配焊）". GstarCAD draws the full underline; length alone was too short.
    const db = createWorkingDb()
    const mleader = new AcDbMLeader()
    mleader.doglegEnabled = true
    mleader.doglegLength = 2.705
    mleader.contentBasePosition = new GeometryPoint2d(1275.419, 602.118)
    const leaderIndex = mleader.addLeader({
      lastLeaderLinePoint: new GeometryPoint2d(1345.537, 602.118),
      lastLeaderLinePointSet: true,
      doglegVector: new GeometryVector3d(-1, 0, 0),
      doglegVectorSet: true,
      doglegLength: 2.705
    })
    mleader.addLeaderLine(leaderIndex, [new GeometryPoint2d(1406.346, 663.239)])
    db.tables.blockTable.modelSpace.appendEntity(mleader)

    const renderer = createRenderer()
    const landingSegments: Array<{ x: number; y: number }[]> = []
    renderer.lines.mockImplementation((points: unknown[]) => {
      const pts = points as Array<{ x: number; y: number }>
      if (
        pts.length === 2 &&
        Math.abs(pts[0].y - pts[1].y) < 1e-6 &&
        Math.abs(pts[0].x - pts[1].x) > 10
      ) {
        landingSegments.push(pts)
      }
      return { kind: 'lines', points }
    })

    mleader.subWorldDraw(renderer as any, false)

    expect(landingSegments.length).toBeGreaterThanOrEqual(1)
    const landing = landingSegments[0]
    const span = Math.abs(landing[0].x - landing[1].x)
    expect(span).toBeCloseTo(70.118, 2)
  })

  it('keeps an explicit positive MLeader textWidth as the MTEXT wrap column', () => {
    const db = createWorkingDb()
    const mleader = createSimpleLeader(db)
    mleader.contentType = AcDbMLeaderContentType.MTextContent
    mleader.hasMText = true
    mleader.textHeight = 4
    mleader.textWidth = 40
    mleader.mtextContent = {
      text: 'wrapped label',
      anchorPoint: new GeometryPoint2d(0, 0)
    }

    const renderer = createRenderer()
    mleader.subWorldDraw(renderer as any, false)

    const mtextArg = (renderer.mtext as jest.Mock).mock.calls[0][0]
    expect(mtextArg.width).toBe(40)
  })
})
