import { GeometryMatrix3d } from '../math/GeometryMatrix3d'
import { GeometryPoint2d, GeometryPoint2dLike } from '../math/GeometryPoint2d'
import {
  GeometryVector3d,
  GeometryVector3dLike
} from '../math/GeometryVector3d'
import { GeometryMathUtil } from './GeometryMathUtil'

const _ocsMatrix = /*@__PURE__*/ new GeometryMatrix3d()
const _ocsXAxis = /*@__PURE__*/ new GeometryVector3d()
const _ocsYAxis = /*@__PURE__*/ new GeometryVector3d()
const _ocsZAxis = /*@__PURE__*/ new GeometryVector3d()
const _ocsNormal = /*@__PURE__*/ new GeometryVector3d()

function createExtrusionMatrix(normal: GeometryVector3dLike) {
  return new GeometryMatrix3d().setFromExtrusionDirection(
    new GeometryVector3d(normal.x, normal.y, normal.z)
  )
}

export function geometryGetOcsReferenceVector(normal: GeometryVector3dLike) {
  return geometryGetOcsReferenceVectorInto(new GeometryVector3d(), normal)
}

/**
 * Writes the OCS reference vector for `normal` into `out` without allocating.
 * Uses the module-level matrix/axis scratch, so like
 * {@link geometryGetOcsReferenceVector} it is single-threaded sequential.
 */
export function geometryGetOcsReferenceVectorInto(
  out: GeometryVector3d,
  normal: GeometryVector3dLike
) {
  _ocsMatrix.setFromExtrusionDirection(
    _ocsNormal.set(normal.x, normal.y, normal.z)
  )
  _ocsMatrix.extractBasis(_ocsXAxis, _ocsYAxis, _ocsZAxis)
  out.copy(_ocsXAxis)
  return out
}

export function geometryTransformOcsPointToWcs(
  point: GeometryPoint2dLike,
  normal: GeometryVector3dLike
) {
  return geometryTransformOcsPointToWcsInto(
    new GeometryPoint2d(),
    point,
    normal
  )
}

/**
 * Transforms an OCS point into WCS, writing into `out` without allocating.
 * The +Z extrusion shortcut skips the matrix entirely (the extrusion matrix
 * is identity there, see {@link GeometryMatrix3d.setFromExtrusionDirection}),
 * which is the dominant case for DXF entities.
 */
export function geometryTransformOcsPointToWcsInto(
  out: GeometryPoint2d,
  point: GeometryPoint2dLike,
  normal: GeometryVector3dLike
) {
  if (normal.x === 0 && normal.y === 0 && normal.z === 1) {
    out.set(point.x, point.y)
    return out
  }
  _ocsMatrix.setFromExtrusionDirection(
    _ocsNormal.set(normal.x, normal.y, normal.z)
  )
  out.set(point.x, point.y)
  out.applyMatrix4(_ocsMatrix)
  return out
}

export function geometryTransformWcsPointToOcs(
  point: GeometryPoint2dLike,
  normal: GeometryVector3dLike
) {
  return new GeometryPoint2d(point.x, point.y).applyMatrix4(
    createExtrusionMatrix(normal).invert()
  )
}

export function geometryGetOcsAngle(
  center: GeometryPoint2dLike,
  point: GeometryPoint2dLike,
  normal: GeometryVector3dLike
) {
  const centerOcs = geometryTransformWcsPointToOcs(center, normal)
  const pointOcs = geometryTransformWcsPointToOcs(point, normal)
  return GeometryMathUtil.normalizeAngle(
    Math.atan2(pointOcs.y - centerOcs.y, pointOcs.x - centerOcs.x)
  )
}
