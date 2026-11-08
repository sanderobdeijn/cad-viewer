jest.mock('../src/app', () => ({
  ApplicationDocManager: {
    instance: {
      sendStringToExecute: jest.fn(),
      lookupGlobalCmd: jest.fn(() => ({}))
    }
  }
}))

import { ApplicationDocManager } from '../src/app'
import { EditorViewKeyHandler } from '../src/view/EditorViewKeyHandler'
import type { ThreeRendererView2d } from '../src/view/ThreeRendererView2d'

function keyboardEvent(partial: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    code: 'KeyZ',
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    target: null,
    isComposing: false,
    keyCode: 0,
    preventDefault: jest.fn(),
    ...partial
  } as KeyboardEvent
}

function createMockView(
  isEditorActive = false,
  htmlSelection: {
    hasSelection?: boolean
    deleted?: boolean
    groups?: { id: string; layer: string }[]
  } = {}
): ThreeRendererView2d {
  return {
    editor: { isActive: isEditorActive },
    selectionSet: { clear: jest.fn() },
    htmlTransientManager: {
      hasSelection: jest.fn(() => htmlSelection.hasSelection ?? false),
      deleteSelected: jest.fn(() => htmlSelection.deleted ?? false),
      deselectAll: jest.fn(),
      getSelectedGroups: jest.fn(() => htmlSelection.groups ?? []),
      remove: jest.fn((id: string) => ({ id })),
      groupsOnLayer: jest.fn(() => []),
      has: jest.fn(() => false)
    },
    isDirty: false,
    isHtmlDirty: false
  } as unknown as ThreeRendererView2d
}

describe('EditorViewKeyHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('handleKeyDown leaves Ctrl+Z and Ctrl+Y to the browser', () => {
    const handler = new EditorViewKeyHandler(createMockView())
    const sendCommand = ApplicationDocManager.instance.sendStringToExecute as jest.Mock

    expect(
      handler.handleKeyDown(keyboardEvent({ code: 'KeyZ', ctrlKey: true }))
    ).toBe(false)
    expect(
      handler.handleKeyDown(keyboardEvent({ code: 'KeyY', ctrlKey: true }))
    ).toBe(false)
    expect(sendCommand).not.toHaveBeenCalled()
  })

  test('Delete removes a selected measurement overlay without dispatching erase', () => {
    const view = createMockView(false, {
      hasSelection: true,
      groups: [{ id: 'm1', layer: 'measurement' }]
    })
    const handler = new EditorViewKeyHandler(view)
    const sendCommand = ApplicationDocManager.instance.sendStringToExecute as jest.Mock
    const event = keyboardEvent({ code: 'Delete' })

    expect(handler.handleKeyDown(event)).toBe(true)
    expect(view.htmlTransientManager.remove).toHaveBeenCalledWith('m1')
    expect(view.htmlTransientManager.deleteSelected).not.toHaveBeenCalled()
    expect(sendCommand).not.toHaveBeenCalled()
    expect(event.preventDefault).toHaveBeenCalled()
  })

  test('Backspace removes a selected measurement overlay (macOS delete key)', () => {
    const view = createMockView(false, {
      hasSelection: true,
      groups: [{ id: 'm1', layer: 'measurement' }]
    })
    const handler = new EditorViewKeyHandler(view)
    const sendCommand = ApplicationDocManager.instance.sendStringToExecute as jest.Mock
    const event = keyboardEvent({ code: 'Backspace' })

    expect(handler.handleKeyDown(event)).toBe(true)
    expect(view.htmlTransientManager.remove).toHaveBeenCalledWith('m1')
    expect(view.htmlTransientManager.deleteSelected).not.toHaveBeenCalled()
    expect(sendCommand).not.toHaveBeenCalled()
    expect(event.preventDefault).toHaveBeenCalled()
  })

  test('Delete dispatches erase when no HTML overlay is selected', () => {
    const handler = new EditorViewKeyHandler(createMockView())
    const sendCommand = ApplicationDocManager.instance.sendStringToExecute as jest.Mock

    expect(handler.handleKeyDown(keyboardEvent({ code: 'Backspace' }))).toBe(
      false
    )
    expect(sendCommand).toHaveBeenCalledWith('erase')
  })

  test('Delete skips erase in read mode when no HTML overlay is selected', () => {
    const lookup = ApplicationDocManager.instance.lookupGlobalCmd as jest.Mock
    lookup.mockReturnValueOnce(undefined)
    const handler = new EditorViewKeyHandler(createMockView())
    const sendCommand = ApplicationDocManager.instance.sendStringToExecute as jest.Mock

    expect(handler.handleKeyDown(keyboardEvent({ code: 'Delete' }))).toBe(false)
    expect(lookup).toHaveBeenCalledWith('erase')
    expect(sendCommand).not.toHaveBeenCalled()
  })

  test('Delete still removes measurement overlay in read mode', () => {
    const lookup = ApplicationDocManager.instance.lookupGlobalCmd as jest.Mock
    lookup.mockReturnValue(undefined)
    const view = createMockView(false, {
      hasSelection: true,
      groups: [{ id: 'm1', layer: 'measurement' }]
    })
    const handler = new EditorViewKeyHandler(view)
    const sendCommand = ApplicationDocManager.instance.sendStringToExecute as jest.Mock
    const event = keyboardEvent({ code: 'Delete' })

    expect(handler.handleKeyDown(event)).toBe(true)
    expect(view.htmlTransientManager.remove).toHaveBeenCalledWith('m1')
    expect(sendCommand).not.toHaveBeenCalled()
    expect(lookup).not.toHaveBeenCalled()
    expect(event.preventDefault).toHaveBeenCalled()
  })
})
