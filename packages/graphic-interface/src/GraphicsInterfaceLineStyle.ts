import { GraphicsInterfaceArrowType } from './GraphicsInterfaceArrowType'
import { GraphicsInterfaceStyleType } from './GraphicsInterfaceStyleType'

/**
 * Line type pattern element
 */
export interface GraphicsInterfaceLineTypePatternElement {
  elementLength: number
  elementTypeFlag: number
  shapeNumber?: number
  styleObjectId?: string
  scale?: number
  rotation?: number
  offsetX?: number
  offsetY?: number
  text?: string
}

/**
 * Arrow style
 */
export interface GraphicsInterfaceArrowStyle {
  /**
   * Arrow type.
   */
  type: GraphicsInterfaceArrowType
  /**
   * The flag to determinate whether the arrow direction is inversed. Default value is false.
   * - true: arrow direction is from the external part of the line to the start or end point of the
   * line like '>------<'.
   * - fase: arrow direction is from the internal part of the line to the start or end point of the
   * line like '<------>'.
   */
  inversed?: boolean
  /**
   * The flag to determinate how to attach arrow to endpoint of the line.
   * - true: append arrow to endpoint of the line
   * - false: overlap arrow with endpoint of the line
   */
  appended?: boolean
  /**
   * Scale factor. Default value is 1.
   */
  scale?: number
  /**
   * The flag whether this arrow is visible.
   */
  visible: boolean
}

/**
 * Line type
 */
export interface GraphicsInterfaceBaseLineStyle {
  /**
   * Line type name
   */
  name: string
  /**
   * Standard flag values (bit-coded values):
   * - 16 = If set, table entry is externally dependent on an xref
   * - 32 = If both this bit and bit 16 are set, the externally dependent xref has been successfully resolved
   * - 64 = If set, the table entry was referenced by at least one entity in the drawing the last time the drawing was edited. (This flag is for the benefit of AutoCAD commands. It can be ignored by most programs that read DXF files and need not be set by programs that write DXF files)
   */
  standardFlag: number
  /**
   * Line type description
   */
  description: string
  /**
   * Total pattern length
   */
  totalPatternLength: number
  /**
   * Line type pattern
   */
  pattern?: GraphicsInterfaceLineTypePatternElement[]
}

/**
 * Line style
 */
export interface GraphicsInterfaceLineStyle extends GraphicsInterfaceBaseLineStyle {
  /**
   * Indicates how the style is determined for this entity.
   *
   * - `ByBlock`: The style is inherited from the block reference containing the entity.
   * - `UserSpecified`: The style is explicitly defined on the entity itself.
   */
  type: GraphicsInterfaceStyleType
}
