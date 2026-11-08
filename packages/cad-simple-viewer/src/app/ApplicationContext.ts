import { CommonEventManager } from '@mlightcad/common'
import { ModelItemEventArgs } from '@mlightcad/geometry-engine'

import { EditorBaseView } from '../editor/view/EditorBaseView'
import { ThreeRendererView2d } from '../view'
import { ApplicationDocument } from './ApplicationDocument'
import { ApplicationSettingManager } from './ApplicationSettingManager'

/**
 * Application context that binds a CAD document with its associated view.
 *
 * This class establishes the connection between a CAD document (containing the drawing model)
 * and its visual representation (the view). It handles event forwarding between the document
 * and view to keep them synchronized.
 *
 * The context manages:
 * - Entity lifecycle events (add, modify, remove)
 * - System variable changes (like point display mode)
 * - Entity selection and highlighting
 *
 * Call {@link dispose} when the document is closed. Use {@link suspend} /
 * {@link resume} when parking an inactive document so its model events do
 * not mutate the shared view while another document is on screen.
 *
 * @example
 * ```typescript
 * const document = new ApplicationDocument();
 * const view = new ThreeRendererView2d();
 * const context = new ApplicationContext(view, document);
 *
 * // The context will automatically sync changes between document and view
 * // For example, when entities are added to the document, they appear in the view
 * ```
 */
export class ApplicationContext {
  /** The view component that renders the CAD drawing */
  private _view: EditorBaseView
  /** The document containing the drawing model */
  private _doc: ApplicationDocument
  /** When false, model and selection listeners no-op (inactive MDI session). */
  private _active = true
  /** Unbind functions registered in the constructor. */
  private readonly _disposers: Array<() => void> = []

  /**
   * Creates a new application context that binds a document with its view.
   *
   * The constructor sets up event listeners to synchronize the document and view:
   * - Entity additions/modifications are reflected in the view
   * - System variable changes (like point display mode) update rendering
   * - Entity selections show/hide grip points
   *
   * @param view - The view used to display the drawing
   * @param doc - The document containing the drawing model
   */
  constructor(view: EditorBaseView, doc: ApplicationDocument) {
    this._view = view
    this._doc = doc

    const bind = <T>(
      manager: CommonEventManager<T>,
      listener: (args: T) => void
    ) => {
      manager.addEventListener(listener)
      this._disposers.push(() => manager.removeEventListener(listener))
    }

    // The drawing window shows the document model.
    const model = doc.model
    const sync = doc.modelSync
    this.bindEntityLookup()

    // Add item to scene
    bind(model.events.itemAdded, ({ item }: ModelItemEventArgs) => {
      if (!this._active || this.view.hasEntity(item.id)) return
      const drawable = sync.drawable(item.id)
      if (drawable) this.view.addEntity(drawable)
    })

    // Update item
    bind(model.events.itemModified, ({ item }: ModelItemEventArgs) => {
      if (!this._active) return
      const drawable = sync.drawable(item.id)
      if (drawable) this.view.updateEntity(drawable)
    })

    // Remove item
    bind(model.events.itemRemoved, ({ item }: ModelItemEventArgs) => {
      if (!this._active || !this.view.hasEntity(item.id)) return
      this.view.removeEntity(sync.createDrawable(item))
    })

    // Set point display mode / size and line weight display.
    bind(ApplicationSettingManager.instance.events.modified, args => {
      if (args.key === 'pointDisplayMode' || args.key === 'pointDisplaySize') {
        if (!this._active) return
        const settings = ApplicationSettingManager.instance
        ;(this._view as ThreeRendererView2d).rerenderPoints(
          settings.get('pointDisplayMode'),
          settings.get('pointDisplaySize')
        )
      } else if (args.key === 'lineWeightDisplay') {
        if (!this._active) return
        const currentView = this._view as ThreeRendererView2d
        const showLineWeight = !!args.value
        if (currentView.renderer.showLineWeight !== showLineWeight) {
          currentView.renderer.showLineWeight = showLineWeight
          // Existing line objects may need different geometry/material classes.
          // Redraw to rebuild scene content using the new display mode.
          void this.regen()
        }
      }
    })

    // Show their grip points when entities are selected
    bind(view.selectionSet.events.selectionAdded, args => {
      if (!this._active) return
      view.highlight(args.ids)
    })

    // Hide their grip points when entities are deselected
    bind(view.selectionSet.events.selectionRemoved, args => {
      if (!this._active) return
      view.unhighlight(args.ids)
    })
  }

  /**
   * Gets the view component that renders the CAD drawing.
   *
   * @returns The associated view instance
   */
  get view() {
    return this._view
  }

  /**
   * Gets the document containing the drawing model.
   *
   * @returns The associated document instance
   */
  get doc(): ApplicationDocument {
    return this._doc
  }

  /**
   * Whether this context currently forwards model events to the shared view.
   */
  get isActive() {
    return this._active
  }

  /**
   * Stops forwarding model events to the view (document is no longer on screen).
   */
  suspend() {
    this._active = false
  }

  /**
   * Resumes forwarding model events after {@link suspend}.
   */
  resume() {
    this._active = true
    this.bindEntityLookup()
  }

  /**
   * Clears the view and draws the document again: model space and its layer,
   * then the items of its model.
   */
  async regen() {
    this._view.clear()
    this._view.addModelSpace()
    this.redrawModel()
  }

  /** Adds the items of the document's model to the view. */
  redrawModel() {
    if (!this._active) return
    const drawables = this._doc.modelSync.drawables(
      this._doc.model.items.map(item => item.id)
    )
    if (drawables.length > 0) this._view.addEntity(drawables)
  }

  /** Lets the view look up the items of this document's model. */
  private bindEntityLookup() {
    const sync = this._doc.modelSync
    this._view.itemLookup = id => sync.item(id)
  }

  /**
   * Removes all event listeners. Call when the document session is discarded.
   */
  dispose() {
    this._active = false
    for (const dispose of this._disposers) {
      dispose()
    }
    this._disposers.length = 0
  }
}
