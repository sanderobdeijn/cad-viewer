import {
  AcGeBox2d,
  AcGeMatrix2d,
  AcGeMatrix3d,
  AcGeVector2dLike
} from '../math'
import { AcGeShape } from './AcGeShape'

/**
 * Abstract base class for all kinds of 2d shapes.
 */
export abstract class AcGeShape2d extends AcGeShape {
  /**
   * The bounding box of this shape
   */
  private _box?: AcGeBox2d

  /**
   * Return new shape translated by given vector.
   */
  translate(v: AcGeVector2dLike): this {
    return this.transform(new AcGeMatrix2d().makeTranslation(v.x, v.y))
  }

  /**
   * Transforms the entity by applying the input matrix.
   * @param matrix Input transformation matrix
   */
  abstract transform(matrix: AcGeMatrix2d): this

  /**
   * Transforms this shape by the XY affine part of a 4x4 matrix.
   * @param matrix Input transformation matrix
   */
  transform3d(matrix: AcGeMatrix3d): this {
    return this.transform(new AcGeMatrix2d().setFromAffineMatrix4(matrix))
  }

  /**
   * Return a deep-cloned copy of this 2d shape.
   */
  abstract clone(): AcGeShape2d

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
  protected abstract calculateBoundingBox(): AcGeBox2d
}
