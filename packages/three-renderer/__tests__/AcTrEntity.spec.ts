import * as THREE from 'three'

import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'
import { AcTrEntity } from '../src/object/AcTrEntity'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrStyleManager } from '../src/style/AcTrStyleManager'

describe('AcTrEntity wcsBbox', () => {
  it('starts empty and accepts explicit WCS bounds', () => {
    const entity = new AcTrEntity(new AcTrRenderContext())

    expect(entity.wcsBbox.isEmpty()).toBe(true)

    entity.wcsBbox.set(new THREE.Vector3(1, 2, 3), new THREE.Vector3(4, 5, 6))

    expectWcsBboxCloseTo(entity.wcsBbox, [1, 2, 3], [4, 5, 6])
  })

  it('copies wcsBbox in copy', () => {
    const context = new AcTrRenderContext(new AcTrStyleManager())
    const entity = new AcTrEntity(context)
    entity.objectId = 'entity-1'
    entity.wcsBbox.set(new THREE.Vector3(3, 4, 0), new THREE.Vector3(8, 9, 0))

    const cloned = new AcTrEntity(context).copy(entity, false)

    expectWcsBboxCloseTo(cloned.wcsBbox, [3, 4, 0], [8, 9, 0])
  })
})
