import { CommonEventManager } from '@mlightcad/common'
import { GeometryPoint2d } from '@mlightcad/geometry-engine'

import type { EditorViewHoverEventArgs } from '../src/editor/view/EditorBaseView'
import {
  EditorHoverController,
  EditorHoverHost
} from '../src/editor/view/EditorHoverController'

class MockHoverHost implements EditorHoverHost {
  pick = jest.fn<
    ReturnType<EditorHoverHost['pick']>,
    Parameters<EditorHoverHost['pick']>
  >()
  onHover = jest.fn()
  onUnhover = jest.fn()
  curMousePos = new GeometryPoint2d(20, 30)
}

describe('EditorHoverController', () => {
  let host: MockHoverHost
  let hoverEvent: CommonEventManager<EditorViewHoverEventArgs>
  let unhoverEvent: CommonEventManager<EditorViewHoverEventArgs>
  let hoverListener: jest.Mock
  let unhoverListener: jest.Mock
  let controller: EditorHoverController

  beforeEach(() => {
    jest.useFakeTimers()
    host = new MockHoverHost()
    hoverEvent = new CommonEventManager<EditorViewHoverEventArgs>()
    unhoverEvent = new CommonEventManager<EditorViewHoverEventArgs>()
    hoverListener = jest.fn()
    unhoverListener = jest.fn()
    hoverEvent.addEventListener(hoverListener)
    unhoverEvent.addEventListener(unhoverListener)
    controller = new EditorHoverController(
      host,
      hoverEvent,
      unhoverEvent,
      500,
      500
    )
  })

  afterEach(() => {
    controller.dispose()
    jest.useRealTimers()
  })

  it('dispatches unhover immediately when the pointer leaves the hovered entity', () => {
    host.pick.mockReturnValueOnce([{ id: 'entity-1' }])

    controller.handleMouseMove(1, 2)
    jest.advanceTimersByTime(500)

    expect(host.onHover).toHaveBeenCalledWith('entity-1')

    host.pick.mockReturnValueOnce([])
    host.curMousePos = new GeometryPoint2d(40, 50)

    controller.handleMouseMove(10, 20)

    expect(host.pick).toHaveBeenLastCalledWith({ x: 10, y: 20 })
    expect(host.onUnhover).toHaveBeenCalledWith('entity-1')
    expect(unhoverListener).toHaveBeenCalledWith({
      id: 'entity-1',
      x: 40,
      y: 50
    })

    jest.advanceTimersByTime(500)
    expect(host.pick).toHaveBeenCalledTimes(2)
  })

  it('does not unhover and rehover when the pointer remains on the same entity', () => {
    host.pick.mockReturnValueOnce([{ id: 'entity-1' }])

    controller.handleMouseMove(1, 2)
    jest.advanceTimersByTime(500)

    host.pick.mockReturnValueOnce([{ id: 'entity-1' }])
    controller.handleMouseMove(10, 20)

    expect(host.onUnhover).not.toHaveBeenCalled()
    expect(unhoverListener).not.toHaveBeenCalled()
    expect(host.onHover).toHaveBeenCalledTimes(1)
  })

  it('cancels pending hover confirmation when the pointer leaves immediately', () => {
    host.pick.mockReturnValue([])
    host.pick.mockReturnValueOnce([{ id: 'entity-1' }])

    controller.handleMouseMove(1, 2)
    jest.advanceTimersByTime(500)

    controller.handleMouseMove(10, 20)
    jest.advanceTimersByTime(500)

    expect(hoverListener).not.toHaveBeenCalled()
  })

  it('cancels pending hover detection when cleared', () => {
    host.pick.mockReturnValueOnce([{ id: 'entity-1' }])

    controller.handleMouseMove(1, 2)
    controller.clear()
    jest.advanceTimersByTime(500)

    expect(host.pick).not.toHaveBeenCalled()
  })
})
