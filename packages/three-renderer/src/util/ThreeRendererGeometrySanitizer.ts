import {
  GeometryCircularArc2d,
  GeometryEllipseArc2d,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'
import type { GraphicsInterfaceDrawable } from '@mlightcad/graphic-interface'

import { ThreeRendererBufferGeometryUtil } from './ThreeRendererBufferGeometryUtil'

const reportedIssues = new Set<string>()

export interface ThreeRendererGeometrySanitizerContext {
  currentDrawingEntity?: GraphicsInterfaceDrawable
}

/**
 * Optional diagnostics for invalid CAD geometry during development.
 *
 * Not used on the normal render path — geometry-engine should prevent
 * non-finite coordinates. Call these helpers manually while investigating
 * a drawing, or from tests.
 */
export class ThreeRendererGeometrySanitizer {
  static isFinitePoint(point: GeometryPoint2dLike | null | undefined): boolean {
    return ThreeRendererBufferGeometryUtil.isFinitePoint(point)
  }

  static filterFinitePoints(
    points: GeometryPoint2dLike[],
    context?: ThreeRendererGeometrySanitizerContext,
    source = 'lines'
  ): GeometryPoint2dLike[] {
    const filtered = points.filter(point =>
      ThreeRendererGeometrySanitizer.isFinitePoint(point)
    )
    if (filtered.length !== points.length) {
      ThreeRendererGeometrySanitizer.reportIssue(
        context,
        source,
        `dropped ${points.length - filtered.length} non-finite point(s)`
      )
    }
    return filtered
  }

  static filterFiniteLineSegments(
    array: Float32Array,
    itemSize: number,
    indices: Uint16Array,
    context?: ThreeRendererGeometrySanitizerContext,
    source = 'lineSegments'
  ): { array: Float32Array; indices: Uint16Array } | null {
    const vertexCount = Math.floor(array.length / itemSize)
    const vertexValid = new Uint8Array(vertexCount)
    for (let vertex = 0; vertex < vertexCount; vertex++) {
      const base = vertex * itemSize
      vertexValid[vertex] =
        Number.isFinite(array[base]) &&
        Number.isFinite(array[base + 1]) &&
        Number.isFinite(array[base + 2] ?? 0)
          ? 1
          : 0
    }

    const validIndices: number[] = []
    for (let index = 0; index + 1 < indices.length; index += 2) {
      const start = indices[index]
      const end = indices[index + 1]
      if (vertexValid[start] && vertexValid[end]) {
        validIndices.push(start, end)
      }
    }

    const droppedVertices =
      vertexCount - vertexValid.reduce((sum, v) => sum + v, 0)
    const droppedSegments = indices.length / 2 - validIndices.length / 2
    if (droppedVertices > 0 || droppedSegments > 0) {
      ThreeRendererGeometrySanitizer.reportIssue(
        context,
        source,
        `dropped ${droppedVertices} vertex(es) and ${droppedSegments} segment(s) with non-finite coordinates`
      )
    }

    if (validIndices.length === 0) {
      return null
    }

    return {
      array,
      indices: new Uint16Array(validIndices)
    }
  }

  /**
   * Rejects circular arcs with a non-finite center or an invalid radius.
   */
  static repairCircularArc(
    arc: GeometryCircularArc2d,
    context?: ThreeRendererGeometrySanitizerContext
  ): GeometryCircularArc2d | null {
    if (!ThreeRendererGeometrySanitizer.isFinitePoint(arc.center)) {
      ThreeRendererGeometrySanitizer.reportIssue(
        context,
        'circularArc',
        'skipped arc with non-finite center'
      )
      return null
    }
    if (!Number.isFinite(arc.radius) || arc.radius <= 0) {
      ThreeRendererGeometrySanitizer.reportIssue(
        context,
        'circularArc',
        `skipped arc with invalid radius (${arc.radius})`
      )
      return null
    }

    return arc
  }

  /**
   * Rejects elliptical arcs with a non-finite center or invalid axis radii.
   */
  static repairEllipseArc(
    arc: GeometryEllipseArc2d,
    context?: ThreeRendererGeometrySanitizerContext
  ): GeometryEllipseArc2d | null {
    if (!ThreeRendererGeometrySanitizer.isFinitePoint(arc.center)) {
      ThreeRendererGeometrySanitizer.reportIssue(
        context,
        'ellipticalArc',
        'skipped ellipse arc with non-finite center'
      )
      return null
    }
    if (
      !Number.isFinite(arc.majorAxisRadius) ||
      arc.majorAxisRadius <= 0 ||
      !Number.isFinite(arc.minorAxisRadius) ||
      arc.minorAxisRadius <= 0
    ) {
      ThreeRendererGeometrySanitizer.reportIssue(
        context,
        'ellipticalArc',
        'skipped ellipse arc with invalid axis radii'
      )
      return null
    }

    return arc
  }

  static reportIssue(
    context: ThreeRendererGeometrySanitizerContext | undefined,
    source: string,
    detail: string
  ) {
    const entity = context?.currentDrawingEntity
    const entityKey = entity
      ? `${entityTypeName(entity)}:${entity.objectId}`
      : 'unknown-entity'
    const key = `${entityKey}:${source}:${detail}`
    if (reportedIssues.has(key)) {
      return
    }
    reportedIssues.add(key)

    const label = entity
      ? `${entityTypeName(entity)} ${entity.objectId}`
      : 'unknown entity'
    console.warn(
      `[ThreeRendererGeometrySanitizer] ${label} ${source}: ${detail}. Upstream entity data is likely invalid.`
    )
  }

  /** Clears deduplicated diagnostic keys; intended for tests. */
  static resetDiagnosticsForTests() {
    reportedIssues.clear()
  }
}

function entityTypeName(entity: GraphicsInterfaceDrawable): string {
  const ctor = entity.constructor as { typeName?: string; name?: string }
  return ctor.typeName ?? ctor.name ?? 'Entity'
}
