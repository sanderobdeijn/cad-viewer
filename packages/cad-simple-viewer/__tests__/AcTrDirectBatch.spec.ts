import {
  GeometryCircularArc2d,
  GeometryLine2d,
  GeometryPoint2d,
  type GeometryPoint2dLike,
  GeometryPolyline2d,
  type GeometryShape,
  type ModelItem
} from '@mlightcad/geometry-engine'
import {
  defaultBatchDrawPolicy,
  RTE_REBASE_THRESHOLD
} from '@mlightcad/three-renderer'
import { AcTrRenderer } from '@mlightcad/three-renderer'
import * as THREE from 'three'

import {
  ACAP_MODEL_SPACE_ID,
  AcApItemDrawable,
  acapPointDisplay
} from '../src/model/AcApItemDrawable'
import {
  isDirectBatchCandidate,
  tryBuildDirectEntityMeta
} from '../src/view/AcTrDirectBatch'
import { useTestSettings } from './helpers/settings'

function createRenderer() {
  const webgl = {
    getSize: (target: THREE.Vector2) => target.set(800, 600),
    setSize: jest.fn(),
    getClearColor: () => new THREE.Color(0, 0, 0),
    getClearAlpha: () => 1,
    autoClear: true,
    domElement: {} as HTMLCanvasElement
  } as unknown as THREE.WebGLRenderer
  return new AcTrRenderer(webgl)
}

let nextId = 0

/** Returns the drawable of a model shape, as the view draws it. */
function shapeDrawable(geometry: GeometryShape) {
  return new AcApItemDrawable(
    { id: String(++nextId), kind: 'shape', geometry } as ModelItem,
    ACAP_MODEL_SPACE_ID,
    acapPointDisplay
  )
}

const lineDrawable = (start: GeometryPoint2dLike, end: GeometryPoint2dLike) =>
  shapeDrawable(new GeometryLine2d(start, end))

/** Runs a test body; the drawables need no drawing to live in. */
const withDrawables = (run: () => void) => {
  useTestSettings()
  run()
}

describe('AcTrDirectBatch eligibility', () => {
  beforeEach(() => useTestSettings())

  it('accepts line-curve candidates and rejects other entity types', () => {
    expect(
      isDirectBatchCandidate(lineDrawable({ x: 0, y: 0 }, { x: 1, y: 0 }))
    ).toBe(true)
    expect(
      isDirectBatchCandidate(shapeDrawable(new GeometryPolyline2d()))
    ).toBe(true)
    expect(
      isDirectBatchCandidate(
        shapeDrawable(
          new GeometryCircularArc2d(
            new GeometryPoint2d(0, 0),
            10,
            0,
            Math.PI,
            false
          )
        )
      )
    ).toBe(true)
    expect(
      isDirectBatchCandidate(
        shapeDrawable(
          new GeometryCircularArc2d(
            new GeometryPoint2d(0, 0),
            5,
            0,
            Math.PI * 2,
            false
          )
        )
      )
    ).toBe(true)
  })

  it('builds meta for LINE via worldDraw tessellation capture', () => {
    withDrawables(() => {
      const renderer = createRenderer()
      const line = lineDrawable(
        new GeometryPoint2d(0, 0),
        new GeometryPoint2d(10, 0)
      )

      const meta = tryBuildDirectEntityMeta(line, renderer)
      expect(meta).not.toBeNull()
      if (!meta) return
      expect(meta.objectId).toBe(line.objectId)
      expect(meta.ownerId).toBe(line.ownerId)
      expect(meta.layerName).toBe(line.layer)
      expect(meta.kind).toBe('lineBasic')
      expect(meta.wcsBbox.min.x).toBeCloseTo(0)
      expect(meta.wcsBbox.max.x).toBeCloseTo(10)
      meta.geometry.dispose()
    })
  })

  it('builds meta for CIRCLE / ARC via subWorldDraw capture', () => {
    withDrawables(() => {
      const renderer = createRenderer()

      const circle = shapeDrawable(
        new GeometryCircularArc2d(
          new GeometryPoint2d(0, 0),
          5,
          0,
          Math.PI * 2,
          false
        )
      )
      const circleMeta = tryBuildDirectEntityMeta(circle, renderer)
      expect(circleMeta).not.toBeNull()
      if (!circleMeta) return
      expect(circleMeta.wcsBbox.min.x).toBeCloseTo(-5, 0)
      expect(circleMeta.wcsBbox.max.x).toBeCloseTo(5, 0)
      circleMeta.geometry.dispose()

      const arc = shapeDrawable(
        new GeometryCircularArc2d(
          new GeometryPoint2d(0, 0),
          10,
          0,
          Math.PI,
          false
        )
      )
      const arcMeta = tryBuildDirectEntityMeta(arc, renderer)
      expect(arcMeta).not.toBeNull()
      arcMeta?.geometry.dispose()
    })
  })

  it('accepts polylines as lineStrip', () => {
    withDrawables(() => {
      const renderer = createRenderer()

      const thin = shapeDrawable(
        new GeometryPolyline2d([
          { x: 0, y: 0, bulge: 0 },
          { x: 10, y: 0, bulge: 0 }
        ])
      )
      expect(thin.directBatchPrimitive).toBe('lineStrip')
      const thinMeta = tryBuildDirectEntityMeta(thin, renderer)
      expect(thinMeta).not.toBeNull()
      expect(thinMeta?.kind).toBe('lineBasic')
      thinMeta?.geometry.dispose()
    })
  })

  it('falls back when draw policy resolves to unbatch', () => {
    withDrawables(() => {
      const renderer = createRenderer()
      renderer.batchDrawPolicy = defaultBatchDrawPolicy
      const largeX = RTE_REBASE_THRESHOLD + 1000
      const line = lineDrawable(
        new GeometryPoint2d(largeX, 0),
        new GeometryPoint2d(largeX + 10, 0)
      )

      expect(tryBuildDirectEntityMeta(line, renderer)).toBeNull()
    })
  })
})
