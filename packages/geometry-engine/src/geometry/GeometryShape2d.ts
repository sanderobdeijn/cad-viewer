import { GeometryBox2d, GeometryMatrix2d, GeometryVector2dLike } from '../math'
import { GeometryShape } from './GeometryShape'

/**
 * Abstract base class for all kinds of 2d shapes.
 */
export abstract class GeometryShape2d extends GeometryShape {
  /**
   * The bounding box of this shape
   */
  private _box?: GeometryBox2d

  /**
   * Return new shape translated by given vector.
   */
  translate(v: GeometryVector2dLike): this {
    return this.transform(new GeometryMatrix2d().makeTranslation(v.x, v.y))
  }

  /**
   * Transforms the entity by applying the input matrix.
   * @param matrix Input transformation matrix
   */
  abstract transform(matrix: GeometryMatrix2d): this

  /**
   * Return a deep-cloned copy of this 2d shape.
   */
  abstract clone(): GeometryShape2d

  /**
   * The bounding box of this shape. Because it is a time-consuming operation to calculate the bounding
   * box of one shape, the bounding box value is cached. It will be calculated again lazily once there
   * are any changes to properties of this shape.
   */
  get box() {
    if (this._box == null || this._boundingBoxNeedsUpdate) {
      this._box = this.calculateBoundingBox()
      this._boundingBoxNeedsUpdate = false
    }
    return this._box
  }

  /**
   * Return true if this shape contains the specified shape
   */
  protected abstract calculateBoundingBox(): GeometryBox2d
}
