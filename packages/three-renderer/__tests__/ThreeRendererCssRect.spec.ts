import { threeRendererCssTopLeftRectToGl } from '../src/viewport/ThreeRendererCssRect'

describe('ThreeRendererCssRect', () => {
  it('converts CSS top-left rectangles to WebGL bottom-left', () => {
    expect(
      threeRendererCssTopLeftRectToGl({ x: 8, y: 8, width: 128, height: 128 }, 600)
    ).toEqual({ x: 8, y: 464, width: 128, height: 128 })
  })
})
