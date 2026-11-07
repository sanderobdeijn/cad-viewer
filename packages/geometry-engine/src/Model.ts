import { AcCmEventManager } from '@mlightcad/common'

import {
  GeometryCircularArc2d,
  GeometryDimension,
  GeometryEllipseArc2d,
  GeometryLine2d,
  GeometryPolyline2d,
  GeometryPolyline2dVertex,
  GeometryShape
} from './geometry'
import { GeometryPoint2d, type GeometryPoint2dLike } from './math'
import { TAU } from './util'

const formatNumber = (value: number) => String(Number(value.toFixed(6)))

const formatPoint = (point: GeometryPoint2dLike) =>
  `(${formatNumber(point.x)}, ${formatNumber(point.y)})`

/** The bulge is left out for a straight segment. */
const formatPolylineVertex = (vertex: GeometryPolyline2dVertex) => {
  const bulge = formatNumber(vertex.bulge ?? 0)
  return bulge === '0'
    ? formatPoint(vertex)
    : `(${formatNumber(vertex.x)}, ${formatNumber(vertex.y)}, bulge=${bulge})`
}

const formatPolylineVertices = (vertices: GeometryPolyline2dVertex[]) =>
  `[${vertices.map(formatPolylineVertex).join(', ')}]`

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
    return `Polyline vertices=${formatPolylineVertices(shape.vertices)} closed=${shape.closed}`
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
const VERTEX_IN_LIST_PATTERN = /\([^()]*\)/g
const VERTEX_PATTERN =
  /^\(\s*([^\s,()]+)\s*,\s*([^\s,()]+)\s*(?:,\s*bulge\s*=\s*([^\s,()]+)\s*)?\)$/
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

const parsePolylineVertex = (
  name: string,
  raw: string
): GeometryPolyline2dVertex => {
  const match = VERTEX_PATTERN.exec(raw)
  if (!match) {
    throw new Error(`${name} must list points such as (1, 2, bulge=0.5)`)
  }
  return {
    x: parseNumber(name, match[1]),
    y: parseNumber(name, match[2]),
    bulge: match[3] === undefined ? 0 : parseNumber('bulge', match[3])
  }
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

  polylineVertices(name: string) {
    const raw = this.required(name)
    const inner = /^\[(.*)\]$/.exec(raw)?.[1]
    if (
      inner === undefined ||
      inner.replace(VERTEX_IN_LIST_PATTERN, '').replace(/[\s,]/g, '') !== ''
    ) {
      throw new Error(`${name} must be a list such as [(1, 2), (3, 4)]`)
    }
    return (inner.match(VERTEX_IN_LIST_PATTERN) ?? []).map(vertex =>
      parsePolylineVertex(name, vertex)
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
      const vertices = fields.polylineVertices('vertices')
      if (vertices.length < 2) {
        throw new Error('vertices needs at least 2 points')
      }
      return new GeometryPolyline2d(vertices, fields.boolean('closed'))
    }
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

const ID_PATTERN = /^[A-Za-z0-9_.:-]+$/

/** Reads one line of text into an item, keeping its id when the line has one. */
const parseItem = (text: string): ModelTextItem => {
  const [, kind, rest] = /^\s*(\S+)(.*)$/.exec(text) as RegExpExecArray
  const fields = new ModelTextFields(rest)
  const id = fields.optional('id')
  if (id !== undefined && !ID_PATTERN.test(id)) {
    throw new Error('id may only use letters, digits and _ . : -')
  }
  let item: ModelTextItem
  if (kind === 'Point') {
    item = { id, kind: 'point', geometry: fields.point('position') }
  } else if (kind === 'Dimension') {
    item = { id, kind: 'dimension', geometry: parseDimension(fields) }
  } else {
    const shape = parseShape(kind, fields)
    if (!shape) {
      throw new Error(`Unknown item "${kind}"`)
    }
    item = { id, kind: 'shape', geometry: shape }
  }
  fields.finish()
  return item
}

/** One shape, point or dimension in a {@link Model}. */
export type ModelItem =
  | { id: string; kind: 'shape'; geometry: GeometryShape }
  | { id: string; kind: 'point'; geometry: GeometryPoint2d }
  | { id: string; kind: 'dimension'; geometry: GeometryDimension }

/** The kind of a {@link ModelItem}. */
export type ModelItemKind = ModelItem['kind']

/** A {@link ModelItem} read from text, whose id is missing for a new line. */
export type ModelTextItem = ModelItem extends infer Item
  ? Item extends ModelItem
    ? Omit<Item, 'id'> & { id?: string }
    : never
  : never

/** Arguments of the {@link Model} item events. */
export interface ModelItemEventArgs {
  /** The model that changed */
  model: Model
  /** The item that was added, changed or removed */
  item: ModelItem
}

/** Adds the id to the line that describes an item, after its kind. */
const withId = (line: string, id: string) =>
  line.replace(/^(\S+)/, `$1 id=${id}`)

const formatGeometry = (item: Omit<ModelItem, 'id'>) => {
  switch (item.kind) {
    case 'shape':
      return formatShape(item.geometry as GeometryShape)
    case 'point':
      return `Point position=${formatPoint(item.geometry as GeometryPoint2d)}`
    case 'dimension':
      return formatDimension(item.geometry as GeometryDimension)
  }
}

/** The order of the kinds in the text */
const KIND_ORDER: ModelItemKind[] = ['shape', 'point', 'dimension']

/**
 * Geometry model: the shapes, points and dimensions of a drawing, each with a
 * stable id.
 *
 * Items keep the order in which they were added. Changes fire
 * {@link events}, so a view can follow the model.
 */
export class Model {
  /** Events fired when items are added, changed or removed */
  readonly events = {
    itemAdded: new AcCmEventManager<ModelItemEventArgs>(),
    itemModified: new AcCmEventManager<ModelItemEventArgs>(),
    itemRemoved: new AcCmEventManager<ModelItemEventArgs>()
  }

  private readonly _items = new Map<string, ModelItem>()
  private _nextId = 1

  /** All items in the order they were added */
  get items(): ModelItem[] {
    return [...this._items.values()]
  }

  /** The shapes in this model */
  get shapes(): GeometryShape[] {
    return this.geometryOf('shape') as GeometryShape[]
  }

  /** The points in this model */
  get points(): GeometryPoint2d[] {
    return this.geometryOf('point') as GeometryPoint2d[]
  }

  /** The dimensions in this model */
  get dimensions(): GeometryDimension[] {
    return this.geometryOf('dimension') as GeometryDimension[]
  }

  /** Returns the item with this id, if any. */
  get(id: string) {
    return this._items.get(id)
  }

  /** Whether the model has an item with this id. */
  has(id: string) {
    return this._items.has(id)
  }

  /**
   * Adds an item, giving it a new id unless one is passed.
   *
   * @param item - The item to add
   * @returns The added item
   * @throws When an item with the same id already exists
   */
  add(item: ModelTextItem): ModelItem {
    const id = item.id ?? this.newId()
    if (this._items.has(id)) {
      throw new Error(`An item with id ${id} already exists`)
    }
    const added = { ...item, id } as ModelItem
    this._items.set(id, added)
    this.events.itemAdded.dispatch({ model: this, item: added })
    return added
  }

  /**
   * Replaces the kind and geometry of an existing item, keeping its id and
   * position.
   *
   * @param item - The new contents, with the id of the item to change
   * @returns The changed item
   * @throws When no item has that id
   */
  update(item: ModelItem): ModelItem {
    if (!this._items.has(item.id)) {
      throw new Error(`No item has id ${item.id}`)
    }
    const updated = { ...item }
    this._items.set(item.id, updated)
    this.events.itemModified.dispatch({ model: this, item: updated })
    return updated
  }

  /**
   * Adds the item, or updates it when an item with its id exists.
   *
   * @param item - The item to store
   * @returns The stored item
   */
  set(item: ModelItem): ModelItem {
    return this._items.has(item.id) ? this.update(item) : this.add(item)
  }

  /**
   * Removes the item with this id.
   *
   * @param id - The id of the item to remove
   * @returns Whether an item was removed
   */
  remove(id: string) {
    const item = this._items.get(id)
    if (!item) {
      return false
    }
    this._items.delete(id)
    this.events.itemRemoved.dispatch({ model: this, item })
    return true
  }

  /** Removes every item. */
  clear() {
    for (const id of [...this._items.keys()]) {
      this.remove(id)
    }
  }

  /**
   * Reads the items described by text written by {@link toString}. Blank lines
   * are ignored and numbers may be written with any spacing. A line without an
   * `id` field describes a new item.
   *
   * @param text - One shape, point or dimension per line
   * @returns The items in the order of their lines
   * @throws {ModelParseError} When a line cannot be read or an id is repeated
   */
  static parseItems(text: string): ModelTextItem[] {
    const items: ModelTextItem[] = []
    const seen = new Set<string>()
    text.split(/\r?\n/).forEach((line, index) => {
      if (line.trim() === '') {
        return
      }
      try {
        const item = parseItem(line)
        if (item.id !== undefined) {
          if (seen.has(item.id)) {
            throw new Error(`id ${item.id} is repeated`)
          }
          seen.add(item.id)
        }
        items.push(item)
      } catch (error) {
        throw new ModelParseError(
          index + 1,
          error instanceof Error ? error.message : String(error)
        )
      }
    })
    return items
  }

  /**
   * Reads a model from the text written by {@link toString}. Lines without an
   * id get a new one.
   *
   * @param text - One shape, point or dimension per line
   * @returns The model described by the text
   * @throws {ModelParseError} When a line cannot be read
   */
  static parse(text: string) {
    const model = new Model()
    const items = Model.parseItems(text)
    items.filter(item => item.id !== undefined).forEach(item => model.add(item))
    items.filter(item => item.id === undefined).forEach(item => model.add(item))
    return model
  }

  /** Return the line of text that describes the given shape, without an id. */
  static formatShape(shape: GeometryShape) {
    return formatShape(shape)
  }

  /** Return the line of text that describes the given point, without an id. */
  static formatPoint(point: GeometryPoint2dLike) {
    return `Point position=${formatPoint(point)}`
  }

  /** Return the line of text that describes the given dimension, without an id. */
  static formatDimension(dimension: GeometryDimension) {
    return formatDimension(dimension)
  }

  /**
   * Return the line of text that describes an item, including its id when it
   * has one.
   */
  static formatItem(item: ModelTextItem) {
    const line = formatGeometry(item)
    return item.id === undefined ? line : withId(line, item.id)
  }

  /**
   * Return a text description of this model with one line per item: shapes
   * first, then points, then dimensions, each in the order they were added.
   */
  toString() {
    return KIND_ORDER.flatMap(kind =>
      this.items.filter(item => item.kind === kind).map(Model.formatItem)
    ).join('\n')
  }

  private geometryOf(kind: ModelItemKind) {
    return this.items
      .filter(item => item.kind === kind)
      .map(item => item.geometry)
  }

  private newId() {
    while (this._items.has(String(this._nextId))) {
      this._nextId++
    }
    return String(this._nextId++)
  }
}
