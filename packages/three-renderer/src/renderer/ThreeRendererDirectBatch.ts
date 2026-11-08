import type { GraphicsInterfaceDrawable } from '@mlightcad/graphic-interface'

import { resolveAnchorFromBox } from '../draw/ThreeRendererBatchDrawPolicy'
import type { ThreeRendererEntity } from '../object/ThreeRendererEntity'
import {
  buildAreaGeometry,
  buildLineGeometry,
  buildLineSegmentsGeometry,
  buildOffsetRingDirectGeometry,
  buildPointGeometry,
  isDirectBatchRejectedMaterial,
  type ThreeRendererDirectEntityMeta} from '../object/ThreeRendererLineGeometryBuilder'
import type { ThreeRendererRenderer } from './ThreeRendererRenderer'

/**
 * Whether the entity advertises a single batchable draw primitive.
 * Prefer this over hard-coded `instanceof` lists.
 */
export function isDirectBatchCandidate(entity: GraphicsInterfaceDrawable): boolean {
  return entity.directBatchPrimitive != null
}

/**
 * Builds a direct-batch payload by running the entity's normal
 * {@link GraphicsInterfaceDrawable.worldDraw} path so tessellation stays in `subWorldDraw`.
 *
 * Returns `null` when the entity does not declare a direct primitive, capture
 * misses, materials are unbatchable, or large-coordinate policy forces unbatch.
 */
export function tryBuildDirectEntityMeta(
  entity: GraphicsInterfaceDrawable,
  renderer: ThreeRendererRenderer
): ThreeRendererDirectEntityMeta | null {
  if (entity.directBatchPrimitive == null) {
    return null
  }

  renderer.beginDirectCapture()
  let placeholder: ThreeRendererEntity | undefined
  try {
    placeholder = entity.worldDraw(renderer) as ThreeRendererEntity | undefined
    const payload = renderer.takeDirectCapture()
    if (!payload) {
      return null
    }

    const built = buildFromCapture(payload, renderer)
    if (!built) {
      return null
    }
    if (built.wcsBbox.isEmpty()) {
      built.geometry.dispose()
      return null
    }

    const drawMode = renderer.batchDrawPolicy.resolveDrawMode({
      anchor: resolveAnchorFromBox(built.wcsBbox),
      position: built.position
    })
    if (drawMode === 'unbatch') {
      built.geometry.dispose()
      return null
    }

    return {
      ...built,
      objectId: entity.objectId,
      ownerId: entity.ownerId,
      layerName: entity.layer,
      visible: entity.visibility !== false
    }
  } catch (error) {
    renderer.cancelDirectCapture()
    throw error
  } finally {
    placeholder?.dispose()
  }
}

function buildFromCapture(
  payload: NonNullable<ReturnType<ThreeRendererRenderer['takeDirectCapture']>>,
  renderer: ThreeRendererRenderer
): Omit<
  ThreeRendererDirectEntityMeta,
  'objectId' | 'ownerId' | 'layerName' | 'visible'
> | null {
  const traits = renderer.subEntityTraits

  if (payload.kind === 'lineStrip') {
    const material = renderer.styleManager.getLineMaterial(traits, false)
    if (isDirectBatchRejectedMaterial(material)) {
      return null
    }
    const line = buildLineGeometry(payload.points, material)
    if (!line) {
      return null
    }
    return {
      kind: line.kind === 'fat' ? 'lineFat' : 'lineBasic',
      geometry: line.geometry,
      worldOffset: line.worldOffset,
      wcsBbox: line.wcsBbox,
      material: line.material
    }
  }

  if (payload.kind === 'lineSegments') {
    const material = renderer.styleManager.getLineMaterial(traits, false)
    return buildLineSegmentsGeometry(
      payload.array,
      payload.itemSize,
      payload.indices,
      material
    )
  }

  if (payload.kind === 'point') {
    const material = renderer.styleManager.getPointsMaterial(traits)
    if (isDirectBatchRejectedMaterial(material)) {
      return null
    }
    return buildPointGeometry(payload.point, material)
  }

  if (payload.kind === 'area') {
    const built = buildAreaGeometry(payload.area, traits, renderer.context)
    if (!built) {
      return null
    }
    if (isDirectBatchRejectedMaterial(built.material)) {
      built.geometry.dispose()
      return null
    }
    return built
  }

  if (payload.kind === 'offsetRing') {
    const built = buildOffsetRingDirectGeometry(
      payload.outer,
      payload.inner,
      traits,
      renderer.context
    )
    if (!built) {
      return null
    }
    if (isDirectBatchRejectedMaterial(built.material)) {
      built.geometry.dispose()
      return null
    }
    return built
  }

  return null
}
