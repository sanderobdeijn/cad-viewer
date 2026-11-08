import { CommonColor } from '@mlightcad/common'
/** Converts an CommonColor to a CSS color string, with rgb() fallback. */
export function threeRendererHtmlCssColor(c: CommonColor): string {
  // Prefer live RGB channels so palette edits are reflected immediately.
  // `cssColor` can lag behind ACI/index mutations on some CommonColor builds.
  if (
    Number.isFinite(c.red) &&
    Number.isFinite(c.green) &&
    Number.isFinite(c.blue)
  ) {
    return `rgb(${c.red}, ${c.green}, ${c.blue})`
  }
  return c.cssColor ?? '#ffffff'
}
