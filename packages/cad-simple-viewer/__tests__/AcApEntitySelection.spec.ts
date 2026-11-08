jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      editor: {
        getSelection: jest.fn()
      }
    }
  }
}))

jest.mock('../src/editor', () => ({
  AcEdPromptSelectionOptions: class {
    constructor(readonly message: string) {}
  },
  AcEdPromptStatus: { OK: 'OK', Cancel: 'Cancel' }
}))

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    sysCmdPrompt: (key: string) => key
  }
}))

import { AcApDocManager } from '../src/app'
import { AcEdPromptStatus } from '../src/editor'
import {
  resolveSelectedIds,
  resolveSelectedItems
} from '../src/service/AcApEntitySelection'

interface TestContextOptions {
  selectionIds?: string[]
  items?: Map<string, { id: string }>
}

const createContext = ({
  selectionIds = [],
  items = new Map()
}: TestContextOptions = {}) => {
  const clear = jest.fn()

  return {
    clear,
    context: {
      doc: {
        modelSync: {
          item: jest.fn((id: string) => items.get(id))
        }
      },
      view: {
        selectionSet: {
          count: selectionIds.length,
          ids: selectionIds,
          clear
        }
      }
    }
  }
}

describe('AcApEntitySelection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('resolveSelectedItems', () => {
    test('returns items from preselection without prompting', async () => {
      const line = { id: 'line' }
      const { clear, context } = createContext({
        selectionIds: ['line'],
        items: new Map([['line', line]])
      })

      const result = await resolveSelectedItems(context as never)

      expect(result).toEqual({ items: [line], ids: ['line'] })
      expect(AcApDocManager.instance.editor.getSelection).not.toHaveBeenCalled()
      expect(clear).not.toHaveBeenCalled()
    })

    test('prompts for selection when nothing is preselected', async () => {
      const line = { id: 'line' }
      const { context } = createContext({
        items: new Map([['line', line]])
      })
      const getSelection = jest.mocked(
        AcApDocManager.instance.editor.getSelection
      )
      getSelection.mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        value: { count: 1, ids: ['line'] } as never
      })

      const result = await resolveSelectedItems(context as never, {
        promptKey: 'move'
      })

      expect(getSelection).toHaveBeenCalledTimes(1)
      expect(getSelection.mock.calls[0][0].message).toBe('move')
      expect(result).toEqual({ items: [line], ids: ['line'] })
    })

    test('returns undefined when the selection prompt is cancelled', async () => {
      const { clear, context } = createContext()
      const getSelection = jest.mocked(
        AcApDocManager.instance.editor.getSelection
      )
      getSelection.mockResolvedValueOnce({
        status: AcEdPromptStatus.Cancel,
        value: undefined
      } as never)

      const result = await resolveSelectedItems(context as never, {
        promptKey: 'move'
      })

      expect(result).toBeUndefined()
      expect(clear).not.toHaveBeenCalled()
    })

    test('does not clear selection when clearOnEmpty is false', async () => {
      const { clear, context } = createContext({
        selectionIds: ['missing']
      })

      const result = await resolveSelectedItems(context as never, {
        clearOnEmpty: false
      })

      expect(result).toBeUndefined()
      expect(clear).not.toHaveBeenCalled()
    })

    test('clears selection when ids do not resolve to items by default', async () => {
      const { clear, context } = createContext({
        selectionIds: ['missing']
      })

      const result = await resolveSelectedItems(context as never)

      expect(result).toBeUndefined()
      expect(clear).toHaveBeenCalledTimes(1)
    })
  })

  describe('resolveSelectedIds', () => {
    test('returns ids from preselection without prompting', async () => {
      const { context } = createContext({
        selectionIds: ['line', 'arc']
      })

      const ids = await resolveSelectedIds(context as never, 'erase')

      expect(ids).toEqual(['line', 'arc'])
      expect(AcApDocManager.instance.editor.getSelection).not.toHaveBeenCalled()
    })

    test('prompts for selection when nothing is preselected', async () => {
      const { context } = createContext()
      const getSelection = jest.mocked(
        AcApDocManager.instance.editor.getSelection
      )
      getSelection.mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        value: { count: 1, ids: ['line'] } as never
      })

      const ids = await resolveSelectedIds(context as never, 'erase')

      expect(getSelection).toHaveBeenCalledTimes(1)
      expect(getSelection.mock.calls[0][0].message).toBe('erase')
      expect(ids).toEqual(['line'])
    })

    test('returns undefined when the selection prompt is cancelled', async () => {
      const { context } = createContext()
      const getSelection = jest.mocked(
        AcApDocManager.instance.editor.getSelection
      )
      getSelection.mockResolvedValueOnce({
        status: AcEdPromptStatus.Cancel,
        value: undefined
      } as never)

      const ids = await resolveSelectedIds(context as never, 'erase')

      expect(ids).toBeUndefined()
    })
  })
})
