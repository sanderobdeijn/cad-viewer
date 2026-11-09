export interface ThreeRendererStyleManagerOptions {
  /**
   * Current canvas background colour, as a 24-bit RGB number.
   *
   * Used by material managers to initialize theme-sensitive colours, such
   * as ACI 7 foreground inversion.
   *
   * Kept in sync with `ThreeRendererView2d.backgroundColor` via
   * `ThreeRendererStyleManager.currentBackgroundColor`.
   *
   * Default is model-space dark background (`GRAPHICS_INTERFACE_MODEL_SPACE_BACKGROUND`).
   */
  currentBackgroundColor: number
}
