jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      editor: {}
    }
  }
}))

jest.mock('../src/editor', () => {
  class AcEdCommand {
    mode: unknown
  }

  class AcEdPreviewJig {
    constructor(_view: unknown) {}
  }

  class MockKeywordCollection {
    add(display: string, global: string, local: string) {
      return { display, global, local }
    }
  }

  class AcEdPromptPointOptions {
    keywords = new MockKeywordCollection()
    constructor(readonly message: string) {}
  }

  class AcEdPromptDistanceOptions {
    constructor(readonly message: string) {}
  }

  class AcEdPromptKeywordOptions {
    keywords = new MockKeywordCollection()
    constructor(readonly message: string) {}
  }

  return {
    AcEdCommand,
    AcEdOpenMode: { Write: 8 },
    AcEdPreviewJig,
    AcEdPromptDistanceOptions,
    AcEdPromptKeywordOptions,
    AcEdPromptPointOptions,
    AcEdPromptStatus: {
      OK: 'OK',
      Keyword: 'Keyword',
      Cancel: 'Cancel',
      None: 'None'
    }
  }
})

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    t: (key: string) => key
  }
}))

import { AcDbPolyline, GeometryPoint2d } from '@mlightcad/data-model'

import {
  accumulateSketchPoint,
  simplifySketchPoints
} from '../src/command/draw/AcApSketchCmd'

describe('AcApSketchCmd helpers', () => {
  test('accumulateSketchPoint ignores moves shorter than the increment', () => {
    const points = [new GeometryPoint2d(0, 0)]
    expect(accumulateSketchPoint(points, { x: 0.05, y: 0 }, 0.1)).toBe(false)
    expect(points).toHaveLength(1)
    expect(accumulateSketchPoint(points, { x: 0.2, y: 0 }, 0.1)).toBe(true)
    expect(points).toHaveLength(2)
  })

  test('simplifySketchPoints keeps first, last, and tolerance-spaced points', () => {
    const simplified = simplifySketchPoints(
      [
        { x: 0, y: 0 },
        { x: 0.1, y: 0 },
        { x: 1, y: 0 },
        { x: 1.05, y: 0 },
        { x: 2, y: 0 }
      ],
      0.5
    )
    expect(simplified.map(p => [p.x, p.y])).toEqual([
      [0, 0],
      [1, 0],
      [2, 0]
    ])
  })
})
