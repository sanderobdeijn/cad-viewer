import { CommonUiYieldGate, log } from '@mlightcad/common'
import {
  GeometryBox2d,
  GeometryBox3d,
  GeometryMatrix3d,
  GeometryPoint2d,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'
import {
  type GraphicsInterfaceDrawable,
  graphicsInterfaceForegroundColorForBackground
} from '@mlightcad/graphic-interface'
import {
  setAcTrDrawOrderZAllocator,
  ThreeRendererEntity,
  ThreeRendererGroup,
  ThreeRendererHtmlTransientManager,
  ThreeRendererRenderer,
  ThreeRendererText
} from '@mlightcad/three-renderer'
import { ThreeRendererMatrixUtil } from '@mlightcad/three-renderer'
import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

import { ApplicationDocManager, ApplicationSettingManager } from '../app'
import { ApplicationZoomCmd } from '../command/ApplicationZoomCmd'
import { notifyMeasurementLayoutChanged } from '../command/measure/ApplicationMeasurementStore'
import {
  editorAttachMobileBoxGesture,
  EditorBaseView,
  EditorCalculateSizeCallback,
  EditorConditionWaiter,
  EditorCorsorType,
  EditorGripManager,
  editorGuardCanvasTouchCallout,
  editorInteractionStrategy,
  editorIsTouchDerivedMouseEvent,
  EditorSelectionAction,
  editorShouldIgnoreCompatMouse,
  EditorSnapLoupeViewState,
  EditorSpatialQueryResultItem,
  EditorSpatialQueryResultItemEx,
  EditorViewMode,
  resolvePointerSelectionAction
} from '../editor'
import {
  GRAPHICS_INTERFACE_MODEL_SPACE_BACKGROUND,
  readBackgroundColor
} from '../editor/global/EditorUiColor'
import { ML_UI_Z_CANVAS_HTML_OVERLAY } from '../editor/global/EditorUiLayout'
import {
  editorItemIntersectsSelectionBox,
  editorNeedsCrossingGeometryRefine
} from '../editor/view/EditorSelectionBoxIntersect'
import { isEffectiveSpatialQueryHit } from '../editor/view/EditorSpatialQueryResult'
import { APPLICATION_MODEL_SPACE_ID } from '../model/ApplicationItemDrawable'
import type { ThreeRendererSpatialSearchOptions } from '../spatialIndex/ThreeRendererSpatialIndex'
import { ThreeRendererGeometryUtil } from '../util'
import {
  trySelectReviewOverlay,
  trySelectReviewOverlaysByBox
} from './EditorReviewOverlayPick'
import { EditorViewKeyHandler } from './EditorViewKeyHandler'
import {
  absorbConvertQueue,
  adaptConvertSliceSize,
  createConvertPending,
  hasPendingActiveOwner
} from './ThreeRendererConvertQueue'
import { tryBuildDirectEntityMeta } from './ThreeRendererDirectBatch'
import { unionGroupWcsChildBoxes } from './ThreeRendererGroupWcsBboxAssert'
import { computeIntelligentExtentsAsync } from './ThreeRendererIntelligentExtents'
import { ThreeRendererLayoutView } from './ThreeRendererLayoutView'
import { ThreeRendererLayoutViewManager } from './ThreeRendererLayoutViewManager'
import { sortPickResults } from './ThreeRendererPickResultUtil'
import { ThreeRendererProgressiveOpenFitController } from './ThreeRendererProgressiveOpenFitController'
import { ThreeRendererScene } from './ThreeRendererScene'
import type { ThreeRendererViewSessionState } from './ThreeRendererViewSessionState'
import { ThreeRendererWorkSlice } from './ThreeRendererWorkSlice'

/**
 * Options to customize view
 */
export interface ThreeRendererView2dOptions {
  /**
   * Container HTML element used by renderer
   */
  container?: HTMLElement
  /**
   * Callback function used to calculate size of canvas when window resized
   */
  calculateSizeCallback?: EditorCalculateSizeCallback
  /**
   * Background color
   */
  background?: number
}

/**
 * Default view option values
 */
export const DEFAULT_VIEW_2D_OPTIONS: ThreeRendererView2dOptions = {
  background: GRAPHICS_INTERFACE_MODEL_SPACE_BACKGROUND
}

/**
 * A 2D CAD viewer component that renders CAD drawings using Three.js.
 *
 * This class extends {@link EditorBaseView} and provides functionality for:
 * - Rendering 2D CAD drawings with Three.js WebGL renderer
 * - Handling user interactions (pan, zoom, select)
 * - Managing layouts and entities
 * - Supporting various CAD file formats (DWG, DXF)
 *
 * @example
 * ```typescript
 * const viewer = new ThreeRendererView2d({
 *   canvas: document.getElementById('canvas') as HTMLCanvasElement,
 *   background: 0x000000,
 *   calculateSizeCallback: () => ({
 *     width: window.innerWidth,
 *     height: window.innerHeight
 *   })
 * });
 * ```
 */
export class ThreeRendererView2d extends EditorBaseView {
  /** The Three.js renderer wrapper for CAD rendering */
  private _renderer: ThreeRendererRenderer
  /**
   * ID of the currently scheduled requestAnimationFrame callback.
   *
   * This value is used to:
   * - Track whether the animation loop is currently running
   * - Prevent scheduling multiple animation loops
   * - Cancel the animation loop when the view is paused, hidden, or disposed
   *
   * A value of `null` indicates that no animation frame is currently scheduled.
   */
  private _rafId: number | null = null
  /** Manager for layout views and viewport handling */
  private _layoutViewManager: ThreeRendererLayoutViewManager
  /** The 3D scene containing all CAD entities organized by layouts */
  private _scene: ThreeRendererScene
  /** Flag indicating if the WebGL scene needs to be re-rendered */
  private _isDirty: boolean
  /** Flag indicating if CSS2D / HTML overlays need a CSS2DRenderer pass */
  private _htmlDirty: boolean
  /** Performance monitoring statistics display */
  private _stats: Stats
  /** The number of entities waiting for processing */
  private _numOfEntitiesToProcess: number
  /** CSS2D renderer for HTML transient overlays */
  private _css2dRenderer: CSS2DRenderer
  /**
   * Block table record ids of layouts whose entities are currently being
   * batch-converted into the scene. Used by
   * {@link ThreeRendererView2d.loadLayoutEntitiesIfNeeded} to guard against
   * re-entrant calls before the convert drain flips
   * `ThreeRendererLayout.isLoaded` to `true`, which would otherwise duplicate
   * entities when the same layout tab is clicked twice in quick succession.
   */
  private _loadingLayouts: Set<string> = new Set()
  /**
   * Block table record ids of layouts that have already received an
   * initial zoom-to-fit. Used by the `layoutSwitched` handler to apply
   * the auto-zoom **only on the first user visit** to each layout, and
   * to preserve the camera state on subsequent visits (matches AutoCAD's
   * per-tab view persistence).
   *
   * Cannot be inferred from `_layoutViewManager.has(btrId)` because
   * `addLayout` pre-creates an `ThreeRendererLayoutView` for every layout in the
   * DWG at document load time — by the time the user clicks a layout
   * tab the view already exists, so "first existence of view" is
   * always false. This set tracks the orthogonal question "has the user
   * actually focused on this layout before?".
   *
   * Marked from two entry points:
   *  - `onAfterOpenDocument` (via `markLayoutAsInitialized`): the
   *    document's startup layout is initialized externally, so we don't
   *    auto-zoom again when the user clicks back to it.
   *  - `layoutSwitched` handler: after the first user-driven switch
   *    completes its initial zoom-to-fit.
   */
  private _initializedLayouts: Set<string> = new Set()
  /**
   * Layouts already framed by `ApplicationDocManager.onAfterOpenDocument` before a
   * first-visit async zoom runs. Suppresses redundant `applyInitialZoom` /
   * `zoomToFitDrawing(..., layoutBtrId)` callbacks that would override the
   * application layer's initial camera when startup and layout-switch events
   * race during document open.
   */
  private _externallyFramedLayouts: Set<string> = new Set()
  /** Progressive camera framing while entities batch-convert at document open. */
  private readonly _progressiveOpenFit: ThreeRendererProgressiveOpenFitController
  /**
   * Object ids claimed by an in-flight interactive {@link batchConvert}
   * that have not yet called {@link ThreeRendererScene.addEntity}. Without
   * this, a second convert pass can append another batched slot for the same
   * id because {@link hasEntity} is still false.
   */
  private readonly _claimedConvertObjectIds = new Set<string>()
  /**
   * Per-objectId convert generation. Bumped by {@link updateEntity} so an
   * in-flight progressive {@link batchConvert} for the same
   * id cannot `addEntity` after the scene was cleared for reconversion
   * (ghost drawables from before the update).
   */
  private readonly _entityConvertGeneration = new Map<string, number>()
  /**
   * When true, entity conversion during document open yields cooperatively so
   * geometry paints incrementally while the open overlay is still visible.
   */
  private _progressiveRendering = false
  /**
   * When false, {@link batchConvert} skips cooperative setTimeout yields.
   * Headless CLI sets this false; interactive viewers leave it true.
   */
  private _cooperativeYield = true
  /**
   * Serial convert queue for progressive opens. Chunks from `entityAppended`
   * enqueue here and a single drain loop runs {@link batchConvert}, so scene
   * convert overlaps ENTITY flush instead of waiting for a post-open
   * `setTimeout` storm after the loading overlay hides.
   */
  private _convertQueue: GraphicsInterfaceDrawable[] = []
  /** In-flight progressive convert drain; shared so awaiters wait for the queue. */
  private _convertDrainPromise: Promise<void> | null = null
  /**
   * Bumped by {@link clear} so an in-flight {@link batchConvert} abandons
   * scene writes and counter updates after the view has been reset for a new
   * document open.
   */
  private _convertEpoch = 0
  /** Last time progressive open actually painted mid-convert. */
  private _lastProgressivePaintAt = 0
  /**
   * When true, the next progressive mid-open paint must not be throttled
   * (camera moved — user pan/zoom or incremental auto-fit).
   */
  private _progressivePaintUrgent = false
  /** Pause convert until this `performance.now()` after user input. */
  private _progressiveInputPauseUntil = 0
  /** Mid-open WebGL paints while progressive convert was still running. */
  private _progressivePaintCount = 0
  /** Cooperative yields taken inside progressive {@link batchConvert}. */
  private _progressiveYieldCount = 0
  /** Removes progressive open input listeners registered in the constructor. */
  private _disposeProgressiveInputWatch?: () => void
  /**
   * Saved view was not applied at open. Frame batch bounds once linework
   * convert drains, so the canvas is not blank until the final fit.
   * Applied on a timer so it does not run on the entity-parse stack.
   */
  private _openLineworkFramePending = false
  private _openLineworkFrameTimer: ReturnType<typeof setTimeout> | null = null
  /** Grip point display and drag editing (Write mode only). */
  private _gripManager: EditorGripManager
  /** Global keyboard shortcuts for the view (erase, etc.). */
  private _keyHandler: EditorViewKeyHandler
  /** Removes iOS canvas long-press callout listeners registered in the constructor. */
  private _disposeCanvasTouchCallout: (() => void) | undefined
  /** Removes mobile long-press box-selection gesture listeners. */
  private _disposeMobileBoxGesture: (() => void) | undefined
  /**
   * Aborts canvas / document DOM listeners registered on this view.
   * Custom singleton listeners are removed explicitly in {@link dispose}.
   */
  private readonly _viewDomAbort = new AbortController()
  private _viewDisposed = false
  /** Named listeners so dispose can detach from shared singletons. */
  private _onTextSynced?: () => void
  private _onSettingsModified?: (args: { key: string; value: unknown }) => void
  private _onCommandWillStartHitTest?: () => void
  private _onCommandEndedHitTest?: () => void

  /**
   * Wall-time between cooperative yields during scene convert (ms) when
   * progressive rendering is off. Overlay still blocks input, so a larger
   * budget keeps throughput high while avoiding Chromium "Page Unresponsive".
   */
  private static readonly OPEN_CONVERT_YIELD_BUDGET_MS = 300
  /**
   * Yield cadence during progressive open (ms). Overlay stays hidden; keep
   * slices near one frame so pan/zoom handlers can run. Discrete
   * `navigator.scheduling.isInputPending` yields once so handlers run;
   * pointerdown/wheel set a short pause so OrbitControls can catch up.
   */
  private static readonly PROGRESSIVE_OPEN_YIELD_BUDGET_MS = 32
  /** Extra idle window after canvas pointerdown/wheel so gestures stay fluid. */
  private static readonly PROGRESSIVE_INPUT_PAUSE_MS = 120
  /**
   * Minimum interval between progressive mid-open paints driven by convert
   * (ms). Full-scene WebGL paints dominate open wall time; user camera
   * changes bypass this throttle via {@link _progressivePaintUrgent}.
   */
  private static readonly PROGRESSIVE_OPEN_PAINT_INTERVAL_MS = 2500
  /**
   * Minimum interval between interactive non-progressive mid-open paints (ms)
   * while convert runs under "Rendering drawing ...".
   * Longer than {@link PROGRESSIVE_OPEN_PAINT_INTERVAL_MS}: the overlay is
   * semi-transparent (`rgba(0,0,0,0.45)`), but each paint still redraws the
   * full scene. Headless
   * (`cooperativeYield` false) skips these paints entirely.
   */
  private static readonly NON_PROGRESSIVE_OPEN_PAINT_INTERVAL_MS = 4000
  /**
   * Target wall time of one interactive convert slice (ms) while a paper
   * layout is active.
   *
   * Slices return to the drain so a layout activated mid-open can jump ahead
   * of a long model-space batch. Kept well above one frame (≈50–100 ms) so
   * the fixed cost of each slice — yield, paint, queue absorb — does not
   * dominate total load time. The 300ms yield inside {@link batchConvert}
   * still applies within a slice.
   */
  private static readonly CONVERT_SLICE_BUDGET_MS = 64
  /**
   * Upper bound on entities per slice. Heavy entities stay at 1
   * because a slice that overruns the time budget is halved.
   */
  private static readonly CONVERT_SLICE_MAX = 512

  /**
   * Creates a new 2D CAD viewer instance.
   *
   * @param options - Configuration options for the viewer
   * @param options.container - Optional HTML container element. If not provided, a new container will be created
   * @param options.calculateSizeCallback - Optional callback function to calculate canvas size on window resize
   * @param options.background - Optional background color as hex number (default: 0x000000)
   */
  constructor(options: ThreeRendererView2dOptions = DEFAULT_VIEW_2D_OPTIONS) {
    const mergedOptions: ThreeRendererView2dOptions = {
      ...DEFAULT_VIEW_2D_OPTIONS,
      ...options
    }

    const container = mergedOptions.container ?? document.createElement('div')
    mergedOptions.container = container
    container.style.overflow = 'hidden'
    // Allow focusing the container after canvas clicks so document-level
    // shortcuts stay scoped to this viewer without stealing host-page focus.
    if (!container.hasAttribute('tabindex')) {
      container.tabIndex = -1
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    container.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.maxWidth = '100%'
    renderer.domElement.style.maxHeight = '100%'
    // Keep one-finger picks (measure snap loupe) from being stolen by the
    // browser scroll / long-press copy-selection callout (especially iOS).
    const disposeCanvasTouchCallout = editorGuardCanvasTouchCallout(
      renderer.domElement,
      container
    )

    super(renderer.domElement, container)
    this._disposeCanvasTouchCallout = disposeCanvasTouchCallout
    const onProgressiveInput = () => this.noteProgressiveUserInput()
    // Pointer and wheel both claim shortcut focus so erase still works
    // after zooming without a prior click, without stealing focus from host
    // inputs/textareas/contenteditable fields.
    const onCanvasPointerDown = () => {
      onProgressiveInput()
      this.focusViewerForShortcuts()
    }
    const onCanvasWheel = () => {
      onProgressiveInput()
      this.focusViewerForShortcuts()
    }
    renderer.domElement.addEventListener('pointerdown', onCanvasPointerDown, {
      capture: true
    })
    renderer.domElement.addEventListener('wheel', onCanvasWheel, {
      capture: true,
      passive: true
    })
    this._disposeProgressiveInputWatch = () => {
      renderer.domElement.removeEventListener(
        'pointerdown',
        onCanvasPointerDown,
        { capture: true }
      )
      renderer.domElement.removeEventListener('wheel', onCanvasWheel, {
        capture: true
      })
    }
    this._gripManager = new EditorGripManager(this)
    this._keyHandler = new EditorViewKeyHandler(this)
    if (options.calculateSizeCallback) {
      this.setCalculateSizeCallback(options.calculateSizeCallback)
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(this.width, this.height)

    this._renderer = new ThreeRendererRenderer(renderer)
    // Shared across all batched groups so later entities occlude
    // earlier linework via depth, matching AutoCAD draw order.
    setAcTrDrawOrderZAllocator(() => this._renderer.allocateDrawOrderZ())
    // Text lays out asynchronously; repaint once a label is ready to draw.
    this._onTextSynced = () => {
      this._isDirty = true
    }
    ThreeRendererText.events.synced.addEventListener(this._onTextSynced)

    this._scene = this.createScene()
    // Initialize background color through setter to keep renderer/cursor in sync.
    this.backgroundColor =
      mergedOptions.background ?? GRAPHICS_INTERFACE_MODEL_SPACE_BACKGROUND
    // During main-view construction the manager singleton is not published yet,
    // so treat a missing manager as "this is the primary canvas".
    this._stats = this.createStats(
      ApplicationSettingManager.instance.isShowStats &&
        (ApplicationDocManager.tryGetInstance() == null || this.isActiveManagedView())
    )

    // The background setting drives the canvas clear colour and ACI-7
    // inversion. `colorTheme` only affects UI chrome — see `useDark` /
    // `EditorUiTheme`, not the renderer foreground.
    this._onSettingsModified = args => {
      if (args.key == 'isShowStats') {
        this.toggleStatsVisibility(this._stats, args.value as boolean)
      } else if (args.key === 'modelBackgroundColor') {
        this.applyCanvasBackground(readBackgroundColor())
      }
    }
    ApplicationSettingManager.instance.events.modified.addEventListener(
      this._onSettingsModified
    )

    let selectionStartWcs: GeometryPoint2dLike | null = null
    let selectionStartCanvas: GeometryPoint2dLike | null = null
    let selectionPreviewEl: HTMLDivElement | null = null

    const canHandleIdlePointer = () => {
      return !this.editor.isActive && !this._gripManager.isDragging
    }

    const canHandleSelectionGesture = () => {
      return this.mode === EditorViewMode.SELECTION && canHandleIdlePointer()
    }

    const canHandleMobileBoxGesture = () => {
      return (
        canHandleIdlePointer() &&
        editorInteractionStrategy().canIdleTouchBox(this.mode)
      )
    }

    const clearSelectionPreview = () => {
      selectionPreviewEl?.remove()
      selectionPreviewEl = null
    }

    const resetSelectionDrag = () => {
      selectionStartWcs = null
      selectionStartCanvas = null
      clearSelectionPreview()
    }

    const beginSelectionPreview = (clientX: number, clientY: number) => {
      selectionStartCanvas = this.viewportToCanvas({
        x: clientX,
        y: clientY
      })
      selectionStartWcs = this.screenToWorld(selectionStartCanvas)
      clearSelectionPreview()
      selectionPreviewEl = document.createElement('div')
      selectionPreviewEl.className = 'ml-jig-preview-rect'
      this.container.appendChild(selectionPreviewEl)
    }

    const updateSelectionPreview = (
      clientX: number,
      clientY: number,
      action: EditorSelectionAction = 'replace'
    ) => {
      if (!selectionStartWcs || !selectionPreviewEl || !selectionStartCanvas) {
        return
      }

      const curCanvas = this.viewportToCanvas({ x: clientX, y: clientY })
      const curWcs = this.screenToWorld(curCanvas)

      const p1 = this.worldToScreen(selectionStartWcs)
      const p2 = this.worldToScreen(curWcs)

      const left = Math.min(p1.x, p2.x)
      const top = Math.min(p1.y, p2.y)
      const width = Math.abs(p1.x - p2.x)
      const height = Math.abs(p1.y - p2.y)

      const mode = this.getSelectionMode(selectionStartCanvas, curCanvas)
      const style = this.getSelectionPreviewStyle(mode, action)

      Object.assign(selectionPreviewEl.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        borderStyle: style.borderStyle,
        background: style.background
      })
      selectionPreviewEl.style.setProperty('--line-color', style.lineColor)
    }

    const finishSelection = (
      clientX: number,
      clientY: number,
      action: EditorSelectionAction,
      isClick: boolean
    ) => {
      if (!selectionStartWcs || !selectionStartCanvas) return

      const endCanvas = this.viewportToCanvas({
        x: clientX,
        y: clientY
      })
      const endWcs = this.screenToWorld(endCanvas)
      clearSelectionPreview()

      if (isClick) {
        if (trySelectReviewOverlay(this, endCanvas.x, endCanvas.y, action)) {
          if (action === 'replace') {
            this.selectionSet.clear()
          }
        } else if (this.entitySelectionEnabled) {
          const picked = this.pick(endWcs)
          if (picked.length > 0) {
            if (action === 'replace') {
              this.htmlTransientManager.deselectAll()
            }
            this.applySelection([picked[0].id], action)
          } else if (action === 'replace') {
            this.selectionSet.clear()
          }
        } else if (action === 'replace') {
          this.selectionSet.clear()
        }
      } else {
        const box = new GeometryBox2d()
          .expandByPoint(selectionStartWcs)
          .expandByPoint(endWcs)
        const mode = this.getSelectionMode(selectionStartCanvas, endCanvas)
        if (this.entitySelectionEnabled) {
          this.selectByBoxWithMode(box, mode, action)
        }
        trySelectReviewOverlaysByBox(this, box, mode, action)
      }

      selectionStartWcs = null
      selectionStartCanvas = null
    }

    const viewDomSignal = this._viewDomAbort.signal

    this.canvas.addEventListener(
      'mousedown',
      e => {
        if (e.button !== 0) return
        if (!canHandleSelectionGesture()) return
        if (editorIsTouchDerivedMouseEvent(e) || editorShouldIgnoreCompatMouse()) {
          return
        }

        beginSelectionPreview(e.clientX, e.clientY)
      },
      { signal: viewDomSignal }
    )

    this.canvas.addEventListener(
      'mousemove',
      e => {
        if (
          !selectionStartWcs ||
          !selectionPreviewEl ||
          !selectionStartCanvas
        ) {
          return
        }
        if (editorIsTouchDerivedMouseEvent(e) || editorShouldIgnoreCompatMouse()) {
          return
        }

        updateSelectionPreview(
          e.clientX,
          e.clientY,
          this.getPointerSelectionAction(e)
        )
      },
      { signal: viewDomSignal }
    )

    this.canvas.addEventListener(
      'mouseup',
      e => {
        if (this._gripManager.isDragging) {
          resetSelectionDrag()
          return
        }
        if (!selectionStartWcs || !selectionStartCanvas) return
        if (editorIsTouchDerivedMouseEvent(e) || editorShouldIgnoreCompatMouse()) {
          return
        }

        const endCanvas = this.viewportToCanvas({
          x: e.clientX,
          y: e.clientY
        })
        const action = this.getPointerSelectionAction(e)
        finishSelection(
          e.clientX,
          e.clientY,
          action,
          this.isSelectionClick(selectionStartCanvas, endCanvas)
        )
      },
      { signal: viewDomSignal }
    )

    this._disposeMobileBoxGesture = editorAttachMobileBoxGesture({
      element: this.canvas,
      shouldStart: () => canHandleMobileBoxGesture(),
      setNavigationEnabled: enabled => {
        this.setNavigationEnabled(enabled)
      },
      onActivate: (clientX, clientY) => {
        beginSelectionPreview(clientX, clientY)
        updateSelectionPreview(clientX, clientY)
      },
      onMove: (clientX, clientY) => {
        updateSelectionPreview(clientX, clientY)
      },
      onBoxEnd: (clientX, clientY, moved) => {
        finishSelection(clientX, clientY, 'replace', !moved)
      },
      onTap: (clientX, clientY) => {
        selectionStartCanvas = this.viewportToCanvas({
          x: clientX,
          y: clientY
        })
        selectionStartWcs = this.screenToWorld(selectionStartCanvas)
        finishSelection(clientX, clientY, 'replace', true)
      },
      onAbort: () => {
        resetSelectionDrag()
      }
    })

    // When using OrbitControls in THREE.js, it attaches its own event listeners to the DOM elements,
    // such as the canvas or the entire document. This can interfere with other event listeners you
    // add, including the keydown event. Scope to this view's container so host-page shortcuts
    // (and post-destroy key presses) are not captured.
    document.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (!this.isActiveManagedView()) return
        if (!this.isShortcutEventInsideViewer(e)) return
        this._keyHandler.handleKeyDown(e)
      },
      { signal: viewDomSignal }
    )
    this._css2dRenderer = new CSS2DRenderer()
    this._css2dRenderer.setSize(this.width, this.height)
    this._css2dRenderer.domElement.style.position = 'absolute'
    this._css2dRenderer.domElement.style.top = '0px'
    this._css2dRenderer.domElement.style.left = '0px'
    this._css2dRenderer.domElement.style.pointerEvents = 'none'
    // Below command line / mobile chrome / dialogs; above the WebGL canvas.
    this._css2dRenderer.domElement.style.zIndex = String(
      ML_UI_Z_CANVAS_HTML_OVERLAY
    )
    this._css2dRenderer.domElement.style.maxWidth = '100%'
    this._css2dRenderer.domElement.style.maxHeight = '100%'
    container.appendChild(this._css2dRenderer.domElement)

    this._layoutViewManager = new ThreeRendererLayoutViewManager()
    this._progressiveOpenFit = new ThreeRendererProgressiveOpenFitController(
      (box, margin) => {
        this.activeLayoutView.zoomTo(box, margin ?? 1.1)
        this._isDirty = true
      }
    )
    this.initialize()
    this.onWindowResize()
    this._isDirty = true
    this._htmlDirty = false
    this.startAnimationLoop()
    this._numOfEntitiesToProcess = 0
  }

  private getPointerSelectionAction(e: MouseEvent) {
    return resolvePointerSelectionAction(e)
  }

  /**
   * Initializes the viewer after renderer and camera are created.
   *
   * This method sets up the initial cursor and can be overridden by child classes
   * to add custom initialization logic.
   *
   * @protected
   */
  initialize() {
    // This method is called after camera and render are created.
    // Children class can override this method to add its own logic
    this.setCursor(EditorCorsorType.Crosshair)
    this._onCommandWillStartHitTest = () => {
      this.htmlTransientManager.setHitTestEnabled(false)
    }
    this._onCommandEndedHitTest = () => {
      this.htmlTransientManager.setHitTestEnabled(true)
    }
    this.editor.events.commandWillStart.addEventListener(
      this._onCommandWillStartHitTest
    )
    this.editor.events.commandEnded.addEventListener(
      this._onCommandEndedHitTest
    )
  }

  /**
   * Gets the current view mode (selection or pan).
   *
   * @returns The current view mode
   * @inheritdoc
   */
  get mode() {
    const activeLayoutView = this.activeLayoutView
    return activeLayoutView ? activeLayoutView.mode : EditorViewMode.SELECTION
  }

  /**
   * Sets the view mode (selection or pan).
   *
   * @param value - The view mode to set
   */
  set mode(value: EditorViewMode) {
    this.activeLayoutView.mode = value
  }

  /**
   * Enables or disables OrbitControls on the active layout view.
   *
   * @param enabled - When false, pan and zoom are disabled (e.g. while the
   *   snap loupe is tracking a long-press).
   */
  override setNavigationEnabled(enabled: boolean) {
    const layoutView = this.activeLayoutView
    if (layoutView) layoutView.enabled = enabled
  }

  /**
   * Shows or hides the screen-fixed snap loupe overlay viewport.
   *
   * @param state - Loupe screen rectangle and world box, or `null` to hide.
   */
  override setSnapLoupe(state: EditorSnapLoupeViewState | null) {
    const overlay = this.activeLayoutView?.overlayViewport
    if (!overlay) return
    if (!state) {
      overlay.visible = false
      this._isDirty = true
      return
    }
    overlay.setScreenRect(state.x, state.y, state.size, state.size)
    overlay.setViewBox(state.viewBox)
    overlay.visible = true
    this._isDirty = true
  }

  /**
   * Gets the Three.js renderer wrapper used for CAD rendering.
   *
   * @returns The renderer instance
   */
  get renderer() {
    return this._renderer
  }

  /** Grip point manager for the view (Write mode only). */
  get gripManager() {
    return this._gripManager
  }

  /**
   * Gets whether the WebGL scene needs to be re-rendered.
   *
   * Camera, CAD entities, and WebGL transients set this flag. CSS2D / HTML
   * overlay mutations should use {@link isHtmlDirty} instead so a badge or
   * overlay DOM change does not clear and redraw the drawing.
   *
   * @returns True if the WebGL view is dirty and needs re-rendering
   */
  get isDirty() {
    return this._isDirty
  }

  /**
   * True while batch conversion is still running.
   *
   * Parsing can report 100% before this reaches zero; callers that need a
   * fully drawable scene (export, scripted zoom) should wait on this (as
   * {@link waitUntilIdle} / {@link zoomToFitDrawing} do).
   *
   * The open-file progress overlay uses this when
   * {@link ApplicationOpenDatabaseOptions.progressiveRendering} is off, so
   * "Rendering drawing ..." stays up until conversion finishes.
   * When progressive rendering is on, the overlay hides at CONVERSION `END`
   * and does not wait on this flag (pan/zoom enabled while convert continues).
   * Deprecated `waitForTextGeometry` no longer selects this gate.
   */
  get isProcessingEntities() {
    return this._numOfEntitiesToProcess > 0
  }

  /**
   * True while the entity convert queue / {@link batchConvert} is still
   * draining.
   */
  get isConvertingEntities() {
    return this._numOfEntitiesToProcess > 0
  }

  /**
   * Waits until batch conversion finishes.
   *
   * Document open can resolve before conversion has drained. Call this before
   * raster/HTML export or scripted commands that assume a complete scene.
   *
   * @param timeoutMs - Maximum wait; returns `false` on timeout (default 60s).
   * @returns `true` when idle, `false` if still busy after the timeout.
   */
  async waitUntilIdle(timeoutMs = 60_000): Promise<boolean> {
    const deadline = Date.now() + Math.max(0, timeoutMs)
    // Require two consecutive idle samples so a brief gap between convert
    // batches does not look like a finished scene.
    let idleStreak = 0
    for (;;) {
      if (!this.isProcessingEntities) {
        idleStreak++
        if (idleStreak >= 2) {
          return true
        }
      } else {
        idleStreak = 0
      }
      if (Date.now() > deadline) {
        return !this.isProcessingEntities
      }
      await new Promise<void>(resolve => setTimeout(resolve, 16))
    }
  }

  /**
   * Whether entity conversion during document open is deferred for progressive display.
   */
  get progressiveRendering() {
    return this._progressiveRendering
  }
  set progressiveRendering(value: boolean) {
    this._progressiveRendering = value
    this.resetProgressiveOpenStats()
  }

  /**
   * When false, entity convert skips cooperative yields and non-progressive
   * mid-open WebGL paints (headless export). Interactive viewers keep this
   * `true` so "Rendering drawing ..." can still refresh the canvas.
   */
  get cooperativeYield() {
    return this._cooperativeYield
  }
  set cooperativeYield(value: boolean) {
    this._cooperativeYield = value
  }

  /**
   * Open-convert counters for OPENPROF / palette (cooperative yields during
   * convert, and throttled mid-open paints). Reset when progressive mode is
   * enabled for an open.
   */
  get progressiveOpenStats() {
    return {
      paintCount: this._progressivePaintCount,
      yieldCount: this._progressiveYieldCount
    }
  }

  private resetProgressiveOpenStats() {
    this._progressivePaintCount = 0
    this._progressiveYieldCount = 0
    this._lastProgressivePaintAt = 0
    this._progressivePaintUrgent = false
    this._progressiveInputPauseUntil = 0
  }

  /**
   * True while a recent canvas pointerdown/wheel asked convert to pause.
   * Does not treat hover mousemove as a pause (that starved convert).
   */
  private isProgressiveGesturePauseActive(): boolean {
    return performance.now() < this._progressiveInputPauseUntil
  }

  /**
   * True when the browser reports pending discrete input (clicks, keys).
   * Continuous events (mousemove) are excluded so hover does not throttle
   * progressive convert.
   */
  private isProgressiveDiscreteInputPending(): boolean {
    const scheduling = (
      navigator as Navigator & {
        scheduling?: {
          isInputPending?: (opts?: { includeContinuous?: boolean }) => boolean
        }
      }
    ).scheduling
    return scheduling?.isInputPending?.() === true
  }

  /**
   * Notes user interaction during progressive convert so paints stay urgent
   * and the drain loop pauses briefly for OrbitControls.
   */
  private noteProgressiveUserInput() {
    if (!this._progressiveRendering || this._numOfEntitiesToProcess <= 0) {
      return
    }
    this._progressivePaintUrgent = true
    this._isDirty = true
    this._progressiveInputPauseUntil =
      performance.now() + ThreeRendererView2d.PROGRESSIVE_INPUT_PAUSE_MS
  }

  /**
   * Yields during progressive convert: honor the time budget; after
   * pointerdown/wheel pause briefly for OrbitControls; on discrete pending
   * input yield once so handlers run without extending the pause window.
   */
  private async progressiveYieldForInput(
    yieldGate: CommonUiYieldGate | undefined,
    yieldToEventLoop: () => Promise<void>
  ): Promise<void> {
    if (this.isProgressiveGesturePauseActive()) {
      await yieldToEventLoop()
      while (performance.now() < this._progressiveInputPauseUntil) {
        await new Promise<void>(resolve => setTimeout(resolve, 16))
      }
      this._progressiveYieldCount++
      return
    }
    if (this.isProgressiveDiscreteInputPending()) {
      await yieldToEventLoop()
      this._progressiveYieldCount++
      return
    }
    if (!yieldGate) {
      return
    }
    const didYield = await yieldGate.maybeYield(yieldToEventLoop)
    if (didYield) {
      this._progressiveYieldCount++
    }
  }

  /**
   * Enables progressive camera framing while entities are batch-converted at
   * document open. Pair with {@link zoomToFitDrawing} for the final accurate fit.
   */
  beginProgressiveOpenFit() {
    this._progressiveOpenFit.begin(this._numOfEntitiesToProcess)
  }

  /**
   * Disables progressive open framing after the final zoom-to-fit runs.
   */
  endProgressiveOpenFit() {
    this._progressiveOpenFit.end()
  }

  /**
   * Sets whether the WebGL scene needs to be re-rendered.
   *
   * When true, the animation loop also runs CSS2DRenderer so HTML
   * overlays reproject after pan / zoom. HTML-only changes should set
   * {@link isHtmlDirty} instead.
   *
   * @param value - True to mark the WebGL view as needing re-rendering
   */
  set isDirty(value: boolean) {
    this._isDirty = value
  }

  /**
   * Gets whether CSS2D / HTML overlays need a CSS2DRenderer pass.
   *
   * @returns True if HTML overlays changed without a WebGL scene change
   */
  get isHtmlDirty() {
    return this._htmlDirty
  }

  /**
   * Sets whether CSS2D / HTML overlays need a CSS2DRenderer pass.
   *
   * Does not force a WebGL redraw. Camera changes still go through
   * {@link isDirty}, which also refreshes overlay projection.
   *
   * @param value - True to mark HTML overlays as needing a CSS2D pass
   */
  set isHtmlDirty(value: boolean) {
    this._htmlDirty = value
  }

  get center() {
    return this.activeLayoutView.center
  }
  set center(value: GeometryPoint2d) {
    this.activeLayoutView.center = value
  }

  /**
   * Gets the background color of the view.
   *
   * The color is represented as a 24-bit hexadecimal RGB number, e.g.,
   * `0x000000` for black.
   */
  get backgroundColor() {
    return this._renderer.getClearColor()
  }

  /**
   * Sets the background color of the view.
   *
   * @param value - The background color as a 24-bit hexadecimal RGB number
   */
  set backgroundColor(value: number) {
    this.applyCanvasBackground(value)
  }

  /**
   * Applies canvas background colour from layout background sysvars or explicit
   * API calls. Also refreshes ACI-7 foreground inversion via the style
   * manager. Does not touch `COLORTHEME` / UI chrome.
   */
  private applyCanvasBackground(value: number) {
    this._renderer.currentBackgroundColor = value
    // Style-manager changeForeground only updates cache entries; batch
    // containers own private material clones and must be repainted too.
    this._scene.repaintForegroundMaterials(
      graphicsInterfaceForegroundColorForBackground(value)
    )
    this.applyViewClearColor(value)
  }

  /**
   * Updates only the WebGL clear colour and cursor chrome.
   */
  private applyViewClearColor(value: number) {
    this._renderer.setClearColor(value)
    this.editor.syncCursorBackground(value)
    this._isDirty = true
  }

  /**
   * Applies the background setting. Called after a document is opened.
   */
  syncDisplaySettings() {
    this.applyCanvasBackground(readBackgroundColor())
  }

  /**
   * The block table record id of the model space
   */
  get modelSpaceBtrId() {
    return this._scene.modelSpaceBtrId
  }
  set modelSpaceBtrId(value: string) {
    this._scene.modelSpaceBtrId = value
  }

  /**
   * The block table record id associated with the active layout
   */
  get activeLayoutBtrId() {
    return this._scene.activeLayoutBtrId
  }
  set activeLayoutBtrId(value: string) {
    const previous = this._scene.activeLayoutBtrId
    this._layoutViewManager.activeLayoutBtrId = value
    this._scene.activeLayoutBtrId = value
    this.htmlTransientManager.setActiveLayoutId(value)
    this._isDirty = true
    if (previous !== value) {
      notifyMeasurementLayoutChanged()
    }
  }

  /**
   * The active layout view
   */
  get activeLayoutView() {
    return this._layoutViewManager.activeLayoutView!
  }

  /**
   * The statistics of the current scene
   */
  get stats() {
    return this._scene.stats
  }

  /**
   * CAD scene graph used for rendering and HTML export.
   */
  get cadScene() {
    return this._scene
  }

  /**
   * The internal THREE scene used by this view.
   */
  get internalScene() {
    return this._scene.internalScene
  }

  /**
   * The HTML transient elements manager for placing overlays anchored to world coordinates.
   */
  get htmlTransientManager(): ThreeRendererHtmlTransientManager {
    return this._scene.htmlTransientManager
  }

  /**
   * The internal THREE camera used by current active layout.
   */
  get internalCamera() {
    return this.activeLayoutView?.internalCamera
  }

  /**
   * @inheritdoc
   */
  screenToWorld(point: GeometryPoint2dLike): GeometryPoint2d {
    const activeLayoutView = this.activeLayoutView
    return activeLayoutView
      ? activeLayoutView.screenToWorld(point)
      : new GeometryPoint2d(point)
  }

  /**
   * @inheritdoc
   */
  worldToScreen(point: GeometryPoint2dLike): GeometryPoint2d {
    const activeLayoutView = this.activeLayoutView
    return activeLayoutView
      ? activeLayoutView.worldToScreen(point)
      : new GeometryPoint2d(point)
  }

  /**
   * @inheritdoc
   */
  zoomTo(box: GeometryBox2d, margin: number = 1.1) {
    this.activeLayoutView.zoomTo(box, margin)
    this._isDirty = true
  }

  /**
   * Re-render points with latest point style settings
   * @param displayMode Input display mode of points
   * @param displaySize Input display size of points (`PDSIZE`)
   */
  rerenderPoints(displayMode: number, displaySize: number = 0) {
    const activeLayout = this._scene.activeLayout
    if (activeLayout) {
      activeLayout.rerenderPoints(displayMode, displaySize)
      this._isDirty = true
    }
  }

  /**
   * When open framing waits on {@link zoomToFitDrawing}, show the linework
   * bounds as soon as entity convert drains.
   */
  requestOpenLineworkFrame() {
    this._openLineworkFramePending = true
    this.scheduleOpenLineworkFrame()
  }

  private cancelOpenLineworkFrame() {
    this._openLineworkFramePending = false
    if (this._openLineworkFrameTimer != null) {
      clearTimeout(this._openLineworkFrameTimer)
      this._openLineworkFrameTimer = null
    }
  }

  private scheduleOpenLineworkFrame() {
    if (
      this._openLineworkFrameTimer != null ||
      !this._openLineworkFramePending
    ) {
      return
    }
    const delay = this.isConvertingEntities ? 50 : 0
    this._openLineworkFrameTimer = setTimeout(() => {
      this._openLineworkFrameTimer = null
      if (!this._openLineworkFramePending) return
      if (this.isConvertingEntities) {
        this.scheduleOpenLineworkFrame()
        return
      }
      this.frameOpenLineworkIfReady()
    }, delay)
  }

  /**
   * @inheritdoc
   */
  zoomToFitDrawing(timeout: number = 0, layoutBtrId?: string) {
    const waiter = new EditorConditionWaiter(
      () => !this.isProcessingEntities,
      () => {
        if (layoutBtrId && this._externallyFramedLayouts.delete(layoutBtrId)) {
          this.endProgressiveOpenFit()
          return
        }
        this._progressiveOpenFit.applyFinalFit(() => this.getDrawingExtents())
        this.endProgressiveOpenFit()
        const originalBtrId = layoutBtrId ?? this.activeLayoutBtrId
        if (originalBtrId) {
          ApplicationZoomCmd.rememberOriginalView(this, originalBtrId)
        }
      },
      300, // check every 300 ms
      timeout
    )
    waiter.start()
  }

  /**
   * @inheritdoc
   */
  zoomToSmartExtents(timeout: number = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      const waiter = new EditorConditionWaiter(
        () => !this.isProcessingEntities,
        () => {
          void (async () => {
            try {
              const smart = await this.resolveSmartFitBox()
              if (smart) {
                this.zoomTo(smart)
                this._isDirty = true
                this.endProgressiveOpenFit()
                resolve()
                return
              }
              this._progressiveOpenFit.applyFinalFit(() =>
                this.getDrawingExtents()
              )
              this.endProgressiveOpenFit()
              resolve()
            } catch (error) {
              // Always clear progressive-open framing so a failed smart fit
              // cannot leave the open-fit overlay/state stuck indefinitely.
              this.endProgressiveOpenFit()
              reject(error)
            }
          })()
        },
        300,
        timeout
      )
      waiter.start()
    })
  }

  /**
   * Resolves intelligent zoom extents from spatial-index entity boxes.
   * Reuses the layout cache until entity geometry extents are invalidated.
   * Collects and clusters cooperatively so the UI thread stays responsive.
   */
  private async resolveSmartFitBox(): Promise<GeometryBox2d | undefined> {
    const activeLayout = this._scene.activeLayout
    if (!activeLayout) return undefined
    const cached = activeLayout.cachedSmartExtents
    if (cached) {
      return cached
    }
    const generation = activeLayout.smartExtentsGeneration
    const work = new ThreeRendererWorkSlice()
    const entries = await activeLayout.collectSpatialExtentBoxesAsync(work)
    const smart = await computeIntelligentExtentsAsync(entries, work)
    // Geometry changed while we yielded: discard this result (a newer cache
    // may already exist; otherwise the caller falls back to drawing extents).
    if (activeLayout.smartExtentsGeneration !== generation) {
      return activeLayout.cachedSmartExtents
    }
    if (smart) {
      activeLayout.cachedSmartExtents = smart
    }
    return smart
  }

  /**
   * @inheritdoc
   */
  flyTo(point: GeometryPoint2dLike, scale: number) {
    this.activeLayoutView.flyTo(point, scale)
    this._isDirty = true
  }

  /**
   * @inheritdoc
   */
  pick(point?: GeometryPoint2dLike, hitRadius?: number, pickOneOnly?: boolean) {
    if (point == null) point = this.curPos
    const results: EditorSpatialQueryResultItemEx[] = []
    const activeLayout = this._scene.activeLayout
    if (!activeLayout) return results

    const activeLayoutView = this.activeLayoutView
    const effectiveHitRadius = hitRadius ?? this.selectionBoxSize
    const paperBox = activeLayoutView.pointToBox(point, effectiveHitRadius)
    const threshold = Math.max(
      paperBox.size.width / 2,
      paperBox.size.height / 2
    )

    // Resolve hits in the active layout.
    const firstQueryResults = this._scene.search(paperBox)
    const raycaster = activeLayoutView.resetRaycaster(point, threshold)
    firstQueryResults.forEach(item => {
      if (!isEffectiveSpatialQueryHit(item)) return
      if (activeLayout.isIntersectWith(item.id, raycaster)) {
        results.push(item)
      }
    })

    const sortedResults = sortPickResults(results, point)
    return pickOneOnly ? sortedResults.slice(0, 1) : sortedResults
  }

  /**
   * @inheritdoc
   */
  search(
    box: GeometryBox2d | GeometryBox3d,
    options?: ThreeRendererSpatialSearchOptions
  ) {
    return this._scene.search(box, options)
  }

  /**
   * @inheritdoc
   */
  select(point?: GeometryPoint2dLike) {
    const idsAdded: Array<string> = []
    const results = this.pick(point)
    results.forEach(item => idsAdded.push(item.id))
    if (idsAdded.length > 0) this.selectionSet.add(idsAdded)
  }

  /**
   * @inheritdoc
   */
  selectByBox(box: GeometryBox2d) {
    this.selectByBoxWithMode(box, 'crossing', 'add')
  }

  /**
   * Drops crossing spatial hits whose curve geometry misses the pick box.
   *
   * Large closed polylines (site boundaries, frames) have AABBs that cover
   * huge empty interiors. Without this refine, crossing a small entity inside
   * that interior also selects those polylines and can stall highlight work.
   */
  protected override refineCrossingSelectionHits(
    box: GeometryBox2d,
    results: EditorSpatialQueryResultItemEx[]
  ): string[] {
    const sync = ApplicationDocManager.instance.curDocument?.modelSync
    if (!sync) {
      return results.map(item => item.id)
    }

    const ids: string[] = []
    for (const item of results) {
      if (!editorNeedsCrossingGeometryRefine(item)) {
        ids.push(item.id)
        continue
      }

      const entityBox = new GeometryBox2d(
        { x: item.minX, y: item.minY },
        { x: item.maxX, y: item.maxY }
      )
      if (box.containsBox(entityBox)) {
        ids.push(item.id)
        continue
      }

      const modelItem = sync.item(item.id)
      if (!modelItem || editorItemIntersectsSelectionBox(modelItem, box)) {
        ids.push(item.id)
      }
    }
    return ids
  }

  /**
   * Adds model space, the one layout that items are drawn in, if missing.
   */
  addModelSpace() {
    this.addLayout(APPLICATION_MODEL_SPACE_ID)
  }

  /**
   * Add the specified transient entity or entities into this view
   * @param entity Input one or multiple transient entities
   */
  addTransientEntity(entity: GraphicsInterfaceDrawable | GraphicsInterfaceDrawable[]) {
    const entities = Array.isArray(entity) ? entity : [entity]
    const epoch = this._convertEpoch
    // Overlay transients (measurement / jigs) must honor entity
    // lineweight even when LWDISPLAY is off; otherwise ribbon style is a no-op.
    const previousForce = this._renderer.forceShowLineWeight
    this._renderer.forceShowLineWeight = true
    try {
      for (let i = 0; i < entities.length; ++i) {
        const entity = entities[i]
        const threeEntity: ThreeRendererEntity | null = this.drawEntity(entity, true)
        if (threeEntity) {
          threeEntity.objectId = entity.objectId
          void threeEntity
            .asyncDraw()
            .then(() => {
              // Drop stale transients started before clear()/regen invalidated the view.
              if (epoch !== this._convertEpoch) {
                threeEntity.dispose()
                return
              }
              this._scene.addTransientEntity(threeEntity)
              this._isDirty = true
            })
            .catch(error => {
              log.error('[ThreeRendererView2d] Transient entity geometry failed:', error)
              threeEntity.dispose()
            })
        }
      }
    } finally {
      this._renderer.forceShowLineWeight = previousForce
    }
  }

  /**
   * Remove the specified transient entity from this view
   * @param objectId Input the object id of the transient entity to remove
   */
  removeTransientEntity(objectId: string) {
    this._scene.removeTransientEntity(objectId)
    this._isDirty = true
  }

  /**
   * Show or hide a published CAD transient entity (e.g. when its measurement
   * group is hidden by a layout switch).
   */
  setTransientEntityVisible(objectId: string, visible: boolean): void {
    if (this._scene.setTransientEntityVisible(objectId, visible)) {
      this._isDirty = true
    }
  }

  /**
   * @inheritdoc
   */
  canCreateEntityPreview(entityIds: string[]): boolean {
    return this._scene.canCreatePreview(entityIds)
  }

  /**
   * @inheritdoc
   */
  createEntityPreview(entityIds: string[]): string | null {
    const handleId = this._scene.createPreview(entityIds)
    if (handleId) {
      this._isDirty = true
    }
    return handleId
  }

  /**
   * @inheritdoc
   */
  updateEntityPreview(handleId: string, matrix: GeometryMatrix3d): void {
    if (
      this._scene.updatePreview(handleId, ThreeRendererMatrixUtil.createMatrix4(matrix))
    ) {
      this._isDirty = true
    }
  }

  /**
   * @inheritdoc
   */
  removeEntityPreview(handleId: string): void {
    if (this._scene.removePreview(handleId)) {
      this._isDirty = true
    }
  }

  /**
   * @inheritdoc
   */
  updateTransientPreviewTransforms(
    transforms: ReadonlyArray<{
      objectId: string
      matrix: GeometryMatrix3d
    }>
  ): void {
    const updated = this._scene.updateTransientPreviewTransforms(
      transforms.map(entry => ({
        objectId: entry.objectId,
        matrix: ThreeRendererMatrixUtil.createMatrix4(entry.matrix)
      }))
    )
    if (updated.webgl) this._isDirty = true
    if (updated.html) this._htmlDirty = true
  }

  /**
   * @inheritdoc
   */
  addEntity(entity: GraphicsInterfaceDrawable | GraphicsInterfaceDrawable[]) {
    const entities = Array.isArray(entity) ? entity : [entity]
    // Mark each owner layout as loaded as soon as the open-time ENTITY stream
    // enqueues work. Progressive convert may not have committed scene entities
    // yet (`entityCount` still 0); without this, `loadLayoutEntitiesIfNeeded`
    // (from `onAfterOpenDocument` → `setActiveLayout`) re-iterates the BTR,
    // double-increments `_numOfEntitiesToProcess`, and keeps
    // "Rendering drawing ..." up long after linework should have finished —
    // so progressive rendering cannot release pan/zoom on time.
    for (let i = 0; i < entities.length; i++) {
      const ownerId = entities[i]?.ownerId
      if (!ownerId) continue
      let layout = this._scene.layouts.get(ownerId)
      if (!layout) {
        this._scene.addEmptyLayout(ownerId)
        layout = this._scene.layouts.get(ownerId)
      }
      if (layout && !layout.isLoaded) {
        layout.isLoaded = true
      }
    }
    this._numOfEntitiesToProcess += entities.length
    // Always serialize convert through one drain loop. Non-progressive opens
    // used to `void batchConvert(chunk)` per ENTITY flush chunk, which ran
    // many converts in parallel and OOM'd dense drawings (e.g. cathedral.dwg)
    // during "Rendering drawing ...". Progressive mid-open paints stay gated
    // by `_progressiveRendering` inside batchConvert / markProgressiveDirty.
    this._convertQueue.push(...entities)
    void this.drainConvertQueue()
  }

  /**
   * @inheritdoc
   */
  removeEntity(entity: GraphicsInterfaceDrawable | GraphicsInterfaceDrawable[]) {
    const entities = Array.isArray(entity) ? entity : [entity]
    entities.forEach(entity => this._scene.removeEntity(entity.objectId))
    this._isDirty = true
  }

  /**
   * @inheritdoc
   */
  hasEntity(objectId: string) {
    return this._scene.hasEntity(objectId)
  }

  /**
   * @inheritdoc
   */
  getEntityVisible(objectId: string) {
    return this._scene.getEntityVisible(objectId)
  }

  /**
   * Updates entity visibility without rebuilding batched geometry.
   */
  updateEntityVisibility(entity: GraphicsInterfaceDrawable) {
    if (!this._scene.setEntityVisible(entity.objectId, entity.visibility)) {
      return false
    }
    this._isDirty = true
    return true
  }

  /**
   * Updates scene visibility for one entity without changing the database.
   */
  setEntitySceneVisible(objectId: string, visible: boolean) {
    if (!this._scene.setEntityVisible(objectId, visible)) {
      return false
    }
    this._isDirty = true
    return true
  }

  /**
   * Reapplies session-only hidden state after an entity enters the scene.
   */
  private applySessionHiddenObjectState(objectId: string) {
    if (!ApplicationDocManager.instance.curDocument.isObjectHidden(objectId)) {
      return
    }
    this._scene.setEntityVisible(objectId, false)
  }

  /**
   * Rebuilds scene geometry for entities whose shape or styling changed.
   *
   * Pure translations should use {@link translateEntity} instead.
   */
  updateEntity(entity: GraphicsInterfaceDrawable | GraphicsInterfaceDrawable[]) {
    const entities = Array.isArray(entity) ? entity : [entity]
    if (entities.length === 0) return

    const selectedIds = entities
      .map(item => item.objectId)
      .filter(objectId => this.selectionSet.has(objectId))

    for (let i = 0; i < entities.length; ++i) {
      const item = entities[i]
      const objectId = String(item.objectId ?? '')
      if (objectId) {
        // Invalidate in-flight commits for this id before releasing the claim /
        // clearing the scene, so a stale progressive convert cannot re-add the
        // pre-update drawable after (or instead of) the reconversion pass.
        this._entityConvertGeneration.set(
          objectId,
          (this._entityConvertGeneration.get(objectId) ?? 0) + 1
        )
        // Allow reconversion: open-time batchConvert claims objectIds to prevent
        // duplicate progressive slots. updateEntity must release that claim or
        // batchConvert skips the entity (scene already cleared → blank drawable).
        this._claimedConvertObjectIds.delete(objectId)
      }
      if (this._scene.hasEntity(item.objectId)) {
        this._scene.removeEntity(item.objectId)
      }
    }

    // Reconvert through the same path as initial load.
    void (async () => {
      await this.batchConvert(entities)
      if (selectedIds.length > 0) {
        this.highlight(selectedIds)
      }
      this._gripManager.refresh()
      this._isDirty = true
    })()
    this._isDirty = true
    // Not sure why texture for image entity isn't updated even if 'isDirty' flag is already set to true.
    // So add one timeout event to set 'isDirty' flag to true again to make it work
    setTimeout(() => {
      this._isDirty = true
    }, 100)
  }

  /**
   * @inheritdoc
   */
  addLayout(layoutBtrId: string) {
    this._scene.addEmptyLayout(layoutBtrId)
    this.createLayoutViewIfNeeded(layoutBtrId)
    this._isDirty = true
  }

  /**
   * Marks a layout as already framed by an external caller (typically
   * `ApplicationDocManager.onAfterOpenDocument`, which zooms the startup
   * layout right after parsing). Subsequent first-visit async zoom
   * callbacks (`applyInitialZoom`, `zoomToFitDrawing(..., layoutBtrId)`)
   * for this btrId are suppressed so they do not override the
   * application layer's initial camera.
   *
   * This is the public counterpart of the `_initializedLayouts` set —
   * exposed so the application layer can stay in sync with the view's
   * notion of "which layouts have been framed already" without
   * needing access to private state.
   */
  markLayoutAsInitialized(layoutBtrId: string) {
    this._initializedLayouts.add(layoutBtrId)
    this._externallyFramedLayouts.add(layoutBtrId)
  }

  /**
   * Whether the layout has already been visited (or framed by the
   * application layer), i.e. a switch to it will not run the first-visit
   * auto zoom. Lets callers that frame a layout themselves (FIND) call
   * {@link markLayoutAsInitialized} only when it is still needed.
   *
   * @param layoutBtrId Input the block table record id of the layout
   */
  isLayoutInitialized(layoutBtrId: string) {
    return this._initializedLayouts.has(layoutBtrId)
  }

  /**
   * Returns the 2D box of drawable geometry in the active layout.
   *
   * Uses {@link ThreeRendererScene.box}, which is derived from batch geometry — not
   * database header `EXTMIN`/`EXTMAX`, which are often stale on real DWGs.
   *
   * @inheritdoc
   */
  getDrawingExtents(): GeometryBox2d | undefined {
    const sceneBox = this._scene.box
    if (sceneBox && !sceneBox.isEmpty()) {
      return ThreeRendererGeometryUtil.threeBox3dToGeBox2d(sceneBox)
    }
    return undefined
  }

  /**
   * Invalidates in-flight progressive convert and empties the convert queue
   * without tearing down the renderer or DOM.
   *
   * Call before {@link ApplicationDocManager.destroy} tears down documents so
   * in-flight commits do not keep reading the manager singleton.
   */
  abortConversion() {
    // Invalidate any in-flight progressive convert so it neither paints into
    // the cleared scene nor double-decrements the processing counter.
    this._convertEpoch++
    this._convertQueue.length = 0
    this._numOfEntitiesToProcess = 0
    this._claimedConvertObjectIds.clear()
    this._entityConvertGeneration.clear()
    this.cancelOpenLineworkFrame()
  }

  /**
   * @inheritdoc
   */
  clear() {
    this.abortConversion()
    this._scene.clear()
    this._renderer.resetDrawOrderZ()
    this._isDirty = true
    this._initializedLayouts.clear()
    this._externallyFramedLayouts.clear()
    this._loadingLayouts.clear()
    this._renderer.dispose()
  }

  /**
   * Captures GPU/camera/selection state so another document can occupy this view.
   *
   * @returns Parked state owned by {@link ApplicationDocSession} until restore.
   */
  captureSessionState(): ThreeRendererViewSessionState {
    return {
      scene: this._scene,
      layoutViewManager: this._layoutViewManager,
      initializedLayouts: this._initializedLayouts,
      externallyFramedLayouts: this._externallyFramedLayouts,
      loadingLayouts: this._loadingLayouts,
      selectionIds: this.selectionSet.ids
    }
  }

  /**
   * Restores a parked document onto this shared view without disposing the renderer.
   *
   * @param state - Snapshot previously returned by {@link captureSessionState} or {@link beginNewSession}.
   */
  restoreSessionState(state: ThreeRendererViewSessionState): void {
    this._convertEpoch++
    this.cancelOpenLineworkFrame()
    this._convertQueue.length = 0
    this._numOfEntitiesToProcess = 0
    this._claimedConvertObjectIds.clear()
    this._entityConvertGeneration.clear()
    this._scene = state.scene
    this._layoutViewManager = state.layoutViewManager
    this._initializedLayouts = state.initializedLayouts
    this._externallyFramedLayouts = state.externallyFramedLayouts
    this._loadingLayouts = state.loadingLayouts
    this._layoutViewManager.resize(this.width, this.height)
    this.selectionSet.clear()
    if (state.selectionIds.length > 0) {
      this.selectionSet.add(state.selectionIds)
    }
    this._isDirty = true
  }

  /**
   * Detaches the current scene and installs an empty one for a newly opened document.
   *
   * @returns Parked state of the previous document.
   */
  beginNewSession(): ThreeRendererViewSessionState {
    const parked = this.captureSessionState()
    this._convertEpoch++
    this.cancelOpenLineworkFrame()
    this._convertQueue.length = 0
    this._numOfEntitiesToProcess = 0
    this._claimedConvertObjectIds.clear()
    this._entityConvertGeneration.clear()
    this._scene = this.createScene()
    this._layoutViewManager = new ThreeRendererLayoutViewManager()
    this._initializedLayouts = new Set()
    this._externallyFramedLayouts = new Set()
    this._loadingLayouts = new Set()
    this.selectionSet.clear()
    this._isDirty = true
    return parked
  }

  /**
   * Disposes GPU resources for a parked session that is being closed.
   *
   * @param state - Parked snapshot to discard.
   */
  disposeSessionState(state: ThreeRendererViewSessionState): void {
    state.scene.clear()
    state.layoutViewManager = new ThreeRendererLayoutViewManager()
    state.initializedLayouts.clear()
    state.externallyFramedLayouts.clear()
    state.loadingLayouts.clear()
    state.selectionIds = []
  }

  /**
   * True when this view is the document manager's live canvas.
   * Satellite/preview views must ignore global shortcuts and layout switches.
   * Returns false when no manager exists so post-destroy key handlers do not
   * reach {@link ApplicationDocManager.instance}.
   */
  private isActiveManagedView(): boolean {
    const singleton = ApplicationDocManager as unknown as {
      _instance?: { curView?: ThreeRendererView2d }
    }
    const current = singleton._instance?.curView
    return current != null && current === this
  }

  /**
   * Moves keyboard focus into the viewer container after canvas interaction so
   * document-level shortcuts stay scoped to this view.
   *
   * Skips host editable fields so wheel-over-canvas does not interrupt typing.
   */
  private focusViewerForShortcuts() {
    const active = document.activeElement
    if (active instanceof Node && this.container.contains(active)) {
      return
    }
    if (
      active instanceof HTMLElement &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable)
    ) {
      return
    }
    this.container.focus({ preventScroll: true })
  }

  /**
   * True when the key event originated from (or is focused within) this view.
   */
  private isShortcutEventInsideViewer(e: KeyboardEvent): boolean {
    const target = e.target
    if (target instanceof Node && this.container.contains(target)) {
      return true
    }
    const active = document.activeElement
    return active instanceof Node && this.container.contains(active)
  }

  /**
   * Drains the convert queue on a single serial worker so ENTITY flush chunks
   * can enqueue without overlapping multiple {@link batchConvert} runs (which
   * spikes heap on large drawings).
   *
   * Concurrent callers share the same promise; if more entities are queued
   * after a drain finishes, a follow-up drain is started.
   */
  private async drainConvertQueue(): Promise<void> {
    if (this._convertDrainPromise) {
      await this._convertDrainPromise
      if (this._convertQueue.length > 0) {
        await this.drainConvertQueue()
      }
      return
    }

    this._convertDrainPromise = this.runConvertDrain().finally(() => {
      this._convertDrainPromise = null
    })

    await this._convertDrainPromise
  }

  /**
   * Converts the queued entities in slices, active layout first.
   *
   * `drainConvertQueue` used to hand the whole queue to one
   * {@link batchConvert}. Model-space entities queued ahead of the
   * sheet then blocked the sheet's frame and viewports for the entire batch,
   * and a layout activated during that batch stayed starved until it
   * finished. Slices return here so a newly active layout is ordered ahead
   * of the remainder. Paper-active opens use a modest slice budget so the
   * sheet can paint soon; model-active opens match the inner
   * {@link batchConvert} yield cadence and grow slices for throughput so
   * Model-first drawings are not slowed by fine outer slicing. Headless
   * opens (`cooperativeYield === false`) still convert in one batch after
   * that reorder.
   */
  private async runConvertDrain(): Promise<void> {
    const epoch = this._convertEpoch
    const interactive = this._cooperativeYield
    // Model-first opens start at max slice so throughput matches a single
    // batchConvert; paper-first stays at 1 so the sheet can paint in small
    // bites. Layout switches reset slice below.
    let slice = !interactive
      ? Number.POSITIVE_INFINITY
      : this.activeLayoutBtrId === this.modelSpaceBtrId
        ? ThreeRendererView2d.CONVERT_SLICE_MAX
        : 1
    let lastYieldAt = performance.now()
    let state = createConvertPending(
      this._convertQueue.splice(0, this._convertQueue.length),
      this.activeLayoutBtrId
    )

    while (
      state.cursor < state.pending.length ||
      this._convertQueue.length > 0
    ) {
      if (this._convertEpoch !== epoch) return

      const queued = this._convertQueue.splice(0, this._convertQueue.length)
      const activeNow = this.activeLayoutBtrId
      const activeChanged = activeNow !== state.activeOwnerId
      state = absorbConvertQueue(state, queued, activeNow)
      if (activeChanged) {
        // Drop back to a small slice so the newly active layout's own
        // entities are not buried inside a leftover large model-space bite.
        if (interactive) slice = 1
      }

      if (state.cursor >= state.pending.length) break

      const end = Math.min(state.pending.length, state.cursor + slice)
      const startedAt = performance.now()
      await this.batchConvert(state.pending.slice(state.cursor, end))
      state.cursor = end
      if (this._convertEpoch !== epoch) return

      if (!interactive) continue

      const took = performance.now() - startedAt
      const modelActive = state.activeOwnerId === this.modelSpaceBtrId
      // Model-first opens only need occasional slice boundaries so a sheet
      // activated mid-load can jump the queue. Progressive uses a tighter
      // budget so input stays responsive after the overlay hides.
      const modelYieldBudget = this._progressiveRendering
        ? ThreeRendererView2d.PROGRESSIVE_OPEN_YIELD_BUDGET_MS
        : ThreeRendererView2d.OPEN_CONVERT_YIELD_BUDGET_MS
      const budget = modelActive
        ? modelYieldBudget
        : ThreeRendererView2d.CONVERT_SLICE_BUDGET_MS
      slice = adaptConvertSliceSize({
        slice,
        tookMs: took,
        budgetMs: budget,
        maxSlice: ThreeRendererView2d.CONVERT_SLICE_MAX,
        // Fine 2× growth only while a paper sheet still needs converting.
        // Model-active (or paper already drained) prefers 4× throughput.
        activeLayoutPending: !modelActive && hasPendingActiveOwner(state)
      })
      if (
        this._progressiveRendering &&
        this.isProgressiveGesturePauseActive()
      ) {
        await new Promise<void>(resolve => setTimeout(resolve, 0))
        while (performance.now() < this._progressiveInputPauseUntil) {
          await new Promise<void>(resolve => setTimeout(resolve, 16))
        }
        lastYieldAt = performance.now()
        if (this._convertEpoch !== epoch) return
      } else if (
        this._progressiveRendering &&
        this.isProgressiveDiscreteInputPending()
      ) {
        await new Promise<void>(resolve => setTimeout(resolve, 0))
        lastYieldAt = performance.now()
        if (this._convertEpoch !== epoch) return
      } else if (performance.now() - lastYieldAt >= budget) {
        await new Promise<void>(resolve => setTimeout(resolve, 0))
        lastYieldAt = performance.now()
        if (this._convertEpoch !== epoch) return
      }
    }
  }

  /**
   * Marks the canvas dirty for progressive open, throttled to avoid painting
   * on every entity (which dominated total open time).
   *
   * Does not stamp {@link _lastProgressivePaintAt} — that updates only when
   * {@link animate} actually paints. Does not set
   * {@link _progressivePaintUrgent}; camera moves do that so pan/zoom stay
   * immediate while convert-driven paints remain rare.
   */
  private markProgressiveDirty(force = false) {
    const now = performance.now()
    if (
      force ||
      now - this._lastProgressivePaintAt >=
        ThreeRendererView2d.PROGRESSIVE_OPEN_PAINT_INTERVAL_MS
    ) {
      this._isDirty = true
    }
  }

  /**
   * Interactive non-progressive open: dirty the canvas so {@link animate} can
   * refresh under "Rendering drawing ...". Headless (`cooperativeYield`
   * false) leaves this unset; the pool-drain / convert-end dirty is enough.
   * {@link animate} applies {@link NON_PROGRESSIVE_OPEN_PAINT_INTERVAL_MS}.
   */
  private markInteractiveOpenDirty() {
    if (this._progressiveRendering || !this._cooperativeYield) {
      return
    }
    this._isDirty = true
  }

  /**
   * True when this frame's WebGL paint should count toward OPENPROF mid-open
   * paints and use the open-time throttle (unless the camera marked urgent).
   */
  private shouldCountMidOpenPaint(
    stillLoading: boolean,
    sceneBusy: boolean
  ): boolean {
    return (
      (this._progressiveRendering && stillLoading) ||
      (!this._progressiveRendering && this._cooperativeYield && sceneBusy)
    )
  }

  /**
   * @inheritdoc
   */
  highlight(ids: string[]) {
    if (!this.entitySelectionEnabled) return
    this._isDirty = this._scene.select(ids)
  }

  /**
   * @inheritdoc
   */
  unhighlight(ids: string[]) {
    this._isDirty = this._scene.unselect(ids)
  }

  stopAnimationLoop() {
    if (this._rafId != null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
  }

  /**
   * Releases canvas DOM, WebGL context, convert work, and listeners.
   *
   * Call when this view will no longer be used (manager destroy / split
   * view teardown). Safe to call more than once.
   */
  dispose() {
    if (this._viewDisposed) return
    this._viewDisposed = true

    // Stop convert before tearing down documents/singletons that commit paths read.
    this.abortConversion()

    this._disposeCanvasTouchCallout?.()
    this._disposeCanvasTouchCallout = undefined
    this._disposeProgressiveInputWatch?.()
    this._disposeProgressiveInputWatch = undefined
    this._disposeMobileBoxGesture?.()
    this._disposeMobileBoxGesture = undefined
    this._viewDomAbort.abort()

    if (this._onTextSynced) {
      ThreeRendererText.events.synced.removeEventListener(this._onTextSynced)
    }
    if (this._onSettingsModified) {
      ApplicationSettingManager.instance.events.modified.removeEventListener(
        this._onSettingsModified
      )
    }
    if (this._onCommandWillStartHitTest) {
      this.editor.events.commandWillStart.removeEventListener(
        this._onCommandWillStartHitTest
      )
    }
    if (this._onCommandEndedHitTest) {
      this.editor.events.commandEnded.removeEventListener(
        this._onCommandEndedHitTest
      )
    }

    this._gripManager.dispose()
    this.cancelOpenLineworkFrame()
    this.stopAnimationLoop()

    this.selectionSet.clear()
    this.htmlTransientManager.dispose()
    this._scene.clear()
    this._renderer.dispose()

    const webgl = this._renderer.internalRenderer
    webgl.dispose()
    webgl.forceContextLoss()

    this.canvas.remove()
    this._css2dRenderer.domElement.remove()
    this._stats.dom.remove()

    // Editor / command line / ResizeObserver (after canvas/CSS2D removed).
    super.dispose()
  }

  /**
   * @inheritdoc
   */
  onHover(id: string) {
    if (!this.entitySelectionEnabled) return
    this._isDirty = this._scene.hover([id])
  }

  /**
   * @inheritdoc
   */
  onUnhover(id: string) {
    this._isDirty = this._scene.unhover([id])
  }

  protected createScene() {
    return new ThreeRendererScene()
  }

  private createStats(show?: boolean) {
    const stats = new Stats()
    document.body.appendChild(stats.dom)

    // Show Stats component at the right-bottom corner of the window
    const statsDom = stats.dom
    statsDom.style.position = 'fixed'
    statsDom.style.inset = 'unset'
    statsDom.style.bottom = '30px'
    statsDom.style.right = '0px'
    this.toggleStatsVisibility(stats, show)
    return stats
  }

  protected onWindowResize() {
    // Refresh size first, then sync WebGL / CSS2D / frustum before notifying
    // listeners so `worldToScreen` consumers see the new projection.
    this.refreshViewSize()
    this._renderer.setSize(this.width, this.height)
    this._css2dRenderer.setSize(this.width, this.height)
    this._layoutViewManager.resize(this.width, this.height)
    this._isDirty = true
    this.events.viewResize.dispatch({
      width: this.width,
      height: this.height
    })
    // CSS2D badges reproject via `_isDirty`. Canvas overlays (measure /
    // measurement strokes, live preview) paint with `worldToScreen` and listen to
    // `viewChanged` only — resize must notify them too.
    this.events.viewChanged.dispatch()
  }

  private animate = () => {
    this._rafId = requestAnimationFrame(this.animate)

    this.events.renderFrame.dispatch({
      render: this._renderer,
      camera: this.internalCamera
    })

    const stillLoading = this._numOfEntitiesToProcess > 0
    const sceneBusy = stillLoading
    // Headless non-progressive (`cooperativeYield` false): skip WebGL until
    // idle. Export reads scene batches, not the framebuffer, and software
    // WebGL + uncapped rAF spent most of open time rasterizing. Interactive
    // non-progressive still paints under "Rendering drawing ..." — throttled
    // below so each converted batch does not redraw the full scene.
    const deferRenderWhileLoading =
      !this._progressiveRendering && !this._cooperativeYield && sceneBusy
    if (!this._isDirty && !this._htmlDirty && !sceneBusy) {
      return
    }
    if (deferRenderWhileLoading) return
    if (!this._isDirty && !this._htmlDirty) return

    // Mid-open throttle: progressive convert paints, and interactive
    // non-progressive paints while the scene is still busy. Camera changes
    // set `_progressivePaintUrgent` so pan/zoom still redraw now.
    const countMidOpenPaint = this.shouldCountMidOpenPaint(
      stillLoading,
      sceneBusy
    )
    const throttleOpenPaint =
      this._isDirty && !this._progressivePaintUrgent && countMidOpenPaint
    if (throttleOpenPaint) {
      const intervalMs = this._progressiveRendering
        ? ThreeRendererView2d.PROGRESSIVE_OPEN_PAINT_INTERVAL_MS
        : ThreeRendererView2d.NON_PROGRESSIVE_OPEN_PAINT_INTERVAL_MS
      if (performance.now() - this._lastProgressivePaintAt < intervalMs) {
        return
      }
    }

    let needsRedraw = false
    if (this._isDirty) {
      if (countMidOpenPaint) {
        this._progressivePaintCount++
        this._lastProgressivePaintAt = performance.now()
        this._progressivePaintUrgent = false
      }
      needsRedraw = this._layoutViewManager.render(this._scene)
    }
    // Camera / WebGL dirty also reprojects CSS2D overlays. HTML-only dirty
    // skips the WebGL pass so measurement badges can update
    // without clearing and redrawing the drawing.
    if (this.internalCamera && (this._isDirty || this._htmlDirty)) {
      this._css2dRenderer.render(this._scene.internalScene, this.internalCamera)
    }
    this._stats?.update()
    // Do not re-dirty every frame during progressive open — paint is throttled
    // from geometry batches to keep total open time down. Counter hitting 0
    // still forces a final dirty in decreaseNumOfEntitiesToProcess().
    this._isDirty = needsRedraw
    this._htmlDirty = false
  }

  private startAnimationLoop() {
    if (this._rafId == null) {
      this._rafId = requestAnimationFrame(this.animate)
    }
  }

  /**
   * Create the layout view with the specified block table record id.
   * @param layoutBtrId Input the block table record id associated with the layout view.
   */
  private createLayoutViewIfNeeded(layoutBtrId: string) {
    let layoutView = this._layoutViewManager.getAt(layoutBtrId)
    if (layoutView == null) {
      layoutView = new ThreeRendererLayoutView(
        this._renderer,
        layoutBtrId,
        this.width,
        this.height
      )
      layoutView.events.viewChanged.addEventListener(() => {
        this._progressiveOpenFit.onLayoutViewChanged()
        this._isDirty = true
        // Bypass mid-open paint throttle so pan/zoom (and incremental fit)
        // remain visible while convert continues.
        if (this._progressiveRendering && this._numOfEntitiesToProcess > 0) {
          this._progressivePaintUrgent = true
        }
        this.events.viewChanged.dispatch()
        this.clearHover()
      })
      this._layoutViewManager.add(layoutView)
    }
    return layoutView
  }

  /**
   * Show or hide stats component
   * @param show If it is true, show stats component. Otherwise, hide stats component.
   * Default value is false.
   */
  private toggleStatsVisibility(stats: Stats, show?: boolean) {
    if (show) {
      stats.dom.style.display = 'block' // Show the stats
    } else {
      stats.dom.style.display = 'none' // Hide the stats
    }
  }

  private drawEntity(entity: GraphicsInterfaceDrawable, delay?: boolean) {
    return entity.worldDraw(this._renderer, delay) as ThreeRendererEntity | null
  }

  /**
   * Converts the specified database entities to three entities
   * @param entities - The database entities
   * @returns The converted three entities
   */
  private async batchConvert(
    entities: GraphicsInterfaceDrawable[],
    options: { forExport?: boolean } = {}
  ) {
    const epoch = this._convertEpoch
    const progressive = this._progressiveRendering && !options.forExport
    // Time-budgeted yields keep the UI (and optional progressive paints) alive
    // during large open chunks. Count-based yields alone stall on expensive
    // hatch batches. Prefer setTimeout(0) over rAF: waiting a full
    // frame per yield inflated total open wall time without improving
    // first-paint much.
    //
    // Always yield for interactive opens — not only when progressiveRendering
    // is on. Otherwise a long sync convert blocks the main thread, the
    // progress overlay cannot poll `isProcessingEntities`, and Chromium may
    // treat the tab as hung ("Page Unresponsive" / kill) at the
    // "Rendering drawing ..." stage. Mid-open WebGL paints are gated by
    // `progressive` / markProgressiveDirty, or markInteractiveOpenDirty
    // when cooperative yields are on.
    //
    // Headless export sets cooperativeYield=false (or forExport) so convert
    // does not pay for setTimeout yields the CLI never needs.
    const yieldBudgetMs = progressive
      ? ThreeRendererView2d.PROGRESSIVE_OPEN_YIELD_BUDGET_MS
      : ThreeRendererView2d.OPEN_CONVERT_YIELD_BUDGET_MS
    const yieldGate =
      options.forExport || !this._cooperativeYield
        ? undefined
        : new CommonUiYieldGate(yieldBudgetMs)
    const yieldToEventLoop = () =>
      new Promise<void>(resolve => setTimeout(resolve, 0))
    for (let i = 0; i < entities.length; ++i) {
      const entity = entities[i]
      try {
        // Document was cleared / replaced while this batch was draining.
        if (epoch !== this._convertEpoch) {
          continue
        }
        if (!entity.visibility) {
          continue
        }

        // Open and export can both observe the same id: the open drain claims
        // it before it calls addEntity, and export convert
        // used to ignore that claim (`forExport`) and expand the block again.
        // Claim as soon as convert starts so a later pass skips it. Skipping
        // a claimed id is safe for export — off/frozen entities are not
        // claimed when open skipped them, so they still convert here.
        const objectId = String(entity.objectId ?? '')
        let convertGen = 0
        if (
          objectId &&
          (this.hasEntity(objectId) ||
            this._claimedConvertObjectIds.has(objectId))
        ) {
          continue
        }
        if (objectId) {
          this._claimedConvertObjectIds.add(objectId)
          convertGen = this._entityConvertGeneration.get(objectId) ?? 0
        }

        // Fast path: entities that declare a single batchable primitive append
        // directly into batches, skipping temporary drawable allocate → clone → dispose.
        const directMeta = tryBuildDirectEntityMeta(entity, this._renderer)
        if (directMeta) {
          let added = false
          let superseded = false
          try {
            if (
              objectId &&
              (this._entityConvertGeneration.get(objectId) ?? 0) !== convertGen
            ) {
              superseded = true
            } else {
              added = this._scene.addDirectEntity(directMeta, true)
              if (added) {
                this.applySessionHiddenObjectState(entity.objectId)
                if (progressive) {
                  this.markProgressiveDirty()
                  this._progressiveOpenFit.afterGeometryBatch(
                    () => this.getDrawingExtents(),
                    i
                  )
                } else {
                  this.markInteractiveOpenDirty()
                }
              }
            }
          } finally {
            directMeta.geometry.dispose()
          }
          if (superseded || added) {
            continue
          }
          // Append refused (e.g. invisible) — fall through to the legacy path.
        }

        const threeEntity: ThreeRendererEntity | null = this.drawEntity(entity, false)
        if (!threeEntity) {
          // Release the claim so a later export pass can retry; otherwise
          // `forExport` claim checks would skip this id forever.
          if (objectId) {
            this._claimedConvertObjectIds.delete(objectId)
          }
          continue
        }

        if (threeEntity) {
          threeEntity.objectId = entity.objectId
          threeEntity.ownerId = entity.ownerId
          threeEntity.visible = true
          if (
            objectId &&
            (this._entityConvertGeneration.get(objectId) ?? 0) !== convertGen
          ) {
            threeEntity.dispose()
            continue
          }
          if (threeEntity instanceof ThreeRendererGroup) {
            this.syncGroupSpatialBoundsForIndexing(threeEntity)
          }
          this._scene.addEntity(threeEntity, true)
          this.applySessionHiddenObjectState(entity.objectId)
          // Release memory occupied by this entity
          threeEntity.dispose()
          if (progressive) {
            this.markProgressiveDirty()
            this._progressiveOpenFit.afterGeometryBatch(
              () => this.getDrawingExtents(),
              i
            )
          } else {
            this.markInteractiveOpenDirty()
          }
        }
      } catch (error) {
        const failedId = String(entity.objectId ?? '')
        if (failedId) {
          this._claimedConvertObjectIds.delete(failedId)
        }
        log.error(
          `[ThreeRendererView2d] Failed to convert entity ${entity.objectId} (${entity.type}):`,
          error
        )
      } finally {
        // Counter was reset in clear() when the epoch advanced; do not
        // decrease again or isProcessingEntities can go negative/warn.
        if (epoch === this._convertEpoch) {
          this.decreaseNumOfEntitiesToProcess()
        }
      }

      if (epoch !== this._convertEpoch) {
        continue
      }

      if (progressive) {
        // Prefer input-aware yields so pan/zoom are not starved after the
        // overlay is gone; paint throttling stays in markProgressiveDirty.
        await this.progressiveYieldForInput(yieldGate, yieldToEventLoop)
      } else if (yieldGate) {
        const didYield = await yieldGate.maybeYield(yieldToEventLoop)
        if (didYield) {
          this._progressiveYieldCount++
        }
      }
    }
  }

  /**
   * Rebuilds group child boxes and aligns aggregate {@link ThreeRendererGroup.wcsBbox}
   * with their union before spatial-index registration.
   */
  private syncGroupSpatialBoundsForIndexing(group: ThreeRendererGroup) {
    group.refreshWcsChildBoxesFromChildren()
    if (group.wcsChildBoxes.length === 0) {
      return
    }

    const childBoxes: EditorSpatialQueryResultItem[] = group.wcsChildBoxes.map(
      box => ({
        minX: box.minX,
        minY: box.minY,
        maxX: box.maxX,
        maxY: box.maxY,
        id: box.id
      })
    )
    group.wcsBbox = unionGroupWcsChildBoxes(group)

    const userData = group.userData as {
      spatialIndexChildBoxes?: EditorSpatialQueryResultItem[]
    }
    userData.spatialIndexChildBoxes = childBoxes
  }

  private decreaseNumOfEntitiesToProcess() {
    this._numOfEntitiesToProcess--
    if (this._numOfEntitiesToProcess < 0) {
      this._numOfEntitiesToProcess = 0
      log.warn(
        'Something wrong! The number of entities to process should not be less than 0.'
      )
    } else if (this._numOfEntitiesToProcess === 0) {
      // Always mark dirty when the queue drains. Progressive open throttles
      // mid-open paints, so the last batch would otherwise never redraw until
      // the user pans/zooms (animate bails when !_isDirty && !_htmlDirty &&
      // !stillLoading).
      this._isDirty = true
    }
  }

  /**
   * Zooms to batch geometry once, after entity convert has drained.
   */
  private frameOpenLineworkIfReady() {
    if (!this._openLineworkFramePending || this.isConvertingEntities) {
      return
    }
    const box = this.getDrawingExtents()
    if (!box || box.isEmpty()) {
      this._openLineworkFramePending = false
      return
    }
    this._openLineworkFramePending = false
    // Programmatic so a progressive open does not treat this as a user zoom
    // and skip the final fit.
    this._progressiveOpenFit.frameProgrammatically(box)
  }

}
