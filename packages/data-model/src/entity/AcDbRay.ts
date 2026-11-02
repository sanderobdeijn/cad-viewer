import {
  GeometryBox3d,
  GeometryIntersectPrimitive,
  GeometryLine2d,
  GeometryMatrix3d,
  geometryOffsetPointByDirectionInXY,
  GeometryPoint2d,
  GeometryPoint2dLike,
  GeometryVector2d,
  GeometryVector2dLike,
  GeometryVector3d
} from '@mlightcad/geometry-engine'
import { AcGiRenderer } from '@mlightcad/graphic-interface'

import { AcDbOsnapMode } from '../misc/AcDbOsnapMode'
import { AcDbCurve } from './AcDbCurve'
import { AcDbEntityProperties } from './AcDbEntityProperties'
import { acdbMovePrimaryGripPointAt } from './AcDbGripHelpers'

/**
 * Represents a ray entity in AutoCAD.
 *
 * A ray is a 2D geometric object that extends infinitely in one direction from a base point.
 * Rays are commonly used for construction lines, reference lines, and temporary geometry.
 * Unlike lines, rays have no end point and extend to infinity.
 *
 * @example
 * ```typescript
 * // Create a ray from origin in the positive X direction
 * const ray = new AcDbRay();
 * ray.basePoint = new GeometryPoint2d(0, 0);
 * ray.unitDir = new GeometryVector2d(1, 0);
 *
 * // Access ray properties
 * console.log(`Base point: ${ray.basePoint}`);
 * console.log(`Unit direction: ${ray.unitDir}`);
 * ```
 */
export class AcDbRay extends AcDbCurve {
  /** The entity type name */
  static override typeName: string = 'Ray'

  override get dxfTypeName() {
    return 'RAY'
  }

  /** The base point of the ray */
  private _basePoint: GeometryPoint2d
  /** The unit direction vector of the ray */
  private _unitDir: GeometryVector2d

  /**
   * Creates a new ray entity.
   *
   * This constructor initializes a ray with default values.
   * The base point is at the origin and the unit direction is undefined.
   *
   * @example
   * ```typescript
   * const ray = new AcDbRay();
   * ray.basePoint = new GeometryPoint2d(5, 10);
   * ray.unitDir = new GeometryVector2d(0, 1); // Positive Y direction
   * ```
   */
  constructor() {
    super()
    this._basePoint = new GeometryPoint2d()
    this._unitDir = new GeometryVector2d()
  }

  /**
   * Gets the base point of this ray.
   *
   * The base point is the starting point from which the ray extends infinitely.
   *
   * @returns The base point as a 2D point
   *
   * @example
   * ```typescript
   * const basePoint = ray.basePoint;
   * console.log(`Ray base point: ${basePoint.x}, ${basePoint.y}`);
   * ```
   */
  get basePoint(): GeometryPoint2d {
    return this._basePoint
  }

  /**
   * Sets the base point of this ray.
   *
   * @param value - The new base point
   *
   * @example
   * ```typescript
   * ray.basePoint = new GeometryPoint2d(10, 20);
   * ```
   */
  set basePoint(value: GeometryPoint2dLike) {
    this._basePoint.copy(value)
  }

  /**
   * Gets the unit direction vector of this ray.
   *
   * The unit direction vector defines the direction in which the ray extends
   * infinitely from the base point.
   *
   * @returns The unit direction vector
   *
   * @example
   * ```typescript
   * const unitDir = ray.unitDir;
   * console.log(`Ray direction: ${unitDir.x}, ${unitDir.y}`);
   * ```
   */
  get unitDir(): GeometryVector2d {
    return this._unitDir
  }

  /**
   * Sets the unit direction vector of this ray.
   *
   * @param value - The new unit direction vector
   *
   * @example
   * ```typescript
   * ray.unitDir = new GeometryVector2d(0, 0); // Positive Z direction
   * ```
   */
  set unitDir(value: GeometryVector2dLike) {
    this._unitDir.copy(value)
  }

  /**
   * Gets whether this ray is closed.
   *
   * Rays are always open entities, so this always returns false.
   *
   * @returns Always false for rays
   */
  get closed(): boolean {
    return false
  }

  /** @inheritdoc */
  get area(): number {
    return 0
  }

  /**
   * Gets the geometric extents (bounding box) of this ray.
   *
   * Since rays extend infinitely, this method returns a bounding box that
   * encompasses a finite portion of the ray for practical purposes.
   *
   * @returns The bounding box that encompasses a portion of the ray
   *
   * @example
   * ```typescript
   * const extents = ray.geometricExtents;
   * console.log(`Ray bounds: ${extents.minPoint} to ${extents.maxPoint}`);
   * ```
   */
  get geometricExtents(): GeometryBox3d {
    const extents = new GeometryBox3d()
    extents.expandByPoint(
      this._unitDir.clone().multiplyScalar(10).add(this._basePoint)
    )
    extents.expandByPoint(
      this._unitDir.clone().multiplyScalar(-10).add(this._basePoint)
    )
    return extents
  }

  /** @inheritdoc */
  override subGetIntersectCurves(): GeometryIntersectPrimitive[] {
    const base = this._basePoint
    const end = this._basePoint.clone().add(this._unitDir)
    return [
      {
        kind: 'line',
        line: new GeometryLine2d(base, end),
        extent: 'ray'
      }
    ]
  }

  /**
   * Returns the full property definition for this ray entity, including
   * general group and geometry group.
   *
   * The geometry group exposes editable start/end coordinates via
   * {@link AcDbPropertyAccessor} so the property palette can update
   * the ray in real-time.
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
              name: 'basePointX',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.basePoint.x,
                set: (v: number) => {
                  this.basePoint.x = v
                }
              }
            },
            {
              name: 'basePointY',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.basePoint.y,
                set: (v: number) => {
                  this.basePoint.y = v
                }
              }
            },
            {
              name: 'unitDirX',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.unitDir.x,
                set: (v: number) => {
                  this.unitDir.x = v
                }
              }
            },
            {
              name: 'unitDirY',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.unitDir.y,
                set: (v: number) => {
                  this.unitDir.y = v
                }
              }
            }
          ]
        }
      ]
    }
  }

  /**
   * Gets the grip points for this ray.
   *
   * Grip points are control points that can be used to modify the ray.
   * For a ray, the grip point is the base point.
   *
   * @returns Array of grip points (base point)
   *
   * @example
   * ```typescript
   * const gripPoints = ray.subGetGripPoints();
   * // gripPoints contains: [basePoint]
   * ```
   */
  subGetGripPoints() {
    const gripPoints = new Array<GeometryPoint2d>()
    gripPoints.push(this.basePoint)
    return gripPoints
  }

  /** @inheritdoc */
  subMoveGripPointsAt(indices: number[], offset: GeometryVector2dLike) {
    acdbMovePrimaryGripPointAt(indices, offset, this.basePoint)
    return this
  }

  /**
   * Gets the object snap points for this trace.
   *
   * Object snap points are precise points that can be used for positioning
   * when drawing or editing. This method provides snap points based on the
   * specified snap mode.
   *
   * @param osnapMode - The object snap mode
   * @param _pickPoint - The point where the user picked
   * @param _lastPoint - The last point
   * @param snapPoints - Array to populate with snap points
   */
  subGetOsnapPoints(
    osnapMode: AcDbOsnapMode,
    pickPoint: GeometryPoint2dLike,
    _lastPoint: GeometryPoint2dLike,
    snapPoints: GeometryPoint2dLike[]
  ) {
    const origin = this.basePoint

    if (osnapMode === AcDbOsnapMode.EndPoint) {
      snapPoints.push(origin)
      return
    }

    const direction = new GeometryVector2d(this.unitDir.x, this.unitDir.y)
    if (direction.lengthSq() === 0) return

    direction.normalize()
    const line = new GeometryLine2d(origin, origin.clone().add(direction))

    switch (osnapMode) {
      case AcDbOsnapMode.Nearest: {
        const projected = line.perpPoint(pickPoint)
        const offset = new GeometryVector2d(projected).sub(origin)
        const t = offset.dot(direction)
        snapPoints.push(t < 0 ? origin : projected)
        break
      }
      case AcDbOsnapMode.Perpendicular:
        snapPoints.push(line.perpPoint(pickPoint))
        break
      default:
        break
    }
  }

  /**
   * Transforms this ray by the specified matrix.
   */
  transformBy(matrix: GeometryMatrix3d) {
    this._basePoint.copy(this._basePoint.applyMatrix4(matrix))
    this._unitDir.copy(
      new GeometryVector3d(
        this._unitDir.x,
        this._unitDir.y,
        0
      ).transformDirection(matrix)
    )
    return this
  }

  /**
   * This ray always draws as a single `lineStrip` primitive.
   *
   * @internal
   */
  override get directBatchPrimitive() {
    return 'lineStrip' as const
  }

  /**
   * Draws this ray using the specified renderer.
   *
   * This method renders the ray as a line segment extending from the base point
   * in the direction of the unit vector. For practical purposes, the ray is
   * drawn with a finite length.
   *
   * @param renderer - The renderer to use for drawing
   * @returns The rendered ray entity, or undefined if drawing failed
   */
  subWorldDraw(renderer: AcGiRenderer) {
    const points: GeometryPoint2d[] = []
    points.push(this.basePoint)
    points.push(
      this._unitDir.clone().multiplyScalar(1000000).add(this._basePoint)
    )
    return renderer.lines(points)
  }

  /**
   * {@inheritDoc AcDbCurve.getOffsetCurves}
   *
   * Returns a parallel ray: the base point shifts perpendicular to the XY projection
   * of {@link unitDir} by `offsetDist`, while direction is unchanged. Fails when the
   * direction is degenerate in the XY plane.
   */
  override getOffsetCurves(offsetDist: number): AcDbCurve[] {
    const curve = this.createOffsetCurve(offsetDist)
    return curve ? [curve] : []
  }

  /**
   * {@inheritDoc AcDbCurve.getOffsetSideAtPoint}
   *
   * Uses the 2D cross product of the ray direction with the vector from
   * {@link basePoint} to `point`, normalized by the XY length of the direction.
   */
  override getOffsetSideAtPoint(point: GeometryPoint2dLike): 1 | -1 {
    const bp = this.basePoint
    const dir = this.unitDir
    const len = Math.hypot(dir.x, dir.y)
    if (len <= 1e-9) return 1
    return (dir.x * (point.y - bp.y) - dir.y * (point.x - bp.x)) / len >= 0
      ? 1
      : -1
  }

  /**
   * @param offsetDist - Signed offset distance in drawing units (perpendicular in XY)
   * @returns Parallel ray, or `null` when {@link unitDir} has negligible XY component
   */
  private createOffsetCurve(offsetDist: number): AcDbRay | null {
    const offsetPoint = geometryOffsetPointByDirectionInXY(
      this.basePoint,
      { x: this.unitDir.x, y: this.unitDir.y },
      offsetDist
    )
    if (!offsetPoint) return null
    const ray = new AcDbRay()
    ray.basePoint = offsetPoint
    ray.unitDir = this.unitDir.clone()
    return ray
  }
}
