import {
  ML_UI_COARSE_POINTER_MEDIA_QUERY,
  ML_UI_COMPACT_MEDIA_QUERY,
  ML_UI_MOBILE_MEDIA_QUERY
} from '../src/editor/global/EditorUiLayout'
import { editorIsDynamicInputEnabled } from '../src/editor/input/EditorDynamicInput'
import { useTestSettings } from './helpers/settings'

const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15'

function installEnvironment(options: {
  media?: (query: string) => boolean
  userAgent?: string
  platform?: string
  maxTouchPoints?: number
}) {
  const previousWindow = (globalThis as { window?: Window }).window
  const previousNavigator = (globalThis as { navigator?: Navigator }).navigator
  const media = options.media ?? (() => false)
  const navigatorStub = {
    userAgent: options.userAgent ?? DESKTOP_UA,
    platform: options.platform ?? 'Win32',
    maxTouchPoints: options.maxTouchPoints ?? 0
  }
  const windowStub = {
    matchMedia: (query: string) => ({
      matches: media(query),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined
    }),
    navigator: navigatorStub
  }

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: windowStub
  })
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: navigatorStub
  })

  return {
    restore() {
      if (previousWindow === undefined) {
        delete (globalThis as { window?: Window }).window
      } else {
        Object.defineProperty(globalThis, 'window', {
          configurable: true,
          writable: true,
          value: previousWindow
        })
      }
      if (previousNavigator === undefined) {
        delete (globalThis as { navigator?: Navigator }).navigator
      } else {
        Object.defineProperty(globalThis, 'navigator', {
          configurable: true,
          writable: true,
          value: previousNavigator
        })
      }
    }
  }
}

describe('editorIsDynamicInputEnabled', () => {
  it('follows DYNMODE on desktop layouts', () => {
    const env = installEnvironment({})
    try {
      useTestSettings({ dynamicInputMode: 3 })
      expect(editorIsDynamicInputEnabled()).toBe(true)

      useTestSettings({ dynamicInputMode: 0 })
      expect(editorIsDynamicInputEnabled()).toBe(false)
    } finally {
      env.restore()
    }
  })

  it('stays disabled on phone layout even when DYNMODE is enabled', () => {
    const env = installEnvironment({
      media: query => query === ML_UI_MOBILE_MEDIA_QUERY
    })
    try {
      useTestSettings({ dynamicInputMode: 3 })
      expect(editorIsDynamicInputEnabled()).toBe(false)
    } finally {
      env.restore()
    }
  })

  it('stays disabled on pad layout even when DYNMODE is enabled', () => {
    const env = installEnvironment({
      media: query => query === ML_UI_COMPACT_MEDIA_QUERY
    })
    try {
      useTestSettings({ dynamicInputMode: 3 })
      expect(editorIsDynamicInputEnabled()).toBe(false)
    } finally {
      env.restore()
    }
  })

  it('stays disabled on wide handheld devices even when DYNMODE is enabled', () => {
    const env = installEnvironment({
      media: query => query === ML_UI_COARSE_POINTER_MEDIA_QUERY,
      userAgent: IPAD_UA
    })
    try {
      useTestSettings({ dynamicInputMode: 3 })
      expect(editorIsDynamicInputEnabled()).toBe(false)
    } finally {
      env.restore()
    }
  })
})
