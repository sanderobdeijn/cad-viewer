import { expect, type Page, test } from '@playwright/test'

test.describe.configure({ timeout: 90000 })

const run = async (page: Page, ...inputs: string[]) => {
  const input = page.locator('.ml-cli-text')
  for (const value of inputs) {
    await input.click({ timeout: 5000 })
    await input.fill(value, { timeout: 5000 })
    await input.press('Enter')
    await page.waitForTimeout(200)
  }
}

const modelText = (page: Page) =>
  page.evaluate(() =>
    (
      window as never as {
        AcApDocManager: {
          instance: { curDocument: { model: { toString(): string } } }
        }
      }
    ).AcApDocManager.instance.curDocument.model.toString()
  )

const ids = (page: Page) =>
  page.evaluate(() =>
    (
      window as never as {
        AcApDocManager: {
          instance: { curDocument: { model: { items: { id: string }[] } } }
        }
      }
    ).AcApDocManager.instance.curDocument.model.items.map(item => item.id)
  )

const select = (page: Page, selected: string[]) =>
  page.evaluate(selected => {
    const view = (
      window as never as {
        AcApDocManager: {
          instance: {
            curView: {
              selectionSet: { clear(): void; add(ids: string[]): void }
            }
          }
        }
      }
    ).AcApDocManager.instance.curView
    view.selectionSet.clear()
    view.selectionSet.add(selected)
  }, selected)

const toPage = (page: Page, point: { x: number; y: number }) =>
  page.evaluate(point => {
    const view = (
      window as never as {
        AcApDocManager: {
          instance: {
            curView: {
              worldToScreen(p: unknown): { x: number; y: number }
              canvasToViewport(p: unknown): { x: number; y: number }
            }
          }
        }
      }
    ).AcApDocManager.instance.curView
    return view.canvasToViewport(view.worldToScreen(point))
  }, point)

test('moves, copies, rotates, offsets, erases and drags grips through the model', async ({
  page
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.waitForFunction(
    () => !!(window as never as { AcApDocManager?: unknown }).AcApDocManager
  )
  await page.waitForTimeout(1500)

  await run(page, 'line', '0,0', '100,0', '')
  await page.keyboard.press('Escape')
  const [line] = await ids(page)

  await select(page, [line])
  await run(page, 'copy', '0,0', '0,20')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  expect(await ids(page)).toHaveLength(2)

  await select(page, [line])
  await run(page, 'move', '0,0', '10,0')
  await page.waitForTimeout(300)
  expect(await modelText(page)).toContain(
    `Line id=${line} start=(10, 0) end=(110, 0)`
  )

  await select(page, [line])
  await run(page, 'rotate', '10,0', '90')
  await page.waitForTimeout(300)
  expect(await modelText(page)).toMatch(
    new RegExp(`Line id=${line} start=\\(10, 0\\) end=\\(10, 100\\)`)
  )

  // Zoom so both lines are on screen.
  await run(page, 'zoom', 'e')
  await page.waitForTimeout(500)

  await page.evaluate(() =>
    (
      window as never as {
        AcApDocManager: {
          instance: { curView: { selectionSet: { clear(): void } } }
        }
      }
    ).AcApDocManager.instance.curView.selectionSet.clear()
  )
  await run(page, 'offset', '5')
  const onLine = await toPage(page, { x: 10, y: 50 })
  await page.mouse.click(onLine.x, onLine.y)
  await page.waitForTimeout(300)
  const side = await toPage(page, { x: 30, y: 50 })
  await page.mouse.click(side.x, side.y)
  await page.waitForTimeout(300)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  expect(await ids(page)).toHaveLength(3)

  // Drag the end grip of the rotated line; it snaps to the start of the copy.
  await select(page, [line])
  await page.waitForTimeout(300)
  const grip = await toPage(page, { x: 10, y: 100 })
  const target = await toPage(page, { x: 0, y: 20 })
  await page.mouse.move(grip.x, grip.y)
  await page.mouse.down()
  await page.mouse.move(target.x + 3, target.y + 3, { steps: 8 })
  await page.mouse.move(target.x + 1, target.y + 1, { steps: 2 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  expect(await modelText(page)).toContain(
    `Line id=${line} start=(10, 0) end=(0, 20)`
  )

  await select(page, [line])
  await run(page, 'erase')
  await page.waitForTimeout(300)
  expect(await ids(page)).not.toContain(line)
  expect(errors).toEqual([])
})
