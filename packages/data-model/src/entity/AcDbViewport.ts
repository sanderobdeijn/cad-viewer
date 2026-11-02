import {
  AcGeBox3d,
  AcGeIntersectPrimitive,
  AcGeMatrix3d,
  AcGePoint2d,
  AcGeVector2dLike,
  AcGeVector3d,
  AcGeVector3dLike
} from '@mlightcad/geometry-engine'
import {
  AcGiEntity,
  AcGiRenderer,
  AcGiViewport
} from '@mlightcad/graphic-interface'

import { acdbGetViewportAnnotationScale } from '../misc/AcDbAnnotationScale'
import { AcDbEntity } from './AcDbEntity'
import { acdbForEachGripIndex } from './AcDbGripHelpers'
import { acdbIntersectPrimitivesFromPointPath } from './AcDbIntersectHelpers'

/**
 * Represents a viewport entity in AutoCAD drawings.
 *
 * A viewport is a rectangular window that displays a portion of the drawing model space
 * within paper space layouts. Viewports allow users to create multiple views of the same
 * drawing at different scales and orientations on a single sheet.
 *
 * Key characteristics:
 * - Viewports exist primarily in paper space layouts
 * - Each viewport has a unique ID number (except the default system viewport with ID 1)
 * - Viewports can be active or inactive
 * - The viewport entity itself is drawn as a rectangular border in paper space
 *
 * @example
 * ```typescript
 * const viewport = new AcDbViewport();
 * viewport.centerPoint = new AcGePoint2d(0, 0);
 * viewport.width = 10;
 * viewport.height = 8;
 * viewport.number = 2;
 * ```
 */
export class AcDbViewport extends AcDbEntity {
  /** The entity type name */
  static override typeName: string = 'Viewport'

  override get dxfTypeName() {
    return 'VIEWPORT'
  }

  private _centerPoint: AcGePoint2d
  private _height: number
  private _width: number
  private _viewCenter: AcGePoint2d
  private _viewTarget: AcGePoint2d
  private _viewDirection: AcGeVector3d
  private _viewTwistAngle: number
  private _viewHeight: number
  private _number: number
  private _snapBase = new AcGePoint2d()
  private _snapSpacing = new AcGePoint2d(1, 1)
  private _gridSpacing = new AcGePoint2d(1, 1)
  private _perspectiveLensLength = 50
  private _frontClipZ = 0
  private _backClipZ = 0
  private _snapAngle = 0
  private _status = 0
  private _ucsPerViewport = 0
  private _circleZoomPercent = 1000
  private _statusBitFlags = 0
  private _ucsOrigin = new AcGePoint2d()
  private _ucsXAxis = new AcGeVector3d(1, 0, 0)
  private _ucsYAxis = new AcGeVector3d(0, 1, 0)
  private _elevation = 0
  private _frozenLayerIds: string[] = []
  private _sheetName = ''
  private _iconFlag = 0
  private _orthographicType = 0
  private _majorGridFrequency = 0
  private _ambientLightColorIndex = 0
  private _brightness = 0
  private _contrast = 0
  private _shadePlotMode = 0
  private _renderMode = 0
  private _defaultLightingType = 0
  private _isDefaultLighting = false
  private _clippingBoundaryId = ''
  private _backgroundId = ''
  private _shadePlotId = ''
  private _ucsId = ''
  private _ucsBaseId = ''
  private _visualStyleId = ''
  private _sunId = ''
  private _ambientLightColorInstance = 0
  private _ambientLightColorName = ''
  private _softPointers: string[] = []

  /**
   * Creates a new AcDbViewport instance.
   *
   * Initializes all properties with default values:
   * - centerPoint: origin (0,0,0)
   * - height: 0
   * - width: 0
   * - viewCenter: origin (0,0,0)
   * - viewTarget: origin (0,0,0)
   * - viewTwistAngle: 0
   * - viewHeight: 0
   * - number: -1 (indicating inactive viewport)
   */
  constructor() {
    super()
    this._centerPoint = new AcGePoint2d()
    this._height = 0
    this._width = 0
    this._viewCenter = new AcGePoint2d()
    this._viewTarget = new AcGePoint2d()
    this._viewDirection = new AcGeVector3d(0, 0, 1)
    this._viewTwistAngle = 0
    this._viewHeight = 0
    this._number = -1
  }

  /**
   * Gets or sets the viewport ID number.
   *
   * This is the number that is reported by the AutoCAD CVPORT system variable
   * when the viewport is the current viewport in the AutoCAD editor. If the viewport is inactive, -1
   * is returned.
   *
   * Important notes:
   * - This value is not saved with the drawing, and changes each time the drawing is opened
   * - Viewport ID 1 is reserved for the system-defined default viewport in paper space
   * - Active viewports have IDs greater than 1
   * - Inactive viewports return -1
   *
   * @returns The viewport ID number
   */
  get number() {
    return this._number
  }
  set number(value: number) {
    this._number = value
  }

  /**
   * Gets or sets the center point of the viewport entity in WCS coordinates (within Paper Space).
   *
   * This point represents the geometric center of the viewport's rectangular boundary
   * in paper space coordinates, not the center of the model space view within the viewport.
   *
   * @returns The center point of the viewport entity
   */
  get centerPoint() {
    return this._centerPoint
  }
  set centerPoint(value: AcGePoint2d) {
    this._centerPoint = value
  }

  /**
   * Gets or sets the height of the viewport entity's window in drawing units.
   *
   * This represents the height of the viewport's rectangular boundary in paper space,
   * measured in the current drawing units. It defines the vertical extent of the
   * viewport border, not the height of the model space view within it.
   *
   * @returns The height of the viewport entity in drawing units
   */
  get height() {
    return this._height
  }
  set height(value: number) {
    this._height = value
  }

  /**
   * Gets or sets the width of the viewport entity's window in drawing units.
   *
   * This represents the width of the viewport's rectangular boundary in paper space,
   * measured in the current drawing units. It defines the horizontal extent of the
   * viewport border, not the width of the model space view within the viewport.
   *
   * Note: This is the width in Paper Space of the viewport itself, not the width
   * of the Model Space view within the viewport.
   *
   * @returns The width of the viewport entity in drawing units
   */
  get width() {
    return this._width
  }
  set width(value: number) {
    this._width = value
  }

  /**
   * Gets or sets the view center in display coordinate system coordinates.
   *
   * This point represents the center of the model space view that is displayed
   * within the viewport. It is specified in the display coordinate system and
   * determines what portion of the model space drawing is visible in the viewport.
   *
   * @returns The center point of the model space view within the viewport
   */
  get viewCenter() {
    return this._viewCenter
  }
  set viewCenter(value: AcGePoint2d) {
    this._viewCenter = value
  }

  /**
   * Gets or sets the view target in WCS coordinates (DXF group 17).
   *
   * The model view center stored in {@link viewCenter} is in DCS; the WCS
   * center shown through the viewport is `viewTarget + rotate(viewCenter,
   * viewTwistAngle)`.
   */
  get viewTarget() {
    return this._viewTarget
  }
  set viewTarget(value: AcGePoint2d) {
    this._viewTarget = value
  }

  /**
   * View direction from target (DXF group 16).
   */
  get viewDirection() {
    return this._viewDirection
  }
  set viewDirection(value: AcGeVector3dLike) {
    this._viewDirection.copy(value)
  }

  /** Snap base point (DXF group 13). */
  get snapBase() {
    return this._snapBase
  }
  set snapBase(value: AcGePoint2d) {
    this._snapBase.copy(value)
  }

  /** Snap spacing (DXF group 14). */
  get snapSpacing() {
    return this._snapSpacing
  }
  set snapSpacing(value: AcGePoint2d) {
    this._snapSpacing.copy(value)
  }

  /** Grid spacing (DXF group 15). */
  get gridSpacing() {
    return this._gridSpacing
  }
  set gridSpacing(value: AcGePoint2d) {
    this._gridSpacing.copy(value)
  }

  /** Perspective lens length (DXF group 42). */
  get perspectiveLensLength() {
    return this._perspectiveLensLength
  }
  set perspectiveLensLength(value: number) {
    this._perspectiveLensLength = value
  }

  /** Front clip plane Z value (DXF group 43). */
  get frontClipZ() {
    return this._frontClipZ
  }
  set frontClipZ(value: number) {
    this._frontClipZ = value
  }

  /** Back clip plane Z value (DXF group 44). */
  get backClipZ() {
    return this._backClipZ
  }
  set backClipZ(value: number) {
    this._backClipZ = value
  }

  /** Snap angle in radians (DXF group 50). */
  get snapAngle() {
    return this._snapAngle
  }
  set snapAngle(value: number) {
    this._snapAngle = value
  }

  /** Viewport status field (DXF group 68). */
  get status() {
    return this._status
  }
  set status(value: number) {
    this._status = value
  }

  /** UCS per-viewport flag (DXF group 71). */
  get ucsPerViewport() {
    return this._ucsPerViewport
  }
  set ucsPerViewport(value: number) {
    this._ucsPerViewport = value
  }

  /** Circle zoom percent (DXF group 72). */
  get circleZoomPercent() {
    return this._circleZoomPercent
  }
  set circleZoomPercent(value: number) {
    this._circleZoomPercent = value
  }

  /** Status bit flags (DXF group 90). */
  get statusBitFlags() {
    return this._statusBitFlags
  }
  set statusBitFlags(value: number) {
    this._statusBitFlags = value
  }

  /** UCS origin (DXF group 110). */
  get ucsOrigin() {
    return this._ucsOrigin
  }
  set ucsOrigin(value: AcGePoint2d) {
    this._ucsOrigin.copy(value)
  }

  /** Elevation (DXF group 146). */
  get elevation() {
    return this._elevation
  }
  set elevation(value: number) {
    this._elevation = value
  }

  /** Frozen layer soft-pointer IDs (DXF group 331). */
  get frozenLayerIds() {
    return this._frozenLayerIds
  }
  set frozenLayerIds(value: string[]) {
    this._frozenLayerIds = [...value]
  }

  /** UCS X axis (DXF group 111). */
  get ucsXAxis() {
    return this._ucsXAxis
  }
  set ucsXAxis(value: AcGeVector3dLike) {
    this._ucsXAxis.copy(value)
  }

  /** UCS Y axis (DXF group 112). */
  get ucsYAxis() {
    return this._ucsYAxis
  }
  set ucsYAxis(value: AcGeVector3dLike) {
    this._ucsYAxis.copy(value)
  }

  /** Paper space sheet name (DXF group 1). */
  get sheetName() {
    return this._sheetName
  }
  set sheetName(value: string) {
    this._sheetName = value
  }

  /** UCSICON display flag (DXF group 74). */
  get iconFlag() {
    return this._iconFlag
  }
  set iconFlag(value: number) {
    this._iconFlag = value
  }

  /** Orthographic type of UCS (DXF group 79). */
  get orthographicType() {
    return this._orthographicType
  }
  set orthographicType(value: number) {
    this._orthographicType = value
  }

  /** Major grid-line frequency (DXF group 61). */
  get majorGridFrequency() {
    return this._majorGridFrequency
  }
  set majorGridFrequency(value: number) {
    this._majorGridFrequency = value
  }

  /** Ambient light color index (DXF group 63). */
  get ambientLightColorIndex() {
    return this._ambientLightColorIndex
  }
  set ambientLightColorIndex(value: number) {
    this._ambientLightColorIndex = value
  }

  /** Brightness (DXF group 141). */
  get viewportBrightness() {
    return this._brightness
  }
  set viewportBrightness(value: number) {
    this._brightness = value
  }

  /** Contrast (DXF group 142). */
  get viewportContrast() {
    return this._contrast
  }
  set viewportContrast(value: number) {
    this._contrast = value
  }

  /** Shade plot mode (DXF group 170). */
  get shadePlotMode() {
    return this._shadePlotMode
  }
  set shadePlotMode(value: number) {
    this._shadePlotMode = value
  }

  /** Render mode (DXF group 281). */
  get renderMode() {
    return this._renderMode
  }
  set renderMode(value: number) {
    this._renderMode = value
  }

  /** Default lighting type (DXF group 282). */
  get defaultLightingType() {
    return this._defaultLightingType
  }
  set defaultLightingType(value: number) {
    this._defaultLightingType = value
  }

  /** Whether default lighting is on (DXF group 292). */
  get isDefaultLighting() {
    return this._isDefaultLighting
  }
  set isDefaultLighting(value: boolean) {
    this._isDefaultLighting = value
  }

  /** Clipping boundary hard-pointer ID (DXF group 340). */
  get clippingBoundaryId() {
    return this._clippingBoundaryId
  }
  set clippingBoundaryId(value: string) {
    this._clippingBoundaryId = value
  }

  /** Background soft-pointer ID (DXF group 332). */
  get backgroundId() {
    return this._backgroundId
  }
  set backgroundId(value: string) {
    this._backgroundId = value
  }

  /** Shade plot soft-pointer ID (DXF group 333). */
  get shadePlotId() {
    return this._shadePlotId
  }
  set shadePlotId(value: string) {
    this._shadePlotId = value
  }

  /** UCS soft-pointer ID (DXF group 345). */
  get ucsId() {
    return this._ucsId
  }
  set ucsId(value: string) {
    this._ucsId = value
  }

  /** UCS base soft-pointer ID (DXF group 346). */
  get ucsBaseId() {
    return this._ucsBaseId
  }
  set ucsBaseId(value: string) {
    this._ucsBaseId = value
  }

  /** Visual style soft-pointer ID (DXF group 348). */
  get visualStyleId() {
    return this._visualStyleId
  }
  set visualStyleId(value: string) {
    this._visualStyleId = value
  }

  /** Sun soft-pointer ID (DXF group 361). */
  get sunId() {
    return this._sunId
  }
  set sunId(value: string) {
    this._sunId = value
  }

  /** Ambient light color (true color, DXF group 421). */
  get ambientLightColorInstance() {
    return this._ambientLightColorInstance
  }
  set ambientLightColorInstance(value: number) {
    this._ambientLightColorInstance = value
  }

  /** Ambient light color name (DXF group 431). */
  get ambientLightColorName() {
    return this._ambientLightColorName
  }
  set ambientLightColorName(value: string) {
    this._ambientLightColorName = value
  }

  /** Soft-pointer IDs from groups 91 / 335 / 343 / 344. */
  get softPointers() {
    return this._softPointers
  }
  set softPointers(value: string[]) {
    this._softPointers = [...value]
  }

  /**
   * Gets or sets the view twist angle in radians (DXF group 51).
   */
  get viewTwistAngle() {
    return this._viewTwistAngle
  }
  set viewTwistAngle(value: number) {
    this._viewTwistAngle = value
  }

  /**
   * Gets or sets the height of the Model Space view within the viewport.
   *
   * This value represents the height of the model space view that is displayed
   * within the viewport, specified in display coordinate system coordinates.
   *
   * Zoom behavior:
   * - Zooming the view out within the viewport increases this value
   * - Zooming the view in within the viewport decreases this value
   *
   * @returns The height of the model space view in display coordinates
   */
  get viewHeight() {
    return this._viewHeight
  }
  set viewHeight(value: number) {
    this._viewHeight = value
  }

  /**
   * Gets the geometric extents of the viewport entity.
   *
   * This method returns a bounding box that encompasses the entire viewport entity
   * in world coordinate system (WCS) coordinates.
   *
   * @returns A bounding box containing the viewport entity
   * @inheritdoc
   */
  get geometricExtents(): AcGeBox3d {
    const halfWidth = this._width / 2
    const halfHeight = this._height / 2
    const box = new AcGeBox3d()
    box.expandByPoint(
      new AcGePoint2d(
        this._centerPoint.x - halfWidth,
        this._centerPoint.y - halfHeight
      )
    )
    box.expandByPoint(
      new AcGePoint2d(
        this._centerPoint.x + halfWidth,
        this._centerPoint.y + halfHeight
      )
    )
    return box
  }

  /** @inheritdoc */
  override subGetIntersectCurves(): AcGeIntersectPrimitive[] {
    const halfWidth = this._width / 2
    const halfHeight = this._height / 2
    const corners = [
      new AcGePoint2d(
        this._centerPoint.x - halfWidth,
        this._centerPoint.y - halfHeight
      ),
      new AcGePoint2d(
        this._centerPoint.x + halfWidth,
        this._centerPoint.y - halfHeight
      ),
      new AcGePoint2d(
        this._centerPoint.x + halfWidth,
        this._centerPoint.y + halfHeight
      ),
      new AcGePoint2d(
        this._centerPoint.x - halfWidth,
        this._centerPoint.y + halfHeight
      )
    ]
    return acdbIntersectPrimitivesFromPointPath(corners, true)
  }

  /**
   * Gets the grip points for this viewport.
   *
   * Grip points are the center point and the four corners of the viewport
   * boundary in paper space, matching AutoCAD viewport grip behavior.
   *
   * @returns Array of grip points as 2D points
   */
  subGetGripPoints() {
    const gripPoints = new Array<AcGePoint2d>()
    const halfWidth = this._width / 2
    const halfHeight = this._height / 2

    gripPoints.push(this._centerPoint)
    if (halfWidth > 0 || halfHeight > 0) {
      gripPoints.push(
        new AcGePoint2d(
          this._centerPoint.x - halfWidth,
          this._centerPoint.y - halfHeight
        ),
        new AcGePoint2d(
          this._centerPoint.x + halfWidth,
          this._centerPoint.y - halfHeight
        ),
        new AcGePoint2d(
          this._centerPoint.x + halfWidth,
          this._centerPoint.y + halfHeight
        ),
        new AcGePoint2d(
          this._centerPoint.x - halfWidth,
          this._centerPoint.y + halfHeight
        )
      )
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
   * Transforms this viewport entity by the specified matrix.
   */
  transformBy(matrix: AcGeMatrix3d) {
    const origin = this._centerPoint.clone()
    const xAxisPoint = this._centerPoint
      .clone()
      .add(new AcGeVector3d(this._width, 0, 0))
    const yAxisPoint = this._centerPoint
      .clone()
      .add(new AcGeVector3d(0, this._height, 0))

    origin.applyMatrix4(matrix)
    xAxisPoint.applyMatrix4(matrix)
    yAxisPoint.applyMatrix4(matrix)

    const xAxis = new AcGeVector3d(
      xAxisPoint.x - origin.x,
      xAxisPoint.y - origin.y,
      0
    )
    const yAxis = new AcGeVector3d(
      yAxisPoint.x - origin.x,
      yAxisPoint.y - origin.y,
      0
    )
    const yScale = this._height !== 0 ? yAxis.length() / this._height : 1

    this._centerPoint.copy(origin)
    this._width = xAxis.length()
    this._height = yAxis.length()
    this._viewHeight *= yScale
    return this
  }

  /**
   * Renders the viewport entity using the specified renderer.
   *
   * The viewport is drawn as a rectangular border when the following conditions are met:
   * - The viewport entity is not in model space (i.e., it's in paper space)
   * - The viewport ID number is greater than 1 (not the default system viewport)
   *
   * In paper space layouts, there is always a system-defined "default" viewport that exists as
   * the bottom-most item. This viewport doesn't show any entities and is mainly for internal
   * AutoCAD purposes. The viewport ID number of this system-defined "default" viewport is 1.
   *
   * @param renderer - The renderer to use for drawing the viewport
   * @returns A render group containing the viewport border lines, or undefined if not drawn
   */
  subWorldDraw(renderer: AcGiRenderer) {
    // Draw a rectangle if meeting the following conditions:
    // - viewport entity isn't in model space
    // - viewport id number is greater than 1
    //
    // In paper space layouts, there is always a system-defined "default" viewport that exists as
    // the bottom-most item. This viewport doesn't show any entities and is mainly for internal
    // AutoCAD purposes. The viewport id number of this system-defined "default" viewport is 1.
    if (
      this._number > 1 &&
      this.ownerId != this.database.tables.blockTable.modelSpace.objectId
    ) {
      const viewport = this.toGiViewport()
      const group = renderer.group(this.createViewportRect(viewport, renderer))
      return group
    }
    return undefined
  }

  /**
   * Converts this AcDbViewport to an AcGiViewport for rendering purposes.
   *
   * This method creates a graphic interface viewport object that contains all the
   * necessary properties for rendering the viewport in the graphics system.
   *
   * @returns An AcGiViewport instance with all viewport properties copied
   */
  toGiViewport() {
    const viewport = new AcGiViewport()
    viewport.id = this.objectId
    viewport.groupId = this.ownerId
    viewport.number = this.number
    viewport.centerPoint = this.centerPoint
    viewport.width = this.width
    viewport.height = this.height
    viewport.viewHeight = this.viewHeight
    viewport.viewCenter = this.viewCenter
    viewport.viewTarget = this.viewTarget
    viewport.viewTwistAngle = this.viewTwistAngle
    viewport.frozenLayerIds = this.frozenLayerIds
    const frozenLayers: string[] = []
    const layerTable = this.database?.tables.layerTable
    if (layerTable) {
      for (const id of this.frozenLayerIds) {
        const layer = layerTable.getIdAt(id)
        if (layer) {
          frozenLayers.push(layer.name)
        }
      }
    }
    viewport.frozenLayers = frozenLayers
    const annotationScale = acdbGetViewportAnnotationScale(this)
    if (annotationScale) {
      viewport.annotationScaleName = annotationScale.scaleName
      viewport.annotationScaleFactor = annotationScale.scaleFactor
    }
    return viewport
  }

  /**
   * Creates the rectangular border lines for the viewport.
   *
   * This private method generates four line entities that form a rectangle representing
   * the viewport's boundary. The rectangle is centered on the viewport's center point
   * and has dimensions specified by the viewport's width and height.
   *
   * @param viewport - The graphic interface viewport containing rendering properties
   * @param renderer - The renderer to use for creating the line entities
   * @returns An array of line entities forming the viewport border
   * @private
   */
  private createViewportRect(viewport: AcGiViewport, renderer: AcGiRenderer) {
    const lines: AcGiEntity[] = []
    lines.push(
      renderer.lines([
        new AcGePoint2d(
          viewport.centerPoint.x - viewport.width / 2,
          viewport.centerPoint.y - viewport.height / 2
        ),
        new AcGePoint2d(
          viewport.centerPoint.x + viewport.width / 2,
          viewport.centerPoint.y - viewport.height / 2
        )
      ])
    )
    lines.push(
      renderer.lines([
        new AcGePoint2d(
          viewport.centerPoint.x + viewport.width / 2,
          viewport.centerPoint.y - viewport.height / 2
        ),
        new AcGePoint2d(
          viewport.centerPoint.x + viewport.width / 2,
          viewport.centerPoint.y + viewport.height / 2
        )
      ])
    )
    lines.push(
      renderer.lines([
        new AcGePoint2d(
          viewport.centerPoint.x + viewport.width / 2,
          viewport.centerPoint.y + viewport.height / 2
        ),
        new AcGePoint2d(
          viewport.centerPoint.x - viewport.width / 2,
          viewport.centerPoint.y + viewport.height / 2
        )
      ])
    )
    lines.push(
      renderer.lines([
        new AcGePoint2d(
          viewport.centerPoint.x - viewport.width / 2,
          viewport.centerPoint.y + viewport.height / 2
        ),
        new AcGePoint2d(
          viewport.centerPoint.x - viewport.width / 2,
          viewport.centerPoint.y - viewport.height / 2
        )
      ])
    )
    return lines
  }

  private moveGripAt(gripIndex: number, offset: AcGeVector2dLike) {
    switch (gripIndex) {
      case 0:
        this._centerPoint.add(offset)
        break
      case 1:
      case 2:
      case 3:
      case 4: {
        const halfWidth = this.width / 2
        const halfHeight = this.height / 2
        const cx = this._centerPoint.x
        const cy = this._centerPoint.y
        const corners: Record<number, { x: number; y: number }> = {
          1: { x: cx - halfWidth, y: cy - halfHeight },
          2: { x: cx + halfWidth, y: cy - halfHeight },
          3: { x: cx + halfWidth, y: cy + halfHeight },
          4: { x: cx - halfWidth, y: cy + halfHeight }
        }
        const oppositeCornerIndex =
          gripIndex === 1 ? 3 : gripIndex === 2 ? 4 : gripIndex === 3 ? 1 : 2
        const moved = corners[gripIndex]
        const fixed = corners[oppositeCornerIndex]
        moved.x += offset.x
        moved.y += offset.y
        this._centerPoint.x = (moved.x + fixed.x) / 2
        this._centerPoint.y = (moved.y + fixed.y) / 2
        this.width = Math.abs(fixed.x - moved.x)
        this.height = Math.abs(fixed.y - moved.y)
        break
      }
      default:
        break
    }
  }
}
