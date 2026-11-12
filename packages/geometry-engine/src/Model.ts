import { CommonEventManager } from '@mlightcad/common'

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

/** A point with an id is written as `point(id, x, y)`. */
const formatIdPoint = (point: GeometryPoint2dLike, withIds: boolean) =>
  withIds && point.id !== undefined
    ? `point(${point.id}, ${formatNumber(point.x)}, ${formatNumber(point.y)})`
    : formatPoint(point)

/**
 * A vertex is written as `(x, y)`, or `point(id, x, y)` with its id. The bulge
 * is left out for a straight segment.
 */
const formatPolylineVertex = (
  vertex: GeometryPolyline2dVertex,
  withIds: boolean
) => {
  const bulge = formatNumber(vertex.bulge ?? 0)
  const coordinates = `${formatNumber(vertex.x)}, ${formatNumber(vertex.y)}`
  const values = bulge === '0' ? coordinates : `${coordinates}, bulge=${bulge}`
  return withIds && vertex.id !== undefined
    ? `point(${vertex.id}, ${values})`
    : `(${values})`
}

const formatPolylineVertices = (
  vertices: GeometryPolyline2dVertex[],
  withIds: boolean
) =>
  `[${vertices.map(vertex => formatPolylineVertex(vertex, withIds)).join(', ')}]`

/** The ids of points are written only when `withIds` is set. */
const formatShape = (shape: GeometryShape, withIds = false) => {
  if (shape instanceof GeometryLine2d) {
    return `Line start=${formatIdPoint(shape.startPoint, withIds)} end=${formatIdPoint(shape.endPoint, withIds)}`
  }
  if (shape instanceof GeometryCircularArc2d) {
    return `CircularArc center=${formatIdPoint(shape.center, withIds)} radius=${formatNumber(shape.radius)} startAngle=${formatNumber(shape.startAngle)} endAngle=${formatNumber(shape.endAngle)}`
  }
  if (shape instanceof GeometryEllipseArc2d) {
    return `EllipseArc center=${formatIdPoint(shape.center, withIds)} majorRadius=${formatNumber(shape.majorAxisRadius)} minorRadius=${formatNumber(shape.minorAxisRadius)} rotation=${formatNumber(shape.rotation)} startAngle=${formatNumber(shape.startAngle)} endAngle=${formatNumber(shape.endAngle)}`
  }
  if (shape instanceof GeometryPolyline2d) {
    return `Polyline vertices=${formatPolylineVertices(shape.vertices, withIds)} closed=${shape.closed}`
  }
  return 'Shape'
}

/** The ids of points are written only when `withIds` is set. */
const formatDimension = (dimension: GeometryDimension, withIds = false) => {
  const parts = [`Dimension type=${dimension.type}`]
  for (const [name, point] of Object.entries(dimension.points)) {
    parts.push(`${name}=${formatIdPoint(point, withIds)}`)
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
const ID_POINT_PATTERN =
  /^point\(\s*(?:([^\s,()]+)\s*,\s*)?([^\s,()]+)\s*,\s*([^\s,()]+)\s*\)$/
const ID_POINT_VALUE_PATTERN = /^point\([^()]*\)/
const VERTEX_IN_LIST_PATTERN = /(?:point)?\([^()]*\)/g
const VERTEX_PATTERN =
  /^\(\s*([^\s,()]+)\s*,\s*([^\s,()]+)\s*(?:,\s*bulge\s*=\s*([^\s,()]+)\s*)?\)$/
const ID_VERTEX_PATTERN =
  /^point\(\s*(?:([^\s,()=]+)\s*,\s*)?([^\s,()=]+)\s*,\s*([^\s,()=]+)\s*(?:,\s*bulge\s*=\s*([^\s,()]+)\s*)?\)$/
const FIELD_NAME_PATTERN = /^\s*([A-Za-z_]\w*)=/
const FIELD_VALUE_PATTERNS: Record<string, RegExp> = {
  '"': /^"(.*?)"(?=\s+[A-Za-z_]\w*=|\s*$)/,
  '(': /^\([^()]*\)/,
  '[': /^\[[^\]]*\]/
}
const PLAIN_VALUE_PATTERN = /^\S+/
/** The tolerance for an arc whose rounded angles span a full turn */
const FULL_TURN_TOLERANCE = 1e-5

const ID_PATTERN = /^[A-Za-z0-9_.:-]+$/

const checkId = (id: string) => {
  if (!ID_PATTERN.test(id)) {
    throw new Error('id may only use letters, digits and _ . : -')
  }
  return id
}

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
  const idMatch = ID_VERTEX_PATTERN.exec(raw)
  const match = idMatch ? idMatch.slice(1) : VERTEX_PATTERN.exec(raw)?.slice(1)
  if (!match) {
    throw new Error(`${name} must list points such as (1, 2, bulge=0.5)`)
  }
  // A plain vertex has no id group, so line its fields up with point(...).
  const [id, x, y, bulge] = idMatch ? match : [undefined, ...match]
  const vertex: GeometryPolyline2dVertex = {
    x: parseNumber(name, x as string),
    y: parseNumber(name, y as string),
    bulge: bulge === undefined ? 0 : parseNumber('bulge', bulge)
  }
  if (id !== undefined) {
    vertex.id = checkId(id)
  }
  return vertex
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
      const pattern = rest.startsWith('point(')
        ? ID_POINT_VALUE_PATTERN
        : (FIELD_VALUE_PATTERNS[rest[0]] ?? PLAIN_VALUE_PATTERN)
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

  /** A point written as `(x, y)`, `point(x, y)` or `point(id, x, y)`. */
  idPoint(name: string) {
    const raw = this.required(name)
    const match = ID_POINT_PATTERN.exec(raw)
    if (!match) {
      return parsePoint(name, raw)
    }
    const point = new GeometryPoint2d(
      parseNumber(name, match[2]),
      parseNumber(name, match[3])
    )
    if (match[1] !== undefined) {
      point.id = checkId(match[1])
    }
    return point
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
      return new GeometryLine2d(fields.idPoint('start'), fields.idPoint('end'))
    case 'CircularArc': {
      const center = fields.idPoint('center')
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
      const center = fields.idPoint('center')
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
    points[name] = fields.idPoint(name)
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

/** Reads one line of text into an item, keeping its id when the line has one. */
const parseItem = (text: string): ModelTextItem => {
  const [, kind, rest] = /^\s*(\S+)(.*)$/.exec(text) as RegExpExecArray
  const fields = new ModelTextFields(rest)
  const rawId = fields.optional('id')
  const id = rawId === undefined ? undefined : checkId(rawId)
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

/** The names of the points of a dimension, in a fixed order. */
const dimensionPointNames = (dimension: GeometryDimension) =>
  Object.keys(dimension.points).sort()

/**
 * The points of an item that carry ids: the ends of a line, the vertices of a
 * polyline, the center of an arc or ellipse and the points of a dimension. A
 * point item is itself the point, so it uses the id of the item.
 */
const idPointsOf = (
  item: Pick<ModelItem, 'kind' | 'geometry'>
): { id?: string }[] => {
  if (item.kind === 'dimension') {
    const dimension = item.geometry as GeometryDimension
    return dimensionPointNames(dimension).map(name => dimension.points[name])
  }
  if (item.kind !== 'shape') {
    return []
  }
  if (item.geometry instanceof GeometryLine2d) {
    return [item.geometry.startPoint, item.geometry.endPoint]
  }
  if (item.geometry instanceof GeometryPolyline2d) {
    return item.geometry.vertices
  }
  if (
    item.geometry instanceof GeometryCircularArc2d ||
    item.geometry instanceof GeometryEllipseArc2d
  ) {
    return [item.geometry.center]
  }
  return []
}

/** Returns a copy of the geometry of an item whose points carry ids. */
const copyGeometry = (item: ModelItem): ModelItem['geometry'] => {
  if (item.kind === 'dimension') {
    const dimension = item.geometry
    return {
      ...dimension,
      points: Object.fromEntries(
        Object.entries(dimension.points).map(([name, point]) => [
          name,
          point.clone()
        ])
      )
    }
  }
  return item.geometry.clone()
}

/** Adds the id to the line that describes an item, after its kind. */
const withId = (line: string, id: string) =>
  line.replace(/^(\S+)/, `$1 id=${id}`)

const formatGeometry = (item: Omit<ModelItem, 'id'>, withIds = false) => {
  switch (item.kind) {
    case 'shape':
      return formatShape(item.geometry as GeometryShape, withIds)
    case 'point':
      return `Point position=${formatPoint(item.geometry as GeometryPoint2d)}`
    case 'dimension':
      return formatDimension(item.geometry as GeometryDimension, withIds)
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
    itemAdded: new CommonEventManager<ModelItemEventArgs>(),
    itemModified: new CommonEventManager<ModelItemEventArgs>(),
    itemRemoved: new CommonEventManager<ModelItemEventArgs>()
  }

  private readonly _items = new Map<string, ModelItem>()
  /** The id of the item that owns each point id */
  private readonly _pointOwners = new Map<string, string>()
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
   * Adds an item, giving it a new id unless one is passed. The points of a
   * shape or dimension get new ids too, unless they have ids that are not
   * used yet.
   *
   * @param item - The item to add
   * @returns The added item
   * @throws When an item or point with the same id already exists
   */
  add(item: ModelTextItem): ModelItem {
    const id = item.id ?? this.newId()
    if (this._items.has(id) || this._pointOwners.has(id)) {
      throw new Error(`An item with id ${id} already exists`)
    }
    const added = this.withPointIds({ ...item, id } as ModelItem)
    this._items.set(id, added)
    this.registerPoints(added)
    this.events.itemAdded.dispatch({ model: this, item: added })
    return added
  }

  /**
   * Replaces the kind and geometry of an existing item, keeping its id and
   * position. Points without an id keep the ids of the points they replace,
   * by position.
   *
   * @param item - The new contents, with the id of the item to change
   * @returns The changed item
   * @throws When no item has that id
   */
  update(item: ModelItem): ModelItem {
    const previous = this._items.get(item.id)
    if (!previous) {
      throw new Error(`No item has id ${item.id}`)
    }
    this.unregisterPoints(previous)
    const updated = this.withPointIds({ ...item }, previous)
    this._items.set(item.id, updated)
    this.registerPoints(updated)
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
    this.unregisterPoints(item)
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
        const ids = [item.id, ...idPointsOf(item).map(point => point.id)]
        for (const id of ids) {
          if (id === undefined) {
            continue
          }
          if (seen.has(id)) {
            throw new Error(`id ${id} is repeated`)
          }
          seen.add(id)
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
    const line = formatGeometry(item, item.id !== undefined)
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

  /** Returns an id used by no item, no point and none of `reserved`. */
  private newId(reserved: ReadonlySet<string> = new Set()) {
    const used = (id: string) =>
      this._items.has(id) || this._pointOwners.has(id) || reserved.has(id)
    while (used(String(this._nextId))) {
      this._nextId++
    }
    return String(this._nextId++)
  }

  /**
   * Returns the item with an id on each of its points. A point keeps its own
   * id, or else the id of the point in the same position in `previous`, as
   * long as no other item or point uses it. The geometry is copied before an
   * id it already has is changed, so geometry shared with another item keeps
   * its ids.
   */
  private withPointIds(item: ModelItem, previous?: ModelItem): ModelItem {
    const points = idPointsOf(item)
    if (points.length === 0) {
      return item
    }
    const inherited = previous
      ? idPointsOf(previous).map(point => point.id)
      : []
    const reserved = new Set([item.id])
    const ids = points.map((point, index) => {
      const id = point.id ?? inherited[index]
      const owner = id === undefined ? undefined : this._pointOwners.get(id)
      const free =
        id !== undefined &&
        !reserved.has(id) &&
        !this._items.has(id) &&
        (owner === undefined || owner === item.id)
      const chosen = free ? id : this.newId(reserved)
      reserved.add(chosen)
      return chosen
    })
    if (points.every((point, index) => point.id === ids[index])) {
      return item
    }
    const changesId = points.some(
      (point, index) => point.id !== undefined && point.id !== ids[index]
    )
    const geometry = changesId ? copyGeometry(item) : item.geometry
    const result = { ...item, geometry } as ModelItem
    idPointsOf(result).forEach((point, index) => {
      point.id = ids[index]
    })
    return result
  }

  private registerPoints(item: ModelItem) {
    for (const point of idPointsOf(item)) {
      this._pointOwners.set(point.id!, item.id)
    }
  }

  private unregisterPoints(item: ModelItem) {
    for (const point of idPointsOf(item)) {
      if (
        point.id !== undefined &&
        this._pointOwners.get(point.id) === item.id
      ) {
        this._pointOwners.delete(point.id)
      }
    }
  }
}
