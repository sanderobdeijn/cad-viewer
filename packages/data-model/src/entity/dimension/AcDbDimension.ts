import {
  GeometryArea2d,
  GeometryBox3d,
  GeometryDimension,
  GeometryIntersectPrimitive,
  GeometryLine2d,
  GeometryMatrix3d,
  GeometryPoint2d,
  GeometryPoint2dLike,
  GeometryPolyline2d,
  GeometryVector2d,
  GeometryVector2dLike,
  GeometryVector3d,
  GeometryVector3dLike
} from '@mlightcad/geometry-engine'
import {
  AcGiArrowStyle,
  AcGiArrowType,
  AcGiMTextAttachmentPoint,
  AcGiMTextFlowDirection,
  AcGiRenderer
} from '@mlightcad/graphic-interface'

import { AcDbObjectId } from '../../base'
import { AcDbDimStyleTableRecord } from '../../database'
import { AcDbOsnapMode } from '../../misc'
import { AcDbEntity } from '../AcDbEntity'
import {
  AcDbEntityProperties,
  AcDbEntityPropertyGroup,
  AcDbEntityPropertyType,
  AcDbEntityRuntimeProperty
} from '../AcDbEntityProperties'
import { acdbForEachGripIndex } from '../AcDbGripHelpers'
import { AcDbLine } from '../AcDbLine'

/**
 * Defines the line spacing style for dimension text.
 */
export enum AcDbLineSpacingStyle {
  /** At least the specified spacing */
  AtLeast = 1,
  /** Exactly the specified spacing */
  Exactly = 2
}

/**
 * An arrowhead of a dimension.
 */
export interface AcDbDimensionArrow {
  /** Position of the arrow tip */
  position: GeometryPoint2d
  /** Direction the arrow points in, in radians */
  rotation: number
  /** Length of the arrow */
  size: number
}

/**
 * The text label of a dimension.
 */
export interface AcDbDimensionLabel {
  /** Text of the label */
  text: string
  /** Position of the label */
  position: GeometryPoint2d
  /** Direction of the text, in radians */
  rotation: number
  /** Height of the text */
  height: number
}

/**
 * What a dimension draws.
 */
export interface AcDbDimensionGraphics {
  lines: GeometryLine2d[]
  arrows: AcDbDimensionArrow[]
  label?: AcDbDimensionLabel
}

/** Half the width of an arrow, relative to its length. */
const ARROW_HALF_WIDTH = 0.125

/** Estimated average character width, relative to the text height. */
const LABEL_CHAR_WIDTH = 0.6

const rotateAround = (
  center: GeometryPoint2d,
  x: number,
  y: number,
  rotation: number
) =>
  new GeometryPoint2d(
    center.x + x * Math.cos(rotation) - y * Math.sin(rotation),
    center.y + x * Math.sin(rotation) + y * Math.cos(rotation)
  )

const arrowOutline = ({ position, rotation, size }: AcDbDimensionArrow) => [
  position.clone(),
  rotateAround(position, -size, -size * ARROW_HALF_WIDTH, rotation),
  rotateAround(position, -size, size * ARROW_HALF_WIDTH, rotation)
]

/** Estimated corners of a label centered on its position. */
const labelCorners = ({
  text,
  position,
  rotation,
  height
}: AcDbDimensionLabel) => {
  const halfWidth = (text.length * height * LABEL_CHAR_WIDTH) / 2
  const halfHeight = height / 2
  return [
    rotateAround(position, -halfWidth, -halfHeight, rotation),
    rotateAround(position, halfWidth, -halfHeight, rotation),
    rotateAround(position, halfWidth, halfHeight, rotation),
    rotateAround(position, -halfWidth, halfHeight, rotation)
  ]
}

/**
 * Abstract base class for all dimension entity types in AutoCAD.
 *
 * This class provides the fundamental functionality for all dimension entities,
 * including dimension text, style management, arrow handling, and measurement
 * calculations. The appearance of dimensions is controlled by dimension variable
 * settings and dimension styles.
 *
 * @example
 * ```typescript
 * class MyDimension extends AcDbDimension {
 *   // Implementation for specific dimension type
 *   draw(renderer: AcGiRenderer) {
 *     // Custom drawing logic
 *   }
 * }
 * ```
 */
export abstract class AcDbDimension extends AcDbEntity {
  /** The entity type name */
  static override typeName: string = 'Dimension'

  override get dxfTypeName() {
    return 'DIMENSION'
  }

  /**
   * DXF group code 10 definition point captured during {@link dxfInFields}.
   *
   * This is **not** {@link dimBlockPosition} (DXF group 12). Subclasses use it
   * as the dim-line / center / far-chord point when their typed point codes are
   * absent (matching AutoCAD DXF and dxf-json-converter).
   */
  protected _dxfDefinitionPoint: GeometryPoint2d
  /** The dimension style name used by this dimension */
  private _dimensionStyleName: string | null
  /** The user-supplied dimension annotation text */
  private _dimensionText: string | null
  /** The measured value of the dimension */
  private _measurement?: number
  /** The line spacing factor for dimension text */
  private _textLineSpacingFactor: number
  /** The line spacing style for dimension text */
  private _textLineSpacingStyle: AcDbLineSpacingStyle
  /** The position of the dimension text */
  private _textPosition: GeometryPoint2d
  /** The rotation angle of the dimension text */
  private _textRotation: number
  /**
   * Horizontal direction for the dimension entity (DXF group 51), in radians.
   * Negative of the angle between the OCS X axis and the UCS X axis.
   */
  private _horizontalRotation: number
  /**
   * Dimension type flags (DXF group 70). Low bits select the dimension kind;
   * bit 32 marks user-defined text position, etc.
   */
  private _dimensionType: number
  /** Dimension text attachment point (DXF group 71). */
  private _attachmentPoint: AcGiMTextAttachmentPoint
  /** DXF class version (group 280); 0 = R2010+. */
  private _dxfVersion: number
  /** The cached dimension style record */
  private _dimStyle?: AcDbDimStyleTableRecord
  /** The normal vector of the plane containing the block reference */
  private _normal: GeometryVector3d

  /**
   * Creates a new dimension entity.
   *
   * This constructor initializes a dimension with default values.
   * Subclasses should override this constructor to set up dimension-specific properties.
   *
   * @example
   * ```typescript
   * const dimension = new MyDimension();
   * dimension.dimensionText = "10.0";
   * dimension.textPosition = new GeometryPoint2d(5, 5);
   * ```
   */
  constructor() {
    super()
    this._dxfDefinitionPoint = new GeometryPoint2d()
    this._dimensionStyleName = null
    this._dimensionText = null
    this._textLineSpacingFactor = 1.0
    this._textLineSpacingStyle = AcDbLineSpacingStyle.AtLeast
    this._textPosition = new GeometryPoint2d()
    this._textRotation = 0
    this._horizontalRotation = 0
    this._dimensionType = 0
    this._attachmentPoint = AcGiMTextAttachmentPoint.MiddleCenter
    this._dxfVersion = 0
    this._normal = new GeometryVector3d(0, 0, 1)
  }

  /**
   * Gets the dimension style name used by this dimension.
   *
   * @returns The dimension style name, or null if not set
   *
   * @example
   * ```typescript
   * const styleName = dimension.dimensionStyleName;
   * console.log(`Dimension style: ${styleName}`);
   * ```
   */
  get dimensionStyleName() {
    return this._dimensionStyleName
  }

  /**
   * Sets the dimension style name for this dimension.
   *
   * @param value - The dimension style name, or null to use default
   *
   * @example
   * ```typescript
   * dimension.dimensionStyleName = "Standard";
   * ```
   */
  set dimensionStyleName(value: string | null) {
    this._dimensionStyleName = value
    this._dimStyle = undefined
  }

  /**
   * Gets the dimension style used by this dimension.
   *
   * This method returns the dimension style record associated with this dimension.
   * If no style is specified, it returns the default dimension style.
   *
   * @returns The dimension style record
   *
   * @example
   * ```typescript
   * const style = dimension.dimensionStyle;
   * console.log(`Style name: ${style.name}`);
   * ```
   */
  get dimensionStyle(): AcDbDimStyleTableRecord {
    if (this._dimStyle == null) {
      let dimStyle: AcDbDimStyleTableRecord | undefined = undefined
      if (this.dimensionStyleName) {
        dimStyle = this.database.tables.dimStyleTable.getAt(
          this.dimensionStyleName
        )
      }
      if (dimStyle == null) dimStyle = new AcDbDimStyleTableRecord()
      this._dimStyle = dimStyle
    }
    return this._dimStyle
  }

  /**
   * Gets the user-supplied dimension annotation text string.
   *
   * This string can contain multiline text formatting characters. The text can be:
   * - Empty string ('') for default text only
   * - Text with angle brackets for mixed default and user text (e.g., 'This is the default text <>')
   * - Period ('.') for no text
   * - User-defined text only
   *
   * @returns The dimension text string
   *
   * @example
   * ```typescript
   * const text = dimension.dimensionText;
   * console.log(`Dimension text: ${text}`);
   * ```
   */
  get dimensionText() {
    return this._dimensionText
  }
  set dimensionText(value: string | null) {
    this._dimensionText = value
  }

  /**
   * The points defining this dimension by name.
   */
  abstract get definitionPoints(): Record<string, GeometryPoint2d>

  /**
   * A copy of the geometric definition of this dimension.
   */
  get geometryDimension(): GeometryDimension {
    const points: Record<string, GeometryPoint2d> = {}
    for (const [name, point] of Object.entries(this.definitionPoints)) {
      points[name] = point.clone()
    }
    return {
      type: this.type,
      points,
      text: this.dimensionText ?? undefined,
      measurement: this.measurement
    }
  }

  /**
   * The current measurement value for this dimension
   */
  get measurement() {
    return this._measurement
  }
  set measurement(value: number | undefined) {
    this._measurement = value
  }

  /**
   * The line spacing factor (a value between 0.25 and 4.00).
   */
  get textLineSpacingFactor() {
    return this._textLineSpacingFactor
  }
  set textLineSpacingFactor(value: number) {
    this._textLineSpacingFactor = value
  }

  /**
   * The line spacing style for the dimension.
   */
  get textLineSpacingStyle() {
    return this._textLineSpacingStyle
  }
  set textLineSpacingStyle(value: AcDbLineSpacingStyle) {
    this._textLineSpacingStyle = value
  }

  /**
   * The dimension's text position point. This is the middle center point of the text (which is itself an
   * MText object with middle-center justification).
   */
  get textPosition() {
    return this._textPosition
  }
  set textPosition(value: GeometryPoint2d) {
    this._textPosition.copy(value)
  }

  /**
   * The rotation angle (in radians) of the dimension's annotation text. This is the angle from the
   * dimension's horizontal axis to the horizontal axis used by the text. The angle is in the dimension's
   * OCS X-Y plane with positive angles going counterclockwise when looking down the OCS Z axis towards
   * the OCS origin. The value obtained from: (2 * pi) + the dimension's text rotation angle--the
   * dimension's horizontal rotation angle
   */
  get textRotation() {
    return this._textRotation
  }
  set textRotation(value: number) {
    this._textRotation = value
  }

  /**
   * Horizontal direction for the dimension entity (DXF group 51), in radians.
   *
   * Per the AutoCAD DXF reference this is the negative of the angle between
   * the OCS X axis and the UCS X axis, always in the OCS XY plane.
   */
  get horizontalRotation() {
    return this._horizontalRotation
  }
  set horizontalRotation(value: number) {
    this._horizontalRotation = value
  }

  /**
   * Dimension type flags from DXF group 70.
   *
   * Bits 0–3 encode the dimension kind; bit 5 (32) indicates the text was
   * placed at a user-defined location.
   */
  get dimensionType() {
    return this._dimensionType
  }
  set dimensionType(value: number) {
    this._dimensionType = value
  }

  /**
   * Attachment point of the dimension text (DXF group 71).
   */
  get attachmentPoint() {
    return this._attachmentPoint
  }
  set attachmentPoint(value: AcGiMTextAttachmentPoint) {
    this._attachmentPoint = value
  }

  /**
   * DXF class version (group 280). `0` means R2010+.
   */
  get dxfVersion() {
    return this._dxfVersion
  }
  set dxfVersion(value: number) {
    this._dxfVersion = value
  }

  /**
   * Gets the normal vector of the plane containing the dimension.
   *
   * @returns The normal vector
   */
  get normal(): GeometryVector3d {
    return this._normal
  }

  /**
   * Sets the normal vector of the plane containing the dimension.
   *
   * @param value - The new normal vector
   */
  set normal(value: GeometryVector3dLike) {
    this._normal.copy(value).normalize()
  }

  override get properties(): AcDbEntityProperties {
    return this.getBaseProperties()
  }

  protected getBaseProperties(): AcDbEntityProperties {
    return {
      type: this.type,
      groups: [this.getGeneralProperties(), this.getDimensionProperties()]
    }
  }

  /**
   * Transforms this dimension by the specified matrix.
   */
  transformBy(matrix: GeometryMatrix3d): this {
    const origin = this._textPosition.clone()
    const rotationPoint = this._textPosition
      .clone()
      .add(
        new GeometryVector3d(
          Math.cos(this._textRotation),
          Math.sin(this._textRotation),
          0
        )
      )

    this._textPosition.applyMatrix4(matrix)
    this._normal.transformDirection(matrix)

    origin.applyMatrix4(matrix)
    rotationPoint.applyMatrix4(matrix)
    const rotationVector = new GeometryVector2d(rotationPoint).sub(origin)
    if (rotationVector.lengthSq() > 0) {
      this._textRotation = Math.atan2(rotationVector.y, rotationVector.x)
    }

    this.subTransformBy(matrix)
    return this
  }

  /**
   * Creates what this dimension draws, in WCS coordinates. Dimension types
   * without their own geometry draw nothing.
   */
  protected createGraphics(): AcDbDimensionGraphics {
    return { lines: [], arrows: [] }
  }

  /**
   * Resolves osnap points through the lines of the dimension.
   */
  override subGetOsnapPoints(
    osnapMode: AcDbOsnapMode,
    pickPoint: GeometryPoint2dLike,
    lastPoint: GeometryPoint2dLike,
    snapPoints: GeometryPoint2dLike[]
  ) {
    for (const line of this.createGraphics().lines) {
      new AcDbLine(line.startPoint, line.endPoint).subGetOsnapPoints(
        osnapMode,
        pickPoint,
        lastPoint,
        snapPoints
      )
    }
  }

  /**
   * @inheritdoc
   */
  subWorldDraw(renderer: AcGiRenderer) {
    const { lines, arrows, label } = this.createGraphics()
    const drawables = lines.map(line =>
      renderer.lines([line.startPoint, line.endPoint])
    )
    for (const arrow of arrows) {
      const area = new GeometryArea2d()
      area.add(new GeometryPolyline2d(arrowOutline(arrow), true))
      drawables.push(renderer.area(area))
    }
    if (label) {
      drawables.push(this.drawLabel(renderer, label))
    }
    return renderer.group(drawables)
  }

  private drawLabel(renderer: AcGiRenderer, label: AcDbDimensionLabel) {
    const style = this.database.tables.textStyleTable.resolveAt(
      this.dimensionStyle.dimtxsty
    )
    if (!style) {
      throw new Error('No valid text style found in text style table.')
    }
    return renderer.mtext(
      {
        text: label.text,
        height: label.height,
        width: 0,
        position: label.position,
        rotation: 0,
        directionVector: new GeometryVector3d(
          Math.cos(label.rotation),
          Math.sin(label.rotation),
          0
        ),
        attachmentPoint: this.attachmentPoint,
        drawingDirection: AcGiMTextFlowDirection.LEFT_TO_RIGHT,
        lineSpaceFactor: 1,
        lineSpaceStyle: 0
      },
      style.textStyle
    )
  }

  /** @inheritdoc */
  override subGetIntersectCurves(): GeometryIntersectPrimitive[] {
    return this.createGraphics().lines.flatMap(line =>
      new AcDbLine(line.startPoint, line.endPoint).subGetIntersectCurves()
    )
  }

  /**
   * Builds geometric extents from what this dimension draws, the supplied WCS
   * definition points and the user-placed text position.
   */
  protected getGeometricExtentsFromPoints(
    points: GeometryPoint2dLike[]
  ): GeometryBox3d {
    const box = new GeometryBox3d()
    const { lines, arrows, label } = this.createGraphics()
    for (const line of lines) {
      box.expandByPoint(line.startPoint)
      box.expandByPoint(line.endPoint)
    }
    for (const arrow of arrows) {
      arrowOutline(arrow).forEach(point => box.expandByPoint(point))
    }
    if (label) {
      labelCorners(label).forEach(point => box.expandByPoint(point))
    }
    for (const point of points) {
      box.expandByPoint(point)
    }
    if (this.hasExplicitTextPosition()) {
      box.expandByPoint(this.textPosition)
    }
    return box
  }

  /**
   * Returns true when dimension text has been placed away from the default origin.
   */
  private hasExplicitTextPosition(): boolean {
    const { x, y } = this.textPosition
    return x !== 0 || y !== 0
  }

  /**
   * Collects dimension-specific definition grip points in WCS coordinates.
   *
   * Subclasses override this to expose their editable definition points,
   * matching AutoCAD `AcDbDimension::getGripPoints` behavior.
   */
  protected collectDimensionDefinitionGripPoints(): GeometryPoint2d[] {
    return []
  }

  /**
   * Gets the grip points for this dimension.
   *
   * Returns definition points together with the dimension text position.
   *
   * @returns Array of grip points as 2D points
   */
  subGetGripPoints() {
    return this.collectDimensionDefinitionGripPoints().concat([
      this.textPosition
    ])
  }

  /**
   * Moves dimension definition and text grip points by the given offset.
   */
  subMoveGripPointsAt(indices: number[], offset: GeometryVector2dLike) {
    const definitionPoints = this.collectDimensionDefinitionGripPoints()
    acdbForEachGripIndex(indices, index => {
      if (index >= 0 && index < definitionPoints.length) {
        definitionPoints[index].add(offset)
      } else if (index === definitionPoints.length) {
        this.textPosition.add(offset)
      }
    })
    return this
  }

  protected getDimensionProperties(): AcDbEntityPropertyGroup {
    return {
      groupName: 'dimension',
      properties: [
        this.createProperty(
          'dimensionStyleName',
          'string',
          () => this.dimensionStyleName ?? '',
          (value: string) => {
            this.dimensionStyleName = value.trim() === '' ? null : value
          }
        ),
        this.createProperty(
          'dimensionText',
          'string',
          () => this.dimensionText ?? '',
          (value: string) => {
            this.dimensionText = value
          }
        ),
        this.createProperty('measurement', 'float', () =>
          this.getMeasurementPropertyValue()
        ),
        ...this.createPoint2dProperties(
          'textPosition',
          () => this.textPosition
        ),
        this.createProperty(
          'textRotation',
          'float',
          () => this.textRotation,
          (value: number) => {
            this.textRotation = value
          }
        ),
        this.createProperty(
          'textLineSpacingFactor',
          'float',
          () => this.textLineSpacingFactor,
          (value: number) => {
            this.textLineSpacingFactor = value
          }
        ),
        this.createProperty(
          'textLineSpacingStyle',
          'enum',
          () => this.textLineSpacingStyle,
          (value: AcDbLineSpacingStyle) => {
            this.textLineSpacingStyle = value
          },
          [
            {
              label: AcDbLineSpacingStyle[AcDbLineSpacingStyle.AtLeast],
              value: AcDbLineSpacingStyle.AtLeast
            },
            {
              label: AcDbLineSpacingStyle[AcDbLineSpacingStyle.Exactly],
              value: AcDbLineSpacingStyle.Exactly
            }
          ]
        )
      ]
    }
  }

  protected createProperty<T>(
    name: string,
    type: AcDbEntityPropertyType,
    get: () => T,
    set?: (value: T) => void,
    options?: { label: string; value: unknown }[]
  ): AcDbEntityRuntimeProperty<T> {
    return {
      name,
      type,
      editable: set != null,
      options,
      accessor: set ? { get, set } : { get }
    }
  }

  protected createPoint2dProperties(
    prefix: string,
    getPoint: () => GeometryPoint2d
  ): AcDbEntityRuntimeProperty<number>[] {
    return [
      this.createProperty(
        `${prefix}X`,
        'float',
        () => getPoint().x,
        (value: number) => {
          getPoint().x = value
        }
      ),
      this.createProperty(
        `${prefix}Y`,
        'float',
        () => getPoint().y,
        (value: number) => {
          getPoint().y = value
        }
      )
    ]
  }

  protected getMeasurementPropertyValue(): number | undefined {
    return this.measurement
  }

  protected get arrowScaleFactor() {
    const dimStyle = this.dimensionStyle
    // TODO:
    // 1. DIMASZ has no effect when DIMTSZ is other than zero.
    // 2. Calculate scale factor based on unit
    return dimStyle.dimasz
  }

  /**
   * Arrow style of the first arrow
   */
  protected get firstArrowStyle(): AcGiArrowStyle {
    return {
      type: this.firstArrowType,
      scale: this.arrowScaleFactor,
      appended: this.isAppendArrow,
      visible: this.dimensionStyle.dimse1 == 0
    }
  }

  /**
   * Arrow style of the second arrow
   */
  protected get secondArrowStyle(): AcGiArrowStyle {
    return {
      type: this.secondArrowType,
      scale: this.arrowScaleFactor,
      appended: this.isAppendArrow,
      visible: this.dimensionStyle.dimse2 == 0
    }
  }

  /**
   * The flag to determinate how to attach arrow to endpoint of the line.
   * - true: append arrow to endpoint of the line
   * - false: overlap arrow with endpoint of the line
   */
  protected get isAppendArrow() {
    return true
  }

  /**
   * The BTR id associated with the first arrow type
   */
  protected get firstArrowTypeBtrId() {
    const dimStyle = this.dimensionStyle
    return dimStyle.dimsah == 0 ? dimStyle.dimblk : dimStyle.dimblk1
  }

  /**
   * The first arrow type
   */
  protected get firstArrowType() {
    const btrId = this.firstArrowTypeBtrId
    return this.getArrowName(btrId)
  }

  /**
   * The BTR id associated with the second arrow type
   */
  protected get secondArrowTypeBtrId() {
    const dimStyle = this.dimensionStyle
    return dimStyle.dimsah == 0 ? dimStyle.dimblk : dimStyle.dimblk2
  }

  /**
   * The second arrow type
   */
  protected get secondArrowType() {
    const btrId = this.secondArrowTypeBtrId
    return this.getArrowName(btrId)
  }

  /**
   * The maximum number of arrow lines of this dimension
   */
  protected get arrowLineCount() {
    return 1
  }

  /**
   * Find the point `p3` on a line along the line direction at a distance `length` from `p2`.
   *
   * @param p1 - The start point of the line.
   * @param p2 - The end point of the line.
   * @param length - The distance from `p2` to `p3`.
   * @returns Return the point `p3`.
   */
  protected findPointOnLine1(
    p1: GeometryPoint2d,
    p2: GeometryPoint2d,
    length: number
  ): GeometryPoint2d {
    // Calculate the direction vector from p1 to p2
    const direction = new GeometryPoint2d().subVectors(p2, p1).normalize()

    // Calculate p3 by moving in the direction from p2 by the specified length
    const p3 = new GeometryPoint2d(p2).addScaledVector(direction, length)

    return p3
  }

  /**
   * Find the point `p2` on a line starting from `p1` at a specified angle
   * and at a distance `length` from `p1`.
   *
   * @param p1 - The start point of the line.
   * @param angle - The angle of the line in radians relative to the x-axis.
   * @param length - The distance from `p1` to `p2`.
   * @returns Return the point `p2`.
   */
  protected findPointOnLine2(
    p1: GeometryPoint2dLike,
    angle: number,
    length: number
  ): GeometryPoint2dLike {
    // Calculate the new point p2
    const x = p1.x + length * Math.cos(angle)
    const y = p1.y + length * Math.sin(angle)
    return { x, y }
  }

  /**
   * Adjust start point and end point of extension line according current dimension style
   * @param extensionLine Input extension line to adjust its start point and end point
   */
  protected adjustExtensionLine(extensionLine: GeometryLine2d) {
    const dimStyle = this.dimensionStyle
    extensionLine.extend(dimStyle.dimexe)
    extensionLine.extend(-dimStyle.dimexo, true)
  }

  /**
   * Get dimension style name by dimension block id
   * @param id Input dimension block id
   * @returns Return dimension style name by dimension block id
   */
  private getArrowName(id: AcDbObjectId) {
    const blockTableRecord = this.database.tables.blockTable.getIdAt(id)
    return (
      blockTableRecord
        ? blockTableRecord.name.toUpperCase()
        : AcGiArrowType.Closed
    ) as AcGiArrowType
  }

  /**
   * Subclasses can override this to transform their own definition points.
   */
  protected subTransformBy(_matrix: GeometryMatrix3d) {}
}
