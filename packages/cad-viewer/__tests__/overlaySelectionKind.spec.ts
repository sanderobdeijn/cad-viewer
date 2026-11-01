import { classifyOverlaySelection } from '../src/component/ribbon/overlaySelectionKind'

describe('classifyOverlaySelection', () => {
  it('returns measurement when only measurements are selected', () => {
    expect(
      classifyOverlaySelection({
        selectedGroups: [{ layer: 'measurement' }],
        measurementSelected: true
      })
    ).toBe('measurement')
  })

  it('returns mixed when drawing entities and measurements are selected together', () => {
    expect(
      classifyOverlaySelection({
        selectedGroups: [{ layer: 'measurement' }],
        cadEntityCount: 1,
        measurementSelected: true
      })
    ).toBe('mixed')
  })

  it('returns none when the selection is empty', () => {
    expect(classifyOverlaySelection({})).toBe('none')
  })
})
