import { EditorOpenMode } from '../editor/view'

/**
 * Options for creating a drawing.
 *
 * Display options such as the background or line weight display are settings
 * on {@link ApplicationSettingManager}, not open options.
 *
 * @example
 * ```typescript
 * const options: ApplicationOpenDatabaseOptions = {
 *   mode: EditorOpenMode.Write
 * }
 * ```
 */
export interface ApplicationOpenDatabaseOptions {
  /**
   * The access mode of the drawing.
   * Higher value modes are compatible with lower value modes.
   * - Read (0): Read-only access
   * - Write (8): Full read/write access, compatible with Read
   */
  mode?: EditorOpenMode
  /**
   * Whether opening a drawing is progressive.
   *
   * This flag controls both stages of progressive rendering. The deprecated
   * {@link waitForTextGeometry} option used to control only the second stage
   * and is ignored.
   *
   * - `false` (default): conversion still runs asynchronously, but the canvas
   *   is not redrawn until every entity is converted. The open-file overlay
   *   stays up until conversion finishes
   *   ({@link ThreeRendererView2d.isProcessingEntities}).
   * - `true`: entity conversion yields across event-loop turns so geometry
   *   paints as batches land and the camera can reframe. The canvas overlay
   *   blocks the UI until FETCH_FILE + CONVERSION finish, then hides so
   *   pan/zoom work while scene convert continues. The status bar tracks
   *   parse/conversion progress and clears at CONVERSION `END`.
   *
   * Export / CLI completeness is not controlled by this flag. Callers that
   * need a fully converted scene (HTML/PDF/PNG, headless scripts) still wait via
   * {@link ThreeRendererView2d.waitUntilIdle} /
   * {@link ThreeRendererView2d.ensureEntitiesConvertedForExport}.
   */
  progressiveRendering?: boolean

  /**
   * @deprecated Ignored. Both stages of progressive rendering — mid-open
   * paints during entity convert, and whether the open overlay waits for
   * conversion — are controlled by
   * {@link progressiveRendering}.
   *
   * This option used to control only the text stage of the old text
   * renderer and was easy to confuse with
   * `progressiveRendering`. {@link ApplicationDocManager} strips it with a warning.
   */
  waitForTextGeometry?: boolean

  /**
   * Segments a full circle is drawn with. Lower values save memory; higher
   * values look smoother. When omitted, 50 is used.
   */
  circleSides?: number

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
