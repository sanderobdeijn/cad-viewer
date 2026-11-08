import { editorShouldShowGrips } from '../src/editor/grip/EditorGripPolicy'
import { EditorOpenMode } from '../src/editor/view/EditorOpenMode'

describe('editorShouldShowGrips', () => {
  test('allows grips only in Write mode', () => {
    expect(editorShouldShowGrips(EditorOpenMode.Write, false, 1, 100)).toBe(true)
    expect(editorShouldShowGrips(EditorOpenMode.Read, false, 1, 100)).toBe(false)
  })

  test('blocks grips while command input is active', () => {
    expect(editorShouldShowGrips(EditorOpenMode.Write, true, 1, 100)).toBe(false)
  })

  test('respects GRIPOBJLIMIT selection count', () => {
    expect(editorShouldShowGrips(EditorOpenMode.Write, false, 2, 1)).toBe(false)
    expect(editorShouldShowGrips(EditorOpenMode.Write, false, 1, 1)).toBe(true)
    expect(editorShouldShowGrips(EditorOpenMode.Write, false, 101, 100)).toBe(false)
    expect(editorShouldShowGrips(EditorOpenMode.Write, false, 100, 100)).toBe(true)
    expect(editorShouldShowGrips(EditorOpenMode.Write, false, 1000, 0)).toBe(true)
  })
})
