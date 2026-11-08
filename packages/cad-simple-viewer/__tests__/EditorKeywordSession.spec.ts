import { EditorPromptKeywordOptions } from '../src/editor/input/prompt/EditorPromptKeywordOptions'
import { EditorKeywordSession } from '../src/editor/input/session/EditorKeywordSession'

describe('KeywordSession Enter behavior', () => {
  const createCliStub = () =>
    ({
      clearInput: jest.fn(),
      setInputReadOnly: jest.fn(),
      renderKeywordPrompt: jest.fn(),
      focusInput: jest.fn(),
      clear: jest.fn()
    }) as any

  const createSession = (options: EditorPromptKeywordOptions) => {
    const session = new EditorKeywordSession(createCliStub(), options, true)
    const resolved: string[] = []
    ;(session as any).resolve = (value: string) => resolved.push(value)
    return { session, resolved }
  }

  test('Enter with default keyword returns default keyword', () => {
    const options = new EditorPromptKeywordOptions('pick')
    const kw = options.keywords.add('First', 'First', 'First')
    options.keywords.default = kw
    options.allowNone = false

    const { session, resolved } = createSession(options)
    const handled = session.handleEnter('')

    expect(handled).toBe(true)
    expect(resolved).toEqual(['First'])
  })

  test('Enter with no default and allowNone=true returns none token', () => {
    const options = new EditorPromptKeywordOptions('pick')
    options.keywords.add('First', 'First', 'First')
    options.allowNone = true

    const { session, resolved } = createSession(options)
    const handled = session.handleEnter('')

    expect(handled).toBe(true)
    expect(resolved).toEqual([''])
  })

  test('Enter with default keyword takes precedence over allowNone', () => {
    const options = new EditorPromptKeywordOptions(
      'export invisible layers <Yes>'
    )
    const yes = options.keywords.add('Yes(Y)', 'Yes', 'Yes')
    options.keywords.add('No(N)', 'No', 'No')
    options.keywords.default = yes
    options.allowNone = true

    const { session, resolved } = createSession(options)
    const handled = session.handleEnter('')

    expect(handled).toBe(true)
    expect(resolved).toEqual(['Yes'])
  })
})
