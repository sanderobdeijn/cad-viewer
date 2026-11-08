import { EditorDistanceHandler } from '../src/editor/input/handler/EditorDistanceHandler'
import { EditorPointHandler } from '../src/editor/input/handler/EditorPointHandler'
import { EditorPromptDistanceOptions } from '../src/editor/input/prompt/EditorPromptDistanceOptions'
import { EditorPromptPointOptions } from '../src/editor/input/prompt/EditorPromptPointOptions'

describe('EditorPointHandler.parseCommandLine', () => {
  const pointHandler = new EditorPointHandler(new EditorPromptPointOptions('point'))

  it('parses absolute cartesian coordinates', () => {
    expect(pointHandler.parseCommandLine('50,30')).toEqual({
      x: 50,
      y: 30
    })
  })

  it('parses relative cartesian coordinates', () => {
    expect(
      pointHandler.parseCommandLine('@10,5', {
        referencePoint: { x: 100, y: 200 }
      })
    ).toEqual({ x: 110, y: 205 })
  })

  it('parses absolute polar coordinates', () => {
    const point = pointHandler.parseCommandLine('10<90')
    expect(point?.x).toBeCloseTo(0, 5)
    expect(point?.y).toBeCloseTo(10, 5)
  })

  it('parses relative polar coordinates', () => {
    const point = pointHandler.parseCommandLine('@10<0', {
      referencePoint: { x: 5, y: 5 }
    })
    expect(point).toEqual({ x: 15, y: 5 })
  })

  it('parses rubber-band distance along cursor direction', () => {
    const point = pointHandler.parseCommandLine('10', {
      referencePoint: { x: 0, y: 0 },
      cursorPoint: { x: 0, y: 5 }
    })
    expect(point?.x).toBeCloseTo(0, 5)
    expect(point?.y).toBeCloseTo(10, 5)
  })

  it('returns null for ambiguous keyword-like point tokens', () => {
    expect(pointHandler.parseCommandLine('C')).toBeNull()
  })
})

describe('EditorDistanceHandler.parseCommandLine', () => {
  it('delegates numeric parsing to parse', () => {
    const handler = new EditorDistanceHandler(
      new EditorPromptDistanceOptions('distance')
    )
    expect(handler.parseCommandLine('12.5')).toBe(12.5)
  })
})
