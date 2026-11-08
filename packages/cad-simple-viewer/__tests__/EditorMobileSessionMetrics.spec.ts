/** @jest-environment jsdom */

import { editorComputeSessionMetrics } from '../src/editor/input/ui/EditorMobileSessionMetrics'

describe('editorComputeSessionMetrics', () => {
  it('returns absolute X/Y when no base point is given', () => {
    expect(editorComputeSessionMetrics({ x: 10, y: 20 })).toEqual({
      hasBasePoint: false,
      length: 0,
      angleDeg: 0,
      dx: 0,
      dy: 0,
      x: 10,
      y: 20
    })
  })

  it('computes length, angle, and deltas from a base point', () => {
    const metrics = editorComputeSessionMetrics(
      { x: 40, y: 30 },
      { x: 10, y: 30 }
    )
    expect(metrics.hasBasePoint).toBe(true)
    expect(metrics.dx).toBe(30)
    expect(metrics.dy).toBe(0)
    expect(metrics.length).toBe(30)
    expect(metrics.angleDeg).toBe(0)
    expect(metrics.x).toBe(40)
    expect(metrics.y).toBe(30)
  })

  it('normalizes negative atan2 angles into 0–360', () => {
    const metrics = editorComputeSessionMetrics({ x: 10, y: 0 }, { x: 10, y: 10 })
    expect(metrics.dy).toBe(-10)
    expect(metrics.angleDeg).toBe(270)
  })
})
