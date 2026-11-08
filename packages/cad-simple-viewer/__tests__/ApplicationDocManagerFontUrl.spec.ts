const mockFontLoaderInstances: MockAcApFontLoader[] = []

class MockAcApFontLoader {
  private _baseUrl = ''
  load = jest.fn(() => Promise.resolve())
  avaiableFonts = []
  fontLoader = {}
  getAvaiableFonts = jest.fn(async () => [])

  constructor() {
    mockFontLoaderInstances.push(this)
  }

  get baseUrl() {
    return this._baseUrl
  }

  set baseUrl(value: string) {
    this._baseUrl = value
  }
}

const mockInitialize = jest.fn()
const mockSetRenderMode = jest.fn()
const mockGetRenderMode = jest.fn(() => 'worker')
const mockSetDefaultFonts = jest.fn(() => Promise.resolve())
const mockSetLazyFontLoading = jest.fn(() => Promise.resolve())
const mockSetAwaitFontsBeforeDraw = jest.fn(() => Promise.resolve())
const mockSetFontUrl = jest.fn()
const mockLoadFonts = jest.fn(() => Promise.resolve([]))

jest.mock('../src/app/ApplicationFontLoader', () => ({
  ApplicationFontLoader: MockAcApFontLoader
}))

jest.mock('@mlightcad/three-renderer', () => ({
  ThreeRendererMTextRenderer: {
    getInstance: jest.fn(() => ({
      initialize: mockInitialize,
      setRenderMode: mockSetRenderMode,
      getRenderMode: mockGetRenderMode,
      setDefaultFonts: mockSetDefaultFonts,
      setLazyFontLoading: mockSetLazyFontLoading,
      setAwaitFontsBeforeDraw: mockSetAwaitFontsBeforeDraw,
      setFontUrl: mockSetFontUrl,
      loadFonts: mockLoadFonts
    })),
    resetInstance: jest.fn()
  }
}))

jest.mock('../src/view', () => ({
  ThreeRendererView2d: jest.fn().mockImplementation(() => ({
    container: {},
    editor: {
      clearScriptInputs: jest.fn(),
      enqueueScriptInputs: jest.fn(),
      inputManager: {
        isMobilePromptOpen: false,
        mobileChrome: {
          prepareAccessory: jest.fn(),
          clearAccessory: jest.fn()
        },
        sessionAccessoryHost: {
          host: {},
          type: 'desktop'
        },
        selectionSessionAccessory: null
      }
    },
    renderer: { context: {} },
    addModelSpace: jest.fn(),
    clear: jest.fn(),
    zoomToFitDrawing: jest.fn(),
    zoomToSmartExtents: jest.fn(),
    zoomTo: jest.fn(),
    syncDisplaySettings: jest.fn(),
    captureSessionState: jest.fn(() => ({})),
    restoreSessionState: jest.fn(),
    beginNewSession: jest.fn(() => ({})),
    stopAnimationLoop: jest.fn(),
    disposeSessionState: jest.fn(),
    selectionSet: { ids: [], clear: jest.fn(), add: jest.fn() }
  }))
}))

jest.mock('../src/app/ApplicationDocument', () => ({
  ApplicationDocument: jest.fn().mockImplementation(() => ({
    isReusableUntitled: true,
    destroy: jest.fn(),
    openMode: 0
  }))
}))

jest.mock('../src/app/ApplicationProgress', () => ({
  ApplicationProgress: jest.fn().mockImplementation(() => ({
    hide: jest.fn(),
    show: jest.fn(),
    setMessage: jest.fn()
  }))
}))

jest.mock('../src/app/ApplicationContext', () => ({
  ApplicationContext: jest.fn().mockImplementation((view, doc) => ({
    view,
    doc,
    suspend: jest.fn(),
    resume: jest.fn(),
    dispose: jest.fn()
  }))
}))

jest.mock('../src/plugin/ApplicationPluginManager', () => ({
  ApplicationPluginManager: jest.fn().mockImplementation(() => ({
    unloadAllPlugins: jest.fn(() => Promise.resolve()),
    setContext: jest.fn(),
    loadPluginsFromConfig: jest.fn(() =>
      Promise.resolve({ loaded: [], failed: [] })
    ),
    loadPluginsFromFolder: jest.fn(() =>
      Promise.resolve({ loaded: [], failed: [] })
    )
  }))
}))

jest.mock('../src/ui/UIDrawStyleSessionAccessory', () => ({
  UIDrawStyleSessionAccessory: jest.fn().mockImplementation(() => ({
    setActiveKind: jest.fn(),
    createSessionAccessory: jest.fn(),
    dispose: jest.fn()
  }))
}))

jest.mock('../src/editor/input/ui/EditorDesktopSessionAccessoryChrome', () => ({
  EditorDesktopSessionAccessoryChrome: jest.fn().mockImplementation(() => ({
    dispose: jest.fn()
  }))
}))

jest.mock('../src/command/measure/ApplicationRegisterMeasureCommands', () => ({
  registerMeasureCommands: jest.fn()
}))

jest.mock('../src/command/ApplicationInstallDrawStyleSessionAccessory', () => ({
  applicationInstallDrawStyleSessionAccessory: jest.fn(),
  applicationGetDrawStyleSessionAccessory: jest.fn()
}))

jest.mock('../src/editor', () => ({
  EditorCommandStack: jest.fn().mockImplementation(() => ({
    addCommand: jest.fn(),
    lookupGlobalCmd: jest.fn(),
    lookupLocalCmd: jest.fn(),
    searchCommandsByPrefix: jest.fn(),
    cancelActive: jest.fn(() => Promise.resolve())
  })),
  EditorOpenMode: {
    Read: 0
  },
  eventBus: {
    emit: jest.fn()
  }
}))

jest.mock('../src/command', () => {
  const commandNames = [
    'ApplicationAboutCmd',
    'ApplicationArcCmd',
    'ApplicationCacheFontCmd',
    'ApplicationCircleCmd',
    'ApplicationClearMeasurementsCmd',
    'ApplicationCloseCmd',
    'ApplicationCopyCmd',
    'ApplicationDimLinearCmd',
    'ApplicationEllipseCmd',
    'ApplicationEraseCmd',
    'ApplicationHideObjectsCmd',
    'ApplicationLayoffCmd',
    'ApplicationLineCmd',
    'ApplicationLogCmd',
    'ApplicationMeasureAngleCmd',
    'ApplicationMeasureArcCmd',
    'ApplicationMeasureAreaCmd',
    'ApplicationMeasureContinuousCmd',
    'ApplicationMeasureDistanceCmd',
    'ApplicationMeasurementExportCmd',
    'ApplicationMeasurementImportCmd',
    'ApplicationMeasurementVisibilityCmd',
    'ApplicationMeasurePointCmd',
    'ApplicationMLineCmd',
    'ApplicationMoveCmd',
    'ApplicationMTextCmd',
    'ApplicationOffsetCmd',
    'ApplicationOpenCmd',
    'ApplicationPanCmd',
    'ApplicationPointCmd',
    'ApplicationPolygonCmd',
    'ApplicationPolylineCmd',
    'ApplicationQNewCmd',
    'ApplicationRayCmd',
    'ApplicationRectCmd',
    'ApplicationRegenCmd',
    'ApplicationRotateCmd',
    'ApplicationSelectCmd',
    'ApplicationSwitchBgCmd',
    'ApplicationSysVarCmd',
    'ApplicationUnisolateObjectsCmd',
    'ApplicationXLineCmd',
    'ApplicationZoomCmd'
  ]
  return {
    ...Object.fromEntries(
      commandNames.map(name => [
        name,
        jest.fn().mockImplementation(() => ({ trigger: jest.fn() }))
      ])
    ),
    resetMeasurementSession: jest.fn()
  }
})

import { ApplicationDocManager } from '../src/app/ApplicationDocManager'
import { applicationDisposeNotificationService } from '../src/app/notification'

describe('ApplicationDocManager font URL configuration', () => {
  beforeEach(() => {
    ;(ApplicationDocManager as unknown as { _instance: unknown })._instance = undefined
    applicationDisposeNotificationService()
    mockFontLoaderInstances.length = 0
    mockInitialize.mockClear()
    mockSetRenderMode.mockClear()
    mockGetRenderMode.mockClear()
    mockGetRenderMode.mockReturnValue('worker')
    mockSetDefaultFonts.mockClear()
    mockSetLazyFontLoading.mockClear()
    mockSetAwaitFontsBeforeDraw.mockClear()
    mockSetFontUrl.mockClear()
    mockLoadFonts.mockClear()
    mockLoadFonts.mockResolvedValue([])
  })

  it('configures the font loader to download fonts from the custom base URL', async () => {
    const baseUrl = 'https://cdn.example.com/cad-data/'

    const manager = ApplicationDocManager.createInstance({
      baseUrl
    })

    await manager?.loadFonts(['simkai'])

    expect(mockFontLoaderInstances[0].baseUrl).toBe(`${baseUrl}fonts/`)
    expect(mockFontLoaderInstances[0].load).toHaveBeenCalledWith(['simkai'])
  })

  it('syncs the default fonts preset to the mtext renderer after worker init', () => {
    ApplicationDocManager.createInstance({})

    expect(mockInitialize).toHaveBeenCalled()
    expect(mockSetDefaultFonts).toHaveBeenCalledWith(['simsun', 'hztxt'])
    expect(mockSetFontUrl).toHaveBeenCalled()
  })

  it('configures main-thread mtext rendering before initializing workers', () => {
    ApplicationDocManager.createInstance({
      useMainThreadDraw: true
    })

    expect(mockSetRenderMode).toHaveBeenCalledWith('main')
    expect(mockInitialize).toHaveBeenCalled()
    expect(mockSetRenderMode.mock.invocationCallOrder[0]).toBeLessThan(
      mockInitialize.mock.invocationCallOrder[0]
    )
  })
})

describe('ApplicationDocManager preset fonts for open', () => {
  beforeEach(() => {
    ;(ApplicationDocManager as unknown as { _instance: unknown })._instance = undefined
    applicationDisposeNotificationService()
    mockGetRenderMode.mockReset()
    mockGetRenderMode.mockReturnValue('worker')
    mockLoadFonts.mockReset()
    mockLoadFonts.mockResolvedValue([])
  })

  it('loads the full preset into all workers and reuses the promise', async () => {
    const manager = ApplicationDocManager.createInstance({})
    mockLoadFonts.mockClear()

    const first = manager!.ensurePresetFontsForOpen()
    const second = manager!.ensurePresetFontsForOpen()
    expect(first).toBe(second)

    await first

    expect(mockLoadFonts).toHaveBeenCalledTimes(1)
    const call = mockLoadFonts.mock.calls[0] as unknown as [
      string[],
      { scope?: string } | undefined
    ]
    const names = call[0]
    const options = call[1]
    expect(names.length).toBeGreaterThan(0)
    expect(names).toEqual(expect.arrayContaining(['simsun', 'hztxt', 'amgdt']))
    expect(options).toEqual({ scope: 'all' })
    expect(manager!.lastPresetFontsForOpen).toEqual(names)
  })

  it('loads preset via FontManager.requestFonts in main-thread mode', async () => {
    const { FontManager } = await import('@mlightcad/mtext-renderer')
    const requestFonts = jest
      .spyOn(FontManager.instance, 'requestFonts')
      .mockResolvedValue([])
    mockGetRenderMode.mockReturnValue('main')

    const manager = ApplicationDocManager.createInstance({
      useMainThreadDraw: true
    })
    mockLoadFonts.mockClear()
    requestFonts.mockClear()

    await manager!.ensurePresetFontsForOpen()

    expect(mockLoadFonts).not.toHaveBeenCalled()
    expect(requestFonts).toHaveBeenCalledTimes(1)
    const requested = requestFonts.mock.calls[0][0] as readonly string[]
    expect(requested.length).toBeGreaterThan(0)
    requestFonts.mockRestore()
  })

  it('kicks ensurePresetFontsForOpen from onBeforeOpenDocument without awaiting it', () => {
    const manager = ApplicationDocManager.createInstance({})
    let ensureCalled = false
    let ensureSettled = false
    let settleTimer: ReturnType<typeof setTimeout> | undefined
    ;(
      manager as unknown as { ensurePresetFontsForOpen: () => Promise<void> }
    ).ensurePresetFontsForOpen = () => {
      ensureCalled = true
      return new Promise<void>(resolve => {
        settleTimer = setTimeout(() => {
          ensureSettled = true
          resolve()
        }, 50)
      })
    }
    ;(
      manager as unknown as {
        onBeforeOpenDocument: (options?: unknown, replace?: boolean) => void
      }
    ).onBeforeOpenDocument({}, false)

    expect(ensureCalled).toBe(true)
    // Open continues while preset load is still in flight.
    expect(ensureSettled).toBe(false)
    if (settleTimer) clearTimeout(settleTimer)
  })
})

describe('ApplicationDocManager document sessions', () => {
  beforeEach(() => {
    ;(ApplicationDocManager as unknown as { _instance: unknown })._instance = undefined
    applicationDisposeNotificationService()
  })

  it('starts with one document session', () => {
    const manager = ApplicationDocManager.createInstance({})
    expect(manager?.documentCount).toBe(1)
    expect(manager?.documents).toHaveLength(1)
    expect(manager?.mdiActiveDocument).toBe(manager?.curDocument)
    expect(manager?.activeSessionId).toMatch(/^doc-/)
  })

  it('activateDocument is a no-op for the current document', async () => {
    const manager = ApplicationDocManager.createInstance({})
    await expect(manager!.activateDocument(manager!.curDocument)).resolves.toBe(
      true
    )
    expect(manager!.documentCount).toBe(1)
  })

  it('closeDocument on the last drawing keeps one untitled session', async () => {
    const manager = ApplicationDocManager.createInstance({})
    const first = manager!.curDocument
    await manager!.closeDocument()
    expect(manager!.documentCount).toBe(1)
    expect(manager!.curDocument).not.toBe(first)
  })
})
