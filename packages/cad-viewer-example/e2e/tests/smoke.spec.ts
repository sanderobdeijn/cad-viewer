import { expect, test, type Page } from '@playwright/test'

async function readNewDrawing(page: Page) {
  return page.evaluate(() => {
    type Named = { name: string }
    const mgr = (
      window as Window & {
        AcApDocManager?: {
          instance: {
            curDocument: {
              docTitle: string
              database: {
                clayer: string
                dimstyle: string
                insunits: number
                tables: {
                  layerTable: { newIterator: () => Iterable<Named> }
                  dimStyleTable: { newIterator: () => Iterable<Named> }
                  textStyleTable: { newIterator: () => Iterable<Named> }
                  blockTable: {
                    newIterator: () => Iterable<{
                      newIterator: () => Iterable<unknown>
                    }>
                  }
                }
                objects: {
                  layout: {
                    newIterator: () => Iterable<{ layoutName: string }>
                  }
                }
              }
            }
          }
        }
      }
    ).AcApDocManager?.instance
    if (!mgr) return null
    const doc = mgr.curDocument
    const db = doc.database
    const names = (table: { newIterator: () => Iterable<Named> }) =>
      [...table.newIterator()].map(record => record.name)
    let entityCount = 0
    for (const block of db.tables.blockTable.newIterator()) {
      entityCount += [...block.newIterator()].length
    }
    return {
      title: doc.docTitle,
      clayer: db.clayer,
      dimstyle: db.dimstyle,
      insunits: db.insunits,
      layers: names(db.tables.layerTable),
      dimStyles: names(db.tables.dimStyleTable),
      textStyles: names(db.tables.textStyleTable),
      layouts: [...db.objects.layout.newIterator()].map(l => l.layoutName),
      entityCount
    }
  })
}

test('opens straight into a blank drawing', async ({ page }) => {
  const drawingRequests: string[] = []
  page.on('request', request => {
    if (/\.(dxf|dwg|wasm)(\?|$)/i.test(request.url())) {
      drawingRequests.push(request.url())
    }
  })

  await page.goto('/')
  await expect(page.locator('.ml-cad-viewer-container')).toBeVisible()
  await expect(page.locator('.ml-cad-container canvas').first()).toBeVisible()
  await page.waitForTimeout(1500)

  await expect(page.locator('input[type="file"][accept*="dxf"]')).toHaveCount(0)
  expect(drawingRequests).toEqual([])

  const drawing = await readNewDrawing(page)
  expect(drawing).toEqual({
    title: 'Untitled',
    clayer: '0',
    dimstyle: 'ISO-25',
    insunits: 4,
    layers: ['0'],
    dimStyles: ['Standard', 'Annotative', 'ISO-25'],
    textStyles: ['Standard', 'Annotative'],
    layouts: ['Model', 'Layout1', 'Layout2'],
    entityCount: 0
  })
})

test('has no Open command', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(
    () => (window as Window & { AcApDocManager?: unknown }).AcApDocManager
  )

  const hasOpen = await page.evaluate(() => {
    const mgr = (
      window as Window & {
        AcApDocManager?: {
          instance: { lookupGlobalCmd: (name: string) => unknown }
        }
      }
    ).AcApDocManager?.instance
    return mgr ? mgr.lookupGlobalCmd('open') != null : null
  })
  expect(hasOpen).toBe(false)
})

test('switches between the model and paper layouts of a new drawing', async ({
  page
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', error => {
    pageErrors.push(error.message)
  })

  await page.goto('/')
  const tabs = page.locator('.ml-layout-tabs-button')
  await expect(tabs.filter({ hasText: 'Layout1' })).toBeVisible()

  await tabs.filter({ hasText: 'Layout1' }).click()
  await page.waitForTimeout(500)
  await tabs.filter({ hasText: 'Model' }).click()
  await page.waitForTimeout(500)

  await expect(page.locator('.ml-cad-container canvas').first()).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('supports basic mouse interactions without runtime errors', async ({
  page
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', error => {
    pageErrors.push(error.message)
  })

  await page.goto('/')
  await expect(page.locator('.ml-cad-container')).toBeVisible()

  const container = page.locator('.ml-cad-container')
  await container.hover()
  await page.mouse.wheel(0, -800)
  await page.waitForTimeout(250)
  await page.mouse.wheel(0, 700)
  await page.waitForTimeout(250)

  await page.mouse.move(640, 420)
  await page.mouse.down()
  await page.mouse.move(740, 470, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(250)

  await expect(page.locator('.ml-cad-viewer-container')).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('shows the editor and drawing side by side below a full-width ribbon', async ({
  page
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')

  const editor = page.getByRole('textbox', { name: 'Text editor' })
  const canvas = page.locator('.ml-cad-container canvas').first()
  await expect(editor).toBeVisible()
  await expect(canvas).toBeVisible()

  const headerBox = await page.locator('.ml-cad-header').boundingBox()
  expect(headerBox).toMatchObject({ x: 0, y: 0, width: 1280 })
  const statusBarBox = await page.locator('.ml-status-bar').boundingBox()
  expect(statusBarBox).toMatchObject({ x: 0, width: 1280 })

  const editorBox = await editor.boundingBox()
  expect(editorBox).toMatchObject({ x: 0, y: headerBox!.height })
  expect(editorBox!.width).toBeCloseTo(1280 / 3, 0)
  expect(editorBox!.y + editorBox!.height).toBe(statusBarBox!.y)
})

test('resizes the text editor by dragging the divider', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.waitForFunction(
    () => !!(window as Window & { AcApDocManager?: unknown }).AcApDocManager
  )

  const editor = page.getByRole('textbox', { name: 'Text editor' })
  const canvas = page.locator('.ml-cad-container canvas').first()
  const divider = page.getByRole('separator', { name: 'Resize side panel' })

  const dragDividerTo = async (x: number) => {
    const box = await divider.boundingBox()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.mouse.down()
    await page.mouse.move(x, 400, { steps: 5 })
    await page.mouse.up()
  }

  await dragDividerTo(800)
  expect((await editor.boundingBox())!.width).toBeCloseTo(800, 0)
  await expect
    .poll(async () => {
      const box = await canvas.boundingBox()
      return [Math.round(box!.x), Math.round(box!.width)]
    })
    .toEqual([805, 475])

  // The panes keep a minimum share of the width.
  await dragDividerTo(10)
  expect((await editor.boundingBox())!.width).toBeCloseTo(1280 * 0.15, 0)
  await dragDividerTo(1270)
  expect((await editor.boundingBox())!.width).toBeCloseTo(1280 * 0.85, 0)

  // Moving the mouse after release must not keep resizing.
  const released = (await editor.boundingBox())!.width
  await page.mouse.move(600, 400)
  expect((await editor.boundingBox())!.width).toBe(released)

  await divider.focus()
  await page.keyboard.press('ArrowLeft')
  expect((await editor.boundingBox())!.width).toBeCloseTo(1280 * 0.83, 0)
})

test('keeps keystrokes typed in the text editor out of the viewer', async ({
  page
}) => {
  await page.goto('/')
  await page.waitForFunction(
    () => !!(window as Window & { AcApDocManager?: unknown }).AcApDocManager
  )

  const editor = page.getByRole('textbox', { name: 'Text editor' })
  await editor.click()
  await page.keyboard.type('line')
  await page.keyboard.press('Enter')
  await page.keyboard.type('done')

  await expect(editor).toHaveValue('line\ndone')
  await expect(editor).toBeFocused()
  await expect(
    page.getByRole('textbox', { name: 'Type command' })
  ).toHaveValue('')

  // The viewer's Find shortcut stops the event before it reaches the editor.
  await editor.evaluate(element => {
    element.addEventListener('keydown', event => {
      if (event.key === 'f') element.dataset.findKeyReached = 'true'
    })
  })
  await page.keyboard.press('Control+f')
  await expect(editor).toHaveAttribute('data-find-key-reached', 'true')
})

test('draws a line from the ribbon button after using the text editor', async ({
  page
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.waitForFunction(
    () => !!(window as Window & { AcApDocManager?: unknown }).AcApDocManager
  )

  await page.getByRole('textbox', { name: 'Text editor' }).fill('text')
  await page
    .getByRole('button', { name: 'Draw a single straight line' })
    .click()
  const prompt = page.locator('.ml-cli-prompt')
  await expect(prompt).toContainText('first point')

  await page.mouse.click(800, 300)
  await expect(prompt).toContainText('next point')
  await page.mouse.click(1100, 550)
  await page.keyboard.press('Escape')
  await expect(prompt).toHaveText('')
})

test('stays in English without a language selector', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'zh-CN' })
  await context.addInitScript(() => {
    localStorage.setItem('preferred_lang', 'zh')
  })
  const page = await context.newPage()
  await page.goto('/')

  await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible()
  await expect(
    page.getByRole('textbox', { name: 'Type command' })
  ).toBeVisible()
  await expect(page.locator('.ml-ribbon-language-switch')).toHaveCount(0)
  await context.close()
})
