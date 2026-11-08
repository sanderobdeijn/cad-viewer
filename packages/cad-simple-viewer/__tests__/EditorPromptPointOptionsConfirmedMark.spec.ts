import { EditorPromptPointOptions } from '../src/editor/input/prompt/EditorPromptPointOptions'

describe('EditorPromptPointOptions.showConfirmedPointMark', () => {
  it('defaults to undefined so the input manager can apply phone/pad auto behavior', () => {
    const options = new EditorPromptPointOptions('Specify point')
    expect(options.showConfirmedPointMark).toBeUndefined()
  })

  it('allows an explicit override', () => {
    const options = new EditorPromptPointOptions('Specify point')
    options.showConfirmedPointMark = true
    expect(options.showConfirmedPointMark).toBe(true)
    options.showConfirmedPointMark = false
    expect(options.showConfirmedPointMark).toBe(false)
    options.showConfirmedPointMark = undefined
    expect(options.showConfirmedPointMark).toBeUndefined()
  })
})
