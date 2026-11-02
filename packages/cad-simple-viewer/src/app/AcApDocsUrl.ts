/**
 * Builds user-guide URLs under a configurable docs root.
 *
 * Configure the root via {@link AcApDocManagerOptions.docsBaseUrl},
 * {@link acapSetDocsBaseUrl}, or the `docs-base-url` prop on `MlCadViewer`.
 *
 * @example
 * ```ts
 * acapDocsUrl('guide/magnifier.html')
 * // → https://mlightcad.com/cad-viewer/docs/guide/magnifier.html
 * ```
 */

import { MLIGHTCAD_DOCS_URL } from './AcApBrand'

/** Magnifier (mobile) guide page relative to the docs root. */
export const ACAP_DOCS_PATH_MAGNIFIER = 'guide/magnifier.html'

/**
 * Default public user-guide root (trailing slash optional; normalized on use).
 * Prefer {@link acapGetDocsBaseUrl} at runtime.
 */
export const ACAP_DEFAULT_DOCS_BASE_URL = MLIGHTCAD_DOCS_URL

/** Active docs root for {@link acapDocsUrl} (no trailing slash). */
let docsBaseUrl = normalizeDocsBaseUrl(ACAP_DEFAULT_DOCS_BASE_URL)

/**
 * Returns the configured docs root, falling back to
 * {@link ACAP_DEFAULT_DOCS_BASE_URL}.
 */
export function acapGetDocsBaseUrl(): string {
  return docsBaseUrl
}

/**
 * Sets the docs root used by {@link acapDocsUrl}.
 *
 * Prefer {@link AcApDocManagerOptions.docsBaseUrl} (or the `docs-base-url`
 * prop on `MlCadViewer`) so the value is applied when the viewer starts.
 *
 * @param url - Absolute docs root (e.g. `https://example.com/docs/`).
 */
export function acapSetDocsBaseUrl(url: string): void {
  docsBaseUrl = normalizeDocsBaseUrl(url)
}

/**
 * Builds a full docs URL for `docPath`.
 *
 * @param docPath - Path under the docs root, with or without a leading slash
 *   (e.g. `guide/magnifier.html` or `/guide/magnifier.html`).
 * @returns Absolute URL to the page.
 */
export function acapDocsUrl(docPath: string): string {
  return `${acapGetDocsBaseUrl()}/${docPath.replace(/^\/+/, '')}`
}

/**
 * Strips trailing slashes and ensures a usable absolute or root-relative base.
 *
 * @param url - Raw docs base URL from options or callers.
 * @returns Normalized base without a trailing slash (joined paths add `/`).
 */
export function normalizeDocsBaseUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ACAP_DEFAULT_DOCS_BASE_URL.replace(/\/+$/, '')
  return trimmed.replace(/\/+$/, '')
}
