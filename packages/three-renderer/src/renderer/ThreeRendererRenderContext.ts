import {
  GRAPHICS_INTERFACE_DARK_THEME_FOREGROUND,
  GRAPHICS_INTERFACE_LIGHT_THEME_FOREGROUND,
  GraphicsInterfaceContext,
  graphicsInterfaceIsLightBackground
} from '@mlightcad/graphic-interface'

import {
  alwaysBatchDrawPolicy,
  ThreeRendererBatchDrawPolicy} from '../draw/ThreeRendererBatchDrawPolicy'
import { ThreeRendererStyleManager } from '../style/ThreeRendererStyleManager'

/**
 * Per-renderer shared services passed into drawable objects during conversion.
 *
 * Bundles material/style access with scene-graph policies so entity instances
 * only hold one reference while each concern stays in its own module.
 * Extends {@link GraphicsInterfaceContext} so {@link GraphicsInterfaceRenderer.context} can carry the
 * background-dependent colour resolution state.
 *
 * Defaults to {@link alwaysBatchDrawPolicy} so entities merge in
 * {@link ThreeRendererBatchedGroup} whenever possible. Large-coordinate precision is
 * handled at render time by relative-to-eye rebasing in {@link ThreeRendererRenderer}.
 * Inject {@link defaultBatchDrawPolicy} only when you need the legacy
 * coordinate-threshold unbatch path for testing or compatibility.
 */
export class ThreeRendererRenderContext extends GraphicsInterfaceContext {
  readonly styleManager: ThreeRendererStyleManager
  batchDrawPolicy: ThreeRendererBatchDrawPolicy

  /**
   * When `true` (default), {@link ThreeRendererGroup} glyph `asyncDraw` returns to the
   * event loop every few dozen milliseconds so a browser can paint.
   * Headless export sets this to `false` so that yield does not add timer delay.
   */
  yieldDuringAsyncDraw = true

  constructor(
    styleManager: ThreeRendererStyleManager = new ThreeRendererStyleManager(),
    batchDrawPolicy: ThreeRendererBatchDrawPolicy = alwaysBatchDrawPolicy
  ) {
    super()
    this.styleManager = styleManager
    this.batchDrawPolicy = batchDrawPolicy
  }

  /**
   * Refreshes background-dependent fields from the canvas background colour.
   */
  syncBackgroundColor(backgroundColor: number): void {
    this.backgroundIsDark = !graphicsInterfaceIsLightBackground(backgroundColor)
    this.foregroundOnDark = GRAPHICS_INTERFACE_DARK_THEME_FOREGROUND
    this.foregroundOnLight = GRAPHICS_INTERFACE_LIGHT_THEME_FOREGROUND
  }
}
