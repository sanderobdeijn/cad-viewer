import {
  AcCmEventManager,
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
  AcDbEntityEventArgs,
  AcDbLine,
  AcDbObjectId,
  AcDbOrdinateDimension,
  AcDbPoint,
  AcDbPolyline,
  AcDbRadialDimension,
  AcDbRotatedDimension,
  GeometryCircularArc2d,
  GeometryDimension,
  GeometryEllipseArc2d,
  GeometryLine2d,
  GeometryPoint2d,
  GeometryPolyline2d,
  GeometryPolyline2dVertex,
  GeometryShape,
  GeometryVector2d,
  Model,
  ModelItem,
  ModelTextItem
} from '@mlightcad/data-model'

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
import { AcApEntityService } from '../service/AcApEntityService'
import type { AcTrView2d } from '../view'

/** The parts of a document that {@link AcApModelSync} follows. */
export interface AcApModelSyncDocument {
  /** The drawing database whose model space is mirrored */
  readonly database: AcDbDatabase
  /** Whether the document may be changed */
  readonly openMode: AcEdOpenMode
}

function asEntityList(entity: AcDbEntity | AcDbEntity[]): AcDbEntity[] {
  return Array.isArray(entity) ? entity : [entity]
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
  /** Applies this line to the entity, or returns false if it cannot */
  canUpdate: (entity: AcDbEntity) => boolean
  update: (entity: AcDbEntity) => void
  create: () => AcDbEntity
}

type PolylineVertex = GeometryPolyline2dVertex & {
  startWidth?: number
  endWidth?: number
}

const updatePolyline = (entity: AcDbPolyline, shape: GeometryPolyline2d) => {
  // The text has no widths, so keep those of each existing vertex.
  const previous = [
    ...(entity.geometry as unknown as GeometryPolyline2d<PolylineVertex>)
      .vertices
  ]
  entity.reset(false)
  shape.vertices.forEach((vertex, index) => {
    const kept = previous[index]
    entity.addVertexAt(
      index,
      new GeometryPoint2d(vertex.x, vertex.y),
      vertex.bulge ?? 0,
      kept?.startWidth ?? -1,
      kept?.endWidth ?? -1
    )
  })
  entity.closed = shape.closed
}

const updateEllipse = (entity: AcDbEllipse, shape: GeometryEllipseArc2d) => {
  entity.center = shape.center
  entity.majorAxisRadius = shape.majorAxisRadius
  entity.minorAxisRadius = shape.minorAxisRadius
  entity.majorAxis = new GeometryVector2d(
    Math.cos(shape.rotation),
    Math.sin(shape.rotation)
  )
  entity.startAngle = shape.startAngle
  entity.endAngle = shape.endAngle
}

const shapeTarget = (shape: GeometryShape): ModelTextTarget => {
  const line = Model.formatShape(shape)
  if (shape instanceof GeometryLine2d) {
    return {
      line,
      canUpdate: entity => entity instanceof AcDbLine,
      update: entity => {
        const target = entity as AcDbLine
        target.startPoint = shape.startPoint
        target.endPoint = shape.endPoint
      },
      create: () => new AcDbLine(shape.startPoint, shape.endPoint)
    }
  }
  if (shape instanceof GeometryCircularArc2d) {
    const full = shape.closed
    return {
      line,
      canUpdate: entity =>
        full ? entity instanceof AcDbCircle : entity instanceof AcDbArc,
      update: entity => {
        const target = entity as AcDbCircle | AcDbArc
        target.center = shape.center
        target.radius = shape.radius
        if (target instanceof AcDbArc) {
          target.startAngle = shape.startAngle
          target.endAngle = shape.endAngle
        }
      },
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
      update: entity => updateEllipse(entity as AcDbEllipse, shape),
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
      update: entity => updatePolyline(entity as AcDbPolyline, shape),
      create: () => {
        const entity = new AcDbPolyline()
        updatePolyline(entity, shape)
        return entity
      }
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
  update: entity => {
    ;(entity as AcDbPoint).position = point
  },
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
  update: entity => {
    const target = entity as AcDbDimension
    Object.assign(target, dimension.points)
    target.dimensionText = dimension.text ?? null
  },
  create: () =>
    DIMENSION_TYPES[dimension.type].create(
      dimension.points,
      dimension.text ?? null
    )
})

/**
 * Keeps the {@link Model} of one document in step with its database.
 *
 * The model holds a copy of the shape, point or dimension of each model-space
 * entity, using the entity's object id as the item id. The drawing window
 * draws from this model.
 * Measurements are overlays rather than entities, so they are followed through
 * the measurement store of the document's view and listed with the dimensions
 * under their own ids. They are not drawn from the model.
 * Other entities, such as text and block references, are left out.
 * Edited text is written back to the drawing through {@link applyText}.
 *
 * Call {@link dispose} to stop listening.
 */
export class AcApModelSync {
  /** The model kept in step with the drawing window */
  readonly model = new Model()
  /** Events fired by this class */
  readonly events = {
    /** Fired after the contents of the model have changed */
    modelChanged: new AcCmEventManager<{ model: Model }>()
  }

  /** Ids of the measurement items currently in {@link model} */
  private _measurementIds = new Set<string>()
  private readonly _unsubscribeMeasurements: () => void
  private _database?: AcDbDatabase
  private _spaceId?: AcDbObjectId

  /**
   * Creates the model from the document and starts following changes.
   *
   * @param _doc - The document whose model space is mirrored
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
    this.bindDatabase(_doc.database)
    this.resync()
  }

  /**
   * Rebuilds the model from the model space of the document's database.
   *
   * Call after the database content is replaced, such as for a new drawing.
   */
  resync() {
    this.bindDatabase(this._doc.database)
    this.rebuild(this._doc.database.tables.blockTable.modelSpace.objectId)
  }

  /** Whether the item with this id is a measurement rather than an entity. */
  isMeasurement(id: string) {
    return this._measurementIds.has(id)
  }

  /**
   * Builds an entity that draws a model item, for the drawing window.
   *
   * The entity is not added to the database. It carries the item id as its
   * object id and belongs to model space, so selection and editing still find
   * the database entity with the same id.
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
    entity.objectId = item.id as AcDbObjectId
    entity.ownerId = database.tables.blockTable.modelSpace.objectId
    return entity
  }

  /**
   * Changes the drawing to match edited model text, in one transaction.
   *
   * A line whose `id` names an item in the model is applied to that item: it is
   * left alone when unchanged, updated in place when it is still the same kind,
   * and otherwise replaced. Lines without a known id are new: each is matched to
   * an unchanged or same-kind item that no line names, or creates an entity in
   * the current space. Items that no line describes are erased. Measurements
   * are overlays rather than entities, so their lines are ignored.
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

    const database = this._database
    const blockTable = database?.tables.blockTable
    const space = this._spaceId ? blockTable?.getIdAt(this._spaceId) : undefined
    if (!database || !blockTable || !space) {
      return
    }

    const current = new Map(this.currentLines().map(item => [item.id, item]))
    const named: { id: AcDbObjectId; target: ModelTextTarget }[] = []
    const unnamed: ModelTextTarget[] = []
    for (const item of parsed) {
      const target = targetFor(item)
      if (item.id !== undefined && current.has(item.id)) {
        if (current.get(item.id)!.line !== target.line) {
          named.push({ id: item.id, target })
        }
        current.delete(item.id)
      } else {
        unnamed.push(target)
      }
    }

    // Lines without an id keep matching the items no line names, so typing
    // a new line without its id does not create it again on every edit.
    const remaining = [...current.values()]
    const changed = unnamed.filter(target => {
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
    if (this._doc.openMode < AcEdOpenMode.Write) {
      throw new Error('This drawing is read-only')
    }

    const takeEntityFor = (target: ModelTextTarget) => {
      const index = remaining.findIndex(item => {
        const entity = blockTable.getEntityById(item.id)
        return !!entity && target.canUpdate(entity)
      })
      return index < 0 ? undefined : remaining.splice(index, 1)[0].id
    }

    database.transactionManager.runInTransaction(() => {
      const created: AcDbEntity[] = []
      const replace = (
        target: ModelTextTarget,
        id: AcDbObjectId | undefined
      ) => {
        const entity = target.create()
        const previous = id ? blockTable.getEntityById(id) : undefined
        if (previous) {
          // A line that changed to another kind keeps the look of what it replaces.
          AcApEntityService.copyDisplayTraits(previous, entity)
          database.openEntityForWrite(previous.objectId)?.erase()
        }
        created.push(entity)
      }
      for (const { id, target } of named) {
        const entity = blockTable.getEntityById(id)
        if (entity && target.canUpdate(entity)) {
          target.update(database.openEntityForWrite(id)!)
        } else {
          replace(target, id)
        }
      }
      const toCreate = changed.filter(target => {
        const id = takeEntityFor(target)
        const entity = id ? database.openEntityForWrite(id) : undefined
        if (entity) {
          target.update(entity)
        }
        return !entity
      })
      for (const target of toCreate) {
        replace(target, remaining.shift()?.id)
      }
      for (const { id } of remaining) {
        database.openEntityForWrite(id)?.erase()
      }
      if (created.length > 0) {
        space.appendEntity(created)
      }
    })
  }

  /**
   * Stops following the drawing window.
   */
  dispose() {
    this._unsubscribeMeasurements()
    this.bindDatabase(undefined)
  }

  /** The entity items of the model, each with the line that describes it. */
  private currentLines() {
    return this.model.items
      .filter(item => !this._measurementIds.has(item.id))
      .map(item => ({
        id: item.id as AcDbObjectId,
        line: targetFor(item).line
      }))
  }

  private bindDatabase(database: AcDbDatabase | undefined) {
    if (this._database) {
      const events = this._database.events
      events.entityAppended.removeEventListener(this.onEntityChanged)
      events.entityModified.removeEventListener(this.onEntityChanged)
      events.entityErased.removeEventListener(this.onEntityErased)
    }
    this._database = database
    if (database) {
      const events = database.events
      events.entityAppended.addEventListener(this.onEntityChanged)
      events.entityModified.addEventListener(this.onEntityChanged)
      events.entityErased.addEventListener(this.onEntityErased)
    }
  }

  private rebuild(spaceId: AcDbObjectId) {
    this._spaceId = spaceId
    this.model.clear()
    this._measurementIds.clear()
    const space = this._database?.tables.blockTable.getIdAt(spaceId)
    if (space) {
      for (const entity of space.newIterator()) {
        this.storeEntity(entity)
      }
    }
    this.updateMeasurements()
    this.publish()
  }

  /** Copies an entity into the model, returning whether it is shown there. */
  private storeEntity(entity: AcDbEntity) {
    const item = this.itemFor(entity)
    if (!item) {
      return false
    }
    this.model.set(item)
    return true
  }

  private itemFor(entity: AcDbEntity): ModelItem | undefined {
    if (entity.ownerId !== this._spaceId) {
      return undefined
    }
    const id = entity.objectId
    if (entity instanceof AcDbPoint) {
      return { id, kind: 'point', geometry: entity.position.clone() }
    }
    if (entity instanceof AcDbDimension) {
      return { id, kind: 'dimension', geometry: entity.geometryDimension }
    }
    const shape = entity.geometry
    return shape ? { id, kind: 'shape', geometry: shape.clone() } : undefined
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
      text: getMeasurementValueText(record.id, this._database) || undefined
    }
  }

  private publish() {
    this.events.modelChanged.dispatch({ model: this.model })
  }

  private readonly onMeasurementsChanged = () => {
    this.updateMeasurements()
    this.publish()
  }

  private readonly onEntityChanged = (args: AcDbEntityEventArgs) => {
    let changed = false
    for (const entity of asEntityList(args.entity)) {
      changed = this.storeEntity(entity) || changed
    }
    if (changed) {
      this.publish()
    }
  }

  private readonly onEntityErased = (args: AcDbEntityEventArgs) => {
    let changed = false
    for (const entity of asEntityList(args.entity)) {
      changed = this.model.remove(entity.objectId) || changed
    }
    if (changed) {
      this.publish()
    }
  }
}
