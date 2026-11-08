jest.mock('@mlightcad/common', () => ({
  log: { warn: jest.fn(), info: jest.fn(), error: jest.fn() }
}))

import { EditorConditionWaiter } from '../src/editor/global/EditorConditionWaiter'

describe('EditorConditionWaiter', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('runs the action immediately when the condition is already true', () => {
    const action = jest.fn()
    const waiter = new EditorConditionWaiter(() => true, action, 300, 0)
    waiter.start()
    expect(action).toHaveBeenCalledTimes(1)
    expect(waiter.isRunning()).toBe(false)
  })

  it('waits for the interval when the condition is initially false', () => {
    let ready = false
    const action = jest.fn()
    const waiter = new EditorConditionWaiter(() => ready, action, 300, 0)
    waiter.start()
    expect(action).not.toHaveBeenCalled()

    ready = true
    jest.advanceTimersByTime(299)
    expect(action).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1)
    expect(action).toHaveBeenCalledTimes(1)
    expect(waiter.isRunning()).toBe(false)
  })
})
