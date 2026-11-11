import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'
import * as THREE from 'three'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

/** Which batch container the built line geometry should append into. */
export type ThreeRendererLineGeometryKind = 'basic'

/** Entity kind for generalized direct-batch metadata. */
export type ThreeRendererDirectEntityKind = 'lineBasic' | 'point'

/**
 * Local-space geometry ready for {@link ThreeRendererBatchedGroup} append or
 * wrapping in an {@link ThreeRendererLine} drawable.
 */
export interface ThreeRendererBuiltLineGeometry {
  kind: ThreeRendererLineGeometryKind
  geometry: THREE.BufferGeometry | LineSegmentsGeometry
  worldOffset: THREE.Vector3
  wcsBbox: THREE.Box3
  material: THREE.Material
}

/** Built geometry for any direct-batch entity kind. */
export interface ThreeRendererBuiltDirectGeometry {
  kind: ThreeRendererDirectEntityKind
  geometry: THREE.BufferGeometry | LineSegmentsGeometry
  worldOffset: THREE.Vector3
  wcsBbox: THREE.Box3
  material: THREE.Material
  /** Point entities only — world position for bbox intersection. */
  position?: GeometryPoint2dLike
}

/** Generalized direct-batch entity metadata (line, point). */
export interface ThreeRendererDirectEntityMeta extends ThreeRendererBuiltDirectGeometry {
  objectId: string
  ownerId: string
  visible: boolean
}

const _point = /*@__PURE__*/ new THREE.Vector3()

/**
 * Returns true for shader materials that cannot direct-batch.
 *
 * @param material - Material resolved for the entity draw.
 * @returns `true` when the material is a shader and must use the drawable path.
 */
export function isDirectBatchRejectedMaterial(
  material: THREE.Material
): boolean {
  return material instanceof THREE.ShaderMaterial
}

/**
 * Builds rebased line geometry from world-space points and a resolved material.
 *
 * Vertices are stored relative to the point-cloud bounding-box center
 * (`worldOffset`) so float32 batch buffers stay precise. The result is indexed
 * `BufferGeometry` for `THREE.LineSegments`.
 *
 * @param points - World-space polyline vertices (at least two).
 * @param material - Resolved line material.
 * @returns Built local-space geometry, or `null` when fewer than two points
 *   are provided.
 */
export function buildLineGeometry(
  points: GeometryPoint2dLike[],
  material: THREE.Material
): ThreeRendererBuiltLineGeometry | null {
  if (points.length < 2) {
    return null
  }

  const worldOffset = computeLocalOrigin(points)
  const maxVertexCount = points.length

  const wcsBbox = computeWcsBboxFromPoints(points)

  const vertices = new Float32Array(maxVertexCount * 3)
  // Exactly one index pair per polyline edge. Allocating maxVertexCount*2 left a
  // trailing (0,0) pair (typed-array zero-fill) that became a phantom zero-length
  // segment after toNonIndexed / LineSegments pairing — visible as duplicate
  // verts in dashed-line batches (e.g. A4107 WSP connectors).
  const indexCount = (maxVertexCount - 1) * 2
  const indices =
    maxVertexCount * 2 > 65535
      ? new Uint32Array(indexCount)
      : new Uint16Array(indexCount)

  for (let i = 0, pos = 0; i < maxVertexCount; i++) {
    const point = points[i]
    vertices[pos++] = point.x - worldOffset.x
    vertices[pos++] = point.y - worldOffset.y
    vertices[pos++] = -worldOffset.z
  }
  for (let i = 0, pos = 0; i < maxVertexCount - 1; i++) {
    indices[pos++] = i
    indices[pos++] = i + 1
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))

  return {
    kind: 'basic',
    geometry,
    worldOffset,
    wcsBbox,
    material
  }
}

/**
 * Builds rebased single-vertex point geometry for {@link ThreeRendererBatchedPoint}.
 *
 * The position attribute is a single `(0,0,0)` vertex; the world location is
 * carried by `worldOffset` / `position` so batch float32 buffers stay precise.
 *
 * @param point - World-space point location.
 * @param material - Resolved point material.
 * @returns Built point geometry with a tiny WCS bbox around `point`.
 */
export function buildPointGeometry(
  point: GeometryPoint2dLike,
  material: THREE.Material
): ThreeRendererBuiltDirectGeometry {
  const worldOffset = new THREE.Vector3(point.x, point.y, 0)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0], 3)
  )
  const epsilon = 1e-6
  const z = 0
  const wcsBbox = new THREE.Box3(
    new THREE.Vector3(point.x - epsilon, point.y - epsilon, z - epsilon),
    new THREE.Vector3(point.x + epsilon, point.y + epsilon, z + epsilon)
  )
  return {
    kind: 'point',
    geometry,
    worldOffset,
    wcsBbox,
    material,
    position: point
  }
}

/**
 * Builds rebased line-segment geometry from packed vertex/index buffers.
 *
 * Filters out degenerate `(0,0)` index pairs, rebases positions to the
 * vertex-cloud bbox center, and selects fat (`lineFat`) or basic
 * (`lineBasic`) output based on whether `material` is a {@link LineMaterial}.
 *
 * @param array - Interleaved vertex attribute data (positions and optional
 *   extra components).
 * @param itemSize - Components per vertex in `array` (at least 3 for xyz).
 * @param indices - Index buffer pairing vertices into line segments.
 * @param material - Resolved line material; pattern shaders are rejected.
 * @returns Built local-space geometry, or `null` for pattern shader materials
 *   or when no valid segments / bbox remain.
 */
export function buildLineSegmentsGeometry(
  array: Float32Array,
  itemSize: number,
  indices: Uint16Array,
  material: THREE.Material
): ThreeRendererBuiltDirectGeometry | null {
  if (isDirectBatchRejectedMaterial(material)) {
    return null
  }

  const filteredIndices: number[] = []
  for (let i = 0; i < indices.length; i += 2) {
    const i1 = indices[i]
    const i2 = indices[i + 1]
    if (i1 === 0 && i2 === 0) {
      continue
    }
    filteredIndices.push(i1, i2)
  }
  if (filteredIndices.length < 2) {
    return null
  }

  const box = new THREE.Box3()
  for (let i = 0; i < array.length; i += itemSize) {
    box.expandByPoint(_point.set(array[i], array[i + 1], array[i + 2] ?? 0))
  }
  if (box.isEmpty()) {
    return null
  }

  const worldOffset = box.getCenter(new THREE.Vector3())
  const wcsBbox = box.clone()

  const rebased = new Float32Array(array.length)
  for (let i = 0; i < array.length; i += itemSize) {
    rebased[i] = array[i] - worldOffset.x
    rebased[i + 1] = array[i + 1] - worldOffset.y
    rebased[i + 2] = (array[i + 2] ?? 0) - worldOffset.z
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(rebased, itemSize)
  )
  geometry.setIndex(
    new THREE.BufferAttribute(new Uint16Array(filteredIndices), 1)
  )

  return {
    kind: 'lineBasic',
    geometry,
    worldOffset,
    wcsBbox,
    material
  }
}

/**
 * Computes the bounding-box center of a world-space point cloud.
 *
 * The center is used as `worldOffset` when storing vertices in local
 * coordinates for float32 batch precision.
 *
 * @param points - World-space points to enclose.
 * @returns Center of the axis-aligned bounding box of `points`.
 */
function computeLocalOrigin(points: GeometryPoint2dLike[]) {
  const box = new THREE.Box3()
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    box.expandByPoint(_point.set(p.x, p.y, 0))
  }
  return box.getCenter(new THREE.Vector3())
}

/**
 * Computes the world-coordinate-system axis-aligned bounding box of a point
 * cloud.
 *
 * @param points - World-space points to enclose.
 * @returns A new {@link THREE.Box3} expanded by every point in `points`.
 */
function computeWcsBboxFromPoints(points: GeometryPoint2dLike[]) {
  const box = new THREE.Box3()
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    box.expandByPoint(_point.set(p.x, p.y, 0))
  }
  return box
}
