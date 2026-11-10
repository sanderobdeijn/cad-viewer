import { GeometryMatrix2d } from '@mlightcad/geometry-engine'
import * as THREE from 'three'

/**
 * Util class for Threejs Matrix
 * @internal
 */
export class ThreeRendererMatrixUtil {
  /** Converts a 2D affine matrix to a Three.js matrix that keeps Z unchanged. */
  static createMatrix4(matrix: GeometryMatrix2d) {
    const e = matrix.elements
    return new THREE.Matrix4(
      e[0],
      e[3],
      0,
      e[6],
      e[1],
      e[4],
      0,
      e[7],
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    )
  }
}
