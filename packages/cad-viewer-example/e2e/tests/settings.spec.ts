import { expect, type Page, test } from '@playwright/test'

test.describe.configure({ timeout: 60000 })

type Settings = { get(key: string): unknown }

const openDrawing = async (page: Page) => {
  await page.goto('/')
  await page.waitForFunction(
    () => !!(window as Window & { ApplicationDocManager?: unknown }).ApplicationDocManager
  )
  await page.waitForTimeout(1500)
}

const run = async (page: Page, ...inputs: string[]) => {
  const input = page.locator('.ml-cli-text')
  for (const value of inputs) {
    await input.click({ timeout: 5000 })
    await input.fill(value, { timeout: 5000 })
    await input.press('Enter')
    await page.waitForTimeout(200)
  }
}

/** Reads settings through the viewer's setting manager. */
const setting = (page: Page, key: string) =>
  page.evaluate(
    key =>
      (
        window as unknown as {
          ApplicationSettingManager: { instance: Settings }
        }
      ).ApplicationSettingManager.instance.get(key),
    key
  )

const view = (page: Page) =>
  page.evaluate(() => {
    const mgr = (
      window as unknown as {
        ApplicationDocManager: {
          instance: {
            curView: { backgroundColor: number }
            curDocument: { model: { items: unknown[] } }
          }
        }
      }
    ).ApplicationDocManager.instance
    return {
      background: mgr.curView.backgroundColor,
      items: mgr.curDocument.model.items.length
    }
  })

test('changes settings by the names of the old system variables', async ({
  page
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await openDrawing(page)

  await run(page, 'orthomode', '1')
  expect(await setting(page, 'orthoMode')).toBe(1)

  await run(page, 'colortheme', 'light')
  expect(await setting(page, 'colorTheme')).toBe('light')
  await expect(page.locator('html')).not.toHaveClass(/(^|\s)dark(\s|$)/)

  expect(errors).toEqual([])
})

test('starts a new drawing with the new command', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await openDrawing(page)
  const editor = page.getByLabel('Text editor')

  await run(page, 'line', '0,0', '100,50', '')
  await page.keyboard.press('Escape')
  await expect(editor).toHaveValue(/Line/)

  await run(page, 'qnew')
  await expect(editor).toHaveValue('')

  await run(page, 'line', '0,0', '10,10', '')
  await page.keyboard.press('Escape')
  await expect(editor).toHaveValue(/Line/)
  expect(errors).toEqual([])
})

test('switches the background and keeps the drawing on regen', async ({
  page
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await openDrawing(page)
  await run(page, 'line', '0,0', '100,50', '')
  await page.keyboard.press('Escape')

  const before = await view(page)
  await run(page, 'switchbg')
  await expect
    .poll(async () => (await view(page)).background)
    .not.toBe(before.background)
  expect(await setting(page, 'modelBackgroundColor')).toBe(
    (await view(page)).background
  )

  await run(page, 'regen')
  await page.waitForTimeout(500)
  expect((await view(page)).items).toBe(1)
  const drawn = await page.evaluate(() => {
    const mgr = (
      window as unknown as {
        ApplicationDocManager: {
          instance: {
            curView: { hasEntity(id: string): boolean }
            curDocument: { model: { items: { id: string }[] } }
          }
        }
      }
    ).ApplicationDocManager.instance
    return mgr.curDocument.model.items.every(item =>
      mgr.curView.hasEntity(item.id)
    )
  })
  expect(drawn).toBe(true)
  expect(errors).toEqual([])
})
