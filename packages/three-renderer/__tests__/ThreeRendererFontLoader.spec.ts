const mockSetFontUrl = jest.fn()

jest.mock('@mlightcad/mtext-renderer', () => {
  class MockDefaultFontLoader {
    private _baseUrl = 'https://cdn.jsdelivr.net/gh/mlightcad/cad-data/fonts/'

    get baseUrl() {
      return this._baseUrl
    }

    set baseUrl(value: string) {
      if (this._baseUrl === value) {
        return
      }
      this._baseUrl = value
      this.onFontUrlChanged(value)
    }

    onFontUrlChanged(_url: string) {
      // Hook for subclasses.
    }
  }

  return {
    DefaultFontLoader: MockDefaultFontLoader
  }
})

jest.mock('../src/renderer/ThreeRendererMTextRenderer', () => ({
  ThreeRendererMTextRenderer: {
    getInstance: jest.fn(() => ({
      setFontUrl: mockSetFontUrl
    }))
  }
}))

import { ThreeRendererFontLoader } from '../src/renderer/ThreeRendererFontLoader'

describe('ThreeRendererFontLoader', () => {
  beforeEach(() => {
    mockSetFontUrl.mockClear()
  })

  it('notifies the MText renderer when the custom font base URL changes', () => {
    const loader = new ThreeRendererFontLoader()
    const fontUrl = 'https://cdn.example.com/cad/fonts/'

    loader.baseUrl = fontUrl

    expect(mockSetFontUrl).toHaveBeenCalledWith(fontUrl)
  })
})
