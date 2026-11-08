/**
 * Canonical filenames for Web Worker JS bundles shipped with the viewer.
 *
 * Keep these in one place so rename/migration is a single-file change.
 * Runtime TypeScript mirrors these in:
 *   packages/cad-simple-viewer/src/app/ApplicationWorkerAssets.ts
 */

/** MTEXT layout/shaping worker from `@mlightcad/mtext-renderer`. */
export const MTEXT_RENDERER_WORKER_FILE = 'mtext-renderer-worker.js'

/** npm package that ships {@link MTEXT_RENDERER_WORKER_FILE}. */
export const MTEXT_RENDERER_PACKAGE = '@mlightcad/mtext-renderer'
