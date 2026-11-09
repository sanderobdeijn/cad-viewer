import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'

/**
 * One line of text, centred on its position.
 */
export interface GraphicsInterfaceTextData {
  /** The text to draw. */
  text: string
  /** Height of the text in drawing units. */
  height: number
  /** Centre of the text. */
  position: GeometryPoint2dLike
  /** Counter-clockwise rotation around the position, in radians. */
  rotation?: number
}
