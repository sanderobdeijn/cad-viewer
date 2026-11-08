import {
  GeometryPoint2dLike,
  GeometryVector3dLike
} from '@mlightcad/geometry-engine'

/**
 * Describes one AutoCAD SHAPE entity for rendering.
 *
 * A shape references a single glyph from an SHX shape font, identified by
 * {@link name} and/or {@link shapeNumber}.
 */
export interface GraphicsInterfaceShapeData {
  /** Shape name within the SHX font (DXF group 2). */
  name?: string
  /** Numeric shape code within the SHX font. */
  shapeNumber?: number
  /** Shape height (DXF group 40). */
  size: number
  /** Insertion point in WCS coordinates (DXF group 10). */
  position: GeometryPoint2dLike
  /** Rotation relative to the shape OCS X axis, in radians (DXF group 50). */
  rotation?: number
  /** Extrusion/normal vector (DXF groups 210–230). */
  directionVector?: GeometryVector3dLike
  /** Relative X-scale factor (DXF group 41). */
  widthFactor?: number
}
