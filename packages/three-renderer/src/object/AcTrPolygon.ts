import {
  acdbDrawTessellateOptions,
  AcGiSubEntityTraits,
  GeometryArea2d,
  GeometryIndexNode,
  GeometryPoint2d,
  GeometryPoint2dLike,
  GeometryUtil,
  log
} from '@mlightcad/data-model'
import { GeometryEpsilon, PolyBool } from '@velipso/polybool'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { resolveAnchorFromBox } from '../draw/AcTrBatchDrawPolicy'
import type { AcTrDrawMode } from '../draw/AcTrDrawMode'
import { AcTrRenderContext } from '../renderer/AcTrRenderContext'
import { AcTrBufferGeometryUtil } from '../util/AcTrBufferGeometryUtil'
import { AcTrEntity } from './AcTrEntity'
import { resolveSelfIntersectingFillLoop } from './AcTrFillLoopRepair'

function toVector2(points: GeometryPoint2dLike[]): THREE.Vector2[] {
  return points
    .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
    .map(point => new THREE.Vector2(point.x, point.y))
}

/**
 * True when a hole's first finite vertex lies inside (or on) the outer ring.
 * Used after self-intersect repair splits an outer into several simple regions
 * so each region only receives its own holes.
 */
function isHoleInsideOuter(
  hole: GeometryPoint2dLike[],
  outer: GeometryPoint2dLike[]
): boolean {
  for (const point of hole) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      continue
    }
    return GeometryUtil.isPointInPolygon(point, outer, true)
  }
  return false
}

function hasFillVertices(geometry: THREE.BufferGeometry | undefined): boolean {
  if (!geometry) {
    return false
  }
  const position = geometry.getAttribute('position')
  return !!position && position.count > 0
}

/**
 * Bounding-box center of tessellated fill loops in float64 WCS.
 * Used as the origin-shift so float32 positions stay precise at large survey
 * coordinates.
 */
function computeLocalOriginFromLoops(
  loops: GeometryPoint2dLike[][]
): THREE.Vector3 | undefined {
  const box = new THREE.Box3()
  let hasPoint = false
  for (const loop of loops) {
    for (const point of loop) {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        continue
      }
      box.expandByPoint(_tmpPoint.set(point.x, point.y, 0))
      hasPoint = true
    }
  }
  if (!hasPoint || box.isEmpty()) {
    return undefined
  }
  return box.getCenter(new THREE.Vector3())
}

/** Returns fill loops translated so `origin` becomes the local (0,0). */
function offsetLoops(
  loops: GeometryPoint2d[][],
  origin: THREE.Vector3
): GeometryPoint2d[][] {
  return loops.map(loop =>
    loop.map(
      point => new GeometryPoint2d(point.x - origin.x, point.y - origin.y)
    )
  )
}

const _tmpPoint = /*@__PURE__*/ new THREE.Vector3()

export class AcTrPolygon extends AcTrEntity {
  constructor(
    area: GeometryArea2d,
    traits: AcGiSubEntityTraits,
    context: AcTrRenderContext
  ) {
    super(context)

    const tessellateOptions = acdbDrawTessellateOptions({ context })
    const pointBoundaries = area.tessellate(tessellateOptions)
    // Reuse sampled loops so buildHierarchy does not tessellate a second time.
    const hierarchy = (
      Object.create(area, {
        tessellate: { value: () => pointBoundaries }
      }) as GeometryArea2d
    ).buildHierarchy(tessellateOptions)
    const hasRenderableBoundaries = pointBoundaries.some(
      loop => loop.length >= 3
    )

    // Offset tessellated loops in float64 *before* THREE.ShapeGeometry writes
    // Float32Array positions. At |x| ≈ 3.85e7 the float32 ULP is ~4 drawing
    // units, so a wide-polyline half-width of 1.05 collapses if WCS is stored
    // first and rebased afterwards (cad-viewer#724).
    const localOrigin = computeLocalOriginFromLoops(pointBoundaries)
    const boundariesForGeometry = localOrigin
      ? offsetLoops(pointBoundaries, localOrigin)
      : pointBoundaries

    const geometries: THREE.BufferGeometry[] = []
    this.buildFillGeometry(boundariesForGeometry, hierarchy, geometries)

    let geometry: THREE.BufferGeometry | undefined
    if (geometries.length === 1) {
      geometry = geometries[0]
    } else if (geometries.length > 1) {
      geometry = mergeGeometries(geometries) ?? undefined
    }

    if (geometry && hasFillVertices(geometry)) {
      const boundingBox =
        AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
      if (!boundingBox) {
        log.warn('Skipped fill with invalid geometry coordinates')
        geometry.dispose()
        return
      }
      this.wcsBbox = localOrigin
        ? boundingBox.clone().translate(localOrigin)
        : boundingBox

      const material = this.styleManager.getFillMaterial(traits)
      const mesh = new THREE.Mesh(geometry, material)
      if (localOrigin) {
        mesh.position.set(localOrigin.x, localOrigin.y, localOrigin.z)
      }
      this.add(mesh)
      this.finalizeLeafDrawables()
    } else if (hasRenderableBoundaries) {
      log.warn('Failed to convert fill boundaries!')
    }
  }

  override resolveDrawMode(): AcTrDrawMode {
    return this.batchDrawPolicy.resolveDrawMode({
      anchor: resolveAnchorFromBox(this.wcsBbox)
    })
  }

  private buildFillGeometry(
    pointBoundaries: GeometryPoint2d[][],
    node: GeometryIndexNode,
    geometries: THREE.BufferGeometry[]
  ) {
    if (node.children.length === 0) {
      return
    }
    const noHoles: number[] = []
    const holes = new Map<number, number[]>()
    node.children.forEach(child => {
      if (child.children.length === 0) {
        noHoles.push(child.index)
      } else {
        holes.set(
          child.index,
          child.children.map(child => child.index)
        )
      }
    })

    const createGeometry = (shape: THREE.Shape) => {
      try {
        const geom = new THREE.ShapeGeometry(shape)
        if (!AcTrBufferGeometryUtil.hasFinitePositions(geom)) {
          geom.dispose()
          return
        }
        if (geom.hasAttribute('uv')) {
          geom.deleteAttribute('uv')
        }
        if (geom.hasAttribute('normal')) {
          geom.deleteAttribute('normal')
        }
        geometries.push(geom)
      } catch (_error) {
        log.warn(
          `Triangulate shape error: ${shape
            .getPoints()
            .map(v => v.toArray())
            .toString()}`
        )
      }
    }

    noHoles.forEach(index => {
      const points = pointBoundaries[index]
      if (points.length < 3) {
        return
      }
      // Fill loops may self-intersect (T-junctions without a shared
      // vertex). Earcut then fills the concave exterior — repair first.
      for (const region of resolveSelfIntersectingFillLoop(points)) {
        if (region.length < 3) {
          continue
        }
        createGeometry(new THREE.Shape(toVector2(region)))
      }
    })

    for (const pair of holes) {
      const outerPoints = pointBoundaries[pair[0]]
      if (outerPoints.length < 3) {
        continue
      }
      // Merge overlapping holes once (shared by every repaired outer region).
      // ShapeGeometry/earcut must not receive overlapping hole paths (#744).
      const holePaths = this.buildMergedHolePaths(pointBoundaries, pair[1])
      // Same self-intersection repair as the no-hole path. If the outer splits
      // into several simple regions, only attach holes that lie inside each
      // region — foreign holes corrupt earcut triangulation.
      const outerRegions = resolveSelfIntersectingFillLoop(outerPoints)
      for (const outerRegion of outerRegions) {
        if (outerRegion.length < 3) {
          continue
        }
        const shape = new THREE.Shape(toVector2(outerRegion))
        for (const hole of holePaths) {
          if (hole.length < 3) {
            continue
          }
          if (!isHoleInsideOuter(hole, outerRegion)) {
            continue
          }
          shape.holes.push(new THREE.Path(toVector2(hole)))
        }
        createGeometry(shape)
      }
    }

    node.children.forEach(child => {
      child.children.forEach(grandchild => {
        this.buildFillGeometry(pointBoundaries, grandchild, geometries)
      })
    })
  }

  /**
   * Build hole rings for an outer, unioning overlapping hole components (#744).
   */
  private buildMergedHolePaths(
    pointBoundaries: GeometryPoint2d[][],
    holeIndices: number[]
  ): GeometryPoint2dLike[][] {
    const paths: GeometryPoint2dLike[][] = []
    const vec2Array = (vecs: GeometryPoint2d[]) =>
      vecs.map(p => p.toArray() as [number, number])
    const needMergeHolesArr = this.findIntersectHole(
      pointBoundaries,
      holeIndices
    )
    needMergeHolesArr.forEach(mergeArr => {
      const validHoles = mergeArr.filter(
        index => pointBoundaries[index].length >= 3
      )
      let epsilon = 1e-6
      let mergedOk = false
      try {
        if (validHoles.length === 0) {
          // nothing to merge
        } else if (validHoles.length === 1) {
          paths.push(pointBoundaries[validHoles[0]])
          mergedOk = true
        } else {
          // One epsilon / PolyBool for the whole component — mixing
          // GeometryEpsilon across segment build and combine is unreliable.
          epsilon = Math.min(
            ...validHoles.map(index => pointBoundaries[index][0].relativeEps()),
            1e-6
          )
          const polybool = new PolyBool(new GeometryEpsilon(epsilon))
          let acc = polybool.segments({
            regions: [vec2Array(pointBoundaries[validHoles[0]])],
            inverted: false
          })
          for (let i = 1; i < validHoles.length; i++) {
            const next = polybool.segments({
              regions: [vec2Array(pointBoundaries[validHoles[i]])],
              inverted: false
            })
            // Fold into the running union, not only against the first loop.
            acc = polybool.selectUnion(polybool.combine(acc, next))
          }
          const mergedHoles = polybool.polygon(acc)
          if (mergedHoles.regions.length > 0) {
            mergedHoles.regions.forEach((ps: number[][]) => {
              if (ps.length === 0) {
                return
              }
              paths.push(ps.map(p => new GeometryPoint2d(p[0], p[1])))
            })
            mergedOk = true
          } else {
            log.warn('mergedHoles.regions is empty!')
          }
        }
      } catch (error) {
        log.warn(`Polybool error: ${error}, epsilon is ${epsilon}`)
      }
      // Failed or empty union: keep openings open with the original loops
      // instead of dropping the whole component.
      if (!mergedOk) {
        for (const index of validHoles) {
          paths.push(pointBoundaries[index])
        }
      }
    })
    const ignoreHoleIndexArr = needMergeHolesArr.flat()
    // Non-overlapping holes stay as-is.
    for (let i = 0; i < holeIndices.length; i++) {
      const idx = holeIndices[i]
      if (!ignoreHoleIndexArr.includes(idx)) {
        const holePoints = pointBoundaries[idx]
        if (holePoints.length < 3) {
          continue
        }
        paths.push(holePoints)
      }
    }
    return paths
  }

  /**
   * Group hole indices into connected components under pairwise intersection.
   * Only components with two or more holes are returned (those need a boolean
   * union before triangulation).
   */
  private findIntersectHole(
    pointBoundaries: GeometryPoint2dLike[][],
    indexArr: number[]
  ): number[][] {
    const len = indexArr.length
    if (len < 2) {
      return []
    }

    const parent = Array.from({ length: len }, (_, i) => i)
    const find = (i: number): number => {
      let root = i
      while (parent[root] !== root) {
        root = parent[root]
      }
      let cur = i
      while (parent[cur] !== root) {
        const next = parent[cur]
        parent[cur] = root
        cur = next
      }
      return root
    }
    const unite = (a: number, b: number) => {
      const ra = find(a)
      const rb = find(b)
      if (ra !== rb) {
        parent[rb] = ra
      }
    }

    for (let i = 0; i < len; i++) {
      const points1 = pointBoundaries[indexArr[i]]
      for (let j = i + 1; j < len; j++) {
        const points2 = pointBoundaries[indexArr[j]]
        if (GeometryUtil.isPolygonIntersect(points1, points2)) {
          unite(i, j)
        }
      }
    }

    const components = new Map<number, number[]>()
    for (let i = 0; i < len; i++) {
      const root = find(i)
      let group = components.get(root)
      if (!group) {
        group = []
        components.set(root, group)
      }
      group.push(indexArr[i])
    }

    return Array.from(components.values()).filter(group => group.length > 1)
  }
}
