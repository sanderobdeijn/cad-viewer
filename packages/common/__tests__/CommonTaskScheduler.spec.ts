import { CommonTask, CommonTaskScheduler } from '../src'

class AddOneTask extends CommonTask<number, number> {
  constructor() {
    super('add-one')
  }

  run(input: number) {
    return input + 1
  }
}

class AsyncDoubleTask extends CommonTask<number, number> {
  constructor() {
    super('async-double')
  }

  async run(input: number) {
    return input * 2
  }
}

class ThrowTask extends CommonTask<number, number> {
  constructor() {
    super('throw')
  }

  run(_input: number): number {
    throw new Error('boom')
  }
}

describe('CommonTaskScheduler', () => {
  it('executes chained tasks', async () => {
    const scheduler = new CommonTaskScheduler<number, number>()
    const progress = jest.fn()
    const complete = jest.fn()

    scheduler.addTask(new AddOneTask())
    scheduler.addTask(new AddOneTask())
    scheduler.setProgressCallback(progress)
    scheduler.setCompleteCallback(complete)

    await scheduler.run(1)

    expect(progress).toHaveBeenCalledTimes(2)
    expect(complete).toHaveBeenCalledWith(3)
  })

  it('uses requestAnimationFrame path when available', async () => {
    const scheduler = new CommonTaskScheduler<number, number>()
    const raf = jest.fn((cb: FrameRequestCallback) => {
      cb(0)
      return 1
    })
    const previous = (globalThis as { requestAnimationFrame?: unknown })
      .requestAnimationFrame
    ;(
      globalThis as unknown as { requestAnimationFrame: typeof raf }
    ).requestAnimationFrame = raf

    try {
      scheduler.addTask(new AddOneTask())
      const done = jest.fn()
      scheduler.setCompleteCallback(done)

      await scheduler.run(10)

      expect(raf).toHaveBeenCalled()
      expect(done).toHaveBeenCalledWith(11)
    } finally {
      if (previous == null) {
        delete (globalThis as { requestAnimationFrame?: unknown })
          .requestAnimationFrame
      } else {
        ;(
          globalThis as unknown as { requestAnimationFrame: unknown }
        ).requestAnimationFrame = previous
      }
    }
  })

  it('handles errors without interrupt and still completes', async () => {
    const scheduler = new CommonTaskScheduler<number, number>()
    const onError = jest.fn().mockReturnValue(false)
    const onComplete = jest.fn()

    scheduler.addTask(new ThrowTask())
    scheduler.addTask(new AddOneTask())
    scheduler.setErrorCallback(onError)
    scheduler.setCompleteCallback(onComplete)

    await scheduler.run(1)

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith(2)
  })

  it('rejects when error callback requests interruption', async () => {
    const scheduler = new CommonTaskScheduler<number, number>()
    scheduler.addTask(new ThrowTask())
    scheduler.addTask(new AsyncDoubleTask())
    scheduler.setErrorCallback(() => true)

    await expect(scheduler.run(3)).rejects.toThrow('boom')
  })
})
