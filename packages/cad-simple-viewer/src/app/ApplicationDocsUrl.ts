/**
 * Builds user-guide URLs under a configurable docs root.
 *
 * Configure the root via {@link ApplicationDocManagerOptions.docsBaseUrl},
 * {@link applicationSetDocsBaseUrl}, or the `docs-base-url` prop on `MlCadViewer`.
 *
 * @example
 * ```ts
 * applicationDocsUrl('guide/magnifier.html')
 * // → https://mlightcad.com/cad-viewer/docs/guide/magnifier.html
 * ```
 */

import { MLIGHTCAD_DOCS_URL } from './ApplicationBrand'

/** Magnifier (mobile) guide page relative to the docs root. */
export const APPLICATION_DOCS_PATH_MAGNIFIER = 'guide/magnifier.html'

/**
 * Default public user-guide root (trailing slash optional; normalized on use).
 * Prefer {@link applicationGetDocsBaseUrl} at runtime.
 */
export const APPLICATION_DEFAULT_DOCS_BASE_URL = MLIGHTCAD_DOCS_URL

/** Active docs root for {@link applicationDocsUrl} (no trailing slash). */
let docsBaseUrl = normalizeDocsBaseUrl(APPLICATION_DEFAULT_DOCS_BASE_URL)

/**
 * Returns the configured docs root, falling back to
 * {@link APPLICATION_DEFAULT_DOCS_BASE_URL}.
 */
export function applicationGetDocsBaseUrl(): string {
  return docsBaseUrl
}

/**
 * Sets the docs root used by {@link applicationDocsUrl}.
 *
 * Prefer {@link ApplicationDocManagerOptions.docsBaseUrl} (or the `docs-base-url`
 * prop on `MlCadViewer`) so the value is applied when the viewer starts.
 *
 * @param url - Absolute docs root (e.g. `https://example.com/docs/`).
 */
export function applicationSetDocsBaseUrl(url: string): void {
  docsBaseUrl = normalizeDocsBaseUrl(url)
}

/**
 * Builds a full docs URL for `docPath`.
 *
 * @param docPath - Path under the docs root, with or without a leading slash
 *   (e.g. `guide/magnifier.html` or `/guide/magnifier.html`).
 * @returns Absolute URL to the page.
 */
export function applicationDocsUrl(docPath: string): string {
  return `${applicationGetDocsBaseUrl()}/${docPath.replace(/^\/+/, '')}`
}

/**
 * Strips trailing slashes and ensures a usable absolute or root-relative base.
 *
 * @param url - Raw docs base URL from options or callers.
 * @returns Normalized base without a trailing slash (joined paths add `/`).
 */
export function normalizeDocsBaseUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return APPLICATION_DEFAULT_DOCS_BASE_URL.replace(/\/+$/, '')
  return trimmed.replace(/\/+$/, '')
}
