import { CommonColor } from '@mlightcad/common'
import {
  ThreeRendererEntity,
  ThreeRendererRenderContext,
  ThreeRendererRenderer,
  getSceneDrawableUserData,
  setMaterialMetadata
} from '@mlightcad/three-renderer'
import * as THREE from 'three'

import { applicationDefaultLayerTraits } from '../src/model/ApplicationItemDrawable'
import { ThreeRendererLayer } from '../src/view/ThreeRendererLayer'
import { ThreeRendererLayerAppearanceController } from '../src/view/ThreeRendererLayerAppearanceController'
import { ThreeRendererScene } from '../src/view/ThreeRendererScene'

/**
 * Regression guard for remapped material ids: each layout scene layer must be
 * updated once when {@link ThreeRendererLayer.syncAppearanceFromRecord} runs.
 */
describe('layer material remap fan-out', () => {
  it('updates batched materials once per remapped id', () => {
    const oldMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
    const newMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const materials: Record<number, THREE.Material> = {
      [oldMaterial.id]: newMaterial
    }

    const wallLayer = new ThreeRendererLayer({
      name: 'WALL',
      isFrozen: false,
      isOff: false,
      color: new CommonColor()
    })
    const updateMaterial = jest.spyOn(wallLayer, 'updateMaterial')

    const renderer = {
      getLayerBoundMaterial: jest.fn((material: THREE.Material) => material),
      styleManager: {
        getLineMaterial: jest.fn(),
        getMTextFillMaterial: jest.fn()
      }
    } as unknown as ThreeRendererRenderer

    wallLayer.syncAppearanceFromRecord(
      'WALL',
      { layer: 'WALL' },
      materials,
      renderer
    )

    expect(updateMaterial).toHaveBeenCalledTimes(1)
    expect(updateMaterial).toHaveBeenCalledWith(oldMaterial.id, newMaterial)
  })

  it('rebinds unbatched drawables via objectLayerName when the drawable moved layer', () => {
    const oldMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
    setMaterialMetadata(oldMaterial, {
      layer: '0',
      isByLayerColor: true
    })

    const reboundMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const materials: Record<number, THREE.Material> = {}

    const wallLayer = new ThreeRendererLayer({
      name: 'MOVED',
      isFrozen: false,
      isOff: false,
      color: new CommonColor()
    })

    const line = new THREE.Line(new THREE.BufferGeometry(), oldMaterial)
    line.userData.layerName = 'MOVED'
    getSceneDrawableUserData(line).noBatch = true

    const entity = new ThreeRendererEntity(new ThreeRendererRenderContext())
    entity.objectId = 'insert-line'
    entity.add(line)
    wallLayer.addEntity(entity)

    let drawable: THREE.Line | undefined
    const unbatchedObjects = (
      wallLayer.internalObject as unknown as { _unbatchedObjects: THREE.Group }
    )._unbatchedObjects
    unbatchedObjects.traverse(child => {
      if (drawable || !(child instanceof THREE.Line)) {
        return
      }
      drawable = child
    })
    expect(drawable).toBeDefined()
    expect(drawable!.material).toBe(oldMaterial)

    const getLayerBoundMaterial = jest.fn(() => reboundMaterial)
    const renderer = {
      getLayerBoundMaterial,
      styleManager: {
        getLineMaterial: jest.fn(),
        getMTextFillMaterial: jest.fn()
      }
    } as unknown as ThreeRendererRenderer

    wallLayer.syncAppearanceFromRecord(
      'MOVED',
      { layer: 'MOVED' },
      materials,
      renderer
    )

    expect(drawable!.material).toBe(reboundMaterial)
    expect(getSceneDrawableUserData(drawable!).styleMaterialId).toBe(
      reboundMaterial.id
    )
    expect(getLayerBoundMaterial).toHaveBeenCalled()
  })

  it('syncs each layout scene layer once via the appearance controller', () => {
    const oldMaterial = new THREE.LineBasicMaterial({ color: 0xffffff })
    const newMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 })
    const materials: Record<number, THREE.Material> = {
      [oldMaterial.id]: newMaterial
    }

    const sceneLayerA = {
      syncAppearanceFromRecord: jest.fn()
    } as unknown as ThreeRendererLayer
    const sceneLayerB = {
      syncAppearanceFromRecord: jest.fn()
    } as unknown as ThreeRendererLayer

    const scene = {
      forEachSceneLayer: jest.fn(
        (layerName: string, fn: (sceneLayer: ThreeRendererLayer) => void) => {
          expect(layerName).toBe('WALL')
          fn(sceneLayerA)
          fn(sceneLayerB)
        }
      )
    } as unknown as ThreeRendererScene

    const renderer = {
      updateLayerMaterial: jest.fn(() => materials)
    } as unknown as ThreeRendererRenderer

    const controller = new ThreeRendererLayerAppearanceController(
      scene,
      renderer,
      () => ({ layer: 'WALL' })
    )

    controller.syncFromLiveRecord('WALL')

    expect(scene.forEachSceneLayer).toHaveBeenCalledTimes(1)
    expect(sceneLayerA.syncAppearanceFromRecord).toHaveBeenCalledTimes(1)
    expect(sceneLayerB.syncAppearanceFromRecord).toHaveBeenCalledTimes(1)
    expect(renderer.updateLayerMaterial).toHaveBeenCalledWith('WALL', {
      layer: 'WALL'
    })
  })

  it('resolves layer 0 to the default layer traits', () => {
    const renderer = {
      updateLayerMaterial: jest.fn(() => ({}))
    } as unknown as ThreeRendererRenderer

    const controller = new ThreeRendererLayerAppearanceController(
      {
        forEachSceneLayer: jest.fn()
      } as unknown as ThreeRendererScene,
      renderer
    )

    controller.syncFromLiveRecord('0')

    expect(renderer.updateLayerMaterial).toHaveBeenCalledWith(
      '0',
      applicationDefaultLayerTraits()
    )
  })

  it('skips layers other than layer 0', () => {
    const renderer = {
      updateLayerMaterial: jest.fn(() => ({}))
    } as unknown as ThreeRendererRenderer

    const controller = new ThreeRendererLayerAppearanceController(
      {
        forEachSceneLayer: jest.fn()
      } as unknown as ThreeRendererScene,
      renderer
    )

    controller.syncFromLiveRecord('WALL')

    expect(renderer.updateLayerMaterial).not.toHaveBeenCalled()
  })
})
