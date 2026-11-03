import {
  GeometryBox3d,
  GeometryIntersectPrimitive,
  GeometryLine2d,
  GeometryMatrix3d,
  GeometryPoint2d,
  GeometryPoint2dLike,
  GeometryVector2dLike
} from '@mlightcad/geometry-engine'
import { AcGiRenderer } from '@mlightcad/graphic-interface'

import { AcDbOsnapMode } from '../misc/AcDbOsnapMode'
import { AcDbCurve } from './AcDbCurve'
import { AcDbEntityProperties } from './AcDbEntityProperties'
import { acdbForEachGripIndex } from './AcDbGripHelpers'

/**
 * Represents a line entity in AutoCAD.
 *
 * A line is a 2D geometric object defined by its start point and end point.
 * Lines are fundamental drawing entities that can be used to create straight
 * line segments in the XY plane.
 *
 * @example
 * ```typescript
 * // Create a line from point (0,0,0) to point (10,10,0)
 * const line = new AcDbLine(
 *   new GeometryPoint2d(0, 0),
 *   new GeometryPoint2d(10, 10)
 * );
 *
 * // Access line properties
 * console.log(`Start point: ${line.startPoint}`);
 * console.log(`End point: ${line.endPoint}`);
 * console.log(`Mid point: ${line.midPoint}`);
 * ```
 */
export class AcDbLine extends AcDbCurve {
  /** The entity type name */
  static override typeName: string = 'Line'

  override get dxfTypeName() {
    return 'LINE'
  }

  override get geometry() {
    return this._geo
  }

  /** Backing for the lazily materialized geometric line object. */
  private _geoData: GeometryLine2d | null = null

  /**
   * The underlying geometric line object. Materialized lazily so that
   * factory-created entities (dxfIn path) never allocate a default line
   * that dxfIn would immediately replace.
   */
  private get _geo(): GeometryLine2d {
    if (this._geoData == null) {
      this._geoData = new GeometryLine2d(
        new GeometryPoint2d(),
        new GeometryPoint2d()
      )
    }
    return this._geoData
  }

  private set _geo(value: GeometryLine2d) {
    this._geoData = value
  }

  /**
   * Creates a new line entity.
   *
   * This constructor initializes the line object with the specified start and end points.
   * Both points must be in World Coordinate System (WCS) XY coordinates.
   *
   * @param start - The starting point of the line in WCS coordinates
   * @param end - The ending point of the line in WCS coordinates
   *
   * @example
   * ```typescript
   * const line = new AcDbLine(
   *   new GeometryPoint2d(0, 0),
   *   new GeometryPoint2d(100, 50)
   * );
   * ```
   */
  constructor()
  constructor(start: GeometryPoint2dLike, end: GeometryPoint2dLike)
  constructor(start?: GeometryPoint2dLike, end?: GeometryPoint2dLike) {
    super()
    if (start !== undefined && end !== undefined) {
      this._geo = new GeometryLine2d(start, end)
    }
  }

  /**
   * Gets the starting point of this line.
   *
   * @returns The starting point as a 2D point
   *
   * @example
   * ```typescript
   * const startPoint = line.startPoint;
   * console.log(`Line starts at: ${startPoint.x}, ${startPoint.y}`);
   * ```
   */
  get startPoint(): GeometryPoint2d {
    return this._geo.startPoint
  }

  /**
   * Sets the starting point of this line.
   *
   * @param value - The new starting point
   *
   * @example
   * ```typescript
   * line.startPoint = new GeometryPoint2d(5, 5);
   * ```
   */
  set startPoint(value: GeometryPoint2dLike) {
    this._geo.startPoint = value
  }

  /**
   * Gets the ending point of this line.
   *
   * @returns The ending point as a 2D point
   *
   * @example
   * ```typescript
   * const endPoint = line.endPoint;
   * console.log(`Line ends at: ${endPoint.x}, ${endPoint.y}`);
   * ```
   */
  get endPoint(): GeometryPoint2d {
    return this._geo.endPoint
  }

  /**
   * Sets the ending point of this line.
   *
   * @param value - The new ending point
   *
   * @example
   * ```typescript
   * line.endPoint = new GeometryPoint2d(15, 15);
   * ```
   */
  set endPoint(value: GeometryPoint2dLike) {
    this._geo.endPoint = value
  }

  /**
   * Gets the middle point of this line.
   *
   * The middle point is calculated as the midpoint between the start and end points.
   *
   * @returns The middle point as a 2D point
   *
   * @example
   * ```typescript
   * const midPoint = line.midPoint;
   * console.log(`Line midpoint: ${midPoint.x}, ${midPoint.y}`);
   * ```
   */
  get midPoint(): GeometryPoint2d {
    return this._geo.midPoint
  }

  /**
   * Gets the geometric extents (bounding box) of this line.
   *
   * @returns The bounding box that encompasses the entire line
   *
   * @example
   * ```typescript
   * const extents = line.geometricExtents;
   * console.log(`Line bounds: ${extents.minPoint} to ${extents.maxPoint}`);
   * ```
   */
  get geometricExtents(): GeometryBox3d {
    return new GeometryBox3d(this._geo.box.min, this._geo.box.max)
  }

  /** @inheritdoc */
  override subGetIntersectCurves(): GeometryIntersectPrimitive[] {
    return [
      {
        kind: 'line',
        line: this._geo,
        extent: 'bounded'
      }
    ]
  }

  /**
   * Gets whether this line is closed.
   *
   * Lines are always open entities, so this always returns false.
   *
   * @returns Always false for lines
   */
  get closed(): boolean {
    return false
  }

  /** @inheritdoc */
  get area(): number {
    return 0
  }

  /**
   * Returns the full property definition for this line entity, including
   * general group and geometry group.
   *
   * The geometry group exposes editable start/end coordinates via
   * {@link AcDbPropertyAccessor} so the property palette can update
   * the line in real-time.
   *
   * Each property is an {@link AcDbEntityRuntimeProperty}.
   */
  get properties(): AcDbEntityProperties {
    return {
      type: this.type,
      groups: [
        this.getGeneralProperties(),
        {
          groupName: 'geometry',
          properties: [
            {
              name: 'startX',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.startPoint.x,
                set: (v: number) => {
                  this.startPoint.x = v
                }
              }
            },
            {
              name: 'startY',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.startPoint.y,
                set: (v: number) => {
                  this.startPoint.y = v
                }
              }
            },
            {
              name: 'endX',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.endPoint.x,
                set: (v: number) => {
                  this.endPoint.x = v
                }
              }
            },
            {
              name: 'endY',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.endPoint.y,
                set: (v: number) => {
                  this.endPoint.y = v
                }
              }
            },
            {
              name: 'length',
              type: 'float',
              editable: false,
              accessor: {
                get: () => this._geo.length
              }
            }
          ]
        }
      ]
    }
  }

  /**
   * Gets the grip points for this line.
   *
   * Grip points are control points that can be used to modify the line.
   * For a line, the grip points are the midpoint, start point, and end point.
   *
   * @returns Array of grip points (midpoint, start point, end point)
   *
   * @example
   * ```typescript
   * const gripPoints = line.subGetGripPoints();
   * // gripPoints contains: [midPoint, startPoint, endPoint]
   * ```
   */
  subGetGripPoints() {
    const gripPoints = new Array<GeometryPoint2d>()
    gripPoints.push(this.midPoint)
    gripPoints.push(this.startPoint)
    gripPoints.push(this.endPoint)
    return gripPoints
  }

  /**
   * Moves grip points for this line.
   *
   * Index 0 moves the midpoint and translates the whole line. Indices 1 and 2
   * move the start and end points respectively.
   */
  subMoveGripPointsAt(indices: number[], offset: GeometryVector2dLike) {
    acdbForEachGripIndex(indices, index => {
      switch (index) {
        case 0:
          this.transformBy(
            GeometryMatrix3d.makeTranslation({ ...offset, z: 0 })
          )
          break
        case 1:
          this.startPoint.add(offset)
          break
        case 2:
          this.endPoint.add(offset)
          break
        default:
          break
      }
    })
    return this
  }

  /**
   * Gets the object snap points for this line.
   *
   * Object snap points are precise points that can be used for positioning
   * when drawing or editing. This method provides snap points based on the
   * specified snap mode.
   *
   * @param osnapMode - The object snap mode
   * @param pickPoint - The point where the user picked
   * @param _lastPoint - The last point
   * @param snapPoints - Array to populate with snap points
   */
  subGetOsnapPoints(
    osnapMode: AcDbOsnapMode,
    pickPoint: GeometryPoint2dLike,
    _lastPoint: GeometryPoint2dLike,
    snapPoints: GeometryPoint2dLike[]
  ) {
    const geo = this._geo
    switch (osnapMode) {
      case AcDbOsnapMode.EndPoint:
        snapPoints.push(geo.startPoint)
        snapPoints.push(geo.endPoint)
        break
      case AcDbOsnapMode.MidPoint:
        snapPoints.push(geo.midPoint)
        break
      case AcDbOsnapMode.Nearest:
        // Nearest snap: project the pick point onto the line and return that point
        {
          const projectedPoint = geo.project(pickPoint)
          snapPoints.push(projectedPoint)
        }
        break
      case AcDbOsnapMode.Perpendicular:
        // Perpendicular snap: find a perpendicular point from the pick point to the line
        {
          const perpPoint = geo.perpPoint(pickPoint)
          snapPoints.push(perpPoint)
        }
        break
      case AcDbOsnapMode.Tangent:
        // N/A for tangent snap
        break
      default:
        break
    }
  }

  /**
   * Transforms this line by the specified matrix.
   *
   * This method applies a geometric transformation to the line, updating
   * both the start and end points according to the transformation matrix.
   *
   * @param matrix - The transformation matrix to apply
   * @returns This line after transformation
   *
   * @example
   * ```typescript
   * const translationMatrix = GeometryMatrix3d.translation(10, 0, 0);
   * line.transformBy(translationMatrix);
   * // Line is now translated 10 units in the X direction
   * ```
   */
  transformBy(matrix: GeometryMatrix3d) {
    const geo = this._geo.transform3d(matrix)
    this._geo = new GeometryLine2d(geo.startPoint, geo.endPoint)
    return this
  }

  /**
   * This line always draws as a single `lineStrip` primitive.
   *
   * @internal
   */
  override get directBatchPrimitive() {
    return 'lineStrip' as const
  }

  /**
   * Draws this line using the specified renderer.
   *
   * This method renders the line as a series of connected line segments
   * using the line's current style properties.
   *
   * @param renderer - The renderer to use for drawing
   * @returns The rendered line entity, or undefined if drawing failed
   */
  subWorldDraw(renderer: AcGiRenderer) {
    return renderer.lines([this.startPoint, this.endPoint])
  }

  override getOffsetCurves(offsetDist: number): AcDbCurve[] {
    const geo = this._geo.offset(offsetDist)
    return [new AcDbLine(geo.startPoint, geo.endPoint)]
  }

  override getOffsetSideAtPoint(point: GeometryPoint2dLike): 1 | -1 {
    const s = this.startPoint
    const e = this.endPoint
    return (e.x - s.x) * (point.y - s.y) - (e.y - s.y) * (point.x - s.x) >= 0
      ? 1
      : -1
  }
}
