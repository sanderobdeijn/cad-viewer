/**
 * Axis-aligned rectangle in CSS pixels with origin at the top-left of the
 * canvas (or host). Used for overlay viewports, scissor conversion, and
 * loupe layout.
 */
export interface ThreeRendererCssRect {
  /** Left edge in CSS pixels. */
  x: number
  /** Top edge in CSS pixels. */
  y: number
  /** Width in CSS pixels. */
  width: number
  /** Height in CSS pixels. */
  height: number
}

/**
 * Converts a CSS top-left rectangle to WebGL / Three.js viewport coordinates
 * (origin at the bottom-left of the canvas).
 *
 * Three.js `setViewport` / `setScissor` take these CSS-pixel values and apply
 * `pixelRatio` internally.
 *
 * @param rect - Rectangle in CSS pixels, origin top-left.
 * @param canvasCssHeight - Canvas CSS height (same space as `rect.y`).
 * @returns The same rectangle with `y` measured from the canvas bottom.
 */
export function threeRendererCssTopLeftRectToGl(
  rect: ThreeRendererCssRect,
  canvasCssHeight: number
): ThreeRendererCssRect {
  return {
    x: rect.x,
    y: canvasCssHeight - rect.y - rect.height,
    width: rect.width,
    height: rect.height
  }
}
