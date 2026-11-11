import {
  GeometryBox2d,
  type GeometryDimension,
  GeometryLine2d,
  type GeometryMatrix2d,
  GeometryPoint2d,
  type GeometryPoint2dLike,
  GeometryVector2d,
  type GeometryVector2dLike
} from '@mlightcad/geometry-engine'
import {
  type GraphicsInterfaceEntity,
  type GraphicsInterfaceRenderer
} from '@mlightcad/graphic-interface'

/**
 * The dimension types a drawing can hold and the points each one needs, in
 * the order of their grips.
 */
export const APPLICATION_DIMENSION_POINTS: Record<string, readonly string[]> = {
  AlignedDimension: ['xLine1Point', 'xLine2Point', 'dimLinePoint'],
  RotatedDimension: ['xLine1Point', 'xLine2Point', 'dimLinePoint'],
  RadialDimension: ['center', 'chordPoint'],
  DiametricDimension: ['chordPoint', 'farChordPoint'],
  OrdinateDimension: ['definingPoint', 'leaderEndPoint'],
  '3PointAngularDimension': [
    'centerPoint',
    'xLine1Point',
    'xLine2Point',
    'arcPoint'
  ],
  ArcDimension: ['centerPoint', 'xLine1Point', 'xLine2Point', 'arcPoint']
}

/** Extension beyond the dimension line, as `DIMEXE` of the default style. */
const DIMEXE = 0.18
/** Offset of extension lines from their origin, as `DIMEXO`. */
const DIMEXO = 0.625
/** Arrow length and label height of drawn dimensions. */
const DIMENSION_ARROW_SIZE = 10
const DIMENSION_TEXT_HEIGHT = 10
const ARROW_HALF_WIDTH = 0.125
const LABEL_CHAR_WIDTH = 0.6

interface DimensionArrow {
  position: GeometryPoint2d
  rotation: number
  size: number
}

interface DimensionLabel {
  text: string
  position: GeometryPoint2d
  rotation: number
  height: number
}

/** The lines, arrows and label that draw a dimension. */
export interface ApplicationDimensionGraphics {
  lines: GeometryLine2d[]
  arrows: DimensionArrow[]
  label?: DimensionLabel
}

const rotateAround = (
  center: GeometryPoint2d,
  x: number,
  y: number,
  rotation: number
) =>
  new GeometryPoint2d(
    center.x + x * Math.cos(rotation) - y * Math.sin(rotation),
    center.y + x * Math.sin(rotation) + y * Math.cos(rotation)
  )

const arrowOutline = ({ position, rotation, size }: DimensionArrow) => [
  position.clone(),
  rotateAround(position, -size, -size * ARROW_HALF_WIDTH, rotation),
  rotateAround(position, -size, size * ARROW_HALF_WIDTH, rotation)
]

const labelCorners = ({ text, position, rotation, height }: DimensionLabel) => {
  const halfWidth = (text.length * height * LABEL_CHAR_WIDTH) / 2
  const halfHeight = height / 2
  return [
    rotateAround(position, -halfWidth, -halfHeight, rotation),
    rotateAround(position, halfWidth, -halfHeight, rotation),
    rotateAround(position, halfWidth, halfHeight, rotation),
    rotateAround(position, -halfWidth, halfHeight, rotation)
  ]
}

/** Returns the defining points of a dimension in grip order. */
export function dimensionGripPoints(
  dimension: GeometryDimension
): GeometryPoint2d[] {
  const names = APPLICATION_DIMENSION_POINTS[dimension.type] ?? []
  return names
    .map(name => dimension.points[name])
    .filter((point): point is GeometryPoint2d => point != null)
}

/** Returns a copy of a dimension with copies of its points. */
export function cloneDimension(
  dimension: GeometryDimension
): GeometryDimension {
  const points: Record<string, GeometryPoint2d> = {}
  for (const [name, point] of Object.entries(dimension.points)) {
    points[name] = point.clone()
  }
  return { ...dimension, points }
}

/**
 * Returns a copy of a dimension with the given grips moved.
 *
 * @param dimension - The dimension to change
 * @param indices - Grip indices, in the order of {@link dimensionGripPoints}
 * @param offset - How far to move the grips
 */
export function moveDimensionGrips(
  dimension: GeometryDimension,
  indices: readonly number[],
  offset: GeometryVector2dLike
): GeometryDimension {
  const moved = cloneDimension(dimension)
  const names = APPLICATION_DIMENSION_POINTS[dimension.type] ?? []
  for (const index of indices) {
    const name = names[index]
    if (name && moved.points[name]) moved.points[name].add(offset)
  }
  return moved
}

/** Returns a copy of a dimension with its points transformed. */
export function transformDimension(
  dimension: GeometryDimension,
  matrix: GeometryMatrix2d
): GeometryDimension {
  const moved = cloneDimension(dimension)
  for (const point of Object.values(moved.points)) {
    point.applyMatrix2d(matrix)
  }
  return moved
}

const extensionLine = (point: GeometryPoint2d, rotation: number) => {
  const angle = rotation + Math.PI / 2
  return new GeometryLine2d(point, {
    x: point.x + 100 * Math.cos(angle),
    y: point.y + 100 * Math.sin(angle)
  })
}

const projectOnto = (line: GeometryLine2d, point: GeometryPoint2dLike) => {
  const direction = new GeometryVector2d()
    .subVectors(line.endPoint, line.startPoint)
    .normalize()
  const length = new GeometryVector2d()
    .subVectors(point, line.startPoint)
    .dot(direction)
  return new GeometryPoint2d().addVectors(
    line.startPoint,
    new GeometryVector2d().copy(direction).multiplyScalar(length)
  )
}

/**
 * Returns the lines, arrows and label of a dimension. Only aligned and
 * rotated dimensions draw graphics.
 */
export function dimensionGraphics(
  dimension: GeometryDimension
): ApplicationDimensionGraphics {
  if (
    dimension.type !== 'AlignedDimension' &&
    dimension.type !== 'RotatedDimension'
  ) {
    return { lines: [], arrows: [] }
  }
  const { xLine1Point, xLine2Point, dimLinePoint } = dimension.points
  if (!xLine1Point || !xLine2Point || !dimLinePoint) {
    return { lines: [], arrows: [] }
  }
  const rotation = Math.atan2(
    xLine2Point.y - xLine1Point.y,
    xLine2Point.x - xLine1Point.x
  )
  const extension1 = extensionLine(xLine1Point, rotation)
  const extension2 = extensionLine(xLine2Point, rotation)
  const end1 = projectOnto(extension1, dimLinePoint)
  const end2 = projectOnto(extension2, dimLinePoint)
  const dimensionLine = new GeometryLine2d(end1, end2)
  extension1.endPoint = end1
  extension1.extend(DIMEXE)
  extension1.extend(-DIMEXO, true)
  extension2.endPoint = end2
  extension2.extend(DIMEXE)
  extension2.extend(-DIMEXO, true)
  const text = dimension.text ?? xLine1Point.distanceTo(xLine2Point).toFixed(3)
  return {
    lines: [dimensionLine, extension1, extension2],
    arrows: [
      {
        position: dimensionLine.startPoint,
        rotation: rotation + Math.PI,
        size: DIMENSION_ARROW_SIZE
      },
      {
        position: dimensionLine.endPoint,
        rotation,
        size: DIMENSION_ARROW_SIZE
      }
    ],
    label: text
      ? {
          text,
          position: new GeometryPoint2d(dimensionLine.midPoint),
          rotation,
          height: DIMENSION_TEXT_HEIGHT
        }
      : undefined
  }
}

/** Returns the extents of a dimension's graphics and points. */
export function dimensionExtents(dimension: GeometryDimension): GeometryBox2d {
  const box = new GeometryBox2d()
  const { lines, arrows, label } = dimensionGraphics(dimension)
  for (const line of lines) {
    box.expandByPoint(line.startPoint)
    box.expandByPoint(line.endPoint)
  }
  for (const arrow of arrows) {
    arrowOutline(arrow).forEach(point => box.expandByPoint(point))
  }
  if (label) {
    labelCorners(label).forEach(point => box.expandByPoint(point))
  }
  for (const point of Object.values(dimension.points)) {
    box.expandByPoint(point)
  }
  return box
}

/** Draws a dimension's lines, arrows and label. */
export function drawDimension(
  dimension: GeometryDimension,
  renderer: GraphicsInterfaceRenderer
): GraphicsInterfaceEntity {
  const { lines, arrows, label } = dimensionGraphics(dimension)
  const drawables = lines.map(line =>
    renderer.lines([line.startPoint, line.endPoint])
  )
  for (const arrow of arrows) {
    drawables.push(renderer.fill(arrowOutline(arrow)))
  }
  if (label) {
    drawables.push(
      renderer.text({
        text: label.text,
        height: label.height,
        position: label.position,
        rotation: label.rotation
      })
    )
  }
  return renderer.group(drawables)
}
