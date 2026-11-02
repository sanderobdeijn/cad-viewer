import {
  AcGeBox3d,
  AcGeCircArc2d,
  AcGeIntersectPrimitive,
  AcGeMatrix3d,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGeVector2dLike
} from '@mlightcad/geometry-engine'
import { AcGiRenderer } from '@mlightcad/graphic-interface'

import { AcDbOsnapMode } from '../misc/AcDbOsnapMode'
import { AcDbCurve } from './AcDbCurve'
import { AcDbEntityProperties } from './AcDbEntityProperties'
import { acdbForEachGripIndex } from './AcDbGripHelpers'
import { acdbPickNearestOsnapPoint } from './AcDbOsnapHelpers'

/** Quadrant grip angles in radians: 0°, 90°, 180°, 270°. */
const CIRCLE_QUADRANT_GRIP_ANGLES = [0, Math.PI / 2, Math.PI, (Math.PI / 2) * 3]

/**
 * Represents a circle entity in AutoCAD.
 *
 * A circle is a 2D geometric object defined by its center point and radius.
 * Circles are closed curves that can be used to create circular shapes
 * in drawings. The circle is always drawn in the XY plane.
 *
 * @example
 * ```typescript
 * // Create a circle with center at (0,0) and radius 5
 * const circle = new AcDbCircle(
 *   new AcGePoint2d(0, 0),
 *   5
 * );
 *
 * // Access circle properties
 * console.log(`Center: ${circle.center}`);
 * console.log(`Radius: ${circle.radius}`);
 * console.log(`Normal: ${circle.normal}`);
 * ```
 */
export class AcDbCircle extends AcDbCurve {
  /** The entity type name */
  static override typeName: string = 'Circle'

  override get dxfTypeName() {
    return 'CIRCLE'
  }

  /** Backing for the lazily materialized geometric circular arc object. */
  private _geoData: AcGeCircArc2d | null = null

  /**
   * The underlying geometric circular arc object. Materialized lazily so that
   * factory-created entities (dxfIn path) never allocate default geometry.
   */
  private get _geo(): AcGeCircArc2d {
    if (this._geoData == null) {
      this._geoData = AcGeCircArc2d.fromMathAngles(
        new AcGePoint2d(),
        1,
        0,
        0,
        false
      )
    }
    return this._geoData
  }

  private set _geo(value: AcGeCircArc2d) {
    this._geoData = value
  }

  /**
   * Creates a new circle entity.
   *
   * This constructor creates a circle using the specified center point and radius.
   * The center point must be in World Coordinate System (WCS) XY coordinates.
   * The circle is created as a full circle (0 to 2π radians).
   *
   * @param center - The center point of the circle in WCS coordinates
   * @param radius - The radius of the circle (must be positive)
   *
   * @example
   * ```typescript
   * // Create a circle in the XY plane
   * const circle = new AcDbCircle(
   *   new AcGePoint2d(10, 20),
   *   15
   * );
   * ```
   */
  constructor()
  constructor(center: AcGePoint2dLike, radius: number)
  constructor(center?: AcGePoint2dLike, radius?: number) {
    super()
    if (center !== undefined && radius !== undefined) {
      this._geo = AcGeCircArc2d.fromMathAngles(center, radius, 0, 0, false)
    }
  }

  /**
   * Gets the center point of this circle.
   *
   * @returns The center point as a 2D point
   *
   * @example
   * ```typescript
   * const centerPoint = circle.center;
   * console.log(`Circle center: ${centerPoint.x}, ${centerPoint.y}`);
   * ```
   */
  get center(): AcGePoint2d {
    return this._geo.center
  }

  /**
   * Sets the center point of this circle.
   *
   * @param value - The new center point
   *
   * @example
   * ```typescript
   * circle.center = new AcGePoint2d(5, 5);
   * ```
   */
  set center(value: AcGePoint2dLike) {
    this._geo.center = value
  }

  /**
   * Gets the radius of this circle.
   *
   * @returns The radius value
   *
   * @example
   * ```typescript
   * const radius = circle.radius;
   * console.log(`Circle radius: ${radius}`);
   * ```
   */
  get radius(): number {
    return this._geo.radius
  }

  /**
   * Sets the radius of this circle.
   *
   * @param value - The new radius value (must be positive)
   *
   * @example
   * ```typescript
   * circle.radius = 25;
   * ```
   */
  set radius(value: number) {
    this._geo.radius = value
  }

  /**
   * Gets the geometric extents (bounding box) of this circle.
   *
   * @returns The bounding box that encompasses the entire circle
   *
   * @example
   * ```typescript
   * const extents = circle.geometricExtents;
   * console.log(`Circle bounds: ${extents.minPoint} to ${extents.maxPoint}`);
   * ```
   */
  get geometricExtents() {
    return new AcGeBox3d(this._geo.box.min, this._geo.box.max)
  }

  /** @inheritdoc */
  override subGetIntersectCurves(): AcGeIntersectPrimitive[] {
    return [
      {
        kind: 'circArc',
        arc: this._geo,
        extendable: false
      }
    ]
  }

  /**
   * Gets whether this circle is closed.
   *
   * Circles are always closed entities, so this always returns true.
   *
   * @returns Always true for circles
   */
  get closed(): boolean {
    return this._geo.closed
  }

  /** @inheritdoc */
  override get area(): number {
    return this._geo.area
  }

  /**
   * Gets the object snap points for this circle.
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
      case AcDbOsnapMode.Center:
      case AcDbOsnapMode.Centroid:
        snapPoints.push(geo.center)
        break
      case AcDbOsnapMode.Quadrant:
        snapPoints.push(geo.getPointAtAngle(0))
        snapPoints.push(geo.getPointAtAngle(Math.PI / 2))
        snapPoints.push(geo.getPointAtAngle(Math.PI))
        snapPoints.push(geo.getPointAtAngle((Math.PI / 2) * 3))
        break
      case AcDbOsnapMode.Nearest:
        {
          const projectedPoint = this._geo.nearestPoint(pickPoint)
          snapPoints.push(projectedPoint)
        }
        break
      case AcDbOsnapMode.Tangent: {
        const points = this._geo.tangentPoints(pickPoint)
        snapPoints.push(...points)
        break
      }
      case AcDbOsnapMode.Perpendicular: {
        const candidates = this._geo.perpendicularPoints(pickPoint)
        const nearest = acdbPickNearestOsnapPoint(pickPoint, candidates)
        if (nearest) snapPoints.push(nearest)
        break
      }
      default:
        break
    }
  }

  /**
   * Returns the full property definition for this circle entity, including
   * general group and geometry group.
   *
   * The geometry group exposes editable center coordinates and radius via
   * {@link AcDbPropertyAccessor} so the property palette can update
   * the circle in real-time.
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
              name: 'diameter',
              type: 'float',
              editable: false,
              accessor: {
                get: () => this._geo.radius * 2
              }
            },
            {
              name: 'perimeter',
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
   * Gets the grip points for this circle.
   *
   * Grip points are control points that can be used to modify the circle.
   * For a circle, the grip points are the center and the four quadrant
   * points at 0°, 90°, 180°, and 270°.
   *
   * @returns Array of grip points (center, then quadrant points)
   *
   * @example
   * ```typescript
   * const gripPoints = circle.subGetGripPoints();
   * // gripPoints contains: [center, q0, q90, q180, q270]
   * ```
   */
  subGetGripPoints() {
    const gripPoints = new Array<AcGePoint2d>()
    const geo = this._geo
    gripPoints.push(geo.center)
    for (const angle of CIRCLE_QUADRANT_GRIP_ANGLES) {
      gripPoints.push(geo.getPointAtAngle(angle))
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
   * Transforms this circle by the specified matrix.
   *
   * This method applies a geometric transformation to the circle, updating
   * the center point and radius according to the transformation matrix.
   *
   * @param matrix - The transformation matrix to apply
   * @returns This circle after transformation
   *
   * @example
   * ```typescript
   * const translationMatrix = AcGeMatrix3d.translation(10, 0, 0);
   * circle.transformBy(translationMatrix);
   * // Circle is now translated 10 units in the X direction
   * ```
   */
  transformBy(matrix: AcGeMatrix3d) {
    this._geo = this._geo.transform3d(matrix)
    return this
  }

  /**
   * This circle always draws as a single `lineStrip` primitive.
   *
   * @internal
   */
  override get directBatchPrimitive() {
    return 'lineStrip' as const
  }

  /**
   * Draws this circle using the specified renderer.
   *
   * This method renders the circle as a circular arc using the circle's
   * current style properties.
   *
   * @param renderer - The renderer to use for drawing
   * @returns The rendered circle entity, or undefined if drawing failed
   */
  subWorldDraw(renderer: AcGiRenderer) {
    return renderer.circularArc(this._geo)
  }

  override getOffsetCurves(offsetDist: number): AcDbCurve[] {
    const curve = this.createOffsetCurve(offsetDist)
    return curve ? [curve] : []
  }

  override getOffsetSideAtPoint(point: AcGePoint2dLike): 1 | -1 {
    const c = this.center
    const r = this.radius
    return Math.sqrt((point.x - c.x) ** 2 + (point.y - c.y) ** 2) >= r ? 1 : -1
  }

  private createOffsetCurve(offsetDist: number): AcDbCircle | null {
    const geo = this._geo.offset(offsetDist)
    if (!geo) return null
    return new AcDbCircle(geo.center, geo.radius)
  }

  private moveGripAt(gripIndex: number, offset: AcGeVector2dLike) {
    switch (gripIndex) {
      case 0:
        this.transformBy(AcGeMatrix3d.makeTranslation({ ...offset, z: 0 }))
        break
      case 1:
      case 2:
      case 3:
      case 4: {
        const angle = CIRCLE_QUADRANT_GRIP_ANGLES[gripIndex - 1]
        const point = this._geo.getPointAtAngle(angle)
        const newPoint = new AcGePoint2d(point.x + offset.x, point.y + offset.y)
        const newRadius = newPoint.distanceTo(this.center)
        if (newRadius > 0) {
          this.radius = newRadius
        }
        break
      }
      default:
        break
    }
  }
}
