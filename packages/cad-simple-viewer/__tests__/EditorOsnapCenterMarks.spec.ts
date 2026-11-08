import {
  EDITOR_MAX_ACQUIRED_CENTER_MARKS,
  type EditorOsnapCenterMark,
  mergeAcquiredCenterMarks
} from '../src/editor/input/EditorOsnapCenterMarks'

function mark(x: number, y = 0): EditorOsnapCenterMark {
  return { x, y, z: 0 }
}

describe('mergeAcquiredCenterMarks', () => {
  it('returns the same array when nothing new is hovered', () => {
    const existing = [mark(1), mark(2)]
    expect(mergeAcquiredCenterMarks(existing, [])).toBe(existing)
  })

  it('keeps unique centers and ignores duplicates', () => {
    const existing = [mark(0)]
    const merged = mergeAcquiredCenterMarks(existing, [mark(0), mark(10)])
    expect(merged).toHaveLength(2)
    expect(merged[0]?.x).toBe(0)
    expect(merged[1]?.x).toBe(10)
  })

  it('caps acquired ticks so a fast sweep cannot grow without bound', () => {
    let marks: EditorOsnapCenterMark[] = []
    for (let i = 0; i < EDITOR_MAX_ACQUIRED_CENTER_MARKS + 8; i++) {
      marks = mergeAcquiredCenterMarks(marks, [mark(i * 100)])
    }
    expect(marks).toHaveLength(EDITOR_MAX_ACQUIRED_CENTER_MARKS)
    expect(marks[0]?.x).toBe(8 * 100)
    expect(marks[marks.length - 1]?.x).toBe(
      (EDITOR_MAX_ACQUIRED_CENTER_MARKS + 7) * 100
    )
  })
})
