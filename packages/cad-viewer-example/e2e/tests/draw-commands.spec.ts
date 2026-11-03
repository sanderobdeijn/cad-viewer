import { expect, type Page, test } from '@playwright/test'

test.describe.configure({ timeout: 40000 })

type Db = {
  tables: {
    blockTable: {
      modelSpace: {
        newIterator: () => Iterable<{ dxfTypeName: string }>
      }
    }
  }
}

const modelSpaceTypes = (page: Page) =>
  page.evaluate(() => {
    const mgr = (
      window as Window & {
        AcApDocManager?: { instance: { curDocument: { database: Db } } }
      }
    ).AcApDocManager!.instance
    const entities = mgr.curDocument.database.tables.blockTable.modelSpace
    return [...entities.newIterator()].map(entity => entity.dxfTypeName)
  })

const countDrawnPixels = async (page: Page) => {
  const canvas = page.locator('.ml-cad-container canvas').first()
  const screenshot = (await canvas.screenshot()).toString('base64')
  return page.evaluate(async imageBase64 => {
    const image = new Image()
    image.src = `data:image/png;base64,${imageBase64}`
    await image.decode()
    const probe = document.createElement('canvas')
    probe.width = image.naturalWidth
    probe.height = image.naturalHeight
    const context = probe.getContext('2d')!
    context.drawImage(image, 0, 0)
    const { data } = context.getImageData(0, 0, probe.width, probe.height)
    let count = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] + data[i + 1] + data[i + 2] > 60) count++
    }
    return count
  }, screenshot)
}

const openDrawing = async (page: Page) => {
  await page.goto('/')
  await page.waitForFunction(
    () => !!(window as Window & { AcApDocManager?: unknown }).AcApDocManager
  )
  await page.waitForTimeout(1500)
}

const run = async (page: Page, ...inputs: string[]) => {
  const input = page.locator('.ml-cli-text')
  for (const value of inputs) {
    await input.click({ timeout: 5000 })
    await input.fill(value, { timeout: 5000 })
    await input.press('Enter')
    await page.waitForTimeout(150)
  }
}

const cases: Array<[string, string[], string]> = [
  ['line', ['line', '0,0', '100,50', ''], 'LINE'],
  ['polyline', ['pline', '0,0', '100,0', '100,50', ''], 'LWPOLYLINE'],
  ['circle', ['circle', '0,0', '50'], 'CIRCLE'],
  ['arc', ['arc', '50,0', '0,50', '-50,0'], 'ARC'],
  ['clockwise arc', ['arc', '-50,0', '0,50', '50,0'], 'ARC'],
  ['ellipse', ['ellipse', '-50,0', '50,0', '20'], 'ELLIPSE'],
  ['rectangle', ['rectang', '0,0', '100,50'], 'LWPOLYLINE'],
  ['polygon', ['polygon', '6', '0,0', 'I', '50'], 'LWPOLYLINE'],
  ['spline', ['spline', '0,0', '30,40', '60,0', '90,40', ''], 'SPLINE'],
  ['multiline', ['mline', '0,0', '100,0', '100,50', ''], 'MLINE'],
  ['ray', ['ray', '0,0', '100,50', ''], 'RAY'],
  ['construction line', ['xline', '0,0', '100,50', ''], 'LINE'],
  ['point', ['point', '10,10'], 'POINT']
]

for (const [name, inputs, type] of cases) {
  test(`draws a ${name} without errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))

    await openDrawing(page)
    const before = await countDrawnPixels(page)
    await run(page, ...inputs)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    expect(await modelSpaceTypes(page)).toContain(type)
    if (name !== 'point') {
      expect(await countDrawnPixels(page)).toBeGreaterThan(before)
    }
    expect(errors).toEqual([])
  })
}

const lineStart = (page: Page) =>
  page.evaluate(() => {
    const mgr = (
      window as unknown as {
        AcApDocManager: {
          instance: {
            curDocument: {
              database: {
                tables: {
                  blockTable: {
                    modelSpace: {
                      newIterator: () => Iterable<{
                        dxfTypeName: string
                        startPoint: { x: number; y: number; z?: number }
                      }>
                    }
                  }
                }
              }
            }
          }
        }
      }
    ).AcApDocManager.instance
    const entities =
      mgr.curDocument.database.tables.blockTable.modelSpace.newIterator()
    const line = [...entities].find(entity => entity.dxfTypeName === 'LINE')!
    return { ...line.startPoint }
  })

test('moves and undoes a drawn shape through the UI', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 1280, height: 800 })

  await openDrawing(page)
  await run(page, 'line', '0,0', '100,0', '')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.evaluate(() =>
    (
      window as unknown as {
        AcApDocManager: {
          instance: { curView: { zoomToFitDrawing: () => void } }
        }
      }
    ).AcApDocManager.instance.curView.zoomToFitDrawing()
  )
  await page.waitForTimeout(500)

  await run(page, 'move')
  // After zoom-to-fit the line runs across the middle of the drawing pane.
  await page.mouse.click(800, 446)
  await page.waitForTimeout(300)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  await run(page, '0,0', '10,20')
  await page.waitForTimeout(300)

  const moved = await lineStart(page)
  expect(moved.x).toBeCloseTo(10, 6)
  expect(moved.y).toBeCloseTo(20, 6)
  expect(moved.z).toBeUndefined()

  await run(page, 'undo')
  await page.waitForTimeout(300)
  const restored = await lineStart(page)
  expect(restored.x).toBeCloseTo(0, 6)
  expect(restored.y).toBeCloseTo(0, 6)

  expect(errors).toEqual([])
})

test('shows the shapes of the drawing in the text editor', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 1280, height: 800 })
  const editor = page.getByRole('textbox', { name: 'Text editor' })

  await openDrawing(page)
  await expect(editor).toHaveValue('')

  await run(page, 'line', '0,0', '100,0', '')
  await page.keyboard.press('Escape')
  await expect(editor).toHaveValue('Line start=(0, 0) end=(100, 0)')

  await run(page, 'circle', '0,0', '50')
  await page.keyboard.press('Escape')
  await expect(editor).toHaveValue(
    /^Line start=\(0, 0\) end=\(100, 0\)\nCircularArc center=\(0, 0\) radius=50 /
  )

  await run(page, 'undo')
  await expect(editor).toHaveValue('Line start=(0, 0) end=(100, 0)')

  await run(page, 'undo')
  await expect(editor).toHaveValue('')

  expect(errors).toEqual([])
})

test('shows points and dimensions in the text editor', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 1280, height: 800 })
  const editor = page.getByRole('textbox', { name: 'Text editor' })

  await openDrawing(page)
  await run(page, 'point', '5,5')
  await page.keyboard.press('Escape')
  await expect(editor).toHaveValue('Point position=(5, 5)')

  await run(page, 'dimlinear', '0,0', '100,0', '50,20')
  await page.keyboard.press('Escape')
  await expect(editor).toHaveValue(
    /^Point position=\(5, 5\)\nDimension type=\w+ xLine1Point=\(0, 0\) xLine2Point=\(100, 0\) dimLinePoint=\(50, 20\)/
  )

  await run(page, 'undo')
  await expect(editor).toHaveValue('Point position=(5, 5)')

  expect(errors).toEqual([])
})

test('shows measurements in the text editor', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 1280, height: 800 })
  const editor = page.getByRole('textbox', { name: 'Text editor' })

  await openDrawing(page)
  await run(page, 'measuredistance', '0,0', '100,0')
  await page.keyboard.press('Escape')
  await expect(editor).toHaveValue(
    /^Dimension type=MeasureDistance start=\(0, 0\) end=\(100, 0\) text="[^"]*100/
  )

  await run(page, 'undo')
  await expect(editor).toHaveValue('')

  await run(page, 'redo')
  await expect(editor).toHaveValue(/^Dimension type=MeasureDistance /)

  await run(page, 'clearmeasurements')
  await expect(editor).toHaveValue('')

  expect(errors).toEqual([])
})
