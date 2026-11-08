import { AcCmEventManager } from '@mlightcad/common'
import {
  AcDb3PointAngularDimension,
  AcDbAlignedDimension,
  AcDbArc,
  AcDbArcDimension,
  AcDbCircle,
  AcDbDatabase,
  AcDbDiametricDimension,
  AcDbDimension,
  AcDbEllipse,
  AcDbEntity,
  AcDbLine,
  AcDbOrdinateDimension,
  AcDbPoint,
  AcDbPolyline,
  AcDbRadialDimension,
  AcDbRotatedDimension
} from '@mlightcad/data-model'
import {
  GeometryCircularArc2d,
  GeometryDimension,
  GeometryEllipseArc2d,
  GeometryLine2d,
  GeometryPoint2d,
  GeometryPolyline2d,
  GeometryShape,
  GeometryVector2d,
  Model,
  ModelItem,
  ModelTextItem
} from '@mlightcad/geometry-engine'

import {
  getMeasurementValueText,
  listLayoutMeasurements,
  subscribeMeasurements
} from '../command/measure/AcApMeasurementStore'
import type {
  AcApMeasurementGeometry,
  AcApMeasurementPoint2d,
  AcApMeasurementRecord
} from '../command/measure/AcApMeasurementTypes'
import type { AcEdBaseView } from '../editor/view/AcEdBaseView'
import { AcEdOpenMode } from '../editor/view/AcEdOpenMode'
import type { AcTrView2d } from '../view'

/** The parts of a document that {@link AcApModelSync} uses. */
export interface AcApModelSyncDocument {
  /** The drawing database that entities built for drawing belong to */
  readonly database: AcDbDatabase
  /** Whether the document may be changed */
  readonly openMode: AcEdOpenMode
}

function measurementPoints(
  geometry: AcApMeasurementGeometry
): Record<string, AcApMeasurementPoint2d> {
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

type DimensionPoints = Record<string, GeometryPoint2d>

const ALIGNED_POINTS = ['xLine1Point', 'xLine2Point', 'dimLinePoint']
const ANGULAR_POINTS = ['centerPoint', 'xLine1Point', 'xLine2Point', 'arcPoint']

/** The dimension types that text can create and the points each one needs. */
const DIMENSION_TYPES: Record<
  string,
  {
    points: string[]
    create: (points: DimensionPoints, text: string | null) => AcDbDimension
  }
> = {
  AlignedDimension: {
    points: ALIGNED_POINTS,
    create: (p, text) =>
      new AcDbAlignedDimension(
        p.xLine1Point,
        p.xLine2Point,
        p.dimLinePoint,
        text
      )
  },
  RotatedDimension: {
    points: ALIGNED_POINTS,
    create: (p, text) =>
      new AcDbRotatedDimension(
        p.xLine1Point,
        p.xLine2Point,
        p.dimLinePoint,
        text
      )
  },
  RadialDimension: {
    points: ['center', 'chordPoint'],
    create: (p, text) =>
      new AcDbRadialDimension(p.center, p.chordPoint, 0, text)
  },
  DiametricDimension: {
    points: ['chordPoint', 'farChordPoint'],
    create: (p, text) =>
      new AcDbDiametricDimension(p.chordPoint, p.farChordPoint, 0, text)
  },
  OrdinateDimension: {
    points: ['definingPoint', 'leaderEndPoint'],
    create: (p, text) =>
      new AcDbOrdinateDimension(p.definingPoint, p.leaderEndPoint, text)
  },
  '3PointAngularDimension': {
    points: ANGULAR_POINTS,
    create: (p, text) =>
      new AcDb3PointAngularDimension(
        p.centerPoint,
        p.xLine1Point,
        p.xLine2Point,
        p.arcPoint,
        text
      )
  },
  ArcDimension: {
    points: ANGULAR_POINTS,
    create: (p, text) =>
      new AcDbArcDimension(
        p.centerPoint,
        p.xLine1Point,
        p.xLine2Point,
        p.arcPoint,
        text
      )
  }
}

/** The measured value is derived, so editing it does not change an entity. */
const dimensionLine = (dimension: GeometryDimension) =>
  Model.formatDimension({ ...dimension, measurement: undefined })

const checkDimension = (dimension: GeometryDimension) => {
  const definition = DIMENSION_TYPES[dimension.type]
  if (!definition) {
    throw new Error(`Unknown dimension type "${dimension.type}"`)
  }
  const names = Object.keys(dimension.points)
  for (const name of definition.points) {
    if (!names.includes(name)) {
      throw new Error(`${dimension.type} needs ${name}`)
    }
  }
  for (const name of names) {
    if (!definition.points.includes(name)) {
      throw new Error(`${dimension.type} has no ${name}`)
    }
  }
}

/** One line of edited text and how to turn it into an entity. */
interface ModelTextTarget {
  line: string
  /** Whether an item drawn by this entity may take this line in place */
  canUpdate: (entity: AcDbEntity) => boolean
  create: () => AcDbEntity
}

const createPolyline = (shape: GeometryPolyline2d) => {
  const entity = new AcDbPolyline()
  shape.vertices.forEach((vertex, index) => {
    entity.addVertexAt(
      index,
      new GeometryPoint2d(vertex.x, vertex.y),
      vertex.bulge ?? 0
    )
  })
  entity.closed = shape.closed
  return entity
}

const shapeTarget = (shape: GeometryShape): ModelTextTarget => {
  const line = Model.formatShape(shape)
  if (shape instanceof GeometryLine2d) {
    return {
      line,
      canUpdate: entity => entity instanceof AcDbLine,
      create: () => new AcDbLine(shape.startPoint, shape.endPoint)
    }
  }
  if (shape instanceof GeometryCircularArc2d) {
    const full = shape.closed
    return {
      line,
      canUpdate: entity =>
        full ? entity instanceof AcDbCircle : entity instanceof AcDbArc,
      create: () =>
        full
          ? new AcDbCircle(shape.center, shape.radius)
          : new AcDbArc(
              shape.center,
              shape.radius,
              shape.startAngle,
              shape.endAngle
            )
    }
  }
  if (shape instanceof GeometryEllipseArc2d) {
    return {
      line,
      canUpdate: entity => entity instanceof AcDbEllipse,
      create: () =>
        new AcDbEllipse(
          shape.center,
          new GeometryVector2d(
            Math.cos(shape.rotation),
            Math.sin(shape.rotation)
          ),
          shape.majorAxisRadius,
          shape.minorAxisRadius,
          shape.startAngle,
          shape.endAngle
        )
    }
  }
  if (shape instanceof GeometryPolyline2d) {
    return {
      line,
      canUpdate: entity => entity instanceof AcDbPolyline,
      create: () => createPolyline(shape)
    }
  }
  throw new Error(`Cannot edit "${line}"`)
}

const targetFor = (item: ModelTextItem): ModelTextTarget => {
  switch (item.kind) {
    case 'shape':
      return shapeTarget(item.geometry)
    case 'point':
      return pointTarget(item.geometry)
    case 'dimension':
      return dimensionTarget(item.geometry)
  }
}

const isMeasurementItem = (item: ModelTextItem | ModelItem) =>
  item.kind === 'dimension' && MEASUREMENT_TYPES.has(item.geometry.type)

const pointTarget = (point: GeometryPoint2d): ModelTextTarget => ({
  line: Model.formatPoint(point),
  canUpdate: entity => entity instanceof AcDbPoint,
  create: () => {
    const entity = new AcDbPoint()
    entity.position = point
    return entity
  }
})

const dimensionTarget = (dimension: GeometryDimension): ModelTextTarget => ({
  line: dimensionLine(dimension),
  canUpdate: entity =>
    entity instanceof AcDbDimension && entity.type === dimension.type,
  create: () =>
    DIMENSION_TYPES[dimension.type].create(
      dimension.points,
      dimension.text ?? null
    )
})

/**
 * Returns the contents of a model item that an entity describes.
 *
 * @param entity - A line, circle, arc, ellipse, polyline, point or dimension
 * @returns The kind and geometry, or undefined for other entities
 */
export const itemContentsFor = (
  entity: AcDbEntity
): Omit<ModelItem, 'id'> | undefined => {
  if (entity instanceof AcDbPoint) {
    return { kind: 'point', geometry: entity.position.clone() }
  }
  if (entity instanceof AcDbDimension) {
    return { kind: 'dimension', geometry: entity.geometryDimension }
  }
  const shape = entity.geometry
  return shape ? { kind: 'shape', geometry: shape.clone() } : undefined
}

/**
 * Holds the {@link Model} of one document: the shapes, points and dimensions
 * of its drawing, and the way commands and the text editor change them.
 *
 * The model is the drawing. The drawing window, grips, object snaps and
 * selection see each item through an entity built from it by {@link entity},
 * whose object id is the item id. Those entities are not in the database, and
 * changing one does not change the drawing: commands pass changed entities
 * back through {@link add}, {@link replace} and {@link remove}.
 *
 * Measurements are overlays rather than items of the drawing, so they are
 * followed through the measurement store of the document's view and listed
 * with the dimensions under their own ids. They are not drawn from the model.
 *
 * Call {@link dispose} to stop listening.
 */
export class AcApModelSync {
  /** The model of the drawing */
  readonly model = new Model()
  /** Events fired by this class */
  readonly events = {
    /** Fired after the contents of the model have changed */
    modelChanged: new AcCmEventManager<{ model: Model }>()
  }

  /** Ids of the measurement items currently in {@link model} */
  private _measurementIds = new Set<string>()
  /** Entities built for items, with the item each was built from */
  private readonly _entities = new Map<
    string,
    { item: ModelItem; entity: AcDbEntity | undefined }
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
    private readonly _doc: AcApModelSyncDocument,
    private readonly _getView: () => AcEdBaseView | undefined = () => undefined
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
    this._entities.clear()
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
   * Returns the entity that draws the item with this id.
   *
   * The same entity is returned until the item changes. Treat it as read-only:
   * to change the item, change a clone and pass it to {@link replace}.
   *
   * @param id - The id of the item
   * @returns The entity, or undefined for measurements, missing ids and items
   *   that cannot be drawn
   */
  entity(id: string): AcDbEntity | undefined {
    const item = this.model.get(id)
    if (!item) {
      this._entities.delete(id)
      return undefined
    }
    const cached = this._entities.get(id)
    if (cached?.item === item) {
      return cached.entity
    }
    const entity = this.createEntity(item)
    this._entities.set(id, { item, entity })
    return entity
  }

  /**
   * Returns the entities that draw the items with these ids, skipping ids
   * that have none.
   */
  entities(ids: Iterable<string>): AcDbEntity[] {
    const result: AcDbEntity[] = []
    for (const id of ids) {
      const entity = this.entity(id)
      if (entity) result.push(entity)
    }
    return result
  }

  /**
   * Builds a new entity that draws a model item.
   *
   * The entity is not added to the database. It carries the item id as its
   * object id and belongs to model space.
   *
   * @param item - The item to draw
   * @returns The entity, or undefined for measurements and items that cannot
   *   be drawn
   */
  createEntity(item: ModelItem): AcDbEntity | undefined {
    if (this._measurementIds.has(item.id) || isMeasurementItem(item)) {
      return undefined
    }
    if (item.kind === 'dimension') {
      try {
        checkDimension(item.geometry)
      } catch {
        return undefined
      }
    }
    const database = this._doc.database
    const entity = targetFor(item).create()
    entity.database = database
    entity.objectId = item.id
    entity.ownerId = database.tables.blockTable.modelSpace.objectId
    return entity
  }

  /**
   * Adds the shapes, points and dimensions described by entities to the
   * drawing, each under a new id.
   *
   * @param entities - The entities to add; others are skipped
   * @returns The new ids, in the order of the entities that were added
   * @throws When the document is read-only
   */
  add(entities: AcDbEntity | AcDbEntity[]): string[] {
    this.checkWritable()
    const ids: string[] = []
    for (const entity of Array.isArray(entities) ? entities : [entities]) {
      const contents = itemContentsFor(entity)
      if (contents) {
        ids.push(this.model.add(contents as ModelTextItem).id)
      }
    }
    return ids
  }

  /**
   * Changes an item to what an entity describes, keeping its id.
   *
   * @param id - The id of the item to change
   * @param entity - The new contents
   * @returns Whether the item was changed
   * @throws When the document is read-only
   */
  replace(id: string, entity: AcDbEntity) {
    this.checkWritable()
    const contents = itemContentsFor(entity)
    if (!contents || !this.model.has(id) || this._measurementIds.has(id)) {
      return false
    }
    this.model.update({ ...contents, id } as ModelItem)
    return true
  }

  /**
   * Changes an item through a copy of its entity, keeping its id.
   *
   * @param id - The id of the item to change
   * @param change - Changes the copy, such as by moving a grip point
   * @returns Whether the item was changed
   * @throws When the document is read-only
   */
  edit(id: string, change: (entity: AcDbEntity) => void) {
    this.checkWritable()
    const copy = this.entity(id)?.clone()
    if (!copy) {
      return false
    }
    change(copy)
    return this.replace(id, copy)
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
    const unnamed: { item: ModelTextItem; target: ModelTextTarget }[] = []
    for (const item of parsed) {
      const target = targetFor(item)
      if (item.id !== undefined && current.has(item.id)) {
        if (current.get(item.id)!.line !== target.line) {
          named.push(item as ModelItem)
        }
        current.delete(item.id)
      } else {
        unnamed.push({ item: { ...item, id: undefined }, target })
      }
    }

    // Lines without an id keep matching the items no line names, so typing
    // a new line without its id does not create it again on every edit.
    const remaining = [...current.values()]
    const changed = unnamed.filter(({ target }) => {
      const index = remaining.findIndex(item => item.line === target.line)
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

    const takeIdFor = (target: ModelTextTarget) => {
      let index = remaining.findIndex(item => {
        const entity = this.entity(item.id)
        return !!entity && target.canUpdate(entity)
      })
      if (index < 0 && remaining.length > 0) index = 0
      return index < 0 ? undefined : remaining.splice(index, 1)[0].id
    }

    for (const item of named) {
      this.model.update(item)
    }
    for (const { item, target } of changed) {
      const id = takeIdFor(target)
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
    if (this._doc.openMode < AcEdOpenMode.Write) {
      throw new Error('This drawing is read-only')
    }
  }

  /** The drawing items of the model, each with the line that describes it. */
  private currentLines() {
    return this.model.items
      .filter(item => !this._measurementIds.has(item.id))
      .map(item => ({ id: item.id, line: targetFor(item).line }))
  }

  private updateMeasurements() {
    const view = this._getView() as AcTrView2d | undefined
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
    record: AcApMeasurementRecord
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
      text: getMeasurementValueText(record.id, this._doc.database) || undefined
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
