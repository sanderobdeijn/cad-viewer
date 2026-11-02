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
 * Represents an xline entity in AutoCAD.
 *
 * An xline is a 3D geometric object that extends infinitely in both directions from a base point.
 * Xlines are commonly used for construction lines, reference lines, and temporary geometry.
 * Unlike lines, xlines have no end points and extend to infinity in both directions.
 *
 * @example
 * ```typescript
 * // Create an xline from origin in the positive X direction
 * const xline = new AcDbXline();
 * xline.basePoint = new GeometryPoint2d(0, 0);
 * xline.unitDir = new GeometryVector2d(1, 0);
 *
 * // Access xline properties
 * console.log(`Base point: ${xline.basePoint}`);
 * console.log(`Unit direction: ${xline.unitDir}`);
 * ```
 */
export class AcDbXline extends AcDbCurve {
  /** The entity type name */
  static override typeName: string = 'Xline'

  override get dxfTypeName() {
    return 'XLINE'
  }

  /** The base point of the xline */
  private _basePoint: GeometryPoint2d
  /** The unit direction vector of the xline */
  private _unitDir: GeometryVector2d

  /**
   * Creates a new xline entity.
   *
   * This constructor initializes an xline with default values.
   * The base point is at the origin and the unit direction is undefined.
   *
   * @example
   * ```typescript
   * const xline = new AcDbXline();
   * xline.basePoint = new GeometryPoint2d(5, 10);
   * xline.unitDir = new GeometryVector2d(0, 1); // Positive Y direction
   * ```
   */
  constructor() {
    super()
    this._basePoint = new GeometryPoint2d()
    this._unitDir = new GeometryVector2d()
  }

  /**
   * Gets the base point of this xline.
   *
   * The base point is the center point from which the xline extends infinitely
   * in both directions.
   *
   * @returns The base point as a 2D point
   *
   * @example
   * ```typescript
   * const basePoint = xline.basePoint;
   * console.log(`Xline base point: ${basePoint.x}, ${basePoint.y}`);
   * ```
   */
  get basePoint() {
    return this._basePoint
  }

  /**
   * Sets the base point of this xline.
   *
   * @param value - The new base point
   *
   * @example
   * ```typescript
   * xline.basePoint = new GeometryPoint2d(10, 20);
   * ```
   */
  set basePoint(value: GeometryPoint2d) {
    this._basePoint.copy(value)
  }

  /**
   * Gets the unit direction vector of this xline.
   *
   * The unit direction vector defines the direction in which the xline extends
   * infinitely in both directions from the base point.
   *
   * @returns The unit direction vector
   *
   * @example
   * ```typescript
   * const unitDir = xline.unitDir;
   * console.log(`Xline direction: ${unitDir.x}, ${unitDir.y}`);
   * ```
   */
  get unitDir() {
    return this._unitDir
  }

  /**
   * Sets the unit direction vector of this xline.
   *
   * @param value - The new unit direction vector
   *
   * @example
   * ```typescript
   * xline.unitDir = new GeometryVector2d(0, 0); // Positive Z direction
   * ```
   */
  set unitDir(value: GeometryPoint2d) {
    this._unitDir.copy(value)
  }

  /**
   * Gets whether this xline is closed.
   *
   * Xlines are always open entities, so this always returns false.
   *
   * @returns Always false for xlines
   */
  get closed(): boolean {
    return false
  }

  /** @inheritdoc */
  get area(): number {
    return 0
  }

  /**
   * Gets the geometric extents (bounding box) of this xline.
   *
   * Since xlines extend infinitely in both directions, this method returns a
   * bounding box that encompasses a finite portion of the xline for practical purposes.
   *
   * @returns The bounding box that encompasses a portion of the xline
   *
   * @example
   * ```typescript
   * const extents = xline.geometricExtents;
   * console.log(`Xline bounds: ${extents.minPoint} to ${extents.maxPoint}`);
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
    const end = this._basePoint.clone().add(this._unitDir)
    return [
      {
        kind: 'line',
        line: new GeometryLine2d(this._basePoint, end),
        extent: 'unbounded'
      }
    ]
  }

  /**
   * Returns the full property definition for this xline entity, including
   * general group and geometry group.
   *
   * The geometry group exposes editable start/end coordinates via
   * {@link AcDbPropertyAccessor} so the property palette can update
   * the xline in real-time.
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
   * Gets the grip points for this xline.
   *
   * Grip points are control points that can be used to modify the xline.
   * For an xline, the grip point is the base point.
   *
   * @returns Array of grip points (base point)
   *
   * @example
   * ```typescript
   * const gripPoints = xline.subGetGripPoints();
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
   * Gets the object snap points for this xline.
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

    const direction = this.unitDir.clone()
    if (direction.lengthSq() === 0) return

    direction.normalize()
    const line = new GeometryLine2d(origin, origin.clone().add(direction))

    switch (osnapMode) {
      case AcDbOsnapMode.Nearest:
        snapPoints.push(line.perpPoint(pickPoint))
        break
      case AcDbOsnapMode.Perpendicular:
        snapPoints.push(line.perpPoint(pickPoint))
        break
      default:
        break
    }
  }

  /**
   * Transforms this xline by the specified matrix.
   */
  transformBy(matrix: GeometryMatrix3d) {
    this._basePoint.applyMatrix4(matrix)
    const direction = new GeometryVector3d(
      this._unitDir.x,
      this._unitDir.y,
      0
    ).transformDirection(matrix)
    this._unitDir.set(direction.x, direction.y).normalize()
    return this
  }

  /**
   * This xline always draws as a single `lineStrip` primitive.
   *
   * @internal
   */
  override get directBatchPrimitive() {
    return 'lineStrip' as const
  }

  /**
   * Draws this xline using the specified renderer.
   *
   * This method renders the xline as a line segment extending from the base point
   * in both directions along the unit vector. For practical purposes, the xline is
   * drawn with a finite length.
   *
   * @param renderer - The renderer to use for drawing
   * @returns The rendered xline entity, or undefined if drawing failed
   */
  subWorldDraw(renderer: AcGiRenderer) {
    const points: GeometryPoint2d[] = []
    points.push(
      new GeometryPoint2d(this._basePoint).addScaledVector(
        this._unitDir,
        -1000000
      )
    )
    points.push(
      new GeometryPoint2d(this._basePoint).addScaledVector(
        this._unitDir,
        1000000
      )
    )
    return renderer.lines(points)
  }

  /**
   * {@inheritDoc AcDbCurve.getOffsetCurves}
   *
   * Returns a parallel construction line: {@link basePoint} moves perpendicular to the
   * XY projection of {@link unitDir} by `offsetDist`; direction is unchanged. Returns an
   * empty array when the XY direction is degenerate.
   */
  override getOffsetCurves(offsetDist: number): AcDbCurve[] {
    const curve = this.createOffsetCurve(offsetDist)
    return curve ? [curve] : []
  }

  /**
   * {@inheritDoc AcDbCurve.getOffsetSideAtPoint}
   *
   * Same planar left/right test as {@link AcDbRay.getOffsetSideAtPoint}.
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
   * @returns Parallel xline, or `null` when {@link unitDir} has negligible XY component
   */
  private createOffsetCurve(offsetDist: number): AcDbXline | null {
    const offsetPoint = geometryOffsetPointByDirectionInXY(
      this.basePoint,
      this.unitDir,
      offsetDist
    )
    if (!offsetPoint) return null
    const xline = new AcDbXline()
    xline.basePoint = offsetPoint
    xline.unitDir = this.unitDir.clone()
    return xline
  }
}
