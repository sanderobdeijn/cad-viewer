import { AcCmColor } from '@mlightcad/data-model'

/** Converts an AcCmColor to a CSS color string, with rgb() fallback. */
export function acTrHtmlCssColor(c: AcCmColor): string {
  // Prefer live RGB channels so palette edits are reflected immediately.
  // `cssColor` can lag behind ACI/index mutations on some AcCmColor builds.
  if (
    Number.isFinite(c.red) &&
    Number.isFinite(c.green) &&
    Number.isFinite(c.blue)
  ) {
    return `rgb(${c.red}, ${c.green}, ${c.blue})`
  }
  return c.cssColor ?? '#ffffff'
}
