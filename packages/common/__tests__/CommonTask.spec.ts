import { CommonTask } from '../src'

describe('CommonTask', () => {
  it('throws if run is not implemented by subclass', () => {
    const baseTask = new CommonTask<number, number>('base')
    expect(() => baseTask.run(1)).toThrow(
      'run() must be implemented by subclass'
    )
  })
})
