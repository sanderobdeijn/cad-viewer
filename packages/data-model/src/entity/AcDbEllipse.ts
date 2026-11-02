import {
  AcGeBox3d,
  AcGeEllipseArc2d,
  AcGeIntersectPrimitive,
  AcGeMatrix3d,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGeVector2d,
  AcGeVector2dLike,
  TAU
} from '@mlightcad/geometry-engine'
import { AcGiRenderer } from '@mlightcad/graphic-interface'

import { AcDbOsnapMode } from '../misc/AcDbOsnapMode'
import { AcDbCurve } from './AcDbCurve'
import { AcDbEntityProperties } from './AcDbEntityProperties'
import { acdbForEachGripIndex } from './AcDbGripHelpers'
import { acdbPickNearestOsnapPoint } from './AcDbOsnapHelpers'

/** Quadrant grip angles in radians: 0?, 90?, 180?, 270?. */
const ELLIPSE_QUADRANT_GRIP_ANGLES = [
  0,
  Math.PI / 2,
  Math.PI,
  (Math.PI / 2) * 3
]

/**
 * Represents an ellipse entity in AutoCAD.
 *
 * An ellipse is a 2D geometric object defined by its center point, major and minor axes,
 * and optional start and end angles. Ellipses are curved shapes that can be used to
 * create elliptical shapes in drawings. The ellipse is always drawn in the XY plane.
 *
 * @example
 * ```typescript
 * // Create a full ellipse
 * const ellipse = new AcDbEllipse(
 *   new AcGePoint2d(0, 0),
 *   { x: 1, y: 0 },
 *   10, // major axis radius
 *   5,  // minor axis radius
 *   0,  // start angle
 *   2 * Math.PI // end angle (full ellipse)
 * );
 *
 * // Access ellipse properties
 * console.log(`Center: ${ellipse.center}`);
 * console.log(`Major radius: ${ellipse.majorAxisRadius}`);
 * console.log(`Minor radius: ${ellipse.minorAxisRadius}`);
 * ```
 */
export class AcDbEllipse extends AcDbCurve {
  /** The entity type name */
  static override typeName: string = 'Ellipse'

  override get dxfTypeName() {
    return 'ELLIPSE'
  }

  /** Backing for the lazily materialized geometric ellipse arc object. */
  private _geoData: AcGeEllipseArc2d | null = null

  /**
   * The underlying geometric ellipse arc object. Materialized lazily so that
   * factory-created entities (dxfIn path) never allocate default geometry.
   */
  private get _geo(): AcGeEllipseArc2d {
    if (this._geoData == null) {
      this._geoData = new AcGeEllipseArc2d(new AcGePoint2d(), 1, 1, 0, TAU)
    }
    return this._geoData
  }

  private set _geo(value: AcGeEllipseArc2d) {
    this._geoData = value
  }

  /**
   * Creates a new ellipse entity.
   *
   * This constructor creates an ellipse using the specified center point,
   * major axis, and radii. The center point must be in World Coordinate System (WCS) XY coordinates.
   *
   * @param center - The center point of the ellipse in WCS coordinates
   * @param majorAxis - The major axis vector in WCS coordinates
   * @param majorAxisRadius - The radius of the major axis (must be positive)
   * @param minorAxisRadius - The radius of the minor axis (must be positive)
   * @param startAngle - The starting angle in radians (0 to 2?)
   * @param endAngle - The ending angle in radians (0 to 2?)
   *
   * @example
   * ```typescript
   * // Create a full ellipse in the XY plane
   * const fullEllipse = new AcDbEllipse(
   *   new AcGePoint2d(0, 0),
   *   { x: 1, y: 0 },
   *   20, // major radius
   *   10, // minor radius
   *   0,
   *   2 * Math.PI
   * );
   *
   * // Create a quarter ellipse
   * const quarterEllipse = new AcDbEllipse(
   *   new AcGePoint2d(10, 20),
   *   { x: 1, y: 0 },
   *   15,
   *   8,
   *   0,
   *   Math.PI / 2
   * );
   * ```
   */
  constructor()
  constructor(
    center: AcGePoint2dLike,
    majorAxis: AcGeVector2dLike,
    majorAxisRadius: number,
    minorAxisRadius: number,
    startAngle: number,
    endAngle: number
  )
  constructor(
    center?: AcGePoint2dLike,
    majorAxis?: AcGeVector2dLike,
    majorAxisRadius?: number,
    minorAxisRadius?: number,
    startAngle?: number,
    endAngle?: number
  ) {
    super()
    if (
      center !== undefined &&
      majorAxis !== undefined &&
      majorAxisRadius !== undefined &&
      minorAxisRadius !== undefined &&
      startAngle !== undefined &&
      endAngle !== undefined
    ) {
      this._geo = new AcGeEllipseArc2d(
        center,
        majorAxisRadius,
        minorAxisRadius,
        startAngle,
        endAngle,
        false,
        new AcGeVector2d(majorAxis.x, majorAxis.y).angle()
      )
    }
  }

  /**
   * Gets the center point of this ellipse.
   *
   * @returns The center point as a 2D point
   *
   * @example
   * ```typescript
   * const centerPoint = ellipse.center;
   * console.log(`Ellipse center: ${centerPoint.x}, ${centerPoint.y}`);
   * ```
   */
  get center(): AcGePoint2d {
    return this._geo.center
  }

  /**
   * Sets the center point of this ellipse.
   *
   * @param value - The new center point
   *
   * @example
   * ```typescript
   * ellipse.center = new AcGePoint2d(5, 5);
   * ```
   */
  set center(value: AcGePoint2dLike) {
    this._geo.center = value
  }

  /**
   * Gets the major axis radius of this ellipse.
   *
   * @returns The major axis radius value
   *
   * @example
   * ```typescript
   * const majorRadius = ellipse.majorAxisRadius;
   * console.log(`Major radius: ${majorRadius}`);
   * ```
   */
  get majorAxis(): AcGeVector2d {
    const rotation = this._geo.rotation
    return new AcGeVector2d(Math.cos(rotation), Math.sin(rotation))
  }
  set majorAxis(value: AcGeVector2dLike) {
    this._geo.rotation = new AcGeVector2d(value.x, value.y).angle()
  }

  get majorAxisRadius(): number {
    return this._geo.majorAxisRadius
  }

  /**
   * Sets the major axis radius of this ellipse.
   *
   * @param value - The new major axis radius value (must be positive)
   *
   * @example
   * ```typescript
   * ellipse.majorAxisRadius = 25;
   * ```
   */
  set majorAxisRadius(value: number) {
    this._geo.majorAxisRadius = value
  }

  /**
   * Gets the minor axis radius of this ellipse.
   *
   * @returns The minor axis radius value
   *
   * @example
   * ```typescript
   * const minorRadius = ellipse.minorAxisRadius;
   * console.log(`Minor radius: ${minorRadius}`);
   * ```
   */
  get minorAxisRadius(): number {
    return this._geo.minorAxisRadius
  }

  /**
   * Sets the minor axis radius of this ellipse.
   *
   * @param value - The new minor axis radius value (must be positive)
   *
   * @example
   * ```typescript
   * ellipse.minorAxisRadius = 12;
   * ```
   */
  set minorAxisRadius(value: number) {
    this._geo.minorAxisRadius = value
  }

  /**
   * Gets the start angle of this ellipse.
   *
   * @returns The start angle in radians
   *
   * @example
   * ```typescript
   * const startAngle = ellipse.startAngle;
   * console.log(`ellipse start angle: ${startAngle} radians (${startAngle * 180 / Math.PI} degrees)`);
   * ```
   */
  get startAngle(): number {
    return this._geo.startAngle
  }

  /**
   * Sets the start angle of this ellipse.
   *
   * @param value - The new start angle in radians (0 to 2?)
   *
   * @example
   * ```typescript
   * ellipse.startAngle = Math.PI / 4; // 45 degrees
   * ```
   */
  set startAngle(value: number) {
    this._geo.startAngle = value
  }

  /**
   * Gets the end angle of this ellipse.
   *
   * @returns The end angle in radians
   *
   * @example
   * ```typescript
   * const endAngle = ellipse.endAngle;
   * console.log(`ellipse end angle: ${endAngle} radians (${endAngle * 180 / Math.PI} degrees)`);
   * ```
   */
  get endAngle(): number {
    return this._geo.endAngle
  }

  /**
   * Sets the end angle of this ellipse.
   *
   * @param value - The new end angle in radians (0 to 2?)
   *
   * @example
   * ```typescript
   * ellipse.endAngle = Math.PI; // 180 degrees
   * ```
   */
  set endAngle(value: number) {
    this._geo.endAngle = value
  }

  /**
   * Gets the geometric extents (bounding box) of this ellipse.
   *
   * @returns The bounding box that encompasses the entire ellipse
   *
   * @example
   * ```typescript
   * const extents = ellipse.geometricExtents;
   * console.log(`Ellipse bounds: ${extents.minPoint} to ${extents.maxPoint}`);
   * ```
   */
  get geometricExtents() {
    return new AcGeBox3d(this._geo.box.min, this._geo.box.max)
  }

  /** @inheritdoc */
  override subGetIntersectCurves(): AcGeIntersectPrimitive[] {
    return [
      {
        kind: 'ellipseArc',
        arc: this._geo,
        extendable: !this.closed
      }
    ]
  }

  /**
   * Gets whether this ellipse is closed.
   *
   * A full ellipse may be stored either with identical start/end angles (AutoCAD
   * convention) or with a 0??? parameter span. Both represent a closed curve.
   *
   * @returns True if the ellipse is closed (forms a complete ellipse), false otherwise
   */
  get closed(): boolean {
    return this._geo.closed
  }

  /** @inheritdoc */
  get area(): number {
    return this._geo.area
  }

  /**
   * Gets the grip points for this ellipse.
   *
   * Closed ellipses return the center and four quadrant points.
   * Open ellipse arcs return the center, start point, and end point.
   *
   * @returns Array of grip points
   */
  subGetGripPoints() {
    const gripPoints = new Array<AcGePoint2d>()
    const geo = this._geo
    gripPoints.push(geo.center)
    if (this.closed) {
      for (const angle of ELLIPSE_QUADRANT_GRIP_ANGLES) {
        gripPoints.push(geo.getPointAtAngle(angle))
      }
    } else {
      gripPoints.push(geo.startPoint)
      gripPoints.push(geo.endPoint)
    }
    return gripPoints
  }

  /** @inheritdoc */
  subMoveGripPointsAt(indices: number[], offset: AcGeVector2dLike) {
    acdbForEachGripIndex(indices, index => {
      this.moveGripAt(index, offset)
    })
    return this
  }

  /**
   * Gets the object snap points for this ellipse or ellipse arc.
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
    pickPoint: AcGePoint2dLike,
    _lastPoint: AcGePoint2dLike,
    snapPoints: AcGePoint2dLike[]
  ) {
    const geo = this._geo
    switch (osnapMode) {
      case AcDbOsnapMode.EndPoint:
        if (!this.closed) {
          snapPoints.push(geo.startPoint)
          snapPoints.push(geo.endPoint)
        }
        break
      case AcDbOsnapMode.MidPoint:
        if (!this.closed) {
          snapPoints.push(geo.midPoint)
        }
        break
      case AcDbOsnapMode.Center:
      case AcDbOsnapMode.Centroid:
        snapPoints.push(geo.center)
        break
      case AcDbOsnapMode.Quadrant:
        if (this.closed) {
          for (const angle of ELLIPSE_QUADRANT_GRIP_ANGLES) {
            snapPoints.push(geo.getPointAtAngle(angle))
          }
        }
        break
      case AcDbOsnapMode.Nearest:
        snapPoints.push(geo.nearestPoint(pickPoint))
        break
      case AcDbOsnapMode.Tangent:
        snapPoints.push(...geo.tangentPoints(pickPoint))
        break
      case AcDbOsnapMode.Perpendicular: {
        const candidates = geo.perpendicularPoints(pickPoint)
        const nearest = acdbPickNearestOsnapPoint(pickPoint, candidates)
        if (nearest) snapPoints.push(nearest)
        break
      }
      default:
        break
    }
  }

  /**
   * Transforms this ellipse by the specified matrix.
   */
  transformBy(matrix: AcGeMatrix3d) {
    this._geo = this._geo.transform3d(matrix)
    return this
  }

  /**
   * Returns the full property definition for this ellipse entity, including
   * general group and geometry group.
   *
   * The geometry group exposes editable properties via {@link AcDbPropertyAccessor}
   * so the property palette can update the ellipse in real-time.
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
              name: 'centerX',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.center.x,
                set: (v: number) => {
                  this.center.x = v
                }
              }
            },
            {
              name: 'centerY',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.center.y,
                set: (v: number) => {
                  this.center.y = v
                }
              }
            },
            {
              name: 'majorAxisRadius',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.majorAxisRadius,
                set: (v: number) => {
                  this.center.x = v
                }
              }
            },
            {
              name: 'minorAxisRadius',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.minorAxisRadius,
                set: (v: number) => {
                  this.minorAxisRadius = v
                }
              }
            },
            {
              name: 'startAngle',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.startAngle,
                set: (v: number) => {
                  this.startAngle = v
                }
              }
            },
            {
              name: 'endAngle',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.endAngle,
                set: (v: number) => {
                  this.endAngle = v
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
            },
            {
              name: 'area',
              type: 'float',
              editable: false,
              accessor: {
                get: () => this.area
              }
            }
          ]
        }
      ]
    }
  }

  /**
   * This ellipse always draws as a single `lineStrip` primitive.
   *
   * @internal
   */
  override get directBatchPrimitive() {
    return 'lineStrip' as const
  }

  /**
   * Draws this ellipse using the specified renderer.
   *
   * This method renders the ellipse as an elliptical arc using the ellipse's
   * current style properties.
   *
   * @param renderer - The renderer to use for drawing
   * @returns The rendered ellipse entity, or undefined if drawing failed
   */
  subWorldDraw(renderer: AcGiRenderer) {
    return renderer.ellipticalArc(this._geo)
  }

  override getOffsetCurves(offsetDist: number): AcDbCurve[] {
    const curve = this.createOffsetCurve(offsetDist)
    return curve ? [curve] : []
  }

  override getOffsetSideAtPoint(point: AcGePoint2dLike): 1 | -1 {
    const c = this.center
    const dx = point.x - c.x
    const dy = point.y - c.y
    const major = this.majorAxis
    const majorLen = Math.hypot(major.x, major.y) || 1
    const minorLen =
      (this.minorAxisRadius / this.majorAxisRadius) * majorLen || 1
    const ux = major.x / majorLen
    const uy = major.y / majorLen
    const vx = -uy
    const vy = ux
    const u = dx * ux + dy * uy
    const v = dx * vx + dy * vy
    return (u / majorLen) ** 2 + (v / minorLen) ** 2 >= 1 ? 1 : -1
  }

  private moveGripAt(gripIndex: number, offset: AcGeVector2dLike) {
    switch (gripIndex) {
      case 0:
        this.transformBy(AcGeMatrix3d.makeTranslation({ ...offset, z: 0 }))
        break
      case 1:
        if (this.closed) {
          this.moveQuadrantGripAt(ELLIPSE_QUADRANT_GRIP_ANGLES[0], offset)
        } else {
          this._geo.startAngle = this.angleAtPoint(
            this._geo.startPoint.add(offset)
          )
        }
        break
      case 2:
        if (this.closed) {
          this.moveQuadrantGripAt(ELLIPSE_QUADRANT_GRIP_ANGLES[1], offset)
        } else {
          this._geo.endAngle = this.angleAtPoint(this._geo.endPoint.add(offset))
        }
        break
      case 3:
      case 4:
        if (this.closed) {
          this.moveQuadrantGripAt(
            ELLIPSE_QUADRANT_GRIP_ANGLES[gripIndex - 1],
            offset
          )
        }
        break
      default:
        break
    }
  }

  /**
   * Moves a quadrant grip on a closed ellipse by updating the corresponding axis radius.
   *
   * Grips at 0? and 180? adjust {@link majorAxisRadius}; grips at 90? and 270? adjust
   * {@link minorAxisRadius}. The new radius is the absolute projection of the dragged
   * point onto the relevant axis from the ellipse center.
   *
   * @param angle - Quadrant angle in radians (0, ?/2, ?, or 3?/2).
   * @param offset - Translation applied to the grip point before recomputing the radius.
   * @private
   */
  private moveQuadrantGripAt(angle: number, offset: AcGeVector2dLike) {
    const geo = this._geo
    const point = geo.getPointAtAngle(angle)
    const newPoint = new AcGePoint2d(point.x + offset.x, point.y + offset.y)
    const c = geo.center
    const dx = newPoint.x - c.x
    const dy = newPoint.y - c.y
    const axis =
      angle === 0 || angle === Math.PI ? geo.majorAxis : geo.minorAxis
    const projected = dx * axis.x + dy * axis.y
    const newRadius = Math.abs(projected)
    if (newRadius <= 0) return
    if (angle === 0 || angle === Math.PI) {
      this.majorAxisRadius = newRadius
    } else {
      this.minorAxisRadius = newRadius
    }
  }

  /**
   * Returns the ellipse angle of the point on this ellipse in the direction of `point`.
   */
  private angleAtPoint(point: AcGePoint2dLike) {
    const geo = this._geo
    const dx = point.x - geo.center.x
    const dy = point.y - geo.center.y
    const major = geo.majorAxis
    const minor = geo.minorAxis
    return Math.atan2(
      (dx * minor.x + dy * minor.y) / geo.minorAxisRadius,
      (dx * major.x + dy * major.y) / geo.majorAxisRadius
    )
  }

  private createOffsetCurve(offsetDist: number): AcDbEllipse | null {
    const geo = this._geo.offset(offsetDist)
    if (!geo) return null
    return new AcDbEllipse(
      geo.center,
      geo.majorAxis,
      geo.majorAxisRadius,
      geo.minorAxisRadius,
      geo.startAngle,
      geo.endAngle
    )
  }
}
