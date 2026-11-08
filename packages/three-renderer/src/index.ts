import './types/three-material'

export * from './batch/ThreeRendererBatchedGroup'
export {
  isBatchGeometryActive,
  isBatchGeometryVisible
} from './batch/ThreeRendererBatchedGeometryInfo'
export * from './draw'
export { ThreeRendererBatchedLine } from './batch/ThreeRendererBatchedLine'
export { ThreeRendererBatchedLine2 } from './batch/ThreeRendererBatchedLine2'
export { ThreeRendererBatchedMesh } from './batch/ThreeRendererBatchedMesh'
export { ThreeRendererBatchedPoint } from './batch/ThreeRendererBatchedPoint'
export * from './linetype'
export * from './object/ThreeRendererObject'
export * from './object/ThreeRendererEntity'
export * from './object/ThreeRendererGlyphEntity'
export * from './object/ThreeRendererLineGeometryBuilder'
export * from './object/ThreeRendererGroup'
export * from './html'
export * from './object/ThreeRendererTransientManager'
export * from './object/ThreeRendererPreviewOverlayManager'
export * from './renderer'
export * from './viewport'
export * from './style/ThreeRendererMaterialMetadata'
export { ThreeRendererLinePatternShaders } from './style/ThreeRendererLinePatternShaders'
export {
  ThreeRendererStyleManager,
  type ThreeRendererStyleManagerStats
} from './style/ThreeRendererStyleManager'
export { type ThreeRendererMaterialCacheStats } from './style/ThreeRendererMaterialManager'
export * from './util/ThreeRendererMTextColorUtil'
export { ThreeRendererMatrixUtil } from './util/ThreeRendererMatrixUtil'
export {
  getSceneDrawableUserData,
  markHighlightOverlayGroup,
  patchDrawableMaterialFromCache,
  resolveCachedMaterialRemap,
  syncStyleMaterialIdFromMaterials,
  type ThreeRendererHighlightOverlayGroup,
  type ThreeRendererHighlightOverlayGroupUserData
} from './util/ThreeRendererObjectUserData'
export { isObjectHierarchyVisible } from './util/ThreeRendererVisibility'
