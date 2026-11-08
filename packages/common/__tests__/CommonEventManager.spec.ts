import { CommonEventManager } from '../src'

describe('CommonEventManager', () => {
  it('dispatches payload to listeners', () => {
    const manager = new CommonEventManager<number>()
    const listener = jest.fn()

    manager.addEventListener(listener)
    manager.dispatch(5)

    expect(listener).toHaveBeenCalledWith(5)
  })

  it('supports remove and replace listener with extra args dispatch', () => {
    const manager = new CommonEventManager<number>()
    const listener = jest.fn()

    manager.addEventListener(listener)
    manager.addEventListener(listener)
    manager.replaceEventListener(listener)

    manager.dispatch(7, 'extra', true)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0]).toEqual([7, 'extra', true])

    manager.removeEventListener(listener)
    manager.dispatch(8)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
