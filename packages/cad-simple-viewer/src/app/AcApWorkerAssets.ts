/**
 * Canonical filenames for Web Worker JS bundles used by the viewer.
 *
 * Keep these in one place so rename/migration is a single-file change.
 * Build scripts mirror these in: `tools/worker-assets.mjs`
 */

/** MTEXT layout/shaping worker from `@mlightcad/mtext-renderer`. */
export const MTEXT_RENDERER_WORKER_FILE = 'mtext-renderer-worker.js'

/** npm package that ships {@link MTEXT_RENDERER_WORKER_FILE}. */
export const MTEXT_RENDERER_PACKAGE = '@mlightcad/mtext-renderer'
