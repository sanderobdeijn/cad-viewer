import * as THREE from 'three'

/**
 * Canonical metadata attached to `THREE.Material.userData` by cad-viewer.
 *
 * `THREE.Material` supports arbitrary `userData`, so this interface defines the
 * strongly-typed contract used by style/material management logic.
 */
export interface ThreeRendererMaterialMetadata {
  /** Internal cache key used by style managers for reverse lookup. */
  materialKey: string
  /** True when color follows foreground inversion rules (ACI 7 behavior). */
  isForeground: boolean
  /** Explicit render-order tier for the batch that owns this material. */
  drawOrder?: number
  /** Culling side used by fill materials. Present only when explicitly set. */
  side?: 'front' | 'back'
}

/**
 * Partial metadata view used for legacy/foreign materials whose userData may be incomplete.
 */
export type ThreeRendererMaterialMetadataPatch = Partial<ThreeRendererMaterialMetadata>

/**
 * Common typed view for CAD renderer materials that carry metadata in `userData`.
 */
export type ThreeRendererMaterial = THREE.Material & {
  userData: ThreeRendererMaterialMetadataPatch
}

/**
 * Casts a THREE material into the CAD typed-material view.
 *
 * This does not mutate the material; it only narrows TypeScript types so
 * all metadata access goes through one shared contract.
 */
export function asAcTrMaterial(material: THREE.Material): ThreeRendererMaterial {
  return material as ThreeRendererMaterial
}

/**
 * Returns typed material metadata stored in `material.userData`.
 */
export function getMaterialMetadata(
  material: THREE.Material
): ThreeRendererMaterialMetadataPatch {
  return asAcTrMaterial(material).userData
}

/**
 * Merges metadata fields into `material.userData` with strong typing.
 */
export function setMaterialMetadata(
  material: THREE.Material,
  patch: ThreeRendererMaterialMetadataPatch
): void {
  Object.assign(getMaterialMetadata(material), patch)
}
