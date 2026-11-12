import { GeometryVector2d, GeometryVector2dLike } from './GeometryVector2d'

/**
 * The interface representing a point in 2-dimensional space, with the id it
 * has in a model, if any.
 */
export type GeometryPoint2dLike = GeometryVector2dLike & { id?: string }

/**
 * The class representing a point in 2-dimensional space.
 */
export class GeometryPoint2d extends GeometryVector2d {
  /**
   * The id of this point in a model, if any. A model gives one to each point
   * of its shapes and dimensions; other points leave it unset.
   */
  id?: string

  /**
   * Return a new 2d point with the same x, y and id as this one.
   */
  clone() {
    return GeometryPoint2d.from(this)
  }

  /**
   * Return a new 2d point at the given point, keeping its id when it has one.
   * @param point Input point
   */
  static from(point: GeometryPoint2dLike) {
    const result = new GeometryPoint2d(point.x, point.y)
    if (point.id !== undefined) {
      result.id = point.id
    }
    return result
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
