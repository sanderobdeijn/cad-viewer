import { ThreeRendererHtmlCanvasOverlay } from './ThreeRendererHtmlCanvasOverlay'
import { AC_TR_HTML_DEFAULT_LAYER, ThreeRendererHtmlElement } from './ThreeRendererHtmlElement'
import { threeRendererIsHtmlGrip } from './ThreeRendererHtmlGrip'

/**
 * Options for an {@link ThreeRendererHtmlGroup}.
 */
export interface ThreeRendererHtmlGroupOptions {
  /** Unique group identifier */
  id: string
  /** Layer name for bulk show/hide/clear (default: 'default') */
  layer?: string
  /**
   * Optional layout block-table-record id this group belongs to.
   * When the manager's active layout changes, groups whose `layoutId`
   * does not match are hidden (and matching ones are shown).
   * Omit for groups that should remain visible on every layout.
   */
  layoutId?: string
  /**
   * When `true`, clicking any child requests selection of this group via the
   * manager. Defaults to `false`.
   */
  selectable?: boolean
  /**
   * Invoked after {@link ThreeRendererHtmlGroup.setSelected} changes the visual state.
   * Use for domain-specific extras (e.g. highlighting related CAD entities).
   */
  onSelectedChanged?: (selected: boolean, group: ThreeRendererHtmlGroup) => void
  /**
   * Invoked after {@link ThreeRendererHtmlGroup.setVisible} changes visibility
   * (e.g. when the active layout changes).
   */
  onVisibleChanged?: (visible: boolean, group: ThreeRendererHtmlGroup) => void
  /**
   * Invoked when the group is removed from the manager / disposed.
   * Use for non-HTML resources owned by the group.
   */
  onDispose?: () => void
}

/**
 * Logical group of related HTML overlays.
 *
 * Unlike a leaf element, a group has no world-space CSS2D anchor of its own.
 * Adding a group to {@link ThreeRendererHtmlTransientManager} publishes every CSS2D
 * child and (when selectable) wires click → group selection. Screen-space
 * {@link ThreeRendererHtmlCanvasOverlay} members are owned by the group (visibility /
 * selection / dispose) and are not published into the CSS2D scene.
 */
export class ThreeRendererHtmlGroup {
  readonly id: string
  readonly layer: string
  readonly layoutId?: string
  readonly selectable: boolean

  private readonly _children: ThreeRendererHtmlElement[] = []
  private readonly _canvases: ThreeRendererHtmlCanvasOverlay[] = []
  private _selected = false
  private _visible = true
  private _clickCleanups: (() => void)[] = []
  private _onSelectRequest?: (group: ThreeRendererHtmlGroup) => void

  onSelectedChanged?: (selected: boolean, group: ThreeRendererHtmlGroup) => void
  onVisibleChanged?: (visible: boolean, group: ThreeRendererHtmlGroup) => void
  onDispose?: () => void

  constructor(options: ThreeRendererHtmlGroupOptions) {
    this.id = options.id
    this.layer = options.layer ?? AC_TR_HTML_DEFAULT_LAYER
    this.layoutId = options.layoutId
    this.selectable = options.selectable === true
    this.onSelectedChanged = options.onSelectedChanged
    this.onVisibleChanged = options.onVisibleChanged
    this.onDispose = options.onDispose
  }

  /** CSS2D child overlays currently owned by this group. */
  get children(): readonly ThreeRendererHtmlElement[] {
    return this._children
  }

  /** Screen-space canvas overlays currently owned by this group. */
  get canvases(): readonly ThreeRendererHtmlCanvasOverlay[] {
    return this._canvases
  }

  /** Whether the group is currently drawn as selected. */
  get selected(): boolean {
    return this._selected
  }

  /** Whether the group's children are currently visible. */
  get visible(): boolean {
    return this._visible
  }

  /**
   * Append one or more CSS2D child overlays.
   * Children keep their own ids / world positions / layers.
   */
  add(...children: ThreeRendererHtmlElement[]): this {
    for (const child of children) {
      this._children.push(child)
      if (this.selectable && !threeRendererIsHtmlGrip(child.element)) {
        child.element.style.pointerEvents = 'auto'
        child.element.style.cursor = 'pointer'
      }
      child.object.visible = this._visible
    }
    // If already bound to a manager, rebind so new children receive clicks.
    if (this._onSelectRequest) {
      this.bindSelection(this._onSelectRequest)
    }
    return this
  }

  /**
   * Append one or more viewport canvas overlays owned by this group.
   * Visibility / selection follow the group; dispose removes the canvases.
   */
  addCanvas(...canvases: ThreeRendererHtmlCanvasOverlay[]): this {
    for (const canvas of canvases) {
      this._canvases.push(canvas)
      canvas.setVisible(this._visible)
      if (this._selected) {
        canvas.setSelected(true)
      }
    }
    return this
  }

  /**
   * Toggle selection visuals on every child / canvas and notify listeners.
   */
  setSelected(selected: boolean): void {
    if (this._selected === selected) return
    this._selected = selected
    for (const child of this._children) {
      child.setSelected(selected)
    }
    for (const canvas of this._canvases) {
      canvas.setSelected(selected)
    }
    this.onSelectedChanged?.(selected, this)
  }

  /**
   * Show or hide every child / canvas overlay and notify listeners.
   */
  setVisible(visible: boolean): void {
    if (this._visible === visible) return
    this._visible = visible
    for (const child of this._children) {
      child.object.visible = visible
    }
    for (const canvas of this._canvases) {
      canvas.setVisible(visible)
    }
    this.onVisibleChanged?.(visible, this)
  }

  /**
   * Wire child click handlers. Called by {@link ThreeRendererHtmlTransientManager}
   * after the group is added.
   */
  bindSelection(onSelect: (group: ThreeRendererHtmlGroup) => void): void {
    this.unbindSelection()
    this._onSelectRequest = onSelect
    if (!this.selectable) return

    for (const child of this._children) {
      if (threeRendererIsHtmlGrip(child.element)) continue
      child.element.style.pointerEvents = 'auto'
      child.element.style.cursor = 'pointer'
      const handler = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null
        if (
          target?.isContentEditable ||
          target?.closest('[contenteditable="true"]')
        ) {
          e.stopPropagation()
          return
        }
        // Do not preventDefault: that suppresses the following dblclick.
        e.stopPropagation()
        onSelect(this)
      }
      child.element.addEventListener('click', handler)
      this._clickCleanups.push(() =>
        child.element.removeEventListener('click', handler)
      )
    }
  }

  /** Remove click handlers previously installed by {@link bindSelection}. */
  unbindSelection(): void {
    for (const cleanup of this._clickCleanups) cleanup()
    this._clickCleanups = []
  }

  /**
   * Release selection bindings, dispose owned canvases, and invoke
   * {@link onDispose}. CSS2D child disposal is owned by the manager.
   */
  dispose(): void {
    this.unbindSelection()
    this._onSelectRequest = undefined
    for (const canvas of this._canvases) {
      canvas.dispose()
    }
    this._canvases.length = 0
    try {
      this.onDispose?.()
    } catch {
      // Domain dispose must not block manager cleanup.
    }
  }
}
