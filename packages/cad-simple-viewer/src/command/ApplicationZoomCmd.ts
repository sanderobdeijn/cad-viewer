import {
  FLOAT_TOL,
  GeometryBox2d,
  GeometryPoint2d,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'

import { ApplicationContext, ApplicationDocManager } from '../app'
import {
  EditorBaseView,
  EditorCommand,
  EditorPromptBoxOptions,
  EditorPromptPointOptions,
  EditorPromptStatus,
  EditorPromptStringOptions
} from '../editor'
import { ApplicationI18n } from '../i18n'
import { APPLICATION_MODEL_SPACE_ID } from '../model/ApplicationItemDrawable'

/**
 * AutoCAD-style ZOOM command with keyword-driven branches in a single command.
 *
 * Supported flows:
 * - Press Enter: zoom extents.
 * - Pick first corner: zoom window.
 * - Keywords:
 *   - `All` / `Extents`: zoom extents.
 *   - `Window`: prompt two corners and zoom to that box.
 *   - `Center`: prompt center + height/scale factor.
 *   - `Scale`: scale relative to current view (`n`, `nX`, `nXP`).
 *   - `Previous`: restore previous zoom box.
 *   - `Original`: restore the view captured when the layout was first framed.
 *   - `Saved`: restore AutoCAD VPORT / layout limits (HTML export “Saved”),
 *     falling back to {@link Original} then extents.
 *   - `Smart`: zoom to the dominant geometry cluster (peel far outliers).
 *
 * This command intentionally keeps all zoom branches in one implementation so
 * callers can use script-style command input such as:
 *
 * ```text
 * zoom
 * window
 * ```
 */
export class ApplicationZoomCmd extends EditorCommand {
  /**
   * Stores the last view box before a zoom operation so `Previous` can restore it.
   */
  private static previousViewBox?: GeometryBox2d

  /**
   * View boxes captured when each layout was first framed (open or first visit).
   * Keyed by layout block table record id.
   */
  private static originalViewBoxByLayout = new Map<string, GeometryBox2d>()

  /**
   * Captures the current view box as the "original" view for a layout.
   *
   * Called after the first successful framing when a document opens or when the
   * user first visits a layout tab. Used by the ZOOM `Original` keyword.
   * Later calls for the same layout are ignored so ZOOM Extents cannot replace
   * the stored original view.
   *
   * @param view - Active view.
   * @param layoutBtrId - Layout block table record id.
   */
  static rememberOriginalView(view: EditorBaseView, layoutBtrId: string) {
    if (!layoutBtrId || view.width <= 0 || view.height <= 0) return
    if (ApplicationZoomCmd.originalViewBoxByLayout.has(layoutBtrId)) return
    ApplicationZoomCmd.originalViewBoxByLayout.set(
      layoutBtrId,
      ApplicationZoomCmd.captureViewBoxFromView(view)
    )
  }

  /**
   * Clears remembered original views (e.g. when replacing the current document).
   *
   * Does not clear {@link previousViewBox} used by the `Previous` zoom keyword.
   */
  static clearOriginalViews() {
    ApplicationZoomCmd.originalViewBoxByLayout.clear()
  }

  /**
   * Captures current visible world box from viewport corners.
   *
   * @param view - Active view.
   * @returns Current view box in world coordinates.
   */
  private static captureViewBoxFromView(view: EditorBaseView) {
    const topLeft = view.screenToWorld({ x: 0, y: 0 })
    const bottomRight = view.screenToWorld({
      x: view.width,
      y: view.height
    })
    return new GeometryBox2d().expandByPoint(topLeft).expandByPoint(bottomRight)
  }

  /**
   * Captures current visible world box from the viewport corners.
   *
   * @param context - Current command context.
   * @returns Current view box in world coordinates.
   */
  private captureCurrentViewBox(context: ApplicationContext) {
    return ApplicationZoomCmd.captureViewBoxFromView(context.view)
  }

  /**
   * Saves current view box before executing a zoom branch.
   *
   * @param context - Current command context.
   */
  private rememberViewBeforeZoom(context: ApplicationContext) {
    ApplicationZoomCmd.previousViewBox = this.captureCurrentViewBox(context)
  }

  /**
   * Executes extents-like zoom and records previous view for rollback.
   *
   * @param context - Current command context.
   */
  private zoomToExtents(context: ApplicationContext) {
    this.rememberViewBeforeZoom(context)
    context.view.zoomToFitDrawing()
  }

  /**
   * Zooms to the dominant geometry cluster (smart extents).
   *
   * Shows the same busy overlay used by PDF/HTML export while the cluster is
   * computed, and yields so the spinner can paint before synchronous work.
   *
   * @param context - Current command context.
   */
  private async zoomToSmart(context: ApplicationContext) {
    this.rememberViewBeforeZoom(context)
    await this.withBusyIndicator(
      () => context.view.zoomToSmartExtents(),
      ApplicationI18n.t('main.message.calculatingSmartExtents')
    )
  }

  /**
   * Executes window zoom from two corner points.
   *
   * @param context - Current command context.
   * @param first - First corner in WCS.
   * @param second - Opposite corner in WCS.
   */
  private zoomToWindow(
    context: ApplicationContext,
    first: GeometryPoint2dLike,
    second: GeometryPoint2dLike
  ) {
    const box = new GeometryBox2d().expandByPoint(first).expandByPoint(second)
    this.rememberViewBeforeZoom(context)
    context.view.zoomTo(box, 1)
  }

  /**
   * Prompts second corner from a known first corner, then performs window zoom.
   *
   * @param context - Current command context.
   * @param firstCorner - First window corner in WCS.
   */
  private async promptAndZoomWindowFromFirstCorner(
    context: ApplicationContext,
    firstCorner: GeometryPoint2dLike
  ) {
    const secondPrompt = new EditorPromptPointOptions(
      ApplicationI18n.t('jig.zoom.secondCorner')
    )
    secondPrompt.useBasePoint = true
    secondPrompt.basePoint = new GeometryPoint2d(firstCorner)
    secondPrompt.useDashedLine = true

    const secondResult =
      await ApplicationDocManager.instance.editor.getPoint(secondPrompt)
    if (secondResult.status !== EditorPromptStatus.OK || !secondResult.value)
      return
    this.zoomToWindow(context, firstCorner, secondResult.value)
  }

  /**
   * Prompts a window box using editor `getBox`, then zooms to that box.
   *
   * @param context - Current command context.
   */
  private async promptAndZoomWindowByBox(context: ApplicationContext) {
    const boxOptions = new EditorPromptBoxOptions(
      ApplicationI18n.t('jig.zoom.firstCorner'),
      ApplicationI18n.t('jig.zoom.secondCorner')
    )
    const boxResult = await ApplicationDocManager.instance.editor.getBox(boxOptions)
    if (boxResult.status !== EditorPromptStatus.OK || !boxResult.value) return
    this.rememberViewBeforeZoom(context)
    context.view.zoomTo(boxResult.value, 1)
  }

  /**
   * Handles `Center` branch:
   * - pick center point
   * - input height or scale factor
   *
   * @param context - Current command context.
   */
  private async runCenter(context: ApplicationContext) {
    const centerPrompt = new EditorPromptPointOptions(
      ApplicationI18n.t('jig.zoom.centerPoint')
    )
    const centerResult =
      await ApplicationDocManager.instance.editor.getPoint(centerPrompt)
    if (centerResult.status !== EditorPromptStatus.OK || !centerResult.value)
      return

    const heightPrompt = new EditorPromptStringOptions(
      ApplicationI18n.t('jig.zoom.heightOrScale')
    )
    const heightResult =
      await ApplicationDocManager.instance.editor.getString(heightPrompt)
    if (
      heightResult.status !== EditorPromptStatus.OK ||
      !heightResult.stringResult
    )
      return

    const parsedScale = this.parseScaleFactor(heightResult.stringResult)
    if (parsedScale != null) {
      this.applyRelativeScale(context, parsedScale, centerResult.value)
      return
    }

    const viewHeight = Number(heightResult.stringResult)
    if (!Number.isFinite(viewHeight) || viewHeight <= 0) return
    const aspect = context.view.width / Math.max(context.view.height, 1)
    const halfHeight = viewHeight / 2
    const halfWidth = (viewHeight * aspect) / 2
    const box = new GeometryBox2d()
      .expandByPoint({
        x: centerResult.value.x - halfWidth,
        y: centerResult.value.y - halfHeight
      })
      .expandByPoint({
        x: centerResult.value.x + halfWidth,
        y: centerResult.value.y + halfHeight
      })
    this.rememberViewBeforeZoom(context)
    context.view.zoomTo(box, 1)
  }

  /**
   * Parses scale factor text from AutoCAD-like inputs:
   * - `2` / `2x` / `2xp`
   *
   * @param raw - Raw user input.
   * @returns Positive scale factor, or `undefined` when invalid.
   */
  private parseScaleFactor(raw: string) {
    const text = raw.trim().toLowerCase()
    if (!text) return undefined

    if (text.endsWith('xp')) {
      const value = Number(text.slice(0, -2))
      return Number.isFinite(value) && value > 0 ? value : undefined
    }

    if (text.endsWith('x')) {
      const value = Number(text.slice(0, -1))
      return Number.isFinite(value) && value > 0 ? value : undefined
    }

    const value = Number(text)
    return Number.isFinite(value) && value > 0 ? value : undefined
  }

  /**
   * Applies relative zoom around the specified center (or current view center).
   *
   * @param context - Current command context.
   * @param factor - Relative zoom factor (> 0).
   * @param centerPoint - Optional explicit zoom center in WCS.
   */
  private applyRelativeScale(
    context: ApplicationContext,
    factor: number,
    centerPoint?: GeometryPoint2dLike
  ) {
    const current = this.captureCurrentViewBox(context)
    const width = Math.max(current.max.x - current.min.x, FLOAT_TOL)
    const height = Math.max(current.max.y - current.min.y, FLOAT_TOL)
    const halfWidth = width / (2 * factor)
    const halfHeight = height / (2 * factor)

    const center = centerPoint ?? {
      x: (current.min.x + current.max.x) / 2,
      y: (current.min.y + current.max.y) / 2
    }

    const target = new GeometryBox2d()
      .expandByPoint({ x: center.x - halfWidth, y: center.y - halfHeight })
      .expandByPoint({ x: center.x + halfWidth, y: center.y + halfHeight })
    this.rememberViewBeforeZoom(context)
    context.view.zoomTo(target, 1)
  }

  /**
   * Restores previous view box if one exists and swaps buffers to allow toggling.
   *
   * @param context - Current command context.
   */
  private runPrevious(context: ApplicationContext) {
    if (!ApplicationZoomCmd.previousViewBox) return
    const current = this.captureCurrentViewBox(context)
    context.view.zoomTo(ApplicationZoomCmd.previousViewBox, 1)
    ApplicationZoomCmd.previousViewBox = current
  }

  /**
   * Restores the saved view: the open-time original view, or the extents
   * when there is none.
   *
   * @param context - Current command context.
   */
  private runSaved(context: ApplicationContext) {
    this.rememberViewBeforeZoom(context)
    this.runOriginal(context, false)
  }

  /**
   * Restores the view captured when the active layout was first framed.
   * Falls back to zoom extents when no original view is stored.
   *
   * @param context - Current command context.
   * @param rememberPrevious - When false, caller already recorded previous view.
   */
  private runOriginal(context: ApplicationContext, rememberPrevious: boolean = true) {
    const original =
      ApplicationZoomCmd.originalViewBoxByLayout.get(APPLICATION_MODEL_SPACE_ID)
    if (rememberPrevious) {
      this.rememberViewBeforeZoom(context)
    }
    if (original) {
      context.view.zoomTo(original, 1)
      return
    }
    context.view.zoomToFitDrawing()
  }

  /**
   * Runs zoom interaction with keyword-capable branching.
   *
   * @param context - Current command context.
   */
  async execute(context: ApplicationContext) {
    const firstPrompt = new EditorPromptPointOptions(
      ApplicationI18n.t('jig.zoom.mainPrompt')
    )
    firstPrompt.allowNone = true
    firstPrompt.keywords.add(
      ApplicationI18n.t('jig.zoom.keywords.all.display'),
      ApplicationI18n.t('jig.zoom.keywords.all.global'),
      ApplicationI18n.t('jig.zoom.keywords.all.local')
    )
    firstPrompt.keywords.add(
      ApplicationI18n.t('jig.zoom.keywords.center.display'),
      ApplicationI18n.t('jig.zoom.keywords.center.global'),
      ApplicationI18n.t('jig.zoom.keywords.center.local')
    )
    firstPrompt.keywords.add(
      ApplicationI18n.t('jig.zoom.keywords.extents.display'),
      ApplicationI18n.t('jig.zoom.keywords.extents.global'),
      ApplicationI18n.t('jig.zoom.keywords.extents.local')
    )
    firstPrompt.keywords.add(
      ApplicationI18n.t('jig.zoom.keywords.previous.display'),
      ApplicationI18n.t('jig.zoom.keywords.previous.global'),
      ApplicationI18n.t('jig.zoom.keywords.previous.local')
    )
    firstPrompt.keywords.add(
      ApplicationI18n.t('jig.zoom.keywords.original.display'),
      ApplicationI18n.t('jig.zoom.keywords.original.global'),
      ApplicationI18n.t('jig.zoom.keywords.original.local')
    )
    firstPrompt.keywords.add(
      ApplicationI18n.t('jig.zoom.keywords.saved.display'),
      ApplicationI18n.t('jig.zoom.keywords.saved.global'),
      ApplicationI18n.t('jig.zoom.keywords.saved.local')
    )
    firstPrompt.keywords.add(
      ApplicationI18n.t('jig.zoom.keywords.smart.display'),
      ApplicationI18n.t('jig.zoom.keywords.smart.global'),
      ApplicationI18n.t('jig.zoom.keywords.smart.local')
    )
    firstPrompt.keywords.add(
      ApplicationI18n.t('jig.zoom.keywords.scale.display'),
      ApplicationI18n.t('jig.zoom.keywords.scale.global'),
      ApplicationI18n.t('jig.zoom.keywords.scale.local')
    )
    firstPrompt.keywords.add(
      ApplicationI18n.t('jig.zoom.keywords.window.display'),
      ApplicationI18n.t('jig.zoom.keywords.window.global'),
      ApplicationI18n.t('jig.zoom.keywords.window.local')
    )

    const firstResult =
      await ApplicationDocManager.instance.editor.getPoint(firstPrompt)
    if (firstResult.status === EditorPromptStatus.None) {
      this.zoomToExtents(context)
      return
    }

    if (firstResult.status === EditorPromptStatus.OK && firstResult.value) {
      await this.promptAndZoomWindowFromFirstCorner(context, firstResult.value)
      return
    }

    if (firstResult.status !== EditorPromptStatus.Keyword) return

    const keyword = firstResult.stringResult ?? ''
    if (keyword === 'All' || keyword === 'Extents') {
      this.zoomToExtents(context)
      return
    }
    if (keyword === 'Window') {
      await this.promptAndZoomWindowByBox(context)
      return
    }
    if (keyword === 'Center') {
      await this.runCenter(context)
      return
    }
    if (keyword === 'Scale') {
      const scalePrompt = new EditorPromptStringOptions(
        ApplicationI18n.t('jig.zoom.scaleFactor')
      )
      const scaleResult =
        await ApplicationDocManager.instance.editor.getString(scalePrompt)
      if (
        scaleResult.status !== EditorPromptStatus.OK ||
        !scaleResult.stringResult
      )
        return
      const factor = this.parseScaleFactor(scaleResult.stringResult)
      if (factor == null) return
      this.applyRelativeScale(context, factor)
      return
    }
    if (keyword === 'Previous') {
      this.runPrevious(context)
      return
    }
    if (keyword === 'Original') {
      this.runOriginal(context)
      return
    }
    if (keyword === 'Saved') {
      this.runSaved(context)
      return
    }
    if (keyword === 'Smart') {
      await this.zoomToSmart(context)
      return
    }
  }
}
