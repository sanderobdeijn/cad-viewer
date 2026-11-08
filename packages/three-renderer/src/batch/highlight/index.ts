export {
  BATCH_SLOT_ID_ATTRIBUTE,
  ensureSlotIdAttribute,
  writeSlotIdRange
} from './ThreeRendererBatchSlotId'
export {
  ThreeRendererBatchHighlightState,
  type ThreeRendererBatchHighlightKind
} from './ThreeRendererBatchHighlightState'
export {
  bindBatchHighlightUniforms,
  installBatchHighlightRenderer,
  patchMaterialForBatchHighlight
} from './ThreeRendererBatchHighlightShaders'
