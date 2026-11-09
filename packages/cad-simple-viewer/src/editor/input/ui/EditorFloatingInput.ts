import {
  GeometryPoint2d,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'

import {
  ApplicationSettingManager,
  type ApplicationSettingManagerEventArgs
} from '../../../app/ApplicationSettingManager'
import { EditorBaseView } from '../../view'
import { EditorOsnapPoint, EditorOsnapResolver } from '../EditorOsnapResolver'
import { constrainToTracking } from '../EditorPolarTracking'
import { EditorMarkerManager } from '../marker'
import { EditorFloatingInputBoxes } from './EditorFloatingInputBoxes'
import {
  EditorFloatingInputCancelCallback,
  EditorFloatingInputChangeCallback,
  EditorFloatingInputCommitCallback,
  EditorFloatingInputDrawPreviewCallback,
  EditorFloatingInputDynamicValueCallback,
  EditorFloatingInputNoneCallback,
  EditorFloatingInputOptions,
  EditorFloatingInputValidationCallback
} from './EditorFloatingInputTypes'
import { EditorFloatingMessage } from './EditorFloatingMessage'
import { EditorRubberBand } from './EditorRubberBand'

/**
 * A UI component providing a small floating input box used inside CAD editing
 * workflows. It supports both single-input (distance, angle, etc.) and
 * double-input (coordinate entry) modes.
 *
 * The component is responsible for:
 *
 * - Creating, styling, and destroying its HTML structure
 * - Handling keyboard events (Enter, Escape)
 * - Managing live validation (via built-in or custom callback)
 * - Emitting commit/change/cancel events
 * - Ensuring no memory leaks via `dispose()`
 *
 * This abstraction allows higher-level objects such as EditorInputManager to
 * remain clean and free from DOM-handling logic.
 */
export class EditorFloatingInput<T> extends EditorFloatingMessage {
  /** Stores last confirmed WCS point */
  lastPoint: GeometryPoint2d | null = null

  /** Inject styles only once */
  private static inputStylesInjected = false

  /** Input box container (single or double input) */
  private inputs?: EditorFloatingInputBoxes<T>

  /** Provides a temporary CAD-style rubber-band preview. */
  private rubberBand?: EditorRubberBand

  /** OSNAP marker manager to display and hide OSNAP marker */
  private osnapMarkerManager?: EditorMarkerManager

  /** Stores last confirmed osnap point */
  private lastOsnapPoint?: EditorOsnapPoint
  /** Stores last dynamic WCS point used for preview updates */
  private lastDynamicPoint?: GeometryPoint2dLike

  /** Reference point for ORTHOMODE cursor locking */
  private orthoReferencePoint?: GeometryPoint2dLike

  /** Callbacks */
  private onCommit?: EditorFloatingInputCommitCallback<T>
  private onChange?: EditorFloatingInputChangeCallback<T>
  private onCancel?: EditorFloatingInputCancelCallback
  private onNone?: EditorFloatingInputNoneCallback

  /** Validation and dynamic value providers */
  private validateFn: EditorFloatingInputValidationCallback<T>
  private getDynamicValue: EditorFloatingInputDynamicValueCallback<T>
  private drawPreview?: EditorFloatingInputDrawPreviewCallback

  /** Cached click handler */
  private boundOnClick: (e: MouseEvent) => void
  /** Cached `pointerdown` handler that arms a click commit. */
  private boundOnPointerDown: (e: PointerEvent) => void
  /**
   * When true, a left-button mouse/pen `pointerdown` landed on this prompt's
   * canvas, so the following `click` may commit.
   */
  private mouseClickArmed = false
  /** Whether to suppress UI display while keeping input active */
  private suppressDisplay: boolean = false
  /** When false, a click must not commit (string prompts). */
  private allowPickCommit = true
  /** Cached sysvar handler */
  private boundOnInputSettingChanged: (
    args: ApplicationSettingManagerEventArgs
  ) => void
  /** Cached view change handler */
  private boundOnViewChanged: () => void

  // ---------------------------------------------------------------------------
  // CONSTRUCTOR
  // ---------------------------------------------------------------------------

  /**
   * Constructs a new floating input widget with the given options.
   *
   * @param view - The view associated with the floating input
   * @param options Configuration object controlling behavior, callbacks,
   *                validation, and display mode.
   */
  constructor(view: EditorBaseView, options: EditorFloatingInputOptions<T>) {
    super(view, options)

    this.allowPrompt = options.allowPrompt !== false
    this.allowPickCommit = options.allowPickCommit !== false
    this.suppressDisplay = !this.isDynamicInputEnabled()
    this.orthoReferencePoint =
      options.orthoReferencePoint ?? options.basePoint ?? undefined

    // -----------------------------
    // OSNAP
    // -----------------------------
    if (!options.disableOSnap) {
      this.osnapMarkerManager = new EditorMarkerManager(view)
    }

    // -----------------------------
    // Rubber band
    // -----------------------------
    if (options.basePoint) {
      this.rubberBand = new EditorRubberBand(view)
      this.rubberBand.start(options.basePoint, {
        color: 'var(--ml-ui-canvas-line, #0f0)',
        showBaseLineOnly: options.showBaseLineOnly,
        baseAngle: options.baseAngle
      })
    }

    // -----------------------------
    // Callbacks
    // -----------------------------
    this.validateFn = options.validate
    this.getDynamicValue = options.getDynamicValue
    this.drawPreview = options.drawPreview

    this.onCommit = options.onCommit
    this.onChange = options.onChange
    this.onCancel = options.onCancel
    this.onNone = options.onNone

    // -----------------------------
    // Input boxes
    // -----------------------------
    if (options.inputCount !== 0) {
      this.inputs = new EditorFloatingInputBoxes<T>({
        parent: this.container,
        twoInputs: options.inputCount === 2,
        validate: this.validateFn,
        onCancel: this.onCancel,
        onNone: this.onNone,
        onCommit: this.onCommit,
        onChange: this.onChange,
        autoFocus: this.isDynamicInputEnabled(),
        allowNone: options.allowNone,
        useDefaultValue: options.useDefaultValue,
        defaultValue: options.defaultValue
      })
    }

    // -----------------------------
    // Click commit
    // -----------------------------
    this.boundOnClick = e => this.handleClick(e)
    this.parent.addEventListener('click', this.boundOnClick)
    this.boundOnPointerDown = e => this.handlePointerDown(e)
    this.parent.addEventListener('pointerdown', this.boundOnPointerDown, true)

    // -----------------------------
    // Dynamic input settings listener
    // -----------------------------
    this.boundOnInputSettingChanged = args => {
      const key = args.key
      if (key === 'dynamicInputMode' || key === 'dynamicPrompt') {
        this.updateDynamicInputDisplay()
      } else if (
        key === 'orthoMode' ||
        key === 'polarMode' ||
        key === 'polarAngle' ||
        key === 'polarAdditionalAngles'
      ) {
        this.requestPreviewRefresh()
      }
    }
    ApplicationSettingManager.instance.events.modified.addEventListener(
      this.boundOnInputSettingChanged
    )
    this.boundOnViewChanged = () => this.requestPreviewRefresh()
    this.view.events.viewChanged.addEventListener(this.boundOnViewChanged)
    this.view.events.viewResize.addEventListener(this.boundOnViewChanged)
    this.updateDynamicInputDisplay()

    this.injectInputCSS()
  }

  override showAt(pos: GeometryPoint2dLike) {
    if (this.disposed) return
    this.updateDynamicInputDisplay()
    if (!this.suppressDisplay) {
      super.showAt(pos)
    } else {
      this.visible = true
      this.container.style.display = 'none'
      this.setPosition(pos)
      this.parent.addEventListener('mousemove', this.boundOnMouseMove)
    }
    // Do not seed the jig from a dummy canvas-(0,0); wait for a real pointer.
    if (!this.view.hasCursorPos) return
    const wcsPos = this.view.screenToWorld(this.view.viewportToCanvas(pos))
    this.updateDynamicPreview(wcsPos)
  }

  private injectInputCSS() {
    if (EditorFloatingInput.inputStylesInjected) return
    EditorFloatingInput.inputStylesInjected = true

    const style = document.createElement('style')
    style.textContent = `
      .ml-floating-input input {
        font-size: 12px;
        padding: 2px 4px;
        margin-left: 6px;
        height: 22px;
        width: 90px;
        background: var(--ml-ui-bg, #888);
        border: 1px solid var(--ml-ui-border, #666);
        color: var(--ml-ui-text, #fff);
        border-radius: 2px;
      }
  
      .ml-floating-input input.invalid {
        border-color: var(--ml-ui-danger, red);
        color: var(--ml-ui-danger, red);
      }
    `
    document.head.appendChild(style)
  }

  // ---------------------------------------------------------------------------
  // Overrides
  // ---------------------------------------------------------------------------

  override dispose() {
    if (this.disposed) return
    super.dispose()

    this.parent.removeEventListener('click', this.boundOnClick)
    this.parent.removeEventListener(
      'pointerdown',
      this.boundOnPointerDown,
      true
    )
    ApplicationSettingManager.instance.events.modified.removeEventListener(
      this.boundOnInputSettingChanged
    )
    this.view.events.viewChanged.removeEventListener(this.boundOnViewChanged)
    this.view.events.viewResize.removeEventListener(this.boundOnViewChanged)
    this.inputs?.dispose()
    this.rubberBand?.dispose()
    this.osnapMarkerManager?.clear()
    this.view.osnapResolver.clearAcquiredCenters()
  }

  /**
   * Mouse move handler.
   * Updates dynamic input values, rubber-band preview, OSNAP marker,
   * and optional preview drawing.
   */
  protected override handleMouseMove(e: MouseEvent) {
    if (!this.visible) return

    const wcsPos = this.getPosition({ x: e.clientX, y: e.clientY })
    this.updateDynamicPreview(wcsPos)
  }

  /**
   * Re-render the current preview using the most recent cursor position.
   * Useful when modifier keys change without mouse movement.
   */
  requestPreviewRefresh() {
    if (!this.visible || !this.lastDynamicPoint) return
    this.updateDynamicPreview(this.lastDynamicPoint)

    if (this.osnapMarkerManager && this.lastOsnapPoint) {
      this.osnapMarkerManager.repositionTop(this.lastOsnapPoint)
    }
    this.osnapMarkerManager?.repositionHints()

    if (!this.suppressDisplay && this.view.curMousePos) {
      this.setPosition(this.view.canvasToViewport(this.view.curMousePos))
    }
  }

  // ---------------------------------------------------------------------------
  // Click / Commit
  // ---------------------------------------------------------------------------

  private handleClick(e: MouseEvent) {
    if (!this.visible) return
    if (!this.allowPickCommit) return
    // Commit only after this prompt saw a canvas pointerdown.
    if (!this.mouseClickArmed) return
    this.mouseClickArmed = false

    const wcsPos = this.getPosition({ x: e.clientX, y: e.clientY })
    const defaults = this.getDynamicValue(wcsPos)
    const committed = this.onCommit?.(defaults.value, wcsPos) ?? true
    if (committed) {
      this.lastPoint = wcsPos
    }
  }

  /**
   * Arms a click commit when the left button goes down on this prompt's canvas.
   *
   * @param e - Pointer event; button 0 only.
   */
  private handlePointerDown(e: PointerEvent) {
    if (!this.visible || e.button !== 0) return
    if (!this.allowPickCommit) return
    this.mouseClickArmed = true
  }

  /**
   * Starts rubber-band preview from a base point after the prompt has already begun.
   * Used by two-point distance acquisition when the first point is picked by click.
   */
  setBasePoint(
    basePoint: GeometryPoint2dLike,
    options?: {
      color?: string
      showBaseLineOnly?: boolean
      baseAngle?: number
    }
  ) {
    if (this.disposed || this.rubberBand) return
    this.rubberBand = new EditorRubberBand(this.view)
    this.rubberBand.start(basePoint, {
      color: options?.color ?? 'var(--ml-ui-canvas-line, #0f0)',
      showBaseLineOnly: options?.showBaseLineOnly,
      baseAngle: options?.baseAngle
    })
    this.orthoReferencePoint = basePoint
    this.requestPreviewRefresh()
  }

  private updateDynamicPreview(wcsPos: GeometryPoint2dLike) {
    this.lastDynamicPoint = { x: wcsPos.x, y: wcsPos.y }
    const defaults = this.getDynamicValue(wcsPos)

    this.inputs?.setValue(defaults.raw)

    // Ensure focus stays in input boxes
    if (this.inputs && !this.inputs.focused && !this.suppressDisplay) {
      this.inputs.focus()
    }

    this.rubberBand?.update(wcsPos)
    this.drawPreview?.(wcsPos)
  }

  // ---------------------------------------------------------------------------
  // Position & OSNAP
  // ---------------------------------------------------------------------------

  /**
   * Gets the current cursor position in WCS, considering OSNAP.
   */
  private getPosition(e: GeometryPoint2dLike) {
    // Update floating UI position (screen space)
    const mousePos = super.setPosition(e)

    // Convert cursor to WCS
    const wcsPos = this.view.screenToWorld(mousePos)

    // Apply OSNAP
    if (this.osnapMarkerManager) {
      this.lastOsnapPoint = this.view.osnapResolver.resolve({
        cursorWcs: wcsPos,
        lastPoint: this.lastPoint
          ? { x: this.lastPoint.x, y: this.lastPoint.y }
          : undefined
      })
      this.osnapMarkerManager.setHintMarkers(
        EditorOsnapResolver.displayCenterMarks(
          this.view.osnapResolver.acquiredCenterMarks,
          this.lastOsnapPoint
        )
      )

      if (this.lastOsnapPoint) {
        wcsPos.x = this.lastOsnapPoint.x
        wcsPos.y = this.lastOsnapPoint.y

        this.osnapMarkerManager.showOrRepositionMarker(
          this.lastOsnapPoint,
          EditorOsnapResolver.osnapModeToMarkerType(this.lastOsnapPoint.type)
        )
      } else {
        this.osnapMarkerManager.hideMarker()
      }
    }

    if (this.orthoReferencePoint) {
      const constrained = constrainToTracking(wcsPos, this.orthoReferencePoint)
      wcsPos.x = constrained.x
      wcsPos.y = constrained.y
    }

    return wcsPos
  }

  // ---------------------------------------------------------------------------
  // Dynamic Input Settings
  // ---------------------------------------------------------------------------

  private updateDynamicInputDisplay() {
    const dynamicEnabled = this.isDynamicInputEnabled()
    const promptEnabled = this.isDynamicPromptEnabled()

    this.setSuppressDisplay(!dynamicEnabled)
    this.setPromptVisible(this.allowPrompt && dynamicEnabled && promptEnabled)
  }

  private setSuppressDisplay(suppress: boolean) {
    if (this.suppressDisplay === suppress) return
    this.suppressDisplay = suppress

    if (!this.visible) return

    if (this.suppressDisplay) {
      this.container.style.display = 'none'
      this.inputs?.blur()
    } else {
      this.container.style.display = 'flex'
      if (this.inputs && !this.inputs.focused) {
        this.inputs.focus()
      }
    }
  }

  private setPromptVisible(show: boolean) {
    const hasMessage = !!this.label.textContent?.trim()
    if (!hasMessage) {
      this.label.style.display = 'none'
      return
    }
    this.label.style.display = show ? 'inline' : 'none'
  }
}
