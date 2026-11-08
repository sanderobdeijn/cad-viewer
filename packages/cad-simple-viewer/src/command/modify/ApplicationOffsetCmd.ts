import {
  GeometryPoint2d,
  GeometryPoint2dLike,
  GeometryTol
} from '@mlightcad/geometry-engine'

import { ApplicationContext, ApplicationDocManager } from '../../app'
import {
  EditorBaseView,
  EditorCommand,
  EditorMessageType,
  EditorOpenMode,
  EditorPreviewJig,
  EditorPromptDistanceOptions,
  EditorPromptDoubleResult,
  EditorPromptEntityOptions,
  EditorPromptEntityResult,
  EditorPromptPointOptions,
  EditorPromptPointResult,
  EditorPromptState,
  EditorPromptStateMachine,
  EditorPromptStateStep,
  EditorPromptStatus
} from '../../editor'
import { ApplicationI18n } from '../../i18n'
import { applicationPreviewDrawable } from '../../model/ApplicationItemDrawable'
import {
  type ApplicationItemContents,
  canOffsetItem,
  itemOffsetSide,
  offsetItem
} from '../../model/ApplicationItemGeometry'

/**
 * Union of prompt option types used across the OFFSET state machine.
 *
 * Each OFFSET step builds one of these option objects before delegating to
 * the editor's distance, entity, or point prompt APIs.
 */
type OffsetPromptOptions =
  | EditorPromptDistanceOptions
  | EditorPromptEntityOptions
  | EditorPromptPointOptions

/**
 * Union of prompt result types returned by OFFSET state handlers.
 *
 * The active state narrows this union before reading status and payload fields.
 */
type OffsetPromptResult =
  | EditorPromptDoubleResult
  | EditorPromptEntityResult
  | EditorPromptPointResult

/**
 * Type guard that checks whether an item can participate in OFFSET.
 *
 * Only curves support side detection and offset curve generation; other
 * items are rejected during selection.
 *
 * @param item - Item resolved from the user's selection.
 * @returns `true` when `item` is an offset-capable curve.
 */
function isOffsettableCurve(
  item: ApplicationItemContents | undefined
): item is ApplicationItemContents {
  return !!item && canOffsetItem(item)
}

/**
 * Builds one or more offset curves on the side indicated by a pick point.
 *
 * The side is resolved from the source curve geometry, the absolute distance is
 * applied with the correct sign.
 * Any geometric failure is swallowed and reported as an empty result set.
 *
 * @param curve - Source curve to offset.
 * @param offsetDistance - Absolute offset distance in drawing units.
 * @param sidePoint - Point used to determine which side of the curve to offset toward.
 * @returns Offset curve instances ready for preview or commit, or an empty array on failure.
 */
function buildOffsetCurves(
  curve: ApplicationItemContents,
  offsetDistance: number,
  sidePoint: GeometryPoint2dLike
): ApplicationItemContents[] {
  try {
    const side = itemOffsetSide(curve, sidePoint)
    return offsetItem(curve, offsetDistance * side)
  } catch {
    return []
  }
}

/**
 * OFFSET side preview jig.
 *
 * The selected side changes as the cursor crosses the source curve. Since the
 * offset methods return fresh curve instances, this jig replaces its transient
 * preview set on each update instead of transforming a single cached entity.
 */
class ApplicationOffsetPreviewJig extends EditorPreviewJig<GeometryPoint2dLike> {
  private _view: EditorBaseView
  private _curve: ApplicationItemContents
  private _distance: number
  private _previewCurves: ApplicationItemContents[] = []
  private _renderedIds: string[] = []

  /**
   * Creates a transient OFFSET preview jig for side selection.
   *
   * @param view - Active editor view that owns transient preview entities.
   * @param curve - Source curve whose offset geometry should be previewed.
   * @param distance - Offset distance already confirmed by the user.
   */
  constructor(view: EditorBaseView, curve: ApplicationItemContents, distance: number) {
    super(view)
    this._view = view
    this._curve = curve
    this._distance = distance
  }

  /**
   * Rebuilds the transient offset curves for the current cursor side.
   *
   * Existing preview entities are removed from the view before new geometry is
   * generated because offset APIs return fresh curve instances each time.
   *
   * @param point - Current cursor point used to determine offset side.
   */
  update(point: GeometryPoint2dLike) {
    this.clearRendered()
    this._previewCurves = buildOffsetCurves(this._curve, this._distance, point)
  }

  /**
   * Adds the current offset preview curves to the view as transient geometry.
   */
  override render() {
    if (this._previewCurves.length === 0) return
    const drawables = this._previewCurves.map(curve =>
      applicationPreviewDrawable(curve)
    )
    this._view.addTransientEntity(drawables)
    this._renderedIds = drawables.map(drawable => drawable.objectId)
  }

  /**
   * Removes every transient preview curve from the view when the prompt ends.
   */
  override end() {
    this.clearRendered()
  }

  /**
   * Removes previously rendered transient entities and clears their tracked ids.
   *
   * Called before each preview rebuild so stale offset curves do not remain
   * visible after the cursor crosses to the opposite side.
   */
  private clearRendered() {
    this._renderedIds.forEach(id => this._view.removeTransientEntity(id))
    this._renderedIds = []
  }
}

/**
 * Command to create offset copies of curve entities.
 *
 * The workflow follows the common AutoCAD OFFSET flow:
 * 1) specify an offset distance,
 * 2) select one curve,
 * 3) pick the side for the new curve while previewing the result,
 * 4) repeat selection until Enter/Escape.
 */
export class ApplicationOffsetCmd extends EditorCommand {
  /** Last successfully used offset distance, reused as the default on the next run. */
  private static _lastDistance?: number

  /**
   * Creates the OFFSET command. Drawing geometry may only be offset in Write mode.
   */
  constructor() {
    super()
    this.mode = EditorOpenMode.Write
  }

  /**
   * Runs the OFFSET command through a three-step prompt state machine.
   *
   * The machine loops on curve selection after each successful offset so users
   * can create multiple offsets at the same distance without re-entering it.
   * Pressing Enter at distance entry reuses the previous distance when available.
   *
   * @param context - Current application/document context.
   */
  async execute(context: ApplicationContext) {
    const showCommandMessage = (
      message: string,
      type: EditorMessageType = 'info'
    ) => {
      this.showMessage(message, type)
    }
    let offsetDistance: number | undefined
    let currentCurve: ApplicationItemContents | undefined

    /** Prompt state contract shared by every OFFSET workflow step. */
    type OffsetState = EditorPromptState<OffsetPromptOptions, OffsetPromptResult>
    /** Next-step directive returned by OFFSET state handlers. */
    type OffsetStep = EditorPromptStateStep
    /** State machine that orchestrates distance, selection, and side prompts. */
    type OffsetMachine = EditorPromptStateMachine<
      OffsetPromptOptions,
      OffsetPromptResult
    >

    /**
     * First OFFSET step: prompt for the offset distance.
     *
     * Reuses {@link ApplicationOffsetCmd._lastDistance} as the default when the user
     * presses Enter without typing a new value.
     */
    class DistanceState implements OffsetState {
      /**
       * Creates the distance-entry state.
       *
       * @param machine - Parent state machine used to transition to selection.
       */
      constructor(private machine: OffsetMachine) {}

      /**
       * Builds the distance prompt with optional default distance and rubber-band base point.
       *
       * @returns Configured distance prompt options for the editor.
       */
      buildPrompt() {
        const lastDistance = ApplicationOffsetCmd._lastDistance
        const prompt = new EditorPromptDistanceOptions(
          ApplicationI18n.t('jig.offset.distance')
        )
        prompt.useBasePoint = false
        prompt.useDashedLine = true
        prompt.allowZero = false
        prompt.allowNegative = false
        if (lastDistance != null) {
          prompt.defaultValue = lastDistance
          prompt.useDefaultValue = true
          prompt.allowNone = true
        }
        return prompt
      }

      /**
       * Validates the entered distance and advances to curve selection.
       *
       * Invalid, non-finite, or non-positive distances show a warning and end
       * the command. A valid distance is stored for reuse on subsequent runs.
       *
       * @param result - Distance prompt result from the editor.
       * @returns `'continue'` to move to selection, or `'finish'` to exit.
       */
      handleResult(result: OffsetPromptResult): OffsetStep {
        if (!(result instanceof EditorPromptDoubleResult)) return 'finish'
        if (result.status !== EditorPromptStatus.OK || result.value == null) {
          return 'finish'
        }
        if (
          !Number.isFinite(result.value) ||
          GeometryTol.isNonPositive(result.value)
        ) {
          showCommandMessage(
            ApplicationI18n.t('jig.offset.invalidDistance'),
            'warning'
          )
          return 'finish'
        }

        offsetDistance = result.value
        ApplicationOffsetCmd._lastDistance = result.value
        this.machine.setState(new SelectCurveState(this.machine))
        return 'continue'
      }
    }

    /**
     * Second OFFSET step: prompt for a single offsettable curve.
     *
     * Enter ends the command; invalid selections warn and remain in this state.
     */
    class SelectCurveState implements OffsetState {
      /**
       * Creates the curve-selection state.
       *
       * @param machine - Parent state machine used to transition to side picking.
       */
      constructor(private machine: OffsetMachine) {}

      /**
       * Builds the entity selection prompt for one curve.
       *
       * @returns Configured entity prompt options for the editor.
       */
      buildPrompt() {
        const prompt = new EditorPromptEntityOptions(
          ApplicationI18n.t('jig.offset.selectObject')
        )
        prompt.allowNone = true
        prompt.setRejectMessage(ApplicationI18n.t('jig.offset.invalidSelection'))
        return prompt
      }

      /**
       * Resolves the selected entity and advances to side-point picking when valid.
       *
       * Non-curve selections show a warning and keep prompting for another object.
       *
       * @param result - Entity prompt result from the editor.
       * @returns `'continue'` to pick a side or retry selection, or `'finish'` to exit.
       */
      handleResult(result: OffsetPromptResult): OffsetStep {
        if (!(result instanceof EditorPromptEntityResult)) return 'finish'
        if (result.status === EditorPromptStatus.None) return 'finish'
        if (result.status !== EditorPromptStatus.OK || !result.objectId) {
          return 'finish'
        }

        const entity = context.doc.modelSync.item(result.objectId)
        if (!isOffsettableCurve(entity)) {
          showCommandMessage(
            ApplicationI18n.t('jig.offset.invalidSelection'),
            'warning'
          )
          return 'continue'
        }

        currentCurve = entity
        this.machine.setState(new SidePointState(this.machine))
        return 'continue'
      }
    }

    /**
     * Third OFFSET step: pick the offset side and commit the new curve(s).
     *
     * A preview jig shows the offset result while the cursor moves. After a
     * successful commit, the workflow returns to curve selection.
     */
    class SidePointState implements OffsetState {
      /**
       * Creates the side-point state.
       *
       * @param machine - Parent state machine used to loop back to selection.
       */
      constructor(private machine: OffsetMachine) {}

      /**
       * Builds the side-point prompt and attaches the offset preview jig.
       *
       * Object snap is disabled so the pick reflects the intended side rather
       * than snapping to nearby geometry.
       *
       * @returns Configured point prompt options for the editor.
       */
      buildPrompt() {
        const prompt = new EditorPromptPointOptions(
          ApplicationI18n.t('jig.offset.sidePoint')
        )
        prompt.allowNone = true
        prompt.disableOSnap = true
        if (currentCurve && offsetDistance != null) {
          const jig = new ApplicationOffsetPreviewJig(
            context.view,
            currentCurve,
            offsetDistance
          )
          jig.update({ ...context.view.curPos })
          jig.render()
          prompt.jig = jig
        }
        return prompt
      }

      /**
       * Creates offset geometry from the picked side and appends it to model space.
       *
       * When offset generation fails, a warning is shown and the command still
       * returns to curve selection so the user can try another object.
       *
       * @param result - Point prompt result from the editor.
       * @returns `'continue'` to select another curve, or `'finish'` to exit.
       */
      handleResult(result: OffsetPromptResult): OffsetStep {
        if (!(result instanceof EditorPromptPointResult)) return 'finish'
        if (
          result.status !== EditorPromptStatus.OK ||
          !result.value ||
          !currentCurve ||
          offsetDistance == null
        ) {
          return 'finish'
        }

        const offsetCurves = buildOffsetCurves(
          currentCurve,
          offsetDistance,
          new GeometryPoint2d(result.value)
        )
        if (offsetCurves.length === 0) {
          showCommandMessage(ApplicationI18n.t('jig.offset.offsetFailed'), 'warning')
        } else {
          context.doc.modelSync.addItems(offsetCurves)
        }

        currentCurve = undefined
        this.machine.setState(new SelectCurveState(this.machine))
        return 'continue'
      }
    }

    const machine = new EditorPromptStateMachine<
      OffsetPromptOptions,
      OffsetPromptResult
    >()
    machine.setState(new DistanceState(machine))
    await machine.run(prompt => {
      if (prompt instanceof EditorPromptDistanceOptions) {
        return ApplicationDocManager.instance.editor.getDistance(prompt)
      }
      if (prompt instanceof EditorPromptEntityOptions) {
        return ApplicationDocManager.instance.editor.getEntity(prompt)
      }
      return ApplicationDocManager.instance.editor.getPoint(prompt)
    })
  }
}
