import { ThreeRendererStringUtil } from '../src'

describe('ThreeRendererStringUtil', () => {
  it('formats bytes', () => {
    expect(ThreeRendererStringUtil.formatBytes(0)).toBe('0 B')
    expect(ThreeRendererStringUtil.formatBytes(1536, 1)).toBe('1.5 KB')
  })
})
