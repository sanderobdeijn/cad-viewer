/**
 * @jest-environment jsdom
 */
import { editorLoupeLocalFromCanvasDelta } from '../src/editor/input/ui/EditorSnapLoupeMath'
import {
  EDITOR_TOUCH_MOUSE_GUARD_MS,
  editorArmTouchMouseGuard,
  editorClearFollowingClickSink,
  editorIsGhostClientOrigin,
  editorIsTouchDerivedMouseEvent,
  editorIsTouchLongPressContextMenu,
  editorResetTouchMouseGuard,
  editorShouldIgnoreCompatMouse,
  editorSinkFollowingClick,
  EditorTouchPointSession
} from '../src/editor/input/ui/EditorTouchPointSession'

describe('EditorTouchPointSession', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('commits a short tap without opening the loupe', () => {
    const onLongPress = jest.fn()
    const session = new EditorTouchPointSession()
    session.start(1, 10, 20, onLongPress, 350)
    expect(session.phase).toBe('pending')
    expect(session.end()).toBe('commit')
    expect(onLongPress).not.toHaveBeenCalled()
    expect(session.phase).toBe('idle')
  })

  it('opens the loupe after the long-press delay and commits on end', () => {
    const onLongPress = jest.fn()
    const session = new EditorTouchPointSession()
    session.start(1, 10, 20, onLongPress, 350)
    jest.advanceTimersByTime(350)
    expect(onLongPress).toHaveBeenCalledTimes(1)
    expect(session.phase).toBe('loupe')
    expect(session.end()).toBe('commit')
  })

  it('uses half a second as the default long-press delay', () => {
    const onLongPress = jest.fn()
    const session = new EditorTouchPointSession()
    session.start(1, 10, 20, onLongPress)
    jest.advanceTimersByTime(499)
    expect(onLongPress).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('cancels to pan when moved before the timer', () => {
    const onLongPress = jest.fn()
    const session = new EditorTouchPointSession()
    session.start(1, 0, 0, onLongPress, 350)
    expect(session.move(20, 0, true)).toBe('panning')
    expect(session.phase).toBe('panning')
    jest.advanceTimersByTime(350)
    expect(onLongPress).not.toHaveBeenCalled()
    expect(session.end()).toBe('ignore')
  })

  it('does not cancel to pan when cancelOnMove is false', () => {
    const session = new EditorTouchPointSession()
    session.start(1, 0, 0, () => undefined, 350)
    expect(session.move(40, 0, false)).toBe('continue')
    expect(session.phase).toBe('pending')
  })
})

describe('editorSinkFollowingClick', () => {
  afterEach(() => {
    editorResetTouchMouseGuard()
    jest.useRealTimers()
  })

  it('stops the next click so a new point prompt is not auto-committed', () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    const later = jest.fn()
    target.addEventListener('click', later)
    editorSinkFollowingClick()
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(later).not.toHaveBeenCalled()
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(later).toHaveBeenCalledTimes(1)
    target.remove()
  })

  it('can be cleared so a later mouse click is not eaten', () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    const later = jest.fn()
    target.addEventListener('click', later)
    editorSinkFollowingClick()
    editorClearFollowingClickSink()
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(later).toHaveBeenCalledTimes(1)
    target.remove()
  })

  it('expires so a later mouse click is not eaten if no leftover click arrives', () => {
    jest.useFakeTimers()
    const target = document.createElement('div')
    document.body.appendChild(target)
    const later = jest.fn()
    target.addEventListener('click', later)
    editorSinkFollowingClick()
    jest.advanceTimersByTime(EDITOR_TOUCH_MOUSE_GUARD_MS)
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(later).toHaveBeenCalledTimes(1)
    target.remove()
    jest.useRealTimers()
  })
})

describe('editorShouldIgnoreCompatMouse', () => {
  afterEach(() => {
    editorResetTouchMouseGuard()
  })

  it('ignores mouse after a touch pick so a second nearby point is not committed', () => {
    editorArmTouchMouseGuard(1000)
    expect(editorShouldIgnoreCompatMouse(1000)).toBe(true)
    expect(
      editorShouldIgnoreCompatMouse(1000 + EDITOR_TOUCH_MOUSE_GUARD_MS - 1)
    ).toBe(true)
    expect(editorShouldIgnoreCompatMouse(1000 + EDITOR_TOUCH_MOUSE_GUARD_MS)).toBe(
      false
    )
  })

  it('stays armed while the following-click sink is still listening', () => {
    editorSinkFollowingClick()
    expect(editorShouldIgnoreCompatMouse(1e12)).toBe(true)
    editorClearFollowingClickSink()
    expect(editorShouldIgnoreCompatMouse(1e12)).toBe(false)
  })
})

describe('editorIsGhostClientOrigin', () => {
  it('detects the (0, 0) leftover used as a canvas top-left pick', () => {
    expect(editorIsGhostClientOrigin({ clientX: 0, clientY: 0 })).toBe(true)
    expect(editorIsGhostClientOrigin({ clientX: 1, clientY: 0 })).toBe(false)
  })
})

describe('editorIsTouchDerivedMouseEvent', () => {
  it('treats pointerType touch as touch-derived', () => {
    expect(
      editorIsTouchDerivedMouseEvent({ pointerType: 'touch' } as PointerEvent)
    ).toBe(true)
    expect(
      editorIsTouchDerivedMouseEvent({ pointerType: 'mouse' } as PointerEvent)
    ).toBe(false)
  })

  it('treats sourceCapabilities.firesTouchEvents as touch-derived', () => {
    expect(
      editorIsTouchDerivedMouseEvent({
        sourceCapabilities: { firesTouchEvents: true }
      } as unknown as MouseEvent)
    ).toBe(true)
  })
})

describe('editorIsTouchLongPressContextMenu', () => {
  afterEach(() => {
    editorResetTouchMouseGuard()
  })

  it('treats a firesTouchEvents contextmenu as a long-press leftover', () => {
    expect(
      editorIsTouchLongPressContextMenu({
        button: 2,
        sourceCapabilities: { firesTouchEvents: true }
      } as unknown as MouseEvent)
    ).toBe(true)
  })

  it('treats contextmenu during the compat-mouse guard as a leftover', () => {
    editorSinkFollowingClick()
    expect(
      editorIsTouchLongPressContextMenu({
        button: 2,
        pointerType: 'mouse'
      } as unknown as MouseEvent)
    ).toBe(true)
  })

  it('does not treat a real mouse right-click as a leftover', () => {
    expect(
      editorIsTouchLongPressContextMenu({
        button: 2,
        pointerType: 'mouse'
      } as unknown as MouseEvent)
    ).toBe(false)
  })
})

describe('editorLoupeLocalFromCanvasDelta', () => {
  it('places the snap glyph at the magnified offset from center', () => {
    expect(editorLoupeLocalFromCanvasDelta(10, -4, 128, 3)).toEqual({
      x: 64 + 30,
      y: 64 - 12
    })
  })
})
