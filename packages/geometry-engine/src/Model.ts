import {
  GeometryCircularArc2d,
  GeometryDimension,
  GeometryEllipseArc2d,
  GeometryLine2d,
  GeometryPolyline2d,
  GeometryShape,
  GeometrySpline2d
} from './geometry'
import type { GeometryPoint2d, GeometryPoint2dLike } from './math'

const formatNumber = (value: number) => String(Number(value.toFixed(6)))

const formatPoint = (point: GeometryPoint2dLike) =>
  `(${formatNumber(point.x)}, ${formatNumber(point.y)})`

const formatPoints = (points: GeometryPoint2dLike[]) =>
  `[${points.map(formatPoint).join(', ')}]`

const formatShape = (shape: GeometryShape) => {
  if (shape instanceof GeometryLine2d) {
    return `Line start=${formatPoint(shape.startPoint)} end=${formatPoint(shape.endPoint)}`
  }
  if (shape instanceof GeometryCircularArc2d) {
    return `CircularArc center=${formatPoint(shape.center)} radius=${formatNumber(shape.radius)} startAngle=${formatNumber(shape.startAngle)} endAngle=${formatNumber(shape.endAngle)}`
  }
  if (shape instanceof GeometryEllipseArc2d) {
    return `EllipseArc center=${formatPoint(shape.center)} majorRadius=${formatNumber(shape.majorAxisRadius)} minorRadius=${formatNumber(shape.minorAxisRadius)} rotation=${formatNumber(shape.rotation)} startAngle=${formatNumber(shape.startAngle)} endAngle=${formatNumber(shape.endAngle)}`
  }
  if (shape instanceof GeometryPolyline2d) {
    return `Polyline vertices=${formatPoints(shape.vertices)} closed=${shape.closed}`
  }
  if (shape instanceof GeometrySpline2d) {
    return `Spline degree=${shape.degree} controlPoints=${formatPoints(shape.controlPoints)} closed=${shape.closed}`
  }
  return 'Shape'
}

const formatDimension = (dimension: GeometryDimension) => {
  const parts = [`Dimension type=${dimension.type}`]
  for (const [name, point] of Object.entries(dimension.points)) {
    parts.push(`${name}=${formatPoint(point)}`)
  }
  if (dimension.text != null) {
    parts.push(`text="${dimension.text}"`)
  }
  if (dimension.measurement != null) {
    parts.push(`measurement=${formatNumber(dimension.measurement)}`)
  }
  return parts.join(' ')
}

/**
 * Geometry model
 */
export class Model {
  /**
   * The shapes in this model
   */
  shapes: GeometryShape[] = []

  /**
   * The points in this model
   */
  points: GeometryPoint2d[] = []

  /**
   * The dimensions in this model
   */
  dimensions: GeometryDimension[] = []

  /**
   * Return a text description of this model with one line per shape, point
   * and dimension.
   */
  toString() {
    return [
      ...this.shapes.map(formatShape),
      ...this.points.map(point => `Point position=${formatPoint(point)}`),
      ...this.dimensions.map(formatDimension)
    ].join('\n')
  }
}
