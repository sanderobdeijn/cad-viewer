import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'
import * as THREE from 'three'

const _vector1 = /*@__PURE__*/ new THREE.Vector3()

/**
 * Internal utility class to handle buffer geometry.
 * @internal
 */
export class ThreeRendererBufferGeometryUtil {
  /**
   * Release memeory occupied by buffer geometry
   * @param geometry
   */
  public static release(geometry: THREE.BufferGeometry) {
    geometry.index = null
    geometry.attributes = {}
  }

  /**
   * Converts InterleavedBufferAttribute to BufferAttribute, because mergeGeometries doesn't support InterleavedBufferAttribute.
   * If it is supported by Three.js one day, we should remove this method.
   */
  public static tryConvertInterleavedBufferAttributes(
    geometry: THREE.BufferGeometry
  ) {
    if (!geometry || !geometry.attributes) {
      return
    }
    Object.keys(geometry.attributes).forEach(key => {
      const val = geometry.attributes[key]
      if (val instanceof THREE.InterleavedBufferAttribute) {
        const bufferAttr = val.clone() // returns THREE.BufferAttribute
        geometry.attributes[key] = bufferAttr
      }
    })
  }

  static createBufferGeometryByPoints(points: GeometryPoint2dLike[]) {
    const geometry = new THREE.BufferGeometry()
    const position = new Float32Array(points.length * 3)
    const indices = new Uint16Array((points.length - 1) * 2)
    points.forEach((point, index) => {
      let startIndex = index * 3
      position[startIndex] = point.x
      position[startIndex + 1] = point.y
      position[startIndex + 2] = 0
      if (index > 0) {
        startIndex = (index - 1) * 2
        indices[startIndex] = index - 1
        indices[startIndex + 1] = index
      }
    })
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(position, 3)
    )
    geometry.setIndex(new THREE.Uint16BufferAttribute(indices, 1))
    return geometry
  }

  /**
   * Apply translation and rotation around z-axis to 2d points in the specified buffer geometry
   * @param geometry Input buffer geoemtry to apply translation and rotation
   * @param translation Input translation to apply
   * @param rotationZ Input roatation (in radians) around z-axis to apply
   * @param scale Input scale factor
   */
  static apply2dTransform(
    geometry: THREE.BufferGeometry,
    translation: THREE.Vector2,
    rotationZ: number = 0,
    scale: number = 1
  ) {
    const positionAttribute = geometry.attributes.position // Access vertex positions
    const itemSize = positionAttribute.itemSize
    const array = positionAttribute.array // Direct access to Float32Array for faster processing

    if (rotationZ != 0) {
      const cosAngle = Math.cos(rotationZ)
      const sinAngle = Math.sin(rotationZ)

      // Loop through all vertex positions (x, y) in the array
      for (let i = 0; i < array.length; i += itemSize) {
        const x = array[i]
        const y = array[i + 1]

        // Apply 2D rotation around Z-axis
        const xNew = x * cosAngle - y * sinAngle
        const yNew = x * sinAngle + y * cosAngle

        // Apply translation
        array[i] = xNew * scale + translation.x // Update x coordinate
        array[i + 1] = yNew * scale + translation.y // Update y coordinate
        // No need to modify array[i + 2], which is z (remains 0)
      }
    } else {
      // Loop through all vertex positions (x, y) in the array
      for (let i = 0; i < array.length; i += itemSize) {
        // Apply translation
        array[i] = array[i] * scale + translation.x // Update x coordinate
        array[i + 1] += array[i + 1] * scale + translation.y // Update y coordinate
        // No need to modify array[i + 2], which is z (remains 0)
      }
    }

    // Mark the position attribute as needing update
    positionAttribute.needsUpdate = true

    return geometry
  }

  /**
   * Apply translation and rotation to 2d points in the specified buffer geometry
   * @param geometry Input buffer geoemtry to apply translation and rotation
   * @param translation Input translation to apply
   * @param rotation Input roatation (in radians) around x-axis, y-axis, and z-axis
   */
  static apply3dTransform(
    geometry: THREE.BufferGeometry,
    translation: THREE.Vector3,
    rotation: THREE.Vector3
  ) {
    const positionAttribute = geometry.attributes.position // Access vertex positions
    const itemSize = positionAttribute.itemSize
    const array = positionAttribute.array // Direct access to Float32Array for faster processing

    const cosX = Math.cos(rotation.x)
    const sinX = Math.sin(rotation.x)

    const cosY = Math.cos(rotation.y)
    const sinY = Math.sin(rotation.y)

    const cosZ = Math.cos(rotation.z)
    const sinZ = Math.sin(rotation.z)

    // Loop through all vertex positions (x, y, z) in the array
    for (let i = 0; i < array.length; i += itemSize) {
      let x = array[i]
      let y = array[i + 1]
      let z = array[i + 2]

      // Rotation around X-axis
      let yNew = y * cosX - z * sinX
      let zNew = y * sinX + z * cosX
      y = yNew
      z = zNew

      // Rotation around Y-axis
      let xNew = x * cosY + z * sinY
      zNew = -x * sinY + z * cosY
      x = xNew
      z = zNew

      // Rotation around Z-axis
      xNew = x * cosZ - y * sinZ
      yNew = x * sinZ + y * cosZ
      x = xNew
      y = yNew

      // Apply translation
      array[i] = x + translation.x // Update x coordinate
      array[i + 1] = y + translation.y // Update y coordinate
      array[i + 2] = z + translation.z // Update z coordinate
    }

    // Mark the position attribute as needing update
    positionAttribute.needsUpdate = true

    return geometry
  }

  /**
   * Returns true when all coordinates of a 3D point are finite.
   */
  static isFinitePoint(point: GeometryPoint2dLike | null | undefined): boolean {
    return !!point && Number.isFinite(point.x) && Number.isFinite(point.y)
  }

  /**
   * Returns true when every value in the geometry position attribute is finite.
   */
  static hasFinitePositions(
    geometry: THREE.BufferGeometry | null | undefined
  ): boolean {
    const position = geometry?.getAttribute('position')
    if (!position || position.count === 0) {
      return true
    }

    const array = position.array as ArrayLike<number>
    for (let index = 0; index < array.length; index++) {
      if (!Number.isFinite(array[index])) {
        return false
      }
    }
    return true
  }

  /**
   * Computes a bounding box only when position data is finite.
   *
   * Returns null for invalid geometry instead of letting THREE.js warn on NaN
   * inputs during CAD file conversion.
   */
  static safeComputeBoundingBox(
    geometry: THREE.BufferGeometry,
    target?: THREE.Box3
  ): THREE.Box3 | null {
    if (!ThreeRendererBufferGeometryUtil.hasFinitePositions(geometry)) {
      geometry.boundingBox = null
      return null
    }

    if (target) {
      geometry.boundingBox = target
    }
    geometry.computeBoundingBox()

    const box = geometry.boundingBox
    if (
      !box ||
      !Number.isFinite(box.min.x) ||
      !Number.isFinite(box.min.y) ||
      !Number.isFinite(box.min.z) ||
      !Number.isFinite(box.max.x) ||
      !Number.isFinite(box.max.y) ||
      !Number.isFinite(box.max.z)
    ) {
      geometry.boundingBox = null
      return null
    }

    return box
  }

  /**
   * Computes a bounding sphere only when position data is finite.
   *
   * Returns null for invalid geometry instead of letting THREE.js warn on NaN
   * inputs during CAD file conversion.
   */
  static safeComputeBoundingSphere(
    geometry: THREE.BufferGeometry,
    target?: THREE.Sphere
  ): THREE.Sphere | null {
    const box = ThreeRendererBufferGeometryUtil.safeComputeBoundingBox(geometry)
    if (!box) {
      geometry.boundingSphere = null
      return null
    }

    const sphere = target ?? new THREE.Sphere()
    box.getBoundingSphere(sphere)
    geometry.boundingSphere = sphere
    return sphere
  }

  /**
   * Drops indexed primitives that reference vertices with non-finite coordinates.
   *
   * @returns `true` when at least one primitive remains.
   */
  static sanitizeGeometryPositions(
    geometry: THREE.BufferGeometry,
    indexStride: 2 | 3 = 2
  ): boolean {
    const position = geometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined
    if (!position || position.count === 0) {
      return false
    }

    if (ThreeRendererBufferGeometryUtil.hasFinitePositions(geometry)) {
      return true
    }

    const isFiniteVertex = (vertex: number) => {
      const base = vertex * position.itemSize
      for (let component = 0; component < position.itemSize; component++) {
        if (!Number.isFinite(position.array[base + component])) {
          return false
        }
      }
      return true
    }

    const index = geometry.getIndex()
    if (!index) {
      const validVertices: number[] = []
      for (let vertex = 0; vertex < position.count; vertex++) {
        if (isFiniteVertex(vertex)) {
          validVertices.push(vertex)
        }
      }
      if (validVertices.length === 0) {
        return false
      }
      const array = new Float32Array(validVertices.length * position.itemSize)
      validVertices.forEach((vertex, targetVertex) => {
        const sourceBase = vertex * position.itemSize
        const targetBase = targetVertex * position.itemSize
        for (let component = 0; component < position.itemSize; component++) {
          array[targetBase + component] = position.array[sourceBase + component]
        }
      })
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(array, position.itemSize)
      )
      return true
    }

    const validIndices: number[] = []
    for (
      let offset = 0;
      offset + indexStride <= index.count;
      offset += indexStride
    ) {
      let valid = true
      for (let component = 0; component < indexStride; component++) {
        if (!isFiniteVertex(index.getX(offset + component))) {
          valid = false
          break
        }
      }
      if (valid) {
        for (let component = 0; component < indexStride; component++) {
          validIndices.push(index.getX(offset + component))
        }
      }
    }

    if (validIndices.length === 0) {
      return false
    }

    const IndexArray = validIndices.some(index => index > 65535)
      ? Uint32Array
      : Uint16Array
    geometry.setIndex(
      new THREE.BufferAttribute(new IndexArray(validIndices), 1)
    )
    return true
  }

  /**
   * Applies a matrix to geometry positions without triggering THREE.js NaN
   * bounding-box warnings on corrupt CAD vertex data.
   *
   * @returns `false` when no finite positions remain after sanitization.
   */
  static safeApplyMatrix4(
    geometry: THREE.BufferGeometry,
    matrix: THREE.Matrix4,
    indexStride: 2 | 3 = 2
  ): boolean {
    geometry.boundingBox = null
    geometry.boundingSphere = null
    if (
      !ThreeRendererBufferGeometryUtil.sanitizeGeometryPositions(geometry, indexStride)
    ) {
      return false
    }

    const position = geometry.getAttribute('position') as THREE.BufferAttribute
    for (let vertex = 0; vertex < position.count; vertex++) {
      _vector1.fromBufferAttribute(position, vertex)
      _vector1.applyMatrix4(matrix)
      position.setXYZ(vertex, _vector1.x, _vector1.y, _vector1.z)
    }
    position.needsUpdate = true
    return true
  }
}
