import {
  GeometryMatrix3d,
  GeometryPoint2d,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'

import { AcDbEntityProperties } from '../AcDbEntityProperties'
import { AcDbDimension } from './AcDbDimension'

/**
 * Represents an arc length dimension entity in AutoCAD.
 *
 * This dimension type measures the length of an arc by defining the arc's center point,
 * two points that define the arc's extent, and a point on the arc itself. Arc length
 * dimensions are commonly used in mechanical drawings, architectural plans, and other
 * technical documentation where precise arc measurements are required.
 *
 * The dimension displays the actual arc length value and typically includes extension
 * lines, dimension lines, and arrows positioned to clearly indicate the arc being measured.
 */
export class AcDbArcDimension extends AcDbDimension {
  /** The entity type name */
  static override typeName: string = 'ArcDimension'

  private _arcPoint: GeometryPoint2d
  private _centerPoint: GeometryPoint2d
  private _xLine1Point: GeometryPoint2d
  private _xLine2Point: GeometryPoint2d

  /**
   * Creates a new arc length dimension.
   *
   * @param centerPoint - The center point of the arc being measured. This defines
   *                      the center of the circle that contains the arc
   * @param xLine1Point - The first extension line end point. This defines one end
   *                      of the arc being measured
   * @param xLine2Point - The second extension line end point. This defines the other
   *                      end of the arc being measured
   * @param arcPoint - A point on the arc that helps define the specific arc segment
   *                   being measured. This point is typically between the two extension
   *                   line points
   * @param dimText - Optional custom dimension text to display instead of the calculated
   *                  arc length value. If null, the calculated length will be displayed
   * @param dimStyle - Optional name of the dimension style table record to use for
   *                   formatting. If null, the current default style will be used
   */
  constructor(
    centerPoint: GeometryPoint2dLike,
    xLine1Point: GeometryPoint2dLike,
    xLine2Point: GeometryPoint2dLike,
    arcPoint: GeometryPoint2dLike,
    dimText: string | null = null,
    dimStyle: string | null = null
  ) {
    super()
    this._arcPoint = new GeometryPoint2d().copy(arcPoint)
    this._xLine1Point = new GeometryPoint2d().copy(xLine1Point)
    this._xLine2Point = new GeometryPoint2d().copy(xLine2Point)
    this._centerPoint = new GeometryPoint2d().copy(centerPoint)

    this.dimensionText = dimText
    // TODO: Set it to the current default dimStyle within the AutoCAD editor if dimStyle is null
    this.dimensionStyleName = dimStyle
  }

  override get definitionPoints() {
    return {
      centerPoint: this.centerPoint,
      xLine1Point: this.xLine1Point,
      xLine2Point: this.xLine2Point,
      arcPoint: this.arcPoint
    }
  }

  /**
   * Gets or sets a point on the arc that helps define the arc segment being measured.
   *
   * This point is typically positioned between the two extension line points and helps
   * determine which arc segment should be measured when multiple arcs could be defined
   * by the same center and end points.
   *
   * @returns The arc point that defines the arc segment
   */
  get arcPoint() {
    return this._arcPoint
  }
  set arcPoint(value: GeometryPoint2d) {
    this._arcPoint.copy(value)
  }

  /**
   * Gets or sets the center point of the arc being measured.
   *
   * The center point defines the center of the circle that contains the arc. This point
   * is used to calculate the arc length and position the dimension elements correctly.
   *
   * @returns The center point of the arc
   */
  get centerPoint() {
    return this._centerPoint
  }
  set centerPoint(value: GeometryPoint2d) {
    this._centerPoint.copy(value)
  }

  /**
   * Gets or sets the first extension line end point.
   *
   * This point defines one end of the arc being measured. The extension line extends
   * from this point to the arc, helping to clearly identify the starting point of
   * the arc length measurement.
   *
   * @returns The first extension line end point
   */
  get xLine1Point() {
    return this._xLine1Point
  }
  set xLine1Point(value: GeometryPoint2d) {
    this._xLine1Point.copy(value)
  }

  /**
   * Gets or sets the second extension line end point.
   *
   * This point defines the other end of the arc being measured. The extension line
   * extends from this point to the arc, helping to clearly identify the ending point
   * of the arc length measurement.
   *
   * @returns The second extension line end point
   */
  get xLine2Point() {
    return this._xLine2Point
  }
  set xLine2Point(value: GeometryPoint2d) {
    this._xLine2Point.copy(value)
  }

  override get properties(): AcDbEntityProperties {
    const baseProperties = this.getBaseProperties()
    return {
      type: this.type,
      groups: [
        ...baseProperties.groups,
        {
          groupName: 'geometry',
          properties: [
            ...this.createPoint2dProperties(
              'centerPoint',
              () => this.centerPoint
            ),
            ...this.createPoint2dProperties(
              'xLine1Point',
              () => this.xLine1Point
            ),
            ...this.createPoint2dProperties(
              'xLine2Point',
              () => this.xLine2Point
            ),
            ...this.createPoint2dProperties('arcPoint', () => this.arcPoint)
          ]
        }
      ]
    }
  }

  /**
   * @inheritdoc
   */
  protected override collectDimensionDefinitionGripPoints() {
    return [this.centerPoint, this.xLine1Point, this.xLine2Point, this.arcPoint]
  }

  /**
   * @inheritdoc
   */
  protected override subTransformBy(matrix: GeometryMatrix3d) {
    this._arcPoint.applyMatrix4(matrix)
    this._centerPoint.applyMatrix4(matrix)
    this._xLine1Point.applyMatrix4(matrix)
    this._xLine2Point.applyMatrix4(matrix)
  }

  /**
   * Gets the geometric extents (bounding box) of this dimension entity.
   *
   * The geometric extents define the minimum bounding box that completely contains
   * the dimension entity, including all its components like extension lines,
   * dimension lines, arrows, and text.
   *
   * @returns A 3D bounding box containing the dimension entity
   * @inheritdoc
   */
  get geometricExtents() {
    return this.getGeometricExtentsFromPoints([
      this.xLine1Point,
      this.xLine2Point,
      this.centerPoint,
      this.arcPoint
    ])
  }
}
