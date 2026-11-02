import {
  AcGePoint2dLike,
  AcGePoint3d,
  AcGeVector2d,
  AcGeVector3d
} from '../math'
import { acgeGetOcsReferenceVector, TAU } from '../util'
import { AcGeCircArc2d } from './AcGeCircArc2d'
import { AcGeCircArc3d } from './AcGeCircArc3d'
import { AcGeEllipseArc2d } from './AcGeEllipseArc2d'
import { AcGeEllipseArc3d } from './AcGeEllipseArc3d'
import { AcGeLine2d } from './AcGeLine2d'
import { AcGeLine3d } from './AcGeLine3d'

/**
 * Conversions between 2D curves and their 3D counterparts, for the places that
 * still work in 3D: curve intersection and the renderer. 3D results are always
 * in the XY plane, and converting back to 2D drops Z.
 */

const NEGATIVE_Z_AXIS = { x: 0, y: 0, z: -1 }

/** Returns the point at Z = 0. */
export function acgePoint2dTo3d(point: AcGePoint2dLike): AcGePoint3d {
  return new AcGePoint3d(point.x, point.y, 0)
}

/** Returns the line at Z = 0. */
export function acgeLine2dTo3d(line: AcGeLine2d): AcGeLine3d {
  return new AcGeLine3d(
    acgePoint2dTo3d(line.startPoint),
    acgePoint2dTo3d(line.endPoint)
  )
}

/**
 * Returns the arc at Z = 0. A clockwise arc becomes an arc on the -Z normal,
 * whose angles run from the -X reference direction.
 */
export function acgeCircArc2dTo3d(arc: AcGeCircArc2d): AcGeCircArc3d {
  const center = acgePoint2dTo3d(arc.center)
  const clockwise = arc.clockwise
  const normal = clockwise ? NEGATIVE_Z_AXIS : AcGeVector3d.Z_AXIS
  const refVec = acgeGetOcsReferenceVector(normal)
  if (arc.closed) {
    return new AcGeCircArc3d(center, arc.radius, 0, TAU, normal, refVec)
  }
  const toAngle = (x: number, y: number) =>
    clockwise
      ? Math.atan2(y - center.y, center.x - x)
      : Math.atan2(y - center.y, x - center.x)
  const start = arc.startPoint
  const end = arc.endPoint
  return new AcGeCircArc3d(
    center,
    arc.radius,
    toAngle(start.x, start.y),
    toAngle(end.x, end.y),
    normal,
    refVec
  )
}

/** Returns the XY arc for a 3D arc whose normal is along Z. */
export function acgeCircArc3dTo2d(arc: AcGeCircArc3d): AcGeCircArc2d {
  const clockwise = arc.normal.z < 0
  if (arc.closed) {
    return AcGeCircArc2d.fromMathAngles(arc.center, arc.radius, 0, 0, clockwise)
  }
  const center = arc.center
  const start = arc.startPoint
  const end = arc.endPoint
  return AcGeCircArc2d.fromMathAngles(
    center,
    arc.radius,
    Math.atan2(start.y - center.y, start.x - center.x),
    Math.atan2(end.y - center.y, end.x - center.x),
    clockwise
  )
}

/**
 * Returns the ellipse arc at Z = 0. A clockwise arc becomes an arc on the -Z
 * normal, which negates its angles.
 */
export function acgeEllipseArc2dTo3d(arc: AcGeEllipseArc2d): AcGeEllipseArc3d {
  const clockwise = arc.clockwise
  const toAngle = (angle: number) => (clockwise ? TAU - angle : angle)
  return new AcGeEllipseArc3d(
    acgePoint2dTo3d(arc.center),
    clockwise ? NEGATIVE_Z_AXIS : AcGeVector3d.Z_AXIS,
    { x: Math.cos(arc.rotation), y: Math.sin(arc.rotation), z: 0 },
    arc.majorAxisRadius,
    arc.minorAxisRadius,
    arc.closed ? 0 : toAngle(arc.startAngle),
    arc.closed ? TAU : toAngle(arc.endAngle)
  )
}

/** Returns the XY ellipse arc for a 3D arc whose normal is along Z. */
export function acgeEllipseArc3dTo2d(arc: AcGeEllipseArc3d): AcGeEllipseArc2d {
  const clockwise = arc.normal.z < 0
  const closed = arc.closed || Math.abs(arc.deltaAngle - TAU) < 1e-10
  const toAngle = (angle: number) => (clockwise ? TAU - angle : angle)
  return new AcGeEllipseArc2d(
    arc.center,
    arc.majorAxisRadius,
    arc.minorAxisRadius,
    closed ? 0 : toAngle(arc.startAngle),
    closed ? TAU : toAngle(arc.endAngle),
    clockwise,
    new AcGeVector2d(arc.majorAxis.x, arc.majorAxis.y).angle()
  )
}
