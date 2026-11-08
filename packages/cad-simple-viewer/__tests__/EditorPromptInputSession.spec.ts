import { EditorPointHandler } from '../src/editor/input/handler/EditorPointHandler'
import { EditorPromptKeywordOptions } from '../src/editor/input/prompt/EditorPromptKeywordOptions'
import { EditorPromptPointOptions } from '../src/editor/input/prompt/EditorPromptPointOptions'
import { EditorPromptInputSession } from '../src/editor/input/session/EditorPromptInputSession'

describe('EditorPromptInputSession precedence', () => {
  const createCliStub = () =>
    ({
      clearInput: jest.fn(),
      setInputReadOnly: jest.fn(),
      renderKeywordPrompt: jest.fn(),
      focusInput: jest.fn(),
      clear: jest.fn()
    }) as any

  const createSession = (
    options: EditorPromptKeywordOptions,
    mode: 'geometric' | 'string' | 'keyword'
  ) => {
    const handler = new EditorPointHandler(new EditorPromptPointOptions('point'))
    const session = new EditorPromptInputSession(
      createCliStub(),
      options,
      text => {
        if (text === '50,30') return { x: 50, y: 30, z: 0 }
        return null
      },
      mode,
      false,
      true
    )
    const resolved: Array<{ kind: string; value?: unknown; keyword?: string }> =
      []
    ;(session as any).resolve = (value: unknown) => resolved.push(value as any)
    return { session, resolved }
  }

  test('geometric mode prefers coordinates over keywords', () => {
    const options = new EditorPromptKeywordOptions('pick')
    options.keywords.add('Close', 'Close', 'C')

    const { session, resolved } = createSession(options, 'geometric')
    const handled = session.handleEnter('50,30')

    expect(handled).toBe(true)
    expect(resolved[0]).toEqual({
      kind: 'value',
      value: { x: 50, y: 30, z: 0 }
    })
  })

  test('geometric mode resolves keyword when coordinate parse fails', () => {
    const options = new EditorPromptKeywordOptions('pick')
    options.keywords.add('Close', 'Close', 'C')

    const { session, resolved } = createSession(options, 'geometric')
    const handled = session.handleEnter('C')

    expect(handled).toBe(true)
    expect(resolved[0]).toEqual({ kind: 'keyword', keyword: 'Close' })
  })
})
