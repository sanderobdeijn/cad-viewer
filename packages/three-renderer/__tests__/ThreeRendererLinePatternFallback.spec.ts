import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { ThreeRendererBatchedLine2 } from '../src/batch/ThreeRendererBatchedLine2'
import { ThreeRendererLine } from '../src/object/ThreeRendererLine'
import { ThreeRendererLineSegments } from '../src/object/ThreeRendererLineSegments'
import { ThreeRendererRenderContext } from '../src/renderer/ThreeRendererRenderContext'
import { ThreeRendererStyleManager } from '../src/style/ThreeRendererStyleManager'
import { ThreeRendererSubEntityTraitsUtil } from '../src/util'

/**
 * Builds traits whose linetype carries the given pattern
 * `[elementLength, elementTypeFlag]` pairs.
 */
function makePatternTraits(
  pattern: Array<[number, number?]>,
  lineTypeScale = 1
) {
  const traits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()
  traits.lineType = {
    ...traits.lineType,
    name: 'CUSTOM',
    pattern: pattern.map(([elementLength, elementTypeFlag = 0]) => ({
      elementLength,
      elementTypeFlag
    }))
  }
  traits.lineTypeScale = lineTypeScale
  return traits
}

function makeBrokenContext(): ThreeRendererRenderContext {
  const context = new ThreeRendererRenderContext()
  context.styleManager.options.linePatternShaderBroken = true
  return context
}

function getDistances(geometry: THREE.BufferGeometry, count?: number) {
  const start = geometry.getAttribute('instanceDistanceStart')
  const end = geometry.getAttribute('instanceDistanceEnd')
  const activeCount = count ?? start.count
  return {
    start,
    end,
    values: Array.from({ length: activeCount }, (_, i) => [
      start.getX(i),
      end.getX(i)
    ])
  }
}

function activeSegmentCount(geometry: THREE.BufferGeometry) {
  return (geometry as THREE.InstancedBufferGeometry).instanceCount
}

function segmentGeometry(sx: number, sy: number, ex: number, ey: number) {
  const geometry = new LineSegmentsGeometry()
  geometry.setPositions([sx, sy, 0, ex, ey, 0])
  return geometry
}

describe('dashed fallback material (broken linetype shader)', () => {
  it('aggregates dash and gap sizes from a scaled pattern', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.options.linePatternShaderBroken = true
    const material = styleManager.getLineMaterial(
      makePatternTraits([[100], [-50]], 2)
    ) as LineMaterial

    expect(material).toBeInstanceOf(LineMaterial)
    expect(material.dashed).toBe(true)
    expect(material.dashSize).toBe(200)
    expect(material.gapSize).toBe(100)
  })

  it('uses a fixed dash for pure dot patterns', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.options.linePatternShaderBroken = true
    const material = styleManager.getLineMaterial(
      makePatternTraits([[0], [-25]])
    ) as LineMaterial

    expect(material.dashed).toBe(true)
    expect(material.dashSize).toBe(0.5)
    expect(material.gapSize).toBe(25)
  })

  it('skips embedded text and keeps stray LibreDWG flags as gaps', () => {
    const styleManager = new ThreeRendererStyleManager()
    styleManager.options.linePatternShaderBroken = true

    const textTraits = makePatternTraits([[10], [-5]])
    textTraits.lineType.name = 'GAS'
    textTraits.lineType.pattern = [
      { elementLength: -30, elementTypeFlag: 2, text: 'GAS' },
      { elementLength: 10, elementTypeFlag: 0 },
      { elementLength: -5, elementTypeFlag: 0 }
    ]
    const textMaterial = styleManager.getLineMaterial(
      textTraits
    ) as LineMaterial
    expect(textMaterial.dashSize).toBe(10)
    expect(textMaterial.gapSize).toBe(5)

    const borderTraits = makePatternTraits([[1]])
    borderTraits.lineType.name = 'BORDER2'
    borderTraits.lineType.pattern = [
      { elementLength: 0.25, elementTypeFlag: 10, shapeNumber: 0, text: '' },
      { elementLength: -0.125, elementTypeFlag: 10, shapeNumber: 1, text: '' },
      { elementLength: 0, elementTypeFlag: 10, shapeNumber: 4, text: '' },
      { elementLength: -0.125, elementTypeFlag: 10, shapeNumber: 5, text: '' }
    ]
    const borderMaterial = styleManager.getLineMaterial(
      borderTraits
    ) as LineMaterial
    expect(borderMaterial.dashSize).toBeCloseTo(0.75)
    expect(borderMaterial.gapSize).toBeCloseTo(0.25)
  })

  it('keeps the custom shader material on healthy GPUs', () => {
    const styleManager = new ThreeRendererStyleManager()
    const material = styleManager.getLineMaterial(
      makePatternTraits([[100], [-50]])
    )

    expect(material).toBeInstanceOf(THREE.ShaderMaterial)
  })
})

describe('unbatched dashed fat lines', () => {
  it('computes cumulative instance distances on ThreeRendererLineSegments', () => {
    const array = new Float32Array([0, 0, 0, 10, 0, 0, 10, 10, 0])
    const entity = new ThreeRendererLineSegments(
      array,
      3,
      new Uint16Array([0, 1, 1, 2]),
      makePatternTraits([[12], [-6]]),
      makeBrokenContext()
    )

    const line = entity.children.find(
      child => child instanceof LineSegments2
    ) as LineSegments2 | undefined
    expect(line).toBeDefined()

    const { values } = getDistances(line!.geometry as THREE.BufferGeometry)
    expect(values).toEqual([
      [0, 10],
      [10, 20]
    ])
  })

  it('computes instance distances on ThreeRendererLine', () => {
    const entity = new ThreeRendererLine(
      [
        { x: 0, y: 0 },
        { x: 6, y: 8 }
      ],
      makePatternTraits([[12], [-6]]),
      makeBrokenContext()
    )

    const line = entity.children.find(
      child => child instanceof LineSegments2
    ) as LineSegments2 | undefined
    expect(line).toBeDefined()

    const { values } = getDistances(line!.geometry as THREE.BufferGeometry)
    expect(values).toEqual([[0, 10]])
  })

  it('skips distance attributes for solid fat lines', () => {
    const context = new ThreeRendererRenderContext()
    context.styleManager.showLineWeight = true
    const traits = ThreeRendererSubEntityTraitsUtil.createDefaultTraits()
    traits.lineWeight = 30
    const entity = new ThreeRendererLine(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 }
      ],
      traits,
      context
    )

    const line = entity.children.find(
      child => child instanceof LineSegments2
    ) as LineSegments2 | undefined
    expect(line).toBeDefined()
    expect(
      (line!.geometry as THREE.BufferGeometry).getAttribute(
        'instanceDistanceStart'
      )
    ).toBeUndefined()
  })
})

describe('ThreeRendererBatchedLine2 dash distances', () => {
  function dashedBatch(capacity: number) {
    return new ThreeRendererBatchedLine2(
      capacity,
      new LineMaterial({
        color: 0xffffff,
        dashed: true,
        dashSize: 5,
        gapSize: 5
      })
    )
  }

  it('restarts the dash phase on each appended entity', () => {
    const batch = dashedBatch(8)
    const polyline = new LineSegmentsGeometry()
    polyline.setPositions([0, 0, 0, 10, 0, 0, 10, 0, 0, 10, 5, 0])
    batch.addGeometry(polyline)
    batch.addGeometry(segmentGeometry(0, 0, 0, 4))

    const { values } = getDistances(
      batch.geometry as THREE.BufferGeometry,
      activeSegmentCount(batch.geometry)
    )
    expect(values).toEqual([
      [0, 10],
      [10, 15],
      [0, 4]
    ])
  })

  it('preserves per-entity phases across capacity growth', () => {
    const batch = dashedBatch(2)
    batch.addGeometry(segmentGeometry(0, 0, 10, 0))
    batch.addGeometry(segmentGeometry(0, 0, 0, 5))
    batch.addGeometry(segmentGeometry(0, 0, 1, 0))

    const { values } = getDistances(
      batch.geometry as THREE.BufferGeometry,
      activeSegmentCount(batch.geometry)
    )
    expect(values).toEqual([
      [0, 10],
      [0, 5],
      [0, 1]
    ])
  })

  it('does not shift later entities when one packed geometry is rewritten', () => {
    const batch = dashedBatch(8)
    batch.addGeometry(segmentGeometry(0, 0, 10, 0))
    batch.addGeometry(segmentGeometry(0, 0, 0, 5))
    batch.addGeometry(segmentGeometry(0, 0, 1, 0))

    batch.setGeometryAt(1, segmentGeometry(0, 0, 0, 2))

    const { values } = getDistances(
      batch.geometry as THREE.BufferGeometry,
      activeSegmentCount(batch.geometry)
    )
    expect(values).toEqual([
      [0, 10],
      [0, 2],
      [0, 1]
    ])
  })

  it('skips distance attributes for solid batches', () => {
    const batch = new ThreeRendererBatchedLine2(8, new LineMaterial({ color: 0xffffff }))
    batch.addGeometry(segmentGeometry(0, 0, 10, 0))

    expect(
      (batch.geometry as THREE.BufferGeometry).getAttribute(
        'instanceDistanceStart'
      )
    ).toBeUndefined()
  })
})
