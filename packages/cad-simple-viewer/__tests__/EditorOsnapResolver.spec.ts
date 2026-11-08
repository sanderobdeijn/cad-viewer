import {
  GeometryCircularArc2d,
  GeometryEllipseArc2d,
  GeometryLine2d,
  GeometryPoint2d,
  GeometryPolyline2d,
  type GeometryShape,
  type ModelItem
} from '@mlightcad/geometry-engine'

import { ApplicationSettingManager } from '../src/app/ApplicationSettingManager'
import { EditorOsnapResolver } from '../src/editor/input/EditorOsnapResolver'
import { EditorBaseView } from '../src/editor/view/EditorBaseView'
import * as itemGeometry from '../src/model/ApplicationItemGeometry'
import { ApplicationOsnapMode, applicationOsnapModesToMask } from '../src/model/ApplicationOsnapMode'

function installLocalStorageMock() {
  const store = new Map<string, string>()
  const localStorageMock = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    }
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true
  })
}

/** Shapes the mock view can look up, by id. */
const items = new Map<string, ModelItem>()
const ids = new Map<GeometryShape, string>()

/** Runs `run` with an empty item store; `add` puts a shape in it. */
function withItems(run: (add: (shape: GeometryShape) => void) => void) {
  items.clear()
  ids.clear()
  run(shape => {
    const id = String(items.size + 1)
    items.set(id, { id, kind: 'shape', geometry: shape } as ModelItem)
    ids.set(shape, id)
  })
}

const idOf = (shape: GeometryShape) => ids.get(shape)!

const fullCircle = (center: GeometryPoint2d, radius: number) =>
  new GeometryCircularArc2d(center, radius, 0, Math.PI * 2, false)

function createMockView(
  pickResults: Array<{
    id: string
    minX?: number
    minY?: number
    maxX?: number
    maxY?: number
    children?: Array<{
      id: string
      minX?: number
      minY?: number
      maxX?: number
      maxY?: number
    }>
  }>
): EditorBaseView {
  return {
    pick: jest.fn().mockReturnValue(pickResults),
    itemLookup: (id: string) => items.get(id),
    // 1 CSS px == 1 WCS unit so threshold equals hitRadiusPx
    screenToWorld: jest.fn(({ x, y }: { x: number; y: number }) => ({
      x,
      y,
      z: 0
    }))
  } as unknown as EditorBaseView
}

describe('EditorOsnapResolver', () => {
  beforeEach(() => {
    installLocalStorageMock()
  })

  it('snaps to intersection of two crossing lines', () => {
    withItems(add => {
      const a = new GeometryLine2d(
        new GeometryPoint2d(0, 0),
        new GeometryPoint2d(10, 10)
      )
      const b = new GeometryLine2d(
        new GeometryPoint2d(0, 10),
        new GeometryPoint2d(10, 0)
      )
      add(a)
      add(b)

      ApplicationSettingManager.instance.osnapModes = applicationOsnapModesToMask([
        ApplicationOsnapMode.Intersection,
        ApplicationOsnapMode.EndPoint
      ])

      const view = createMockView([{ id: idOf(a) }, { id: idOf(b) }])
      const resolver = new EditorOsnapResolver(view)
      const snap = resolver.resolve({
        cursorWcs: { x: 5.1, y: 4.9 },
        hitRadiusPx: 20
      })

      expect(snap).toEqual({
        x: 5,
        y: 5,
        type: ApplicationOsnapMode.Intersection
      })
      expect(EditorOsnapResolver.osnapModeToMarkerType(snap!.type)).toBe(
        'intersection'
      )
    })
  })

  it('does not report intersection when only nearest is enabled', () => {
    withItems(add => {
      const a = new GeometryLine2d(
        new GeometryPoint2d(0, 0),
        new GeometryPoint2d(10, 10)
      )
      const b = new GeometryLine2d(
        new GeometryPoint2d(0, 10),
        new GeometryPoint2d(10, 0)
      )
      add(a)
      add(b)

      ApplicationSettingManager.instance.osnapModes = applicationOsnapModesToMask([
        ApplicationOsnapMode.Nearest
      ])

      const view = createMockView([{ id: idOf(a) }, { id: idOf(b) }])
      const resolver = new EditorOsnapResolver(view)
      const snap = resolver.resolve({
        cursorWcs: { x: 5.1, y: 4.9 },
        hitRadiusPx: 20
      })

      expect(snap?.type).not.toBe(ApplicationOsnapMode.Intersection)
      expect(snap?.type).toBe(ApplicationOsnapMode.Nearest)
    })
  })

  it('skips intersectWith for entity pairs whose extents do not overlap', () => {
    withItems(add => {
      const left = new GeometryLine2d(
        new GeometryPoint2d(0, 0),
        new GeometryPoint2d(10, 0)
      )
      const right = new GeometryLine2d(
        new GeometryPoint2d(100, 0),
        new GeometryPoint2d(110, 0)
      )
      add(left)
      add(right)

      ApplicationSettingManager.instance.osnapModes = applicationOsnapModesToMask([
        ApplicationOsnapMode.Intersection,
        ApplicationOsnapMode.EndPoint
      ])

      const intersectSpy = jest.spyOn(itemGeometry, 'intersectItems')
      const view = createMockView([{ id: idOf(left) }, { id: idOf(right) }])
      const resolver = new EditorOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: 5, y: 0 },
        hitRadiusPx: 20
      })

      expect(intersectSpy).not.toHaveBeenCalled()
      intersectSpy.mockRestore()
    })
  })

  it('prefers endpoint over coincident intersection at the same location', () => {
    withItems(add => {
      // T-junction: vertical line endpoint lies on horizontal line
      const horizontal = new GeometryLine2d(
        new GeometryPoint2d(0, 0),
        new GeometryPoint2d(10, 0)
      )
      const vertical = new GeometryLine2d(
        new GeometryPoint2d(5, 0),
        new GeometryPoint2d(5, 10)
      )
      add(horizontal)
      add(vertical)

      ApplicationSettingManager.instance.osnapModes = applicationOsnapModesToMask([
        ApplicationOsnapMode.EndPoint,
        ApplicationOsnapMode.Intersection
      ])

      const view = createMockView([
        { id: idOf(horizontal) },
        { id: idOf(vertical) }
      ])
      const resolver = new EditorOsnapResolver(view)
      const snap = resolver.resolve({
        cursorWcs: { x: 5.05, y: 0.05 },
        hitRadiusPx: 20
      })

      expect(snap?.type).toBe(ApplicationOsnapMode.EndPoint)
      expect(snap?.x).toBeCloseTo(5, 5)
      expect(snap?.y).toBeCloseTo(0, 5)
    })
  })

  it('acquires a center tick when hovering a large circle without snapping to the center', () => {
    withItems(add => {
      const circle = fullCircle(new GeometryPoint2d(0, 0), 100)
      add(circle)

      ApplicationSettingManager.instance.osnapModes = applicationOsnapModesToMask([
        ApplicationOsnapMode.Center
      ])

      const view = createMockView([{ id: idOf(circle) }])
      const resolver = new EditorOsnapResolver(view)
      const snap = resolver.resolve({
        cursorWcs: { x: 100, y: 0 },
        hitRadiusPx: 20
      })

      expect(snap).toBeUndefined()
      expect(resolver.acquiredCenterMarks).toHaveLength(1)
      expect(resolver.acquiredCenterMarks[0]?.x).toBeCloseTo(0, 5)
      expect(resolver.acquiredCenterMarks[0]?.y).toBeCloseTo(0, 5)
      expect(
        EditorOsnapResolver.displayCenterMarks(resolver.acquiredCenterMarks, snap)
      ).toHaveLength(1)
    })
  })

  it('snaps to an acquired circle center after the cursor moves onto the tick', () => {
    withItems(add => {
      const circle = fullCircle(new GeometryPoint2d(0, 0), 100)
      add(circle)

      ApplicationSettingManager.instance.osnapModes = applicationOsnapModesToMask([
        ApplicationOsnapMode.Center
      ])

      const view = createMockView([{ id: idOf(circle) }])
      const resolver = new EditorOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: 100, y: 0 },
        hitRadiusPx: 20
      })
      ;(view.pick as jest.Mock).mockReturnValue([])
      const snap = resolver.resolve({
        cursorWcs: { x: 1, y: 0 },
        hitRadiusPx: 20
      })

      expect(snap?.type).toBe(ApplicationOsnapMode.Center)
      expect(snap?.x).toBeCloseTo(0, 5)
      expect(snap?.y).toBeCloseTo(0, 5)
      expect(
        EditorOsnapResolver.displayCenterMarks(resolver.acquiredCenterMarks, snap)
      ).toHaveLength(0)
    })
  })

  it('keeps the acquired center tick after the cursor leaves the curve until the command ends', () => {
    withItems(add => {
      const circle = fullCircle(new GeometryPoint2d(0, 0), 100)
      add(circle)

      ApplicationSettingManager.instance.osnapModes = applicationOsnapModesToMask([
        ApplicationOsnapMode.Center
      ])

      const view = createMockView([{ id: idOf(circle) }])
      const resolver = new EditorOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: 100, y: 0 },
        hitRadiusPx: 20
      })
      ;(view.pick as jest.Mock).mockReturnValue([])
      const snap = resolver.resolve({
        cursorWcs: { x: 200, y: 0 },
        hitRadiusPx: 20
      })

      expect(snap).toBeUndefined()
      expect(resolver.acquiredCenterMarks).toHaveLength(1)

      const nearCenter = resolver.resolve({
        cursorWcs: { x: 1, y: 0 },
        hitRadiusPx: 20
      })
      expect(nearCenter?.type).toBe(ApplicationOsnapMode.Center)

      resolver.clearAcquiredCenters()
      expect(resolver.acquiredCenterMarks).toHaveLength(0)
    })
  })

  it('snaps to circle center immediately when the center is already within the aperture', () => {
    withItems(add => {
      const circle = fullCircle(new GeometryPoint2d(0, 0), 10)
      add(circle)

      ApplicationSettingManager.instance.osnapModes = applicationOsnapModesToMask([
        ApplicationOsnapMode.Center
      ])

      const view = createMockView([{ id: idOf(circle) }])
      const resolver = new EditorOsnapResolver(view)
      const snap = resolver.resolve({
        cursorWcs: { x: 10, y: 0 },
        hitRadiusPx: 20
      })

      expect(snap?.type).toBe(ApplicationOsnapMode.Center)
      expect(snap?.x).toBeCloseTo(0, 5)
      expect(snap?.y).toBeCloseTo(0, 5)
    })
  })

  it('acquires the arc center when hovering an arc', () => {
    withItems(add => {
      const arc = new GeometryCircularArc2d(
        new GeometryPoint2d(0, 0),
        50,
        0,
        Math.PI / 2,
        false
      )
      add(arc)

      ApplicationSettingManager.instance.osnapModes = applicationOsnapModesToMask([
        ApplicationOsnapMode.Center
      ])

      const view = createMockView([{ id: idOf(arc) }])
      const resolver = new EditorOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: 50, y: 0 },
        hitRadiusPx: 20
      })

      expect(resolver.acquiredCenterMarks).toHaveLength(1)
      expect(resolver.acquiredCenterMarks[0]?.x).toBeCloseTo(0, 5)
      expect(resolver.acquiredCenterMarks[0]?.y).toBeCloseTo(0, 5)
    })
  })

  it('acquires the ellipse center when hovering an ellipse', () => {
    withItems(add => {
      const ellipse = new GeometryEllipseArc2d(
        new GeometryPoint2d(2, 3),
        40,
        20,
        0,
        Math.PI * 2
      )
      add(ellipse)

      ApplicationSettingManager.instance.osnapModes = applicationOsnapModesToMask([
        ApplicationOsnapMode.Center
      ])

      const view = createMockView([{ id: idOf(ellipse) }])
      const resolver = new EditorOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: 42, y: 3 },
        hitRadiusPx: 20
      })

      expect(resolver.acquiredCenterMarks).toHaveLength(1)
      expect(resolver.acquiredCenterMarks[0]?.x).toBeCloseTo(2, 5)
      expect(resolver.acquiredCenterMarks[0]?.y).toBeCloseTo(3, 5)
    })
  })

  it('acquires the bulge-arc center when hovering a polyline arc segment', () => {
    withItems(add => {
      const polyline = new GeometryPolyline2d([
        { x: 0, y: 0, bulge: 1 },
        { x: 10, y: 0, bulge: 0 }
      ])
      add(polyline)

      const expected = new GeometryCircularArc2d(
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        1
      )

      ApplicationSettingManager.instance.osnapModes = applicationOsnapModesToMask([
        ApplicationOsnapMode.Center
      ])

      const view = createMockView([{ id: idOf(polyline) }])
      const resolver = new EditorOsnapResolver(view)
      resolver.resolve({
        cursorWcs: {
          x: expected.midPoint.x,
          y: expected.midPoint.y
        },
        hitRadiusPx: 20
      })

      expect(resolver.acquiredCenterMarks).toHaveLength(1)
      expect(resolver.acquiredCenterMarks[0]?.x).toBeCloseTo(
        expected.center.x,
        5
      )
      expect(resolver.acquiredCenterMarks[0]?.y).toBeCloseTo(
        expected.center.y,
        5
      )
    })
  })

  it('does not acquire a center tick when hovering a line', () => {
    withItems(add => {
      const line = new GeometryLine2d(
        new GeometryPoint2d(0, 0),
        new GeometryPoint2d(10, 0)
      )
      add(line)

      ApplicationSettingManager.instance.osnapModes = applicationOsnapModesToMask([
        ApplicationOsnapMode.Center,
        ApplicationOsnapMode.EndPoint
      ])

      const view = createMockView([{ id: idOf(line) }])
      const resolver = new EditorOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: 5, y: 0 },
        hitRadiusPx: 20
      })

      expect(resolver.acquiredCenterMarks).toHaveLength(0)
    })
  })

  it('accumulates center ticks from multiple hovered circles in one command', () => {
    withItems(add => {
      const a = fullCircle(new GeometryPoint2d(0, 0), 40)
      const b = fullCircle(new GeometryPoint2d(100, 0), 40)
      add(a)
      add(b)

      ApplicationSettingManager.instance.osnapModes = applicationOsnapModesToMask([
        ApplicationOsnapMode.Center
      ])

      const view = createMockView([{ id: idOf(a) }])
      const resolver = new EditorOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: 40, y: 0 },
        hitRadiusPx: 20
      })
      ;(view.pick as jest.Mock).mockReturnValue([{ id: idOf(b) }])
      resolver.resolve({
        cursorWcs: { x: 140, y: 0 },
        hitRadiusPx: 20
      })

      expect(resolver.acquiredCenterMarks).toHaveLength(2)
      expect(resolver.acquiredCenterMarks[0]?.x).toBeCloseTo(0, 5)
      expect(resolver.acquiredCenterMarks[1]?.x).toBeCloseTo(100, 5)
    })
  })
})
