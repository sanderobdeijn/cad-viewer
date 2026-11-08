import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'
import * as THREE from 'three'

import type { ThreeRendererMTextEntityTraits } from './ThreeRendererMTextColorUtil'

/**
 * Relative-to-eye flags stored on {@link THREE.Object3D.userData}.
 *
 * @see ThreeRendererRelativeToEyeUtil
 */
export interface ThreeRendererRteObjectUserData {
  /** Shader hook installed for camera-relative rendering. */
  relativeToEyeEnabled?: boolean
  /** Vertex shader uses split translation instead of geometry rebase. */
  useSplitTranslation?: boolean
  /** Local geometry was rebased (or rebase was skipped intentionally). */
  geometryRebased?: boolean
  /** MTEXT layout cache invalidated after geometry rebase. */
  layoutCache?: unknown
}

/**
 * Runtime fields on {@link THREE.Material.userData} for relative-to-eye patching.
 */
export interface ThreeRendererMaterialRuntimeUserData {
  /** Program-cache key written when the material shader is patched. */
  relativeToEyePatchVersion?: string
  /** Compiled shader instance from the latest `onBeforeCompile`. */
  relativeToEyeCompiledShader?: unknown
  /** Batch slot-mask highlight shader patch installed on this material. */
  batchHighlightPatched?: boolean
  /** Persistent highlight uniform bag shared by compiled shader programs. */
  batchHighlightUniforms?: Record<string, { value: unknown }>
}

/**
 * Entity must stay unbatched (image, …).
 */
export type ThreeRendererNoBatchUserData = {
  noBatch?: true
}

/**
 * Pick metadata copied into batched geometry records and leaf drawables.
 */
export interface ThreeRendererPickableObjectUserData {
  bboxIntersectionCheck?: boolean
  isPoint?: boolean
  position?: GeometryPoint2dLike
}

/**
 * Style-manager linkage for drawable leaves before batching.
 */
export interface ThreeRendererStyledDrawableUserData {
  styleMaterialId?: number
  /** Entity colour/layer snapshot for unbatched MTEXT/TEXT placement roots. */
  textEntityTraits?: ThreeRendererMTextEntityTraits
}

/**
 * Database identity stored on {@link ThreeRendererEntity} and descendants.
 */
export interface ThreeRendererEntityIdentityUserData {
  objectId?: string
  ownerId?: string
  layerName?: string
}

/**
 * {@link ThreeRendererEntity} container userData.
 */
export interface ThreeRendererEntityUserData
  extends ThreeRendererEntityIdentityUserData, ThreeRendererRteObjectUserData {
  originalMaterial?: THREE.Material | THREE.Material[]
}

/**
 * When an unbatched drawable is cloned into world space, stores the source
 * world matrix so HTML export can re-align hatch pattern coordinates.
 */
export type ThreeRendererBakedWorldMatrixUserData = {
  bakedWorldMatrix?: number[]
}

/**
 * Marks drawable leaves whose {@link THREE.BufferGeometry} is borrowed from a
 * shared template, such as a repeated linetype glyph. Instance dispose must not
 * release it.
 */
export type ThreeRendererSharedTemplateGeometryUserData = {
  /**
   * When `true`, this leaf aliases geometry owned by a shared source.
   * {@link ThreeRendererEntity.disposeObject} skips `geometry.dispose()` for the leaf.
   */
  sharesTemplateGeometry?: boolean
}

/**
 * Leaf line/mesh/point objects produced by entity conversion, prior to batching.
 */
export type ThreeRendererSceneDrawableUserData = ThreeRendererPickableObjectUserData &
  ThreeRendererStyledDrawableUserData &
  ThreeRendererRteObjectUserData &
  ThreeRendererNoBatchUserData &
  ThreeRendererBakedWorldMatrixUserData &
  ThreeRendererSharedTemplateGeometryUserData

export interface ThreeRendererHighlightUserData {
  objectId?: string
  /**
   * Three.js id of the origin batch this overlay was extracted from.
   *
   * Used to rebind shared packed `attributes`/`index` after batch growth.
   */
  batchedObjectId?: number
  disposeGeometryOnRemove?: boolean
  /** Marks geometry extracted for command preview overlays. */
  previewDrawable?: boolean
}

/**
 * Marks a preview subset container created by {@link ThreeRendererBatchedGroup.createPreviewSubset}.
 */
export interface ThreeRendererPreviewSubsetGroupUserData {
  /** Set to `true` on the subset root group. */
  previewSubsetGroup?: true
}

/**
 * Marks the root group of one command preview overlay.
 */
export interface ThreeRendererEntityPreviewRootUserData {
  /** Set to `true` on preview roots registered with {@link ThreeRendererPreviewOverlayManager}. */
  entityPreviewRoot?: true
}

/**
 * Marks a {@link THREE.Group} that holds transient selection/hover highlight
 * clones instead of source drawing geometry.
 */
export interface ThreeRendererHighlightOverlayGroupUserData {
  highlightOverlayGroup?: true
}

/**
 * Selection or hover overlay container inside {@link ThreeRendererBatchedGroup}.
 */
export type ThreeRendererHighlightOverlayGroup = THREE.Group & {
  userData: ThreeRendererHighlightOverlayGroupUserData
}

/**
 * Temporary highlight clones attached to hover/selection overlay groups.
 */
export type ThreeRendererHighlightObjectUserData = ThreeRendererHighlightUserData &
  ThreeRendererSceneDrawableUserData

/**
 * Packed batch container (`ThreeRendererBatchedLine`, `ThreeRendererBatchedMesh`, …) userData.
 */
export type ThreeRendererBatchedContainerUserData = ThreeRendererRteObjectUserData

/**
 * Full set of optional fields that may appear on renderer {@link THREE.Object3D.userData}.
 *
 * Use role-specific types (`ThreeRendererEntityUserData`, `ThreeRendererSceneDrawableUserData`, …)
 * at assignment sites; this interface is the superset used for safe reads/writes.
 */
export interface ThreeRendererObjectUserDataFields
  extends
    ThreeRendererEntityIdentityUserData,
    ThreeRendererPickableObjectUserData,
    ThreeRendererStyledDrawableUserData,
    ThreeRendererRteObjectUserData,
    ThreeRendererNoBatchUserData,
    ThreeRendererHighlightUserData,
    ThreeRendererHighlightOverlayGroupUserData,
    ThreeRendererPreviewSubsetGroupUserData,
    ThreeRendererEntityPreviewRootUserData {
  originalMaterial?: THREE.Material | THREE.Material[]
}

/** Partial patch accepted when writing userData fields. */
export type ThreeRendererObjectUserDataPatch = Partial<ThreeRendererObjectUserDataFields>

/**
 * {@link THREE.Object3D} with cad-viewer userData typing.
 */
export type ThreeRendererObject3D = THREE.Object3D & {
  userData: ThreeRendererObjectUserDataPatch
}

export function asAcTrObject(object: THREE.Object3D): ThreeRendererObject3D {
  return object as ThreeRendererObject3D
}

export function getObjectUserData(
  object: THREE.Object3D
): ThreeRendererObjectUserDataPatch {
  return asAcTrObject(object).userData
}

export function getMaterialRuntimeUserData(
  material: THREE.Material
): ThreeRendererMaterialRuntimeUserData {
  return material.userData as ThreeRendererMaterialRuntimeUserData
}

export function getSceneDrawableUserData(
  object: THREE.Object3D
): ThreeRendererSceneDrawableUserData {
  return getObjectUserData(object) as ThreeRendererSceneDrawableUserData
}

/**
 * Resolves a style-cache material remap for one drawable material instance.
 */
export function resolveCachedMaterialRemap(
  material: THREE.Material,
  materials: Record<number, THREE.Material>,
  styleMaterialId?: number
): THREE.Material | undefined {
  return (
    materials[material.id] ??
    (styleMaterialId != null ? materials[styleMaterialId] : undefined)
  )
}

/**
 * Keeps {@link ThreeRendererStyledDrawableUserData.styleMaterialId} aligned with drawable materials.
 *
 * Array materials only store a style id when every slot shares the same material id.
 */
export function syncStyleMaterialIdFromMaterials(
  userData: ThreeRendererStyledDrawableUserData,
  material: THREE.Material | THREE.Material[]
): void {
  if (Array.isArray(material)) {
    const ids = new Set(material.map(entry => entry.id))
    if (ids.size === 1) {
      userData.styleMaterialId = material[0].id
      return
    }
    delete userData.styleMaterialId
    return
  }

  userData.styleMaterialId = material.id
}

type ThreeRendererMaterialDrawable = THREE.Mesh | THREE.Line | THREE.LineSegments

/**
 * Patches drawable material slots after the style cache replaces material instances.
 */
export function patchDrawableMaterialFromCache(
  drawable: ThreeRendererMaterialDrawable,
  materials: Record<number, THREE.Material>
): void {
  const userData = getSceneDrawableUserData(drawable)
  const current = drawable.material

  if (Array.isArray(current)) {
    drawable.material = current.map(entry => {
      const remapped = resolveCachedMaterialRemap(
        entry,
        materials,
        userData.styleMaterialId
      )
      return remapped && remapped !== entry ? remapped : entry
    })
    syncStyleMaterialIdFromMaterials(userData, drawable.material)
    return
  }

  const remapped = resolveCachedMaterialRemap(
    current,
    materials,
    userData.styleMaterialId
  )
  if (remapped && remapped !== current) {
    drawable.material = remapped
    syncStyleMaterialIdFromMaterials(userData, remapped)
  }
}

export function getHighlightUserData(
  object: THREE.Object3D
): ThreeRendererHighlightObjectUserData {
  return getObjectUserData(object) as ThreeRendererHighlightObjectUserData
}

/**
 * Reads preview-root flags from one preview overlay group.
 *
 * @param object - Preview overlay root group
 */
export function getEntityPreviewRootUserData(
  object: THREE.Object3D
): ThreeRendererEntityPreviewRootUserData {
  return getObjectUserData(object) as ThreeRendererEntityPreviewRootUserData
}

export function getHighlightOverlayGroupUserData(
  object: THREE.Object3D
): ThreeRendererHighlightOverlayGroupUserData {
  return getObjectUserData(object) as ThreeRendererHighlightOverlayGroupUserData
}

/**
 * Tags one group as a selection/hover highlight overlay container.
 */
export function markHighlightOverlayGroup(
  group: THREE.Group
): ThreeRendererHighlightOverlayGroup {
  const overlay = group as ThreeRendererHighlightOverlayGroup
  overlay.userData.highlightOverlayGroup = true
  return overlay
}

/**
 * Resolves the Object3D that carries MTEXT insertion/rotation from the renderer.
 * Worker output is already the placement root; sync output wraps it under `MText`.
 */
export function resolveMTextRenderRoot(mtext: THREE.Object3D): THREE.Object3D {
  if (mtext.children.length !== 1) {
    return mtext
  }

  const child = mtext.children[0]
  if (
    child instanceof THREE.Mesh ||
    child instanceof THREE.Line ||
    child instanceof THREE.LineSegments
  ) {
    return mtext
  }

  return child
}

/**
 * Copies RTE / no-batch flags from a source drawable onto a highlight clone.
 */
export function copyHighlightObjectFlags(
  source: THREE.Object3D,
  target: THREE.Object3D
): void {
  const sourceData = getObjectUserData(source)
  const targetData = getSceneDrawableUserData(target)

  if (sourceData.useSplitTranslation) {
    targetData.useSplitTranslation = true
  }

  if (sourceData.noBatch) {
    targetData.noBatch = true
  }

  const childCount = Math.min(source.children.length, target.children.length)

  for (let i = 0; i < childCount; i++) {
    copyHighlightObjectFlags(source.children[i], target.children[i])
  }
}
