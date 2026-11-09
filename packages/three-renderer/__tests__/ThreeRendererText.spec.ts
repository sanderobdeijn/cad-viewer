import { Text } from 'troika-three-text'

import { ThreeRendererText } from '../src/object/ThreeRendererText'
import { ThreeRendererRenderContext } from '../src/renderer/ThreeRendererRenderContext'
import { ThreeRendererSubEntityTraitsUtil } from '../src/util'
import { getSceneDrawableUserData } from '../src/util/ThreeRendererObjectUserData'

jest.mock('troika-three-text', () => {
  const THREE = jest.requireActual('three')
  class Text extends THREE.Mesh {
    text = ''
    fontSize = 0
    font: string | null = null
    anchorX = 'left'
    anchorY = 'top'
    sync = jest.fn()
  }
  return { Text }
})

function createText(rotation = 0) {
  return new ThreeRendererText(
    { text: '12.50', height: 10, position: { x: 100, y: 50 }, rotation },
    ThreeRendererSubEntityTraitsUtil.createDefaultTraits(),
    new ThreeRendererRenderContext()
  )
}

describe('ThreeRendererText', () => {
  it('centres one troika text object on the position', () => {
    const entity = createText(Math.PI / 4)
    expect(entity.children).toHaveLength(1)
    const text = entity.children[0] as unknown as Text
    expect(text.text).toBe('12.50')
    expect(text.fontSize).toBe(10)
    expect(text.anchorX).toBe('center')
    expect(text.anchorY).toBe('middle')
    expect(text.position.x).toBe(100)
    expect(text.position.y).toBe(50)
    expect(text.rotation.z).toBeCloseTo(Math.PI / 4)
    expect(text.sync).toHaveBeenCalled()
  })

  it('stays outside the batches', () => {
    const entity = createText()
    expect(entity.resolveDrawMode()).toBe('unbatch')
    expect(getSceneDrawableUserData(entity.children[0]).noBatch).toBe(true)
  })

  it('estimates a bounding box from the text length and height', () => {
    const box = createText().wcsBbox
    // 5 characters × 10 high × 0.6 wide = 30 wide, 10 high, centred on (100, 50).
    expect(box.min.x).toBeCloseTo(85)
    expect(box.max.x).toBeCloseTo(115)
    expect(box.min.y).toBeCloseTo(45)
    expect(box.max.y).toBeCloseTo(55)
  })

  it('rotates the bounding box with the text', () => {
    const box = createText(Math.PI / 2).wcsBbox
    expect(box.min.x).toBeCloseTo(95)
    expect(box.max.x).toBeCloseTo(105)
    expect(box.min.y).toBeCloseTo(35)
    expect(box.max.y).toBeCloseTo(65)
  })

  it('reports when a layout finishes', () => {
    const listener = jest.fn()
    ThreeRendererText.events.synced.addEventListener(listener)
    const entity = createText()
    entity.children[0].dispatchEvent({ type: 'synccomplete' } as never)
    ThreeRendererText.events.synced.removeEventListener(listener)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
