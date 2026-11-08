import { AcEdOpenMode } from '../editor/view'

/**
 * Options for creating a drawing.
 *
 * Display options such as the background or line weight display are settings
 * on {@link AcApSettingManager}, not open options.
 *
 * @example
 * ```typescript
 * const options: AcApOpenDatabaseOptions = {
 *   mode: AcEdOpenMode.Write
 * }
 * ```
 */
export interface AcApOpenDatabaseOptions {
  /**
   * The access mode of the drawing.
   * Higher value modes are compatible with lower value modes.
   * - Read (0): Read-only access
   * - Write (8): Full read/write access, compatible with Read
   */
  mode?: AcEdOpenMode
  /**
   * Whether opening a drawing is progressive.
   *
   * This flag controls both stages of progressive rendering. The deprecated
   * {@link waitForTextGeometry} option used to control only the second stage
   * and is ignored.
   *
   * - `false` (default): conversion still runs asynchronously, but the canvas
   *   is not redrawn until every entity is converted. The open-file overlay
   *   stays up until deferred text glyph jobs finish
   *   ({@link AcTrView2d.isProcessingEntities}).
   * - `true`: entity conversion yields across event-loop turns so geometry
   *   paints as batches land and the camera can reframe. The canvas overlay
   *   blocks the UI until FETCH_FILE + CONVERSION finish, then hides so
   *   pan/zoom work while scene convert continues. The status bar tracks
   *   parse/conversion progress and clears at CONVERSION `END`.
   *
   * Export / CLI completeness is not controlled by this flag. Callers that
   * need fully drawable text (HTML/PDF/PNG, headless scripts) still wait via
   * {@link AcTrView2d.waitUntilIdle} /
   * {@link AcTrView2d.ensureEntitiesConvertedForExport}.
   */
  progressiveRendering?: boolean

  /**
   * @deprecated Ignored. Both stages of progressive rendering — mid-open
   * paints during entity convert, and whether the open overlay waits for
   * deferred text glyph geometry — are controlled by
   * {@link progressiveRendering}.
   *
   * This option used to control only the text stage (`true` kept
   * "Rendering drawing ..." up until glyphs finished; `false` hid it when
   * entity convert finished) and was easy to confuse with
   * `progressiveRendering`. {@link AcApDocManager} strips it with a warning.
   */
  waitForTextGeometry?: boolean

  /**
   * Segments a full circle is drawn with. Lower values save memory; higher
   * values look smoother. When omitted, 50 is used.
   */
  circleSides?: number

  /**
   * When `true`, convert entities on off/frozen layers during open so offline
   * HTML/PDF export does not need a second convert pass for those entities.
   * Interactive viewing leaves this `false` (default) and converts them later
   * when a layer is turned on or {@link AcTrView2d.ensureEntitiesConvertedForExport}
   * runs.
   */
  convertInvisibleLayers?: boolean

  /**
   * When `true`, skip building the hierarchical spatial index while converting
   * entities. Headless HTML/JPEG export only needs scene batch geometry and
   * layout boxes; the spatial index is for interactive pick / smart extents.
   * Default `false`.
   */
  skipSpatialIndex?: boolean

  /**
   * When `false`, disable cooperative `setTimeout` yields during entity
   * convert and skip non-progressive mid-open WebGL paints. Headless
   * Chromium scripts do not need a responsive UI; yields and full-scene
   * paints inflate open wall time. Default `true` for interactive viewers
   * so "Rendering drawing ..." can still refresh the canvas (throttled).
   */
  cooperativeYield?: boolean
}
