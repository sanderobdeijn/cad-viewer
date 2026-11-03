import { acedShouldShowGrips } from '../src/editor/grip/AcEdGripPolicy'
import { AcEdOpenMode } from '../src/editor/view/AcEdOpenMode'

describe('acEdShouldShowGrips', () => {
  test('allows grips only in Write mode', () => {
    expect(acedShouldShowGrips(AcEdOpenMode.Write, false, 1, 100)).toBe(true)
    expect(acedShouldShowGrips(AcEdOpenMode.Read, false, 1, 100)).toBe(false)
  })

  test('blocks grips while command input is active', () => {
    expect(acedShouldShowGrips(AcEdOpenMode.Write, true, 1, 100)).toBe(false)
  })

  test('respects GRIPOBJLIMIT selection count', () => {
    expect(acedShouldShowGrips(AcEdOpenMode.Write, false, 2, 1)).toBe(false)
    expect(acedShouldShowGrips(AcEdOpenMode.Write, false, 1, 1)).toBe(true)
    expect(acedShouldShowGrips(AcEdOpenMode.Write, false, 101, 100)).toBe(false)
    expect(acedShouldShowGrips(AcEdOpenMode.Write, false, 100, 100)).toBe(true)
    expect(acedShouldShowGrips(AcEdOpenMode.Write, false, 1000, 0)).toBe(true)
  })
})
