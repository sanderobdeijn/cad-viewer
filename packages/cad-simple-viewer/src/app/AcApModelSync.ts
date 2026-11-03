import {
  AcCmEventManager,
  AcDbDatabase,
  AcDbDimension,
  AcDbEntity,
  AcDbEntityEventArgs,
  acdbHostApplicationServices,
  AcDbLayoutEventArgs,
  AcDbObjectId,
  AcDbPoint,
  GeometryDimension,
  GeometryPoint2d,
  GeometryShape,
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
