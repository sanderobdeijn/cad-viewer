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
  acdbHostApplicationServices,
  AcDbLayoutEventArgs,
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
  Model
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
import { AcEdOpenMode } from '../editor/view/AcEdOpenMode'
import { AcApEntityService } from '../service/AcApEntityService'
import type { AcTrView2d } from '../view'
import type { AcApDocManager, AcDbDocumentEventArgs } from './AcApDocManager'

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
  // The text has no arcs or widths, so keep those of each existing vertex.
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
      kept?.bulge ?? 0,
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
 * Keeps a {@link Model} in step with the drawing window.
 *
 * The model holds a copy of the shape, point or dimension of each entity in the
 * space on screen.
 * It listens to the same database events that update the view, and rebuilds
 * when another document becomes active or another layout is selected.
 * Measurements are overlays rather than entities, so they are followed through
 * the measurement store and listed with the dimensions.
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

  private readonly _shapes = new Map<AcDbObjectId, GeometryShape>()
  private readonly _points = new Map<AcDbObjectId, GeometryPoint2d>()
  private readonly _dimensions = new Map<AcDbObjectId, GeometryDimension>()
  private _measurements: GeometryDimension[] = []
  private readonly _unsubscribeMeasurements: () => void
  private _database?: AcDbDatabase
  private _spaceId?: AcDbObjectId

  /**
   * Creates the model from the current document and starts following changes.
   *
   * @param _docManager - The document manager to follow
   */
  constructor(
    private readonly _docManager: Pick<
      AcApDocManager,
      'curDocument' | 'curView' | 'events'
    >
  ) {
    _docManager.events.documentActivated.addEventListener(
      this.onDocumentActivated
    )
    acdbHostApplicationServices().layoutManager.events.layoutSwitched.addEventListener(
      this.onLayoutSwitched
    )
    this._unsubscribeMeasurements = subscribeMeasurements(
      this.onMeasurementsChanged
    )
    const database = _docManager.curDocument.database
    this.bindDatabase(database)
    this.rebuild(database.currentSpaceId)
  }

  /**
   * Changes the drawing to match edited model text, in one transaction.
   *
   * Lines that match an item in the model leave its entity alone. A changed line
   * updates an entity of the same kind, so it keeps its layer and color. Other
   * lines create entities in the current space, and items with no line left are
   * erased. Measurements are overlays rather than entities, so their lines are
   * ignored.
   *
   * Nothing changes if any line is invalid.
   *
   * @param text - The text to apply, in the format of {@link Model.toString}
   * @throws When the text cannot be read or the document is read-only
   */
  applyText(text: string) {
    const parsed = Model.parse(text)
    const dimensions = parsed.dimensions.filter(
      dimension => !MEASUREMENT_TYPES.has(dimension.type)
    )
    dimensions.forEach(checkDimension)
    const targets = [
      ...parsed.shapes.map(shapeTarget),
      ...parsed.points.map(pointTarget),
      ...dimensions.map(dimensionTarget)
    ]

    const database = this._database
    const blockTable = database?.tables.blockTable
    const space = this._spaceId ? blockTable?.getIdAt(this._spaceId) : undefined
    if (!database || !blockTable || !space) {
      return
    }

    const remaining = this.currentLines()
    const changed = targets.filter(target => {
      const index = remaining.findIndex(item => item.line === target.line)
      if (index < 0) {
        return true
      }
      remaining.splice(index, 1)
      return false
    })
    if (changed.length === 0 && remaining.length === 0) {
      return
    }
    if (this._docManager.curDocument.openMode < AcEdOpenMode.Write) {
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
      const toCreate = changed.filter(target => {
        const id = takeEntityFor(target)
        const entity = id ? database.openEntityForWrite(id) : undefined
        if (entity) {
          target.update(entity)
        }
        return !entity
      })
      const created = toCreate.map(target => {
        const entity = target.create()
        // A line that changed to another kind keeps the look of what it replaces.
        const replaced = remaining.shift()
        const previous = replaced && blockTable.getEntityById(replaced.id)
        if (previous) {
          AcApEntityService.copyDisplayTraits(previous, entity)
          database.openEntityForWrite(previous.objectId)?.erase()
        }
        return entity
      })
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
    this._docManager.events.documentActivated.removeEventListener(
      this.onDocumentActivated
    )
    acdbHostApplicationServices().layoutManager.events.layoutSwitched.removeEventListener(
      this.onLayoutSwitched
    )
    this._unsubscribeMeasurements()
    this.bindDatabase(undefined)
  }

  private currentLines() {
    const lines: { id: AcDbObjectId; line: string }[] = []
    this._shapes.forEach((shape, id) =>
      lines.push({ id, line: Model.formatShape(shape) })
    )
    this._points.forEach((point, id) =>
      lines.push({ id, line: Model.formatPoint(point) })
    )
    this._dimensions.forEach((dimension, id) =>
      lines.push({ id, line: dimensionLine(dimension) })
    )
    return lines
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
    this._shapes.clear()
    this._points.clear()
    this._dimensions.clear()
    const space = this._database?.tables.blockTable.getIdAt(spaceId)
    if (space) {
      for (const entity of space.newIterator()) {
        this.storeEntity(entity)
      }
    }
    this.updateMeasurements()
    this.publish()
  }

  private storeEntity(entity: AcDbEntity) {
    if (entity.ownerId !== this._spaceId) {
      return false
    }
    if (entity instanceof AcDbPoint) {
      this._points.set(entity.objectId, entity.position.clone())
      return true
    }
    if (entity instanceof AcDbDimension) {
      this._dimensions.set(entity.objectId, entity.geometryDimension)
      return true
    }
    const shape = entity.geometry
    if (shape) {
      this._shapes.set(entity.objectId, shape.clone())
      return true
    }
    return false
  }

  private updateMeasurements() {
    const view = this._docManager.curView as AcTrView2d
    this._measurements = listLayoutMeasurements(view).map(record =>
      this.measurementToDimension(record)
    )
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
    this.model.shapes = [...this._shapes.values()]
    this.model.points = [...this._points.values()]
    this.model.dimensions = [
      ...this._dimensions.values(),
      ...this._measurements
    ]
    this.events.modelChanged.dispatch({ model: this.model })
  }

  private readonly onDocumentActivated = (args: AcDbDocumentEventArgs) => {
    this.bindDatabase(args.doc.database)
    this.rebuild(args.doc.database.currentSpaceId)
  }

  private readonly onLayoutSwitched = (args: AcDbLayoutEventArgs) => {
    // The layout manager updates currentSpaceId only after this event.
    this.rebuild(args.layout.blockTableRecordId)
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
      const id = entity.objectId
      const erased = [this._shapes, this._points, this._dimensions].map(map =>
        map.delete(id)
      )
      changed = erased.includes(true) || changed
    }
    if (changed) {
      this.publish()
    }
  }
}
