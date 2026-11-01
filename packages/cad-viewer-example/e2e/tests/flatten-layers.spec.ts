import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import { uploadFixture } from '../helpers/fileUpload'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'nested-insert-layers.dxf'
)

test('opened drawings are flattened onto layer 0', async ({ page }) => {
  await page.goto('/')
  await uploadFixture(page, fixturePath, { initialView: 'Extents' })
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30_000
  })
  await page.waitForTimeout(1500)

  const state = await page.evaluate(() => {
    type Entity = {
      dxfTypeName?: string
      objectId: string
      layer: string
      color: { colorIndex?: number | null }
    }
    type Record = {
      name: string
      newIterator: () => Iterable<Entity>
    }
    const mgr = (
      window as Window & {
        AcApDocManager?: {
          instance: {
            curDocument: {
              database: {
                clayer: string
                tables: {
                  layerTable: { newIterator: () => Iterable<{ name: string }> }
                  blockTable: {
                    modelSpace: Record
                    newIterator: () => Iterable<Record>
                  }
                }
              }
            }
            curView: {
              cadScene: {
                activeLayout: {
                  getLayer: (name: string) =>
                    | {
                        visible: boolean
                        hasEntity: (objectId: string) => boolean
                      }
                    | undefined
                } | null
              }
            }
          }
        }
      }
    ).AcApDocManager?.instance
    if (!mgr) return null

    const db = mgr.curDocument.database
    const layerNames = [...db.tables.layerTable.newIterator()].map(l => l.name)
    const entityLayers = new Set<string>()
    for (const block of db.tables.blockTable.newIterator()) {
      for (const entity of block.newIterator()) entityLayers.add(entity.layer)
    }
    const modelSpace = [...db.tables.blockTable.modelSpace.newIterator()]
    const insert = modelSpace.find(e => e.dxfTypeName === 'INSERT')
    const sceneLayer = mgr.curView.cadScene.activeLayout?.getLayer('0')
    const drawnColors = new Set<number>()
    ;(
      sceneLayer as unknown as {
        internalObject: {
          traverse: (
            visit: (obj: {
              material?:
                | { color?: { getHex?: () => number } }
                | Array<{ color?: { getHex?: () => number } }>
            }) => void
          ) => void
        }
      }
    ).internalObject.traverse(obj => {
      if (!obj.material) return
      const materials = Array.isArray(obj.material)
        ? obj.material
        : [obj.material]
      for (const material of materials) {
        const hex = material.color?.getHex?.()
        if (typeof hex === 'number') drawnColors.add(hex)
      }
    })

    return {
      drawnColors: [...drawnColors],
      clayer: db.clayer,
      layerNames,
      entityLayers: [...entityLayers],
      insertColorIndex: insert?.color.colorIndex,
      sceneLayerVisible: sceneLayer?.visible,
      insertDrawn: insert ? sceneLayer?.hasEntity(insert.objectId) : false
    }
  })

  expect(state).not.toBeNull()
  expect(state?.clayer).toBe('0')
  expect(state?.layerNames).toEqual(['0'])
  expect(state?.entityLayers).toEqual(['0'])
  // The INSERT sits on layer Wall (ACI 1) in the file, with a ByLayer color.
  expect(state?.insertColorIndex).toBe(1)
  expect(state?.sceneLayerVisible).toBe(true)
  expect(state?.insertDrawn).toBe(true)
  // The only line is on layer 0 inside an INSERT on DIM (ACI 4), itself nested
  // in the INSERT on Wall. It still draws in DIM's color after flattening.
  expect(state?.drawnColors).toEqual([0x00ffff])
})
