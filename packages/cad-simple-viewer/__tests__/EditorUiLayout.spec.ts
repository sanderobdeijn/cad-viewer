/** @jest-environment jsdom */

import {
  editorGetUiLayout,
  editorIsCompactUiLayout,
  editorIsHandheldDevice,
  editorIsMobileOrPadUi,
  editorIsMobileUiLayout,
  editorShouldHideDesktopCommandLine,
  editorSubscribeUiLayout,
  ML_UI_COARSE_POINTER_MEDIA_QUERY,
  ML_UI_COMPACT_MAX_WIDTH,
  ML_UI_COMPACT_MEDIA_QUERY,
  ML_UI_MOBILE_MAX_WIDTH,
  ML_UI_MOBILE_MEDIA_QUERY,
  ML_UI_SESSION_PANEL_INSET,
  ML_UI_SESSION_PANEL_MAX_WIDTH,
  ML_UI_SESSION_PANEL_WIDTH,
  ML_UI_Z_CANVAS_HTML_OVERLAY,
  ML_UI_Z_CANVAS_HTML_STROKE,
  ML_UI_Z_DRAW_STYLE_TOOLBAR
} from '../src/editor/global/EditorUiLayout'

type MediaListener = (event: MediaQueryListEvent) => void

function installMatchMedia(matches: (query: string) => boolean) {
  const listeners = new Map<string, Set<MediaListener>>()
  const matchMediaDescriptor = Object.getOwnPropertyDescriptor(
    window,
    'matchMedia'
  )

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: matches(query),
      media: query,
      addEventListener: (type: string, listener: MediaListener) => {
        if (type !== 'change') return
        let set = listeners.get(query)
        if (!set) {
          set = new Set()
          listeners.set(query, set)
        }
        set.add(listener)
      },
      removeEventListener: (type: string, listener: MediaListener) => {
        if (type !== 'change') return
        listeners.get(query)?.delete(listener)
      }
    })
  })

  return {
    restore() {
      if (matchMediaDescriptor) {
        Object.defineProperty(window, 'matchMedia', matchMediaDescriptor)
      }
    },
    fire(query: string) {
      const event = {
        matches: matches(query),
        media: query
      } as MediaQueryListEvent
      listeners.get(query)?.forEach(listener => listener(event))
    }
  }
}

describe('EditorUiLayout', () => {
  it('exports mobile layout constants', () => {
    expect(ML_UI_MOBILE_MAX_WIDTH).toBe(600)
    expect(ML_UI_MOBILE_MEDIA_QUERY).toBe('(max-width: 600px)')
    expect(ML_UI_SESSION_PANEL_WIDTH).toBe(440)
    expect(ML_UI_SESSION_PANEL_INSET).toBe(24)
    expect(ML_UI_SESSION_PANEL_MAX_WIDTH).toBe('calc(100vw - 24px)')
    expect(ML_UI_Z_CANVAS_HTML_STROKE).toBe(1)
    expect(ML_UI_Z_CANVAS_HTML_OVERLAY).toBe(2)
    expect(ML_UI_Z_DRAW_STYLE_TOOLBAR).toBe(45)
    expect(ML_UI_Z_CANVAS_HTML_STROKE).toBeLessThan(ML_UI_Z_CANVAS_HTML_OVERLAY)
    expect(ML_UI_Z_CANVAS_HTML_OVERLAY).toBeLessThan(ML_UI_Z_DRAW_STYLE_TOOLBAR)
  })

  it('exports compact layout constants', () => {
    expect(ML_UI_COMPACT_MAX_WIDTH).toBe(960)
    expect(ML_UI_COMPACT_MEDIA_QUERY).toBe('(max-width: 960px)')
  })

  it('reports mobile layout from matchMedia', () => {
    const media = installMatchMedia(query => query === ML_UI_MOBILE_MEDIA_QUERY)

    expect(editorIsMobileUiLayout()).toBe(true)
    expect(editorIsCompactUiLayout()).toBe(false)
    expect(editorGetUiLayout()).toBe('phone')

    media.restore()
  })

  it('reports compact layout from matchMedia', () => {
    const media = installMatchMedia(
      query => query === ML_UI_COMPACT_MEDIA_QUERY
    )

    expect(editorIsCompactUiLayout()).toBe(true)
    expect(editorGetUiLayout()).toBe('pad')

    media.restore()
  })

  it('reports desktop when neither mobile nor compact matches', () => {
    const media = installMatchMedia(() => false)

    expect(editorGetUiLayout()).toBe('desktop')

    media.restore()
  })

  it('notifies subscribers when layout kind changes', () => {
    let mobile = true
    let compact = true
    const media = installMatchMedia(query => {
      if (query === ML_UI_MOBILE_MEDIA_QUERY) return mobile
      if (query === ML_UI_COMPACT_MEDIA_QUERY) return compact
      return false
    })

    const listener = jest.fn()
    const unsubscribe = editorSubscribeUiLayout(listener)

    expect(editorGetUiLayout()).toBe('phone')

    mobile = false
    media.fire(ML_UI_MOBILE_MEDIA_QUERY)
    expect(listener).toHaveBeenCalledWith('pad')

    compact = false
    media.fire(ML_UI_COMPACT_MEDIA_QUERY)
    expect(listener).toHaveBeenCalledWith('desktop')

    unsubscribe()
    media.restore()
  })

  it('treats pad viewport as mobile-or-pad UI', () => {
    const media = installMatchMedia(
      query => query === ML_UI_COMPACT_MEDIA_QUERY
    )

    expect(editorGetUiLayout()).toBe('pad')
    expect(editorIsMobileOrPadUi()).toBe(true)

    media.restore()
  })

  it('treats coarse pointer as a handheld device at desktop width', () => {
    const media = installMatchMedia(
      query => query === ML_UI_COARSE_POINTER_MEDIA_QUERY
    )

    expect(editorGetUiLayout()).toBe('desktop')
    expect(editorIsHandheldDevice()).toBe(true)
    expect(editorIsMobileOrPadUi()).toBe(true)

    media.restore()
  })

  it('does not treat any-pointer coarse (touch laptop) as handheld', () => {
    const media = installMatchMedia(query => query === '(any-pointer: coarse)')

    expect(editorGetUiLayout()).toBe('desktop')
    expect(editorIsHandheldDevice()).toBe(false)
    expect(editorIsMobileOrPadUi()).toBe(false)

    media.restore()
  })
})

describe('editorShouldHideDesktopCommandLine', () => {
  it('hides the CLI on the phone breakpoint even when idle', () => {
    const media = installMatchMedia(query => query === ML_UI_MOBILE_MEDIA_QUERY)
    expect(editorShouldHideDesktopCommandLine(false)).toBe(true)
    expect(editorShouldHideDesktopCommandLine(true)).toBe(true)
    media.restore()
  })

  it('hides the CLI on pad only while a prompt is active', () => {
    const media = installMatchMedia(
      query => query === ML_UI_COMPACT_MEDIA_QUERY
    )
    expect(editorGetUiLayout()).toBe('pad')
    expect(editorShouldHideDesktopCommandLine(false)).toBe(false)
    expect(editorShouldHideDesktopCommandLine(true)).toBe(true)
    media.restore()
  })
})
