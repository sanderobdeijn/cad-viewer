import type { GeometryPoint2d } from '../math'

/**
 * The geometric definition of one dimension.
 */
export interface GeometryDimension {
  /**
   * The kind of dimension, such as `AlignedDimension` or `RadialDimension`
   */
  type: string
  /**
   * The points defining this dimension by name, such as `xLine1Point`
   */
  points: Record<string, GeometryPoint2d>
  /**
   * The text shown on this dimension
   */
  text?: string
  /**
   * The measured value of this dimension
   */
  measurement?: number
}
