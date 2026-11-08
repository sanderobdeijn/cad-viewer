/**
 * @jest-environment jsdom
 */
import type { EditorPromptBoxOptions } from '../src/editor/input/prompt/EditorPromptBoxOptions'
import { EditorPromptBoxResult } from '../src/editor/input/prompt/EditorPromptBoxResult'
import { EditorPromptStatus } from '../src/editor/input/prompt/EditorPromptStatus'
import {
  type EditorBoxPromptHost,
  EditorDesktopInteractionStrategy,
  editorInteractionStrategy,
  EditorMobileInteractionStrategy
} from '../src/editor/input/ui/EditorInteractionStrategy'
import { EditorViewMode } from '../src/editor/view/EditorViewMode'

describe('EditorDesktopInteractionStrategy', () => {
  const strategy = new EditorDesktopInteractionStrategy()

  it('allows idle touch box only in selection mode', () => {
    expect(strategy.canIdleTouchBox(EditorViewMode.SELECTION)).toBe(true)
    expect(strategy.canIdleTouchBox(EditorViewMode.PAN)).toBe(false)
  })

  it('uses desktop point-prompt chrome defaults', () => {
    expect(strategy.point.showsConfirmedPointMarks).toBe(false)
    expect(strategy.point.usesSessionChrome).toBe(false)
    expect(strategy.point.swallowsPromptContextMenu).toBe(false)
    expect(strategy.point.showsCursorDynamicInput).toBe(true)
    expect(strategy.point.showsSnapLoupeOnTouchPick).toBe(false)
  })

  it('acquires a box via two point prompts', async () => {
    const twoPoint = new EditorPromptBoxResult(EditorPromptStatus.OK)
    const host: EditorBoxPromptHost = {
      acquireTwoPointBox: jest.fn().mockResolvedValue(twoPoint),
      acquireHoldDragBox: jest.fn()
    }
    const options = {} as EditorPromptBoxOptions
    await expect(strategy.acquireBox(host, options)).resolves.toBe(twoPoint)
    expect(host.acquireTwoPointBox).toHaveBeenCalledWith(options)
    expect(host.acquireHoldDragBox).not.toHaveBeenCalled()
  })
})

describe('EditorMobileInteractionStrategy', () => {
  const strategy = new EditorMobileInteractionStrategy()

  it('allows idle touch box in selection and pan', () => {
    expect(strategy.canIdleTouchBox(EditorViewMode.SELECTION)).toBe(true)
    expect(strategy.canIdleTouchBox(EditorViewMode.PAN)).toBe(true)
  })

  it('uses mobile point-prompt chrome defaults', () => {
    expect(strategy.point.showsConfirmedPointMarks).toBe(true)
    expect(strategy.point.usesSessionChrome).toBe(true)
    expect(strategy.point.swallowsPromptContextMenu).toBe(true)
    expect(strategy.point.showsCursorDynamicInput).toBe(false)
    expect(strategy.point.showsSnapLoupeOnTouchPick).toBe(true)
  })

  it('acquires a box via hold-drag', async () => {
    const holdDrag = new EditorPromptBoxResult(EditorPromptStatus.OK)
    const host: EditorBoxPromptHost = {
      acquireTwoPointBox: jest.fn(),
      acquireHoldDragBox: jest.fn().mockResolvedValue(holdDrag)
    }
    const options = {} as EditorPromptBoxOptions
    await expect(strategy.acquireBox(host, options)).resolves.toBe(holdDrag)
    expect(host.acquireHoldDragBox).toHaveBeenCalledWith(options)
    expect(host.acquireTwoPointBox).not.toHaveBeenCalled()
  })
})

describe('editorInteractionStrategy', () => {
  it('returns a strategy instance', () => {
    const strategy = editorInteractionStrategy()
    expect(strategy.canIdleTouchBox).toEqual(expect.any(Function))
    expect(strategy.acquireBox).toEqual(expect.any(Function))
  })
})
