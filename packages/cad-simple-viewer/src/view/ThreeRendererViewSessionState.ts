import type { ThreeRendererLayoutViewManager } from './ThreeRendererLayoutViewManager'
import type { ThreeRendererScene } from './ThreeRendererScene'

/**
 * GPU and camera state for one parked document session.
 *
 * Owned by {@link ApplicationDocSession} while the shared {@link ThreeRendererView2d} is
 * showing a different document.
 */
export interface ThreeRendererViewSessionState {
  /** Scene graph for this document (layouts, layers, HTML transients). */
  scene: ThreeRendererScene
  /** Per-layout cameras for this document. */
  layoutViewManager: ThreeRendererLayoutViewManager
  /** Layouts that have already received first-visit framing. */
  initializedLayouts: Set<string>
  /** Layouts framed by document-open, not first user visit. */
  externallyFramedLayouts: Set<string>
  /** Layouts currently being batch-converted. */
  loadingLayouts: Set<string>
  /**
   * Missing fonts reported while this document was active.
   * Parked with the session so FontManager's live map can track the active
   * document only; restored when the session becomes active again.
   */
  missedFonts: Record<string, number>
  /** Selected entity ids at the moment the session was parked. */
  selectionIds: string[]
}
