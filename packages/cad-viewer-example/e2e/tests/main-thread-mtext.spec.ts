import { expect, test } from '@playwright/test'

async function installWorkerSpy(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const OriginalWorker = Worker
    const createdWorkerUrls: string[] = []

    window.Worker = class extends OriginalWorker {
      constructor(scriptURL: string | URL, options?: WorkerOptions) {
        createdWorkerUrls.push(String(scriptURL))
        super(scriptURL, options)
      }
    } as typeof Worker
    ;(
      window as Window & { __createdWorkerUrls?: string[] }
    ).__createdWorkerUrls = createdWorkerUrls
  })
}

async function countMtextRendererWorkers(
  page: import('@playwright/test').Page
) {
  return page.evaluate(() => {
    const urls =
      (window as Window & { __createdWorkerUrls?: string[] })
        .__createdWorkerUrls ?? []
    return urls.filter(url => url.includes('mtext-renderer-worker')).length
  })
}

test('does not create mtext renderer workers by default', async ({ page }) => {
  await installWorkerSpy(page)
  await page.goto('/')

  await expect(page.locator('.ml-cad-container')).toBeVisible()
  await page.waitForTimeout(1200)

  expect(await countMtextRendererWorkers(page)).toBe(0)
})

test('worker mode loads the worker script without errors', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  await installWorkerSpy(page)
  await page.goto('/?worker=1')

  await expect(page.locator('.ml-cad-container canvas').first()).toBeVisible()
  await page.waitForTimeout(1500)

  expect(await countMtextRendererWorkers(page)).toBeGreaterThan(0)
  const workerScriptErrors = consoleErrors.filter(
    text =>
      text.includes('mtext-renderer-worker') ||
      text.includes('ReferenceError: e is not defined')
  )
  expect(workerScriptErrors, workerScriptErrors.join('; ')).toEqual([])
})
