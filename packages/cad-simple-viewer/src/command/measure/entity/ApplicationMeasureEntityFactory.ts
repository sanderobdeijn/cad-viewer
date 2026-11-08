import { deserializeMeasurementStyle } from '../ApplicationMeasurementSidecar'
import type { ApplicationMeasurementRecord } from '../ApplicationMeasurementTypes'
import { ApplicationMeasureAngleEntity } from './ApplicationMeasureAngleEntity'
import { ApplicationMeasureArcEntity } from './ApplicationMeasureArcEntity'
import { ApplicationMeasureAreaEntity } from './ApplicationMeasureAreaEntity'
import { ApplicationMeasureDistanceEntity } from './ApplicationMeasureDistanceEntity'
import type { ApplicationMeasureEntity } from './ApplicationMeasureEntity'
import { ApplicationMeasurePointEntity } from './ApplicationMeasurePointEntity'

/**
 * Creates a concrete measure entity from a sidecar / store record (deserialize).
 *
 * Pair with {@link ApplicationMeasureEntity.toRecord} for the serialize half of the
 * overlay persistence protocol. Deserializes the record's style and dispatches
 * on `geometry.type` to the matching entity constructor (`distance`,
 * `angle`, `area`, `arc`, or `point`).
 *
 * @param record - Persisted measurement record to rehydrate
 * @returns Measure entity ready for {@link ApplicationMeasureEntity.commit}
 */
export function createMeasureEntityFromRecord(
  record: ApplicationMeasurementRecord
): ApplicationMeasureEntity {
  const style = deserializeMeasurementStyle(record.style)
  const options = {
    id: record.id,
    layoutId: record.layoutId,
    style,
    textHeightWcs: record.style.textHeightWcs,
    strokeWidthWcs: record.style.strokeWidthWcs,
    arrowSizeWcs: record.style.arrowSizeWcs
  }
  const geom = record.geometry
  switch (geom.type) {
    case 'distance':
      return new ApplicationMeasureDistanceEntity(
        { x: geom.start.x, y: geom.start.y },
        { x: geom.end.x, y: geom.end.y },
        options
      )
    case 'angle':
      return new ApplicationMeasureAngleEntity(
        { x: geom.vertex.x, y: geom.vertex.y },
        { x: geom.arm1.x, y: geom.arm1.y },
        { x: geom.arm2.x, y: geom.arm2.y },
        options
      )
    case 'area':
      return new ApplicationMeasureAreaEntity(
        geom.points.map(p => ({ x: p.x, y: p.y })),
        options
      )
    case 'arc':
      return new ApplicationMeasureArcEntity(
        { cx: geom.center.x, cy: geom.center.y, r: geom.radius },
        geom.start,
        geom.end,
        options,
        geom.through
      )
    case 'point':
      return new ApplicationMeasurePointEntity(
        { x: geom.position.x, y: geom.position.y },
        options
      )
  }
}
