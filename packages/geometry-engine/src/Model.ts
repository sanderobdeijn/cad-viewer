import {
  GeometryCircularArc2d,
  GeometryDimension,
  GeometryEllipseArc2d,
  GeometryLine2d,
  GeometryPolyline2d,
  GeometryShape,
  GeometrySpline2d
} from './geometry'
import { GeometryPoint2d, type GeometryPoint2dLike } from './math'
import { TAU } from './util'

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
 * Thrown by {@link Model.parse} when a line of text cannot be read.
 */
export class ModelParseError extends Error {
  /**
   * @param line - The 1-based number of the line that could not be read
   * @param reason - Why the line could not be read
   */
  constructor(
    readonly line: number,
    reason: string
  ) {
    super(`Line ${line}: ${reason}`)
    this.name = 'ModelParseError'
    // Keeps instanceof working in the ES5 build.
    Object.setPrototypeOf(this, ModelParseError.prototype)
  }
}

const NUMBER_PATTERN = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/
const POINT_PATTERN = /^\(\s*([^\s,()]+)\s*,\s*([^\s,()]+)\s*\)$/
const POINT_IN_LIST_PATTERN = /\([^()]*\)/g
const FIELD_NAME_PATTERN = /^\s*([A-Za-z_]\w*)=/
const FIELD_VALUE_PATTERNS: Record<string, RegExp> = {
  '"': /^"(.*?)"(?=\s+[A-Za-z_]\w*=|\s*$)/,
  '(': /^\([^()]*\)/,
  '[': /^\[[^\]]*\]/
}
const PLAIN_VALUE_PATTERN = /^\S+/
/** The tolerance for an arc whose rounded angles span a full turn */
const FULL_TURN_TOLERANCE = 1e-5

const parseNumber = (name: string, raw: string) => {
  if (!NUMBER_PATTERN.test(raw)) {
    throw new Error(`${name} must be a number`)
  }
  return Number(raw)
}

const parsePoint = (name: string, raw: string) => {
  const match = POINT_PATTERN.exec(raw)
  if (!match) {
    throw new Error(`${name} must be a point such as (1, 2)`)
  }
  return new GeometryPoint2d(
    parseNumber(name, match[1]),
    parseNumber(name, match[2])
  )
}

/**
 * The name=value fields of one line. Each field can be read once, so that
 * {@link finish} can reject any field that the line should not have.
 */
class ModelTextFields {
  private readonly _values = new Map<string, string>()

  constructor(text: string) {
    let rest = text
    while (rest.trim() !== '') {
      const name = FIELD_NAME_PATTERN.exec(rest)
      if (!name) {
        throw new Error(`Unexpected text "${rest.trim()}"`)
      }
      rest = rest.slice(name[0].length)
      const pattern = FIELD_VALUE_PATTERNS[rest[0]] ?? PLAIN_VALUE_PATTERN
      const value = pattern.exec(rest)
      if (!value) {
        throw new Error(`${name[1]} has an incomplete value`)
      }
      if (this._values.has(name[1])) {
        throw new Error(`${name[1]} is repeated`)
      }
      this._values.set(name[1], value[0])
      rest = rest.slice(value[0].length)
    }
  }

  /** The names of the fields that have not been read yet */
  get names() {
    return [...this._values.keys()]
  }

  optional(name: string) {
    const value = this._values.get(name)
    this._values.delete(name)
    return value
  }

  required(name: string) {
    const value = this.optional(name)
    if (value === undefined) {
      throw new Error(`${name} is missing`)
    }
    return value
  }

  number(name: string) {
    return parseNumber(name, this.required(name))
  }

  point(name: string) {
    return parsePoint(name, this.required(name))
  }

  points(name: string) {
    const raw = this.required(name)
    const inner = /^\[(.*)\]$/.exec(raw)?.[1]
    if (
      inner === undefined ||
      inner.replace(POINT_IN_LIST_PATTERN, '').replace(/[\s,]/g, '') !== ''
    ) {
      throw new Error(`${name} must be a list such as [(1, 2), (3, 4)]`)
    }
    return (inner.match(POINT_IN_LIST_PATTERN) ?? []).map(point =>
      parsePoint(name, point)
    )
  }

  boolean(name: string) {
    const raw = this.required(name)
    if (raw !== 'true' && raw !== 'false') {
      throw new Error(`${name} must be true or false`)
    }
    return raw === 'true'
  }

  finish() {
    if (this.names.length > 0) {
      throw new Error(`Unknown field ${this.names[0]}`)
    }
  }
}

const positive = (name: string, value: number) => {
  if (value <= 0) {
    throw new Error(`${name} must be greater than 0`)
  }
  return value
}

/** Rounded text cannot hold a full turn exactly, so restore it here. */
const snapFullTurn = (startAngle: number, endAngle: number) =>
  Math.abs(endAngle - startAngle - TAU) < FULL_TURN_TOLERANCE
    ? startAngle + TAU
    : endAngle

const clampedKnots = (count: number, degree: number) => {
  const knots: number[] = []
  for (let i = 0; i <= count + degree; i++) {
    knots.push(Math.min(1, Math.max(0, (i - degree) / (count - degree))))
  }
  return knots
}

const parseSpline = (fields: ModelTextFields) => {
  const degree = fields.number('degree')
  const controlPoints = fields.points('controlPoints')
  const closed = fields.boolean('closed')
  if (!Number.isInteger(degree) || degree < 1) {
    throw new Error('degree must be a whole number of at least 1')
  }
  if (controlPoints.length <= degree) {
    throw new Error(`controlPoints needs more than ${degree} points`)
  }
  return new GeometrySpline2d(
    controlPoints,
    clampedKnots(controlPoints.length, degree),
    undefined,
    degree,
    closed
  )
}

const parseShape = (kind: string, fields: ModelTextFields) => {
  switch (kind) {
    case 'Line':
      return new GeometryLine2d(fields.point('start'), fields.point('end'))
    case 'CircularArc': {
      const center = fields.point('center')
      const radius = positive('radius', fields.number('radius'))
      const startAngle = fields.number('startAngle')
      const endAngle = fields.number('endAngle')
      return GeometryCircularArc2d.fromMathAngles(
        center,
        radius,
        startAngle,
        snapFullTurn(startAngle, endAngle),
        false
      )
    }
    case 'EllipseArc': {
      const center = fields.point('center')
      const majorRadius = positive('majorRadius', fields.number('majorRadius'))
      const minorRadius = positive('minorRadius', fields.number('minorRadius'))
      const rotation = fields.number('rotation')
      const startAngle = fields.number('startAngle')
      const endAngle = fields.number('endAngle')
      return new GeometryEllipseArc2d(
        center,
        majorRadius,
        minorRadius,
        startAngle,
        snapFullTurn(startAngle, endAngle),
        false,
        rotation
      )
    }
    case 'Polyline': {
      const vertices = fields.points('vertices')
      if (vertices.length < 2) {
        throw new Error('vertices needs at least 2 points')
      }
      return new GeometryPolyline2d(
        vertices.map(({ x, y }) => ({ x, y, bulge: 0 })),
        fields.boolean('closed')
      )
    }
    case 'Spline':
      return parseSpline(fields)
    default:
      return undefined
  }
}

const parseDimension = (fields: ModelTextFields): GeometryDimension => {
  const type = fields.required('type')
  const text = fields.optional('text')
  const measurement = fields.optional('measurement')
  const points: Record<string, GeometryPoint2d> = {}
  for (const name of fields.names) {
    points[name] = fields.point(name)
  }
  return {
    type,
    points,
    text: text === undefined ? undefined : text.slice(1, -1),
    measurement:
      measurement === undefined
        ? undefined
        : parseNumber('measurement', measurement)
  }
}

const parseLineInto = (model: Model, text: string) => {
  const [, kind, rest] = /^\s*(\S+)(.*)$/.exec(text) as RegExpExecArray
  const fields = new ModelTextFields(rest)
  if (kind === 'Point') {
    model.points.push(fields.point('position'))
  } else if (kind === 'Dimension') {
    model.dimensions.push(parseDimension(fields))
  } else {
    const shape = parseShape(kind, fields)
    if (!shape) {
      throw new Error(`Unknown item "${kind}"`)
    }
    model.shapes.push(shape)
  }
  fields.finish()
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
   * Reads a model from the text written by {@link toString}. Blank lines are
   * ignored and numbers may be written with any spacing.
   *
   * @param text - One shape, point or dimension per line
   * @returns The model described by the text
   * @throws {ModelParseError} When a line cannot be read
   */
  static parse(text: string) {
    const model = new Model()
    text.split(/\r?\n/).forEach((line, index) => {
      if (line.trim() === '') {
        return
      }
      try {
        parseLineInto(model, line)
      } catch (error) {
        throw new ModelParseError(
          index + 1,
          error instanceof Error ? error.message : String(error)
        )
      }
    })
    return model
  }

  /** Return the line of text that describes the given shape. */
  static formatShape(shape: GeometryShape) {
    return formatShape(shape)
  }

  /** Return the line of text that describes the given point. */
  static formatPoint(point: GeometryPoint2dLike) {
    return `Point position=${formatPoint(point)}`
  }

  /** Return the line of text that describes the given dimension. */
  static formatDimension(dimension: GeometryDimension) {
    return formatDimension(dimension)
  }

  /**
   * Return a text description of this model with one line per shape, point
   * and dimension.
   */
  toString() {
    return [
      ...this.shapes.map(formatShape),
      ...this.points.map(Model.formatPoint),
      ...this.dimensions.map(formatDimension)
    ].join('\n')
  }
}
