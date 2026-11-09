import { editorIsDynamicInputEnabled } from '../src/editor/input/EditorDynamicInput'
import { useTestSettings } from './helpers/settings'

describe('editorIsDynamicInputEnabled', () => {
  it('follows DYNMODE', () => {
    useTestSettings({ dynamicInputMode: 3 })
    expect(editorIsDynamicInputEnabled()).toBe(true)

    useTestSettings({ dynamicInputMode: 0 })
    expect(editorIsDynamicInputEnabled()).toBe(false)
  })
})
