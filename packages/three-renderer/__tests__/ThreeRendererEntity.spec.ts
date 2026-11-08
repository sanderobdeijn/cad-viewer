import * as THREE from 'three'

import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'
import { ThreeRendererEntity } from '../src/object/ThreeRendererEntity'
import { ThreeRendererRenderContext } from '../src/renderer/ThreeRendererRenderContext'
import { ThreeRendererStyleManager } from '../src/style/ThreeRendererStyleManager'

describe('ThreeRendererEntity wcsBbox', () => {
  it('starts empty and accepts explicit WCS bounds', () => {
    const entity = new ThreeRendererEntity(new ThreeRendererRenderContext())

    expect(entity.wcsBbox.isEmpty()).toBe(true)

    entity.wcsBbox.set(new THREE.Vector3(1, 2, 3), new THREE.Vector3(4, 5, 6))

    expectWcsBboxCloseTo(entity.wcsBbox, [1, 2, 3], [4, 5, 6])
  })

  it('copies wcsBbox in copy', () => {
    const context = new ThreeRendererRenderContext(new ThreeRendererStyleManager())
    const entity = new ThreeRendererEntity(context)
    entity.objectId = 'entity-1'
    entity.wcsBbox.set(new THREE.Vector3(3, 4, 0), new THREE.Vector3(8, 9, 0))

    const cloned = new ThreeRendererEntity(context).copy(entity, false)

    expectWcsBboxCloseTo(cloned.wcsBbox, [3, 4, 0], [8, 9, 0])
  })
})
