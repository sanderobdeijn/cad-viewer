import {
  checkWebworkerReadiness,
  resetWebworkerReadinessCache
} from '../src/app/AcApWebworkerReadiness'
import { MTEXT_RENDERER_WORKER_FILE } from '../src/app/AcApWorkerAssets'

function mockFetch(
  implementation: (...args: unknown[]) => unknown
): typeof fetch {
  return jest.fn(implementation) as unknown as typeof fetch
}

describe('checkWebworkerReadiness', () => {
  const originalFetch = global.fetch
  const mtextRenderUrl = `/workers/${MTEXT_RENDERER_WORKER_FILE}`

  beforeEach(() => {
    resetWebworkerReadinessCache()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('probes only the MTEXT worker by default', async () => {
    global.fetch = mockFetch(() =>
      Promise.resolve({ ok: true, status: 200 } as Response)
    )

    const ready = await checkWebworkerReadiness()

    expect(ready).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(
      `./assets/${MTEXT_RENDERER_WORKER_FILE}`,
      { method: 'HEAD' }
    )
  })
})
