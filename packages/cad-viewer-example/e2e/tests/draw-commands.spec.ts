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

/** The drawn pixel count once rendering has stopped changing it. */
const settledDrawnPixels = async (page: Page) => {
  let previous = await countDrawnPixels(page)
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250)
    const current = await countDrawnPixels(page)
    if (current === previous) return current
    previous = current
  }
  throw new Error('The drawing did not stop changing')
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

test('moves a drawn shape through the UI', async ({ page }) => {
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

  await run(page, 'clearmeasurements')
  await expect(editor).toHaveValue('')

  expect(errors).toEqual([])
})

test('updates the drawing when the text in the editor is edited', async ({
  page
}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 1280, height: 800 })
  const editor = page.getByRole('textbox', { name: 'Text editor' })
  const error = page.getByRole('alert')
  const applied = async (expected: string[]) => {
    await expect
      .poll(() => modelSpaceTypes(page), { timeout: 5000 })
      .toEqual(expected)
    await page.waitForTimeout(400)
  }

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
  const fullLine = await settledDrawnPixels(page)
  expect(fullLine).toBeGreaterThan(0)

  // A changed line moves the entity on screen and stays as typed while editing.
  await editor.fill('Line start=(0,0) end=(50,0)')
  await expect
    .poll(() => settledDrawnPixels(page), { timeout: 10000 })
    .toBeLessThan(fullLine)
  const halfLine = await settledDrawnPixels(page)
  await expect(editor).toHaveValue('Line start=(0,0) end=(50,0)')

  // An invalid line reports the problem and leaves the drawing alone.
  await editor.fill('Line start=(0, 0) end=(50')
  await expect(error).toHaveText('Line 1: end has an incomplete value')
  expect(await settledDrawnPixels(page)).toBe(halfLine)

  // Fixing it clears the error, and new lines draw new entities.
  await editor.fill(
    'Line start=(0, 0) end=(50, 0)\nLine start=(25, -5) end=(25, 5)'
  )
  await applied(['LINE', 'LINE'])
  await expect(error).toHaveCount(0)
  expect(await settledDrawnPixels(page)).toBeGreaterThan(halfLine)

  // A removed line erases its entity from the screen.
  await editor.fill('Line start=(0, 0) end=(50, 0)')
  await applied(['LINE'])
  expect(await settledDrawnPixels(page)).toBe(halfLine)

  expect(errors).toEqual([])
})

test('creates every kind of entity from the text editor', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 1280, height: 800 })
  const editor = page.getByRole('textbox', { name: 'Text editor' })

  await openDrawing(page)
  const before = await countDrawnPixels(page)
  await editor.fill(
    [
      'Line start=(0, 0) end=(100, 50)',
      'CircularArc center=(50, 0) radius=30 startAngle=0.5 endAngle=2',
      'CircularArc center=(0, 50) radius=20 startAngle=0 endAngle=6.283185',
      'EllipseArc center=(100, 0) majorRadius=40 minorRadius=10 rotation=0.5 startAngle=0 endAngle=6.283185',
      'Polyline vertices=[(0, 0), (30, 0), (30, 30)] closed=true',
      'Point position=(5, 5)',
      'Dimension type=AlignedDimension xLine1Point=(0, 0) xLine2Point=(100, 0) dimLinePoint=(50, -20)'
    ].join('\n')
  )
  await expect
    .poll(async () => (await modelSpaceTypes(page)).sort(), { timeout: 5000 })
    .toEqual(
      [
        'ARC',
        'CIRCLE',
        'DIMENSION',
        'ELLIPSE',
        'LINE',
        'LWPOLYLINE',
        'POINT'
      ].sort()
    )
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect.poll(() => countDrawnPixels(page)).toBeGreaterThan(before)

  // Leaving the editor tidies the text into the order of the model.
  await editor.blur()
  await expect(editor).toHaveValue(/^Line start=\(0, 0\) end=\(100, 50\)\n/)

  expect(errors).toEqual([])
})

test('has no undo buttons or undo keyboard shortcuts', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  const editor = page.getByRole('textbox', { name: 'Text editor' })

  await openDrawing(page)
  await run(page, 'line', '0,0', '100,0', '')
  await page.keyboard.press('Escape')
  await expect(editor).toHaveValue('Line start=(0, 0) end=(100, 0)')

  await expect(page.locator('[data-item-id="cmd-undo"]')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: /^(undo|redo)$/i })
  ).toHaveCount(0)
  await expect(page.locator('.ml-ribbon-tabs-after')).toHaveCount(0)

  await page.locator('.ml-cad-container canvas').first().click()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(300)
  await expect(editor).toHaveValue('Line start=(0, 0) end=(100, 0)')
})

test('moves and deletes a measurement through the UI', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.setViewportSize({ width: 1280, height: 800 })
  const editor = page.getByRole('textbox', { name: 'Text editor' })

  type Manager = {
    instance: {
      curView: {
        zoomToFitDrawing: () => void
        htmlTransientManager: {
          groupsOnLayer: (layer: string) => Array<{
            id: string
            children: Array<{ element: HTMLElement }>
          }>
          selectGroup: (id: string) => void
          getSelectedGroups: () => unknown[]
        }
      }
    }
  }
  const measurementGroups = () =>
    page.evaluate(() => {
      const manager = (window as unknown as { AcApDocManager: Manager })
        .AcApDocManager.instance
      return manager.curView.htmlTransientManager
        .groupsOnLayer('measurement')
        .map(group => group.id)
    })

  await openDrawing(page)
  await run(page, 'line', '0,0', '100,0', '')
  await page.keyboard.press('Escape')
  await page.evaluate(() =>
    (
      window as unknown as { AcApDocManager: Manager }
    ).AcApDocManager.instance.curView.zoomToFitDrawing()
  )
  await page.waitForTimeout(500)
  await run(page, 'measuredistance', '0,0', '100,0')
  await page.keyboard.press('Escape')
  await expect(editor).toHaveValue(
    /Dimension type=MeasureDistance start=.0, 0. end=.100, 0./
  )
  const [id] = await measurementGroups()
  expect(id).toBeTruthy()

  // Dragging a grip replaces the measurement under the same id.
  await page.evaluate(id => {
    const ht = (window as unknown as { AcApDocManager: Manager }).AcApDocManager
      .instance.curView.htmlTransientManager
    ht.selectGroup(id)
  }, id)
  await page.waitForTimeout(200)
  const grip = await page.evaluate(id => {
    const ht = (window as unknown as { AcApDocManager: Manager }).AcApDocManager
      .instance.curView.htmlTransientManager
    const group = ht.groupsOnLayer('measurement').find(g => g.id === id)!
    return group.children
      .map(child => {
        const rect = child.element.getBoundingClientRect()
        return {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          width: rect.width,
          name: child.element.className
        }
      })
      .filter(child => /dot|grip/i.test(child.name))
      .sort((a, b) => a.x - b.x)[0]
  }, id)
  expect(grip).toBeTruthy()
  await page.mouse.move(grip.x, grip.y)
  await page.mouse.down()
  await page.mouse.move(grip.x + 100, grip.y + 60, { steps: 5 })
  await page.mouse.up()
  await expect(editor).not.toHaveValue(/MeasureDistance start=.0, 0./)
  await expect(editor).toHaveValue(
    /Dimension type=MeasureDistance start=.*end=.100, 0./
  )
  expect(await measurementGroups()).toEqual([id])

  // Delete removes it for good.
  await page.evaluate(id => {
    const ht = (window as unknown as { AcApDocManager: Manager }).AcApDocManager
      .instance.curView.htmlTransientManager
    ht.selectGroup(id)
  }, id)
  await page.keyboard.press('Delete')
  await expect(editor).toHaveValue('Line start=(0, 0) end=(100, 0)')
  expect(await measurementGroups()).toEqual([])

  expect(errors).toEqual([])
})
