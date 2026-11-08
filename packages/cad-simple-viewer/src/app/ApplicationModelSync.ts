import { CommonEventManager } from '@mlightcad/common'
import {
  GeometryDimension,
  GeometryPoint2d,
  Model,
  ModelItem,
  ModelTextItem
} from '@mlightcad/geometry-engine'

import {
  getMeasurementValueText,
  listLayoutMeasurements,
  subscribeMeasurements
} from '../command/measure/ApplicationMeasurementStore'
import type {
  ApplicationMeasurementGeometry,
  ApplicationMeasurementPoint2d,
  ApplicationMeasurementRecord
} from '../command/measure/ApplicationMeasurementTypes'
import type { EditorBaseView } from '../editor/view/EditorBaseView'
import { EditorOpenMode } from '../editor/view/EditorOpenMode'
import { APPLICATION_DIMENSION_POINTS } from '../model/ApplicationDimensionGeometry'
import {
  APPLICATION_MODEL_SPACE_ID,
  ApplicationItemDrawable,
  applicationPointDisplay,
  itemTypeName
} from '../model/ApplicationItemDrawable'
import type { ApplicationItemContents } from '../model/ApplicationItemGeometry'
import type { ThreeRendererView2d } from '../view'

/** The parts of a document that {@link ApplicationModelSync} uses. */
export interface ApplicationModelSyncDocument {
  /** Whether the document may be changed */
  readonly openMode: EditorOpenMode
}

function measurementPoints(
  geometry: ApplicationMeasurementGeometry
): Record<string, ApplicationMeasurementPoint2d> {
  switch (geometry.type) {
    case 'distance':
      return { start: geometry.start, end: geometry.end }
    case 'angle':
      return {
        vertex: geometry.vertex,
        arm1: geometry.arm1,
        arm2: geometry.arm2
      }
    case 'area':
      return Object.fromEntries(
        geometry.points.map((point, index) => [`point${index + 1}`, point])
      )
    case 'arc':
      return {
        center: geometry.center,
        start: geometry.start,
        end: geometry.end
      }
    case 'point':
      return { position: geometry.position }
  }
}

const MEASUREMENT_TYPE_NAMES = {
  distance: 'MeasureDistance',
  angle: 'MeasureAngle',
  area: 'MeasureArea',
  arc: 'MeasureArc',
  point: 'MeasurePoint'
}

const MEASUREMENT_TYPES = new Set(Object.values(MEASUREMENT_TYPE_NAMES))

/** The measured value is derived, so editing it does not change an item. */
const dimensionLine = (dimension: GeometryDimension) =>
  Model.formatDimension({ ...dimension, measurement: undefined })

const checkDimension = (dimension: GeometryDimension) => {
  const names = APPLICATION_DIMENSION_POINTS[dimension.type]
  if (!names) {
    throw new Error(`Unknown dimension type "${dimension.type}"`)
  }
  const given = Object.keys(dimension.points)
  for (const name of names) {
    if (!given.includes(name)) {
      throw new Error(`${dimension.type} needs ${name}`)
    }
  }
  for (const name of given) {
    if (!names.includes(name)) {
      throw new Error(`${dimension.type} has no ${name}`)
    }
  }
}

/** The line of text that describes an item, without its id. */
const lineOf = (item: ModelTextItem) =>
  item.kind === 'dimension'
    ? dimensionLine(item.geometry)
    : Model.formatItem({ ...item, id: undefined })

const isMeasurementItem = (item: ModelTextItem | ModelItem) =>
  item.kind === 'dimension' && MEASUREMENT_TYPES.has(item.geometry.type)

/**
 * Holds the {@link Model} of one document: the shapes, points and dimensions
 * of its drawing, and the way commands and the text editor change them.
 *
 * The model is the drawing. The drawing window draws each item through a
 * drawable from {@link drawable}, whose object id is the item id. Commands
 * change the drawing through {@link addItems}, {@link update} and
 * {@link remove}, and the text editor through {@link applyText}.
 *
 * Measurements are overlays rather than items of the drawing, so they are
 * followed through the measurement store of the document's view and listed
 * with the dimensions under their own ids. They are not drawn from the model.
 *
 * Call {@link dispose} to stop listening.
 */
export class ApplicationModelSync {
  /** The model of the drawing */
  readonly model = new Model()
  /** Events fired by this class */
  readonly events = {
    /** Fired after the contents of the model have changed */
    modelChanged: new CommonEventManager<{ model: Model }>()
  }

  /** Ids of the measurement items currently in {@link model} */
  private _measurementIds = new Set<string>()
  /** Drawables built for items, with the item each was built from */
  private readonly _drawables = new Map<
    string,
    { item: ModelItem; drawable: ApplicationItemDrawable }
  >()
  private readonly _unsubscribeMeasurements: () => void

  /**
   * Creates an empty model and starts following measurements.
   *
   * @param _doc - The document whose drawing this model holds
   * @param _getView - Returns the view showing this document, if it is on
   *   screen; its measurements are listed in the model
   */
  constructor(
    private readonly _doc: ApplicationModelSyncDocument,
    private readonly _getView: () => EditorBaseView | undefined = () => undefined
  ) {
    this._unsubscribeMeasurements = subscribeMeasurements(
      this.onMeasurementsChanged
    )
    this.model.events.itemAdded.addEventListener(this.onItemChanged)
    this.model.events.itemModified.addEventListener(this.onItemChanged)
    this.model.events.itemRemoved.addEventListener(this.onItemChanged)
    this.resync()
  }

  /**
   * Empties the drawing and lists the measurements again.
   *
   * Call when the document starts a new drawing.
   */
  resync() {
    this._drawables.clear()
    for (const item of this.model.items) {
      if (!this._measurementIds.has(item.id)) this.model.remove(item.id)
    }
    this.updateMeasurements()
    this.publish()
  }

  /** Whether the item with this id is a measurement rather than a drawing item. */
  isMeasurement(id: string) {
    return this._measurementIds.has(id)
  }

  /**
   * Returns the drawing item with this id: undefined for measurements and
   * missing ids.
   */
  item(id: string): ModelItem | undefined {
    const item = this.model.get(id)
    if (!item || this._measurementIds.has(id) || isMeasurementItem(item)) {
      return undefined
    }
    return item
  }

  /**
   * Returns the drawable that draws the item with this id, the same one until
   * the item changes.
   *
   * @param id - The id of the item
   * @returns The drawable, or undefined for measurements and missing ids
   */
  drawable(id: string): ApplicationItemDrawable | undefined {
    const item = this.item(id)
    if (!item) {
      this._drawables.delete(id)
      return undefined
    }
    const cached = this._drawables.get(id)
    if (cached?.item === item) return cached.drawable
    const drawable = this.createDrawable(item)
    this._drawables.set(id, { item, drawable })
    return drawable
  }

  /** Returns the drawables of the items with these ids that exist. */
  drawables(ids: Iterable<string>): ApplicationItemDrawable[] {
    const result: ApplicationItemDrawable[] = []
    for (const id of ids) {
      const drawable = this.drawable(id)
      if (drawable) result.push(drawable)
    }
    return result
  }

  /**
   * Builds a new drawable for an item, in model space.
   *
   * @param item - The item to draw
   */
  createDrawable(item: ModelItem): ApplicationItemDrawable {
    return new ApplicationItemDrawable(item, APPLICATION_MODEL_SPACE_ID, applicationPointDisplay)
  }

  /**
   * Changes the kind and geometry of an item, keeping its id.
   *
   * @param id - The id of the item to change
   * @param contents - The new kind and geometry
   * @returns Whether the item was changed
   * @throws When the document is read-only
   */
  update(id: string, contents: ApplicationItemContents) {
    this.checkWritable()
    if (!this.item(id)) return false
    this.model.update({ ...contents, id } as ModelItem)
    return true
  }

  /**
   * Adds items with the given kinds and geometry, each under a new id.
   *
   * @param contents - The items to add
   * @returns The new ids
   * @throws When the document is read-only
   */
  addItems(contents: ApplicationItemContents | ApplicationItemContents[]): string[] {
    this.checkWritable()
    const list = Array.isArray(contents) ? contents : [contents]
    return list.map(item => this.model.add(item as ModelTextItem).id)
  }

  /**
   * Removes items from the drawing.
   *
   * @param ids - The ids of the items to remove
   * @returns The number of items removed
   * @throws When the document is read-only
   */
  remove(ids: Iterable<string>) {
    this.checkWritable()
    let count = 0
    for (const id of ids) {
      if (!this._measurementIds.has(id) && this.model.remove(id)) count++
    }
    return count
  }

  /**
   * Changes the drawing to match edited model text.
   *
   * A line whose `id` names an item in the model is applied to that item, even
   * when it changes to another kind. Lines without a known id are new: each is
   * matched to an unchanged or same-kind item that no line names, or is added.
   * Items that no line describes are removed. Measurements are overlays rather
   * than items of the drawing, so their lines are ignored.
   *
   * Nothing changes if any line is invalid.
   *
   * @param text - The text to apply, in the format of {@link Model.toString}
   * @throws When the text cannot be read or the document is read-only
   */
  applyText(text: string) {
    const parsed = Model.parseItems(text).filter(
      item =>
        !isMeasurementItem(item) &&
        !(item.id !== undefined && this._measurementIds.has(item.id))
    )
    parsed.forEach(item => {
      if (item.kind === 'dimension') checkDimension(item.geometry)
    })

    const current = new Map(this.currentLines().map(item => [item.id, item]))
    const named: ModelItem[] = []
    const unnamed: { item: ModelTextItem; line: string }[] = []
    for (const item of parsed) {
      const line = lineOf(item)
      if (item.id !== undefined && current.has(item.id)) {
        if (current.get(item.id)!.line !== line) {
          named.push(item as ModelItem)
        }
        current.delete(item.id)
      } else {
        unnamed.push({ item: { ...item, id: undefined }, line })
      }
    }

    // Lines without an id keep matching the items no line names, so typing
    // a new line without its id does not create it again on every edit.
    const remaining = [...current.values()]
    const changed = unnamed.filter(({ line }) => {
      const index = remaining.findIndex(item => item.line === line)
      if (index < 0) {
        return true
      }
      remaining.splice(index, 1)
      return false
    })
    if (named.length === 0 && changed.length === 0 && remaining.length === 0) {
      return
    }
    this.checkWritable()

    // Prefer an item of the same kind, such as another circle, so the id
    // stays with the shape the line most likely describes.
    const takeIdFor = (item: ModelTextItem) => {
      const kind = itemTypeName(item as ApplicationItemContents)
      let index = remaining.findIndex(other => other.kind === kind)
      if (index < 0 && remaining.length > 0) index = 0
      return index < 0 ? undefined : remaining.splice(index, 1)[0].id
    }

    for (const item of named) {
      this.model.update(item)
    }
    for (const { item } of changed) {
      const id = takeIdFor(item)
      if (id === undefined) {
        this.model.add(item)
      } else {
        this.model.update({ ...item, id } as ModelItem)
      }
    }
    for (const { id } of remaining) {
      this.model.remove(id)
    }
  }

  /**
   * Stops following measurements.
   */
  dispose() {
    this._unsubscribeMeasurements()
    this.model.events.itemAdded.removeEventListener(this.onItemChanged)
    this.model.events.itemModified.removeEventListener(this.onItemChanged)
    this.model.events.itemRemoved.removeEventListener(this.onItemChanged)
  }

  private checkWritable() {
    if (this._doc.openMode < EditorOpenMode.Write) {
      throw new Error('This drawing is read-only')
    }
  }

  /** The drawing items of the model, each with its line and kind. */
  private currentLines() {
    return this.model.items
      .filter(item => !this._measurementIds.has(item.id))
      .map(item => ({
        id: item.id,
        line: lineOf(item),
        kind: itemTypeName(item)
      }))
  }

  private updateMeasurements() {
    const view = this._getView() as ThreeRendererView2d | undefined
    const records = view ? listLayoutMeasurements(view) : []
    const ids = new Set(records.map(record => record.id))
    for (const id of this._measurementIds) {
      if (!ids.has(id)) this.model.remove(id)
    }
    for (const record of records) {
      this.model.set({
        id: record.id,
        kind: 'dimension',
        geometry: this.measurementToDimension(record)
      })
    }
    this._measurementIds = ids
  }

  private measurementToDimension(
    record: ApplicationMeasurementRecord
  ): GeometryDimension {
    const points: Record<string, GeometryPoint2d> = {}
    for (const [name, point] of Object.entries(
      measurementPoints(record.geometry)
    )) {
      points[name] = new GeometryPoint2d(point.x, point.y)
    }
    return {
      type: MEASUREMENT_TYPE_NAMES[record.geometry.type],
      points,
      text: getMeasurementValueText(record.id) || undefined
    }
  }

  private publish() {
    this.events.modelChanged.dispatch({ model: this.model })
  }

  private readonly onMeasurementsChanged = () => {
    this.updateMeasurements()
    this.publish()
  }

  private readonly onItemChanged = () => {
    this.publish()
  }
}
