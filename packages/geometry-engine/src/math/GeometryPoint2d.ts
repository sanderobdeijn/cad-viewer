import { GeometryVector2d, GeometryVector2dLike } from './GeometryVector2d'

/**
 * The interface representing a point in 2-dimensional space.
 */
export type GeometryPoint2dLike = GeometryVector2dLike

/**
 * The class representing a point in 2-dimensional space.
 */
export class GeometryPoint2d extends GeometryVector2d {
  /**
   * Return a new 2d point with the same x and y values as this one.
   */
  clone() {
    return new GeometryPoint2d(this.x, this.y)
  }

  /**
   * Convert one point array to one number array
   * @param array Input one point array
   * @returns Return converted number array
   */
  static pointArrayToNumberArray(array: GeometryPoint2d[]) {
    const numberArray = new Array<number>(array.length * 2)
    array.forEach((item, index) => {
      item.toArray(numberArray, index * 2)
    })
    return numberArray
  }
}
