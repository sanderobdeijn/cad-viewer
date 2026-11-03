import {
  GeometryBox3d,
  GeometryCircularArc2d,
  GeometryIntersectPrimitive,
  GeometryMathUtil,
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
import { acdbPickNearestOsnapPoint } from './AcDbOsnapHelpers'
/**
 * Represents an arc entity in AutoCAD.
 *
 * An arc is a 2D geometric object defined by its center point, radius, start angle,
 * and end angle. Arcs are portions of circles that can be used to create curved
 * line segments in drawings. The arc is always drawn in the XY plane.
 *
 * @example
 * ```typescript
 * // Create a 90-degree arc from 0 to π/2 radians
 * const arc = new AcDbArc(
 *   new GeometryPoint2d(0, 0),
 *   10,
 *   0,
 *   Math.PI / 2
 * );
 *
 * // Access arc properties
 * console.log(`Center: ${arc.center}`);
 * console.log(`Radius: ${arc.radius}`);
 * console.log(`Start angle: ${arc.startAngle}`);
 * console.log(`End angle: ${arc.endAngle}`);
 * ```
 */
export class AcDbArc extends AcDbCurve {
  /** The entity type name */
  static override typeName: string = 'Arc'

  override get dxfTypeName() {
    return 'ARC'
  }

  override get geometry() {
    return this._geo
  }

  /** Backing for the lazily materialized geometric circular arc object. */
  private _geoData: GeometryCircularArc2d | null = null

  /**
   * The underlying geometric circular arc object. Materialized lazily so that
   * factory-created entities (dxfIn path) never allocate default geometry.
   */
  private get _geo(): GeometryCircularArc2d {
    if (this._geoData == null) {
      this._geoData = GeometryCircularArc2d.fromMathAngles(
        new GeometryPoint2d(),
        1,
        0,
        Math.PI / 2,
        false
      )
    }
    return this._geoData
  }

  private set _geo(value: GeometryCircularArc2d) {
    this._geoData = value
  }

  /**
   * Creates a new arc entity.
   *
   * This constructor creates an arc using the specified center point, radius,
   * start angle, and end angle. The center point must be in World Coordinate
   * System (WCS) coordinates. Angles are specified in radians.
   *
   * @param center - The center point of the arc in WCS coordinates
   * @param radius - The radius of the arc (must be positive)
   * @param startAngle - The starting angle in radians (0 to 2π)
   * @param endAngle - The ending angle in radians (0 to 2π)
   * @param clockwise - Whether the arc sweeps clockwise from start to end
   *   (default false)
   *
   * @example
   * ```typescript
   * // Create a quarter circle arc (0 to 90 degrees)
   * const quarterArc = new AcDbArc(
   *   new GeometryPoint2d(0, 0),
   *   15,
   *   0,
   *   Math.PI / 2
   * );
   *
   * // Create a semicircle arc (0 to 180 degrees)
   * const semicircle = new AcDbArc(
   *   new GeometryPoint2d(10, 20),
   *   25,
   *   0,
   *   Math.PI
   * );
   * ```
   */
  constructor()
  constructor(
    center: GeometryPoint2dLike,
    radius: number,
    startAngle: number,
    endAngle: number,
    clockwise?: boolean
  )
  constructor(
    center?: GeometryPoint2dLike,
    radius?: number,
    startAngle?: number,
    endAngle?: number,
    clockwise: boolean = false
  ) {
    super()
    if (
      center !== undefined &&
      radius !== undefined &&
      startAngle !== undefined &&
      endAngle !== undefined
    ) {
      this._geo = GeometryCircularArc2d.fromMathAngles(
        center,
        radius,
        startAngle,
        endAngle,
        clockwise
      )
    }
  }

  /**
   * Gets the center point of this arc.
   *
   * @returns The center point as a 2D point
   *
   * @example
   * ```typescript
   * const centerPoint = arc.center;
   * console.log(`Arc center: ${centerPoint.x}, ${centerPoint.y}`);
   * ```
   */
  get center(): GeometryPoint2d {
    return this._geo.center
  }

  /**
   * Sets the center point of this arc.
   *
   * @param value - The new center point
   *
   * @example
   * ```typescript
   * arc.center = new GeometryPoint2d(5, 5);
   * ```
   */
  set center(value: GeometryPoint2dLike) {
    this._geo.center = value
  }

  /**
   * Gets the radius of this arc.
   *
   * @returns The radius value
   *
   * @example
   * ```typescript
   * const radius = arc.radius;
   * console.log(`Arc radius: ${radius}`);
   * ```
   */
  get radius(): number {
    return this._geo.radius
  }

  /**
   * Sets the radius of this arc.
   *
   * @param value - The new radius value (must be positive)
   *
   * @example
   * ```typescript
   * arc.radius = 25;
   * ```
   */
  set radius(value: number) {
    this._geo.radius = value
  }

  /**
   * Gets the start angle of this arc.
   *
   * @returns The start angle in radians
   *
   * @example
   * ```typescript
   * const startAngle = arc.startAngle;
   * console.log(`Arc start angle: ${startAngle} radians (${startAngle * 180 / Math.PI} degrees)`);
   * ```
   */
  get startAngle(): number {
    return this.polarAngleOf(this._geo.startPoint)
  }

  /**
   * Sets the start angle of this arc.
   *
   * @param value - The new start angle in radians (0 to 2π)
   *
   * @example
   * ```typescript
   * arc.startAngle = Math.PI / 4; // 45 degrees
   * ```
   */
  set startAngle(value: number) {
    this.setAngles(value, this.endAngle)
  }

  /**
   * Gets the end angle of this arc.
   *
   * @returns The end angle in radians
   *
   * @example
   * ```typescript
   * const endAngle = arc.endAngle;
   * console.log(`Arc end angle: ${endAngle} radians (${endAngle * 180 / Math.PI} degrees)`);
   * ```
   */
  get endAngle(): number {
    return this.polarAngleOf(this._geo.endPoint)
  }

  /**
   * Sets the end angle of this arc.
   *
   * @param value - The new end angle in radians (0 to 2π)
   *
   * @example
   * ```typescript
   * arc.endAngle = Math.PI; // 180 degrees
   * ```
   */
  set endAngle(value: number) {
    this.setAngles(this.startAngle, value)
  }

  /**
   * Gets the start point of this arc.
   *
   * The start point is calculated based on the center, radius, and start angle.
   *
   * @returns The start point as a 2D point
   *
   * @example
   * ```typescript
   * const startPoint = arc.startPoint;
   * console.log(`Arc start point: ${startPoint.x}, ${startPoint.y}`);
   * ```
   */
  get clockwise(): boolean {
    return this._geo.clockwise
  }
  set clockwise(value: boolean) {
    this._geo = GeometryCircularArc2d.fromMathAngles(
      this.center,
      this.radius,
      this.startAngle,
      this.endAngle,
      value
    )
  }

  get startPoint(): GeometryPoint2d {
    return this._geo.startPoint
  }

  /**
   * Gets the end point of this arc.
   *
   * The end point is calculated based on the center, radius, and end angle.
   *
   * @returns The end point as a 2D point
   *
   * @example
   * ```typescript
   * const endPoint = arc.endPoint;
   * console.log(`Arc end point: ${endPoint.x}, ${endPoint.y}`);
   * ```
   */
  get endPoint(): GeometryPoint2d {
    return this._geo.endPoint
  }

  /**
   * The middle point of the circular arc
   */
  get midPoint(): GeometryPoint2d {
    return this._geo.midPoint
  }

  /**
   * Gets the geometric extents (bounding box) of this arc.
   *
   * @returns The bounding box that encompasses the entire arc
   *
   * @example
   * ```typescript
   * const extents = arc.geometricExtents;
   * console.log(`Arc bounds: ${extents.minPoint} to ${extents.maxPoint}`);
   * ```
   */
  get geometricExtents() {
    return new GeometryBox3d(this._geo.box.min, this._geo.box.max)
  }

  /** @inheritdoc */
  override subGetIntersectCurves(): GeometryIntersectPrimitive[] {
    return [
      {
        kind: 'circularArc',
        arc: this._geo,
        extendable: !this.closed
      }
    ]
  }

  /**
   * Gets whether this arc is closed.
   *
   * An arc is considered closed if the start and end angles are the same
   * (forming a complete circle).
   *
   * @returns True if the arc is closed (forms a complete circle), false otherwise
   */
  get closed(): boolean {
    return this._geo.closed
  }

  /** @inheritdoc */
  get area(): number {
    return this._geo.area
  }

  /**
   * Returns the full property definition for this arc entity, including
   * general group and geometry group.
   *
   * The geometry group exposes editable properties via {@link AcDbPropertyAccessor}
   * so the property palette can update the arc in real-time.
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
            // --- Cennter Point ---
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
              name: 'radius',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.radius,
                set: (v: number) => {
                  this.radius = v
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
              name: 'arcLength',
              type: 'float',
              editable: false,
              accessor: {
                get: () => this._geo.length
              }
            },
            {
              name: 'totalAngle',
              type: 'float',
              editable: false,
              accessor: {
                get: () =>
                  GeometryMathUtil.radToDeg(Math.abs(this._geo.deltaAngle))
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
   * Gets the grip points for this arc.
   *
   * Grip points are control points that can be used to modify the arc.
   * For an arc, the grip points are the center point, start point, and end point.
   *
   * @returns Array of grip points (center, start point, end point)
   *
   * @example
   * ```typescript
   * const gripPoints = arc.subGetGripPoints();
   * // gripPoints contains: [center, startPoint, endPoint]
   * ```
   */
  subGetGripPoints() {
    const gripPoints = new Array<GeometryPoint2d>()
    gripPoints.push(this.center)
    gripPoints.push(this.startPoint)
    gripPoints.push(this.endPoint)
    return gripPoints
  }

  /** @inheritdoc */
  subMoveGripPointsAt(indices: number[], offset: GeometryVector2dLike) {
    acdbForEachGripIndex(indices, index => {
      this.moveGripAt(index, offset)
    })
    return this
  }

  /**
   * Gets the object snap points for this arc.
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
      case AcDbOsnapMode.Center:
      case AcDbOsnapMode.Centroid:
        snapPoints.push(geo.center)
        break
      case AcDbOsnapMode.Quadrant: {
        for (const point of this._geo.getQuadrantPoints()) {
          snapPoints.push(point)
        }
        break
      }
      case AcDbOsnapMode.Nearest:
        {
          const projectedPoint = this._geo.nearestPoint(pickPoint)
          snapPoints.push(projectedPoint)
        }
        break
      case AcDbOsnapMode.Perpendicular: {
        const candidates = this._geo.perpendicularPoints(pickPoint)
        const nearest = acdbPickNearestOsnapPoint(pickPoint, candidates)
        if (nearest) snapPoints.push(nearest)
        break
      }
      case AcDbOsnapMode.Tangent: {
        const points = this._geo.tangentPoints(pickPoint)
        snapPoints.push(...points)
        break
      }
      default:
        break
    }
  }

  /**
   * Transforms this arc by the specified matrix.
   *
   * This method applies a geometric transformation to the arc, updating
   * the center point, radius, and angles according to the transformation matrix.
   *
   * @param matrix - The transformation matrix to apply
   * @returns This arc after transformation
   *
   * @example
   * ```typescript
   * const translationMatrix = GeometryMatrix3d.translation(10, 0, 0);
   * arc.transformBy(translationMatrix);
   * // Arc is now translated 10 units in the X direction
   * ```
   */
  transformBy(matrix: GeometryMatrix3d) {
    this._geo = this._geo.transform3d(matrix)
    return this
  }

  /**
   * This arc always draws as a single `lineStrip` primitive.
   *
   * @internal
   */
  override get directBatchPrimitive() {
    return 'lineStrip' as const
  }

  /**
   * Draws this arc using the specified renderer.
   *
   * This method renders the arc as a circular arc using the arc's
   * current style properties.
   *
   * @param renderer - The renderer to use for drawing
   * @returns The rendered arc entity, or undefined if drawing failed
   *
   * @example
   * ```typescript
   * const renderedArc = arc.draw(renderer);
   * ```
   */
  subWorldDraw(renderer: AcGiRenderer) {
    return renderer.circularArc(this._geo)
  }

  override getOffsetCurves(offsetDist: number): AcDbCurve[] {
    const curve = this.createOffsetCurve(offsetDist)
    return curve ? [curve] : []
  }

  override getOffsetSideAtPoint(point: GeometryPoint2dLike): 1 | -1 {
    const c = this.center
    const r = this.radius
    return Math.sqrt((point.x - c.x) ** 2 + (point.y - c.y) ** 2) >= r ? 1 : -1
  }

  private polarAngleOf(point: GeometryPoint2dLike) {
    const center = this.center
    return GeometryMathUtil.normalizeAngle(
      Math.atan2(point.y - center.y, point.x - center.x)
    )
  }

  private setAngles(startAngle: number, endAngle: number) {
    this._geo = GeometryCircularArc2d.fromMathAngles(
      this.center,
      this.radius,
      startAngle,
      endAngle,
      this.clockwise
    )
  }

  private moveGripAt(gripIndex: number, offset: GeometryVector2dLike) {
    switch (gripIndex) {
      case 0:
        this.transformBy(GeometryMatrix3d.makeTranslation({ ...offset, z: 0 }))
        break
      case 1: {
        const point = this._geo.startPoint
        this.startAngle = this.polarAngleOf({
          x: point.x + offset.x,
          y: point.y + offset.y
        })
        break
      }
      case 2: {
        const point = this._geo.endPoint
        this.endAngle = this.polarAngleOf({
          x: point.x + offset.x,
          y: point.y + offset.y
        })
        break
      }
      default:
        break
    }
  }

  private createOffsetCurve(offsetDist: number): AcDbArc | null {
    const radius = this.radius + offsetDist
    if (radius <= 0) return null
    return new AcDbArc(
      this.center,
      radius,
      this.startAngle,
      this.endAngle,
      this.clockwise
    )
  }
}
