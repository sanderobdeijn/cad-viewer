import {
  GeometryLine2d,
  GeometryMatrix3d,
  GeometryPoint2d,
  GeometryPoint2dLike,
  GeometryPointLike,
  GeometryVector2d,
  GeometryVector2dLike
} from '@mlightcad/geometry-engine'

import { AcDbEntityProperties } from '../AcDbEntityProperties'
import { AcDbDimension, AcDbDimensionGraphics } from './AcDbDimension'

/**
 * Represents an aligned dimension entity in AutoCAD.
 *
 * An aligned dimension measures the distance between two points located anywhere in space.
 * The dimension's normal vector must be perpendicular to the line between the two points.
 * The two selected points are also used as the definition points for the start of the
 * two dimension extension lines.
 *
 * Aligned dimensions are commonly used to measure distances that are not parallel to
 * the X or Y axes, providing accurate measurements regardless of the orientation.
 *
 * @example
 * ```typescript
 * // Create an aligned dimension
 * const alignedDim = new AcDbAlignedDimension(
 *   new GeometryPoint2d(0, 0),    // First extension line point
 *   new GeometryPoint2d(10, 5),   // Second extension line point
 *   new GeometryPoint2d(5, 2.5),  // Dimension line point
 *   "10.0",                      // Dimension text
 *   "Standard"                   // Dimension style
 * );
 *
 * // Access dimension properties
 * console.log(`Dimension line point: ${alignedDim.dimLinePoint}`);
 * console.log(`Extension line 1 point: ${alignedDim.xLine1Point}`);
 * console.log(`Extension line 2 point: ${alignedDim.xLine2Point}`);
 * ```
 */
export class AcDbAlignedDimension extends AcDbDimension {
  /** The entity type name */
  static override typeName: string = 'AlignedDimension'

  /** The definition point that specifies where the dimension line will be */
  private _dimLinePoint: GeometryPoint2d
  /** The start point for the first extension line */
  private _xLine1Point: GeometryPoint2d
  /** The start point for the second extension line */
  private _xLine2Point: GeometryPoint2d
  /** The extension line obliquing angle in radians */
  private _oblique: number
  /** The dimension's rotation angle in radians */
  private _rotation: number

  /**
   * Creates a new aligned dimension entity.
   *
   * This constructor initializes an aligned dimension using the specified points.
   * The extension line obliquing angle is set to 0.0 by default.
   *
   * @param xLine1Point - Start point (in WCS coordinates) of first extension line
   * @param xLine2Point - Start point (in WCS coordinates) of second extension line
   * @param dimLinePoint - Point (in WCS coordinates) on dimension line itself
   * @param dimText - Text string to use as the dimension annotation (optional)
   * @param dimStyle - String name of dimension style table record to use (optional)
   *
   * @example
   * ```typescript
   * // Create an aligned dimension with default text and style
   * const alignedDim = new AcDbAlignedDimension(
   *   new GeometryPoint2d(0, 0),
   *   new GeometryPoint2d(10, 5),
   *   new GeometryPoint2d(5, 2.5)
   * );
   *
   * // Create an aligned dimension with custom text and style
   * const alignedDim2 = new AcDbAlignedDimension(
   *   new GeometryPoint2d(0, 0),
   *   new GeometryPoint2d(15, 10),
   *   new GeometryPoint2d(7.5, 5),
   *   "15.0",
   *   "Architectural"
   * );
   * ```
   */
  constructor(
    xLine1Point: GeometryPointLike,
    xLine2Point: GeometryPointLike,
    dimLinePoint: GeometryPointLike,
    dimText: string | null = null,
    dimStyle: string | null = null
  ) {
    super()
    this._dimLinePoint = new GeometryPoint2d().copy(dimLinePoint)
    this._xLine1Point = new GeometryPoint2d().copy(xLine1Point)
    this._xLine2Point = new GeometryPoint2d().copy(xLine2Point)
    this._oblique = 0
    this._rotation = 0
    this.calculateRotation()

    if (dimText) {
      this.dimensionText = dimText
    } else {
      // TODO: Decide the umber of digits after the decimal point
      this.dimensionText = this._xLine1Point
        .distanceTo(this._xLine2Point)
        .toFixed(3)
    }

    // TODO: Set it to the current default dimStyle within the AutoCAD editor if dimStyle is null
    this.dimensionStyleName = dimStyle
  }

  override get definitionPoints() {
    return {
      xLine1Point: this.xLine1Point,
      xLine2Point: this.xLine2Point,
      dimLinePoint: this.dimLinePoint
    }
  }

  /**
   * Gets the definition point that specifies where the dimension line will be.
   *
   * This point will be somewhere on the dimension line and determines the position
   * of the dimension text and arrows.
   *
   * @returns The dimension line point in WCS coordinates
   *
   * @example
   * ```typescript
   * const dimLinePoint = alignedDim.dimLinePoint;
   * console.log(`Dimension line point: ${dimLinePoint.x}, ${dimLinePoint.y}`);
   * ```
   */
  get dimLinePoint(): GeometryPoint2d {
    return this._dimLinePoint
  }

  /**
   * Sets the definition point that specifies where the dimension line will be.
   *
   * @param value - The new dimension line point
   *
   * @example
   * ```typescript
   * alignedDim.dimLinePoint = new GeometryPoint2d(5, 2.5);
   * ```
   */
  set dimLinePoint(value: GeometryPoint2dLike) {
    this._dimLinePoint.copy(value)
  }

  /**
   * Gets the start point for the first extension line of the dimension.
   *
   * @returns The first extension line point in WCS coordinates
   *
   * @example
   * ```typescript
   * const xLine1Point = alignedDim.xLine1Point;
   * console.log(`Extension line 1 point: ${xLine1Point.x}, ${xLine1Point.y}`);
   * ```
   */
  get xLine1Point(): GeometryPoint2d {
    return this._xLine1Point
  }

  /**
   * Sets the start point for the first extension line of the dimension.
   *
   * @param value - The new first extension line point
   *
   * @example
   * ```typescript
   * alignedDim.xLine1Point = new GeometryPoint2d(0, 0);
   * ```
   */
  set xLine1Point(value: GeometryPoint2dLike) {
    this._xLine1Point.copy(value)
  }

  /**
   * Gets the start point for the second extension line of the dimension.
   *
   * @returns The second extension line point in WCS coordinates
   *
   * @example
   * ```typescript
   * const xLine2Point = alignedDim.xLine2Point;
   * console.log(`Extension line 2 point: ${xLine2Point.x}, ${xLine2Point.y}`);
   * ```
   */
  get xLine2Point(): GeometryPoint2d {
    return this._xLine2Point
  }

  /**
   * Sets the start point for the second extension line of the dimension.
   *
   * @param value - The new second extension line point
   *
   * @example
   * ```typescript
   * alignedDim.xLine2Point = new GeometryPoint2d(10, 5);
   * ```
   */
  set xLine2Point(value: GeometryPoint2dLike) {
    this._xLine2Point.copy(value)
  }

  /**
   * Gets the dimension's rotation angle.
   *
   * @returns The rotation angle in radians
   *
   * @example
   * ```typescript
   * const rotation = alignedDim.rotation;
   * console.log(`Rotation: ${rotation} radians (${rotation * 180 / Math.PI} degrees)`);
   * ```
   */
  get rotation() {
    return this._rotation
  }

  /**
   * Sets the dimension's rotation angle.
   *
   * @param value - The new rotation angle in radians
   *
   * @example
   * ```typescript
   * alignedDim.rotation = Math.PI / 4; // 45 degrees
   * ```
   */
  set rotation(value: number) {
    this._rotation = value
  }

  /**
   * Gets the extension line obliquing angle.
   *
   * @returns The obliquing angle in radians
   *
   * @example
   * ```typescript
   * const oblique = alignedDim.oblique;
   * console.log(`Oblique angle: ${oblique} radians`);
   * ```
   */
  get oblique() {
    return this._oblique
  }

  /**
   * Sets the extension line obliquing angle.
   *
   * @param value - The new obliquing angle in radians
   *
   * @example
   * ```typescript
   * alignedDim.oblique = Math.PI / 6; // 30 degrees
   * ```
   */
  set oblique(value: number) {
    this._oblique = value
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
              'xLine1Point',
              () => this.xLine1Point
            ),
            ...this.createPoint2dProperties(
              'xLine2Point',
              () => this.xLine2Point
            ),
            ...this.createPoint2dProperties(
              'dimLinePoint',
              () => this.dimLinePoint
            ),
            this.createProperty(
              'rotation',
              'float',
              () => this.rotation,
              (value: number) => {
                this.rotation = value
              }
            ),
            this.createProperty(
              'oblique',
              'float',
              () => this.oblique,
              (value: number) => {
                this.oblique = value
              }
            )
          ]
        }
      ]
    }
  }

  /**
   * @inheritdoc
   */
  protected override collectDimensionDefinitionGripPoints() {
    return [this.xLine1Point, this.xLine2Point, this.dimLinePoint]
  }

  /** @inheritdoc */
  override subMoveGripPointsAt(
    indices: number[],
    offset: GeometryVector2dLike
  ) {
    super.subMoveGripPointsAt(indices, offset)
    this.calculateRotation()
    return this
  }

  /**
   * @inheritdoc
   */
  protected override subTransformBy(matrix: GeometryMatrix3d) {
    this._dimLinePoint.applyMatrix4(matrix)
    this._xLine1Point.applyMatrix4(matrix)
    this._xLine2Point.applyMatrix4(matrix)
    this.calculateRotation()
  }

  /**
   * @inheritdoc
   */
  get geometricExtents() {
    return this.getGeometricExtentsFromPoints([
      this.xLine1Point,
      this.xLine2Point,
      this.dimLinePoint
    ])
  }

  /**
   * @inheritdoc
   */
  protected get isAppendArrow() {
    return false
  }

  /**
   * @inheritdoc
   */
  protected override createGraphics(): AcDbDimensionGraphics {
    const lines = this.createLines()
    const dimensionLine = lines[0]
    return {
      lines,
      // Create arrows at the end of dimension line
      arrows: [
        {
          position: dimensionLine.startPoint,
          rotation: this.rotation + Math.PI,
          size: 10
        },
        { position: dimensionLine.endPoint, rotation: this.rotation, size: 10 }
      ],
      // Create dimension text on the dimension line
      label: this.dimensionText
        ? {
            text: this.dimensionText,
            position: new GeometryPoint2d(dimensionLine.midPoint),
            rotation: this._rotation,
            height: 10
          }
        : undefined
    }
  }

  /**
   * Return one array which contains three lines of the alinged dimension.
   * - The first line in the array is dimension line.
   * - The second line and the third line in the array are extension lines.
   * @returns Return three lines of the alinged dimension
   */
  protected createLines() {
    const lines: GeometryLine2d[] = []

    const extensionLine1 = this.createExtensionLine(this._xLine1Point)
    const extensionLine2 = this.createExtensionLine(this._xLine2Point)

    const intersectionPoint1 = this.findIntersectionPoint(
      extensionLine1,
      this._dimLinePoint
    )
    const intersectionPoint2 = this.findIntersectionPoint(
      extensionLine2,
      this._dimLinePoint
    )
    const dimensionLine = new GeometryLine2d(
      intersectionPoint1,
      intersectionPoint2
    )
    lines.push(dimensionLine)

    // Create the first extension line with extension
    extensionLine1.endPoint = intersectionPoint1
    this.adjustExtensionLine(extensionLine1)
    lines.push(extensionLine1)

    // Create the second extension line with extension
    extensionLine2.endPoint = intersectionPoint2
    this.adjustExtensionLine(extensionLine2)
    lines.push(extensionLine2)

    return lines
  }

  private createExtensionLine(point: GeometryPoint2d) {
    const angle = this.rotation + Math.PI / 2
    const anotherPoint = this.findPointOnLine2(point, angle, 100)
    return new GeometryLine2d(point, anotherPoint)
  }

  /**
   * Compute the intersection point between a line 'line1' and a line 'line2' that passes through
   * a given point 'p' and is perpendicular to line 'line1'.
   *
   * @param line The 'line1'.
   * @param p The point through which the perpendicular 'line2' passes.
   * @returns Returns the intersection point of 'line1' and 'line2'.
   */
  private findIntersectionPoint(line1: GeometryLine2d, p: GeometryPoint2dLike) {
    const p1 = line1.startPoint
    const p2 = line1.endPoint

    // Direction of line1 (p1 - p2)
    const directionOfLine1 = new GeometryVector2d()
      .subVectors(p2, p1)
      .normalize()

    // Vector from point 'p1' to point 'p3'
    const vectorFromP1ToP3 = new GeometryVector2d().subVectors(p, p1)

    // Project vectorAP onto directionL to get the projection vector
    const projectionLength = vectorFromP1ToP3.dot(directionOfLine1)
    const projectionVector = new GeometryVector2d()
      .copy(directionOfLine1)
      .multiplyScalar(projectionLength)

    // Intersection point is the point on line L at the projection
    const intersection = new GeometryPoint2d().addVectors(p1, projectionVector)

    return intersection
  }

  private calculateRotation() {
    const p1 = this._xLine1Point
    const p2 = this._xLine2Point
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    this._rotation = Math.atan2(dy, dx)
  }

  /**
   * DXF subclass marker written for this dimension subtype.
   */
  protected get dxfSubclassMarker() {
    return 'AcDbAlignedDimension'
  }

  protected override getMeasurementPropertyValue() {
    return this.measurement ?? this.xLine1Point.distanceTo(this.xLine2Point)
  }
}
