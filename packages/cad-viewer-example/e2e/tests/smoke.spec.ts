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
