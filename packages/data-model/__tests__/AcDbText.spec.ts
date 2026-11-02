import {
  GeometryBox3d,
  GeometryMatrix3d,
  GeometryPoint2d,
  GeometryVector3d
} from '@mlightcad/geometry-engine'

import { acdbHostApplicationServices } from '../src/base'
import { AcDbDatabase } from '../src/database'
import { AcDbOsnapMode } from '../src/misc'
import {
  AcDbText,
  AcDbTextHorizontalMode,
  AcDbTextVerticalMode
} from '../src/entity'
import { expectDetachedClone } from '../test-utils/cloneTestUtils'

describe('AcDbText', () => {
  it('creates a detached clone with a new objectId', () => {
    expectDetachedClone(() => new AcDbText())
  })
  it('provides default values and dxf type', () => {
    const text = new AcDbText()

    expect(AcDbText.typeName).toBe('Text')
    expect(text.dxfTypeName).toBe('TEXT')
    expect(text.textString).toBe('')
    expect(text.thickness).toBe(1)
    expect(text.height).toBe(0)
    expect(text.position).toMatchObject({ x: 0, y: 0 })
    expect(text.rotation).toBe(0)
    expect(text.oblique).toBe(0)
    expect(text.horizontalMode).toBe(AcDbTextHorizontalMode.LEFT)
    expect(text.verticalMode).toBe(AcDbTextVerticalMode.MIDDLE)
    expect(text.styleName).toBe('')
    expect(text.widthFactor).toBe(1)
  })

  it('supports all property getters and setters', () => {
    const text = new AcDbText()
    const sourcePos = new GeometryPoint2d(1, 2)
    text.textString = 'Hello'
    text.thickness = 2
    text.height = 3.5
    text.position = sourcePos
    text.rotation = Math.PI / 6
    text.oblique = Math.PI / 12
    text.horizontalMode = AcDbTextHorizontalMode.CENTER
    text.verticalMode = AcDbTextVerticalMode.TOP
    text.styleName = 'Standard'
    text.widthFactor = 0.8

    sourcePos.x = 99

    expect(text.textString).toBe('Hello')
    expect(text.thickness).toBe(2)
    expect(text.height).toBe(3.5)
    expect(text.position).toMatchObject({ x: 1, y: 2 })
    expect(text.rotation).toBeCloseTo(Math.PI / 6, 8)
    expect(text.oblique).toBeCloseTo(Math.PI / 12, 8)
    expect(text.horizontalMode).toBe(AcDbTextHorizontalMode.CENTER)
    expect(text.verticalMode).toBe(AcDbTextVerticalMode.TOP)
    expect(text.styleName).toBe('Standard')
    expect(text.widthFactor).toBe(0.8)
  })

  it('returns an GeometryBox3d from geometricExtents', () => {
    const text = new AcDbText()

    expect(text.geometricExtents).toBeInstanceOf(GeometryBox3d)
  })

  it('returns geometricExtents and recomputes when position changes', () => {
    const text = new AcDbText()
    text.textString = 'AB'
    text.height = 2
    text.verticalMode = AcDbTextVerticalMode.BASELINE
    text.position = new GeometryPoint2d(10, 20)

    expect(text.geometricExtents.min).toMatchObject({ x: 10, y: 20 })
    expect(text.geometricExtents.max.x).toBeCloseTo(14)
    expect(text.geometricExtents.max.y).toBeCloseTo(22)

    text.position = new GeometryPoint2d(0, 0)

    expect(text.geometricExtents.min).toMatchObject({ x: 0, y: 0 })
    expect(text.geometricExtents.max.x).toBeCloseTo(4)
    expect(text.geometricExtents.max.y).toBeCloseTo(2)
  })

  it('uses baseline-left extents when center alignment lacks alignment point', () => {
    const text = new AcDbText()
    text.textString = 'AB'
    text.height = 2
    text.horizontalMode = AcDbTextHorizontalMode.CENTER
    text.verticalMode = AcDbTextVerticalMode.BASELINE
    text.position = new GeometryPoint2d(10, 20)

    expect(text.geometricExtents.min).toMatchObject({ x: 10, y: 20 })
    expect(text.geometricExtents.max.x).toBeCloseTo(14)
    expect(text.geometricExtents.max.y).toBeCloseTo(22)
  })

  it('treats an API-set alignment point as provided even when equal to position', () => {
    const text = new AcDbText()
    text.position = new GeometryPoint2d(10, 20)
    expect(text.hasAlignmentPoint).toBe(false)

    text.alignmentPoint = new GeometryPoint2d(10, 20)
    expect(text.hasAlignmentPoint).toBe(true)
  })

  it('returns insertion osnap point only for insertion mode', () => {
    const text = new AcDbText()
    text.position = new GeometryPoint2d(3, 4)
    const snapPoints: GeometryPoint2d[] = []

    text.subGetOsnapPoints(
      AcDbOsnapMode.EndPoint,
      new GeometryPoint2d(),
      new GeometryPoint2d(),
      snapPoints
    )
    expect(snapPoints).toHaveLength(0)

    text.subGetOsnapPoints(
      AcDbOsnapMode.Insertion,
      new GeometryPoint2d(),
      new GeometryPoint2d(),
      snapPoints
    )
    expect(snapPoints).toHaveLength(1)
    expect(snapPoints[0]).toMatchObject({ x: 3, y: 4 })
  })

  it('returns insertion point as grip point', () => {
    const text = new AcDbText()
    text.position = new GeometryPoint2d(3, 4)
    const grips = text.subGetGripPoints()
    expect(grips).toHaveLength(1)
    expect(grips[0]).toMatchObject({
      x: text.position.x,
      y: text.position.y
    })
  })

  it('transforms text with normal scale and rotation updates', () => {
    const text = new AcDbText()
    text.position = new GeometryPoint2d(1, 0)
    text.rotation = 0
    text.height = 2
    text.widthFactor = 1
    text.thickness = 4

    const result = text.transformBy(
      new GeometryMatrix3d()
        .makeRotationZ(Math.PI / 2)
        .multiply(new GeometryMatrix3d().makeScale(2, 3, 5))
    )

    expect(result).toBe(text)
    expect(text.position.x).toBeCloseTo(0, 8)
    expect(text.position.y).toBeCloseTo(2, 8)
    expect(text.rotation).toBeCloseTo(Math.PI / 2, 8)
    expect(text.height).toBeCloseTo(6, 8)
    expect(text.widthFactor).toBeCloseTo(2 / 3, 8)
  })

  it('moves alignment point together with position via transformBy', () => {
    const text = new AcDbText()
    text.horizontalMode = AcDbTextHorizontalMode.CENTER
    text.verticalMode = AcDbTextVerticalMode.TOP
    text.position = new GeometryPoint2d(417.4074308462113, 141.1597540414588)
    text.alignmentPoint = new GeometryPoint2d(
      437.6794664300651,
      156.1597540414587
    )
    const alignmentBefore = text.alignmentPoint.clone()

    text.transformBy(new GeometryMatrix3d().makeTranslation(10, 20, 0))

    expect(text.position.x).toBeCloseTo(427.4074308462113, 6)
    expect(text.position.y).toBeCloseTo(161.1597540414588, 6)
    expect(text.alignmentPoint.x).toBeCloseTo(alignmentBefore.x + 10, 6)
    expect(text.alignmentPoint.y).toBeCloseTo(alignmentBefore.y + 20, 6)
  })

  it('moves alignment point together with position via subMoveGripPointsAt', () => {
    const text = new AcDbText()
    text.horizontalMode = AcDbTextHorizontalMode.CENTER
    text.verticalMode = AcDbTextVerticalMode.TOP
    text.position = new GeometryPoint2d(417.4074308462113, 141.1597540414588)
    text.alignmentPoint = new GeometryPoint2d(
      437.6794664300651,
      156.1597540414587
    )
    const alignmentBefore = text.alignmentPoint.clone()

    text.subMoveGripPointsAt([0], new GeometryVector3d(5, -3, 0))

    expect(text.position.x).toBeCloseTo(422.4074308462113, 6)
    expect(text.position.y).toBeCloseTo(138.1597540414588, 6)
    expect(text.alignmentPoint.x).toBeCloseTo(alignmentBefore.x + 5, 6)
    expect(text.alignmentPoint.y).toBeCloseTo(alignmentBefore.y - 3, 6)
  })

  it('keeps rotation and thickness when corresponding transformed axes collapse', () => {
    const text = new AcDbText()
    text.position = new GeometryPoint2d(1, 2)
    text.rotation = 0
    text.height = 5
    text.widthFactor = 0.5
    text.thickness = 7

    text.transformBy(new GeometryMatrix3d().makeScale(0, 2, 0))

    expect(text.rotation).toBeCloseTo(0, 8)
    expect(text.height).toBeCloseTo(10, 8)
    expect(text.widthFactor).toBeCloseTo(0.5, 8)
    expect(text.thickness).toBeCloseTo(7, 8)
  })

  it('exposes mutable runtime properties', () => {
    const text = new AcDbText()
    const props = text.properties

    expect(props.type).toBe(text.type)
    const textGroup = props.groups.find(group => group.groupName === 'text')
    const geometryGroup = props.groups.find(
      group => group.groupName === 'geometry'
    )
    expect(textGroup).toBeDefined()
    expect(geometryGroup).toBeDefined()

    const byName = Object.fromEntries(
      [
        ...(textGroup?.properties ?? []),
        ...(geometryGroup?.properties ?? [])
      ].map(p => [p.name, p])
    )

    byName.contents.accessor.set?.('A')
    byName.styleName.accessor.set?.('Standard')
    byName.textHeight.accessor.set?.(9)
    byName.rotation.accessor.set?.(1.25)
    byName.widthFactor.accessor.set?.(0.7)
    byName.oblique.accessor.set?.(0.2)
    byName.positionX.accessor.set?.(10)
    byName.positionY.accessor.set?.(20)

    expect(byName.contents.accessor.get()).toBe('A')
    expect(byName.styleName.accessor.get()).toBe('Standard')
    expect(byName.textHeight.accessor.get()).toBe(9)
    expect(byName.rotation.accessor.get()).toBe(1.25)
    expect(byName.widthFactor.accessor.get()).toBe(0.7)
    expect(byName.oblique.accessor.get()).toBe(0.2)
    expect(byName.positionX.accessor.get()).toBe(10)
    expect(byName.positionY.accessor.get()).toBe(20)
    expect(text.position).toMatchObject({ x: 10, y: 20 })
  })

  it('renders by forwarding MText data and resolved text style', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    acdbHostApplicationServices().workingDatabase = db
    const text = new AcDbText()
    text.database = db
    text.textString = 'render'
    text.height = 2.2
    text.widthFactor = 0.6
    text.position = new GeometryPoint2d(7, 8)
    text.rotation = 1.2
    text.styleName = 'NotExists'

    const giEntity = { objectId: 'R' }
    const renderer = {
      mtext: jest.fn(() => giEntity)
    } as unknown as {
      mtext: jest.Mock
    }

    const result = text.subWorldDraw(renderer as never, true)

    expect(result).toBe(giEntity)
    expect(renderer.mtext).toHaveBeenCalledTimes(1)
    const [mtextData, textStyle, delay] = renderer.mtext.mock.calls[0]
    expect(mtextData).toMatchObject({
      text: 'render',
      height: 2.2,
      width: Infinity,
      widthFactor: 0.6,
      position: text.position,
      rotation: 1.2
    })
    expect(textStyle).toBeDefined()
    expect(delay).toBe(true)
  })

  it('creates a default text style when subWorldDraw runs against an empty table', () => {
    const text = new AcDbText()
    text.database = new AcDbDatabase()
    text.textString = 'fallback'
    const renderer = {
      mtext: jest.fn(() => ({}))
    } as unknown as {
      mtext: jest.Mock
    }

    expect(() => text.subWorldDraw(renderer as never)).not.toThrow()
    expect(renderer.mtext).toHaveBeenCalled()
    expect(text.database.tables.textStyleTable.getAt('Standard')).toBeDefined()
  })
})
