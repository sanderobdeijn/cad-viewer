import {
  GeometryLine2d,
  GeometryPoint2d,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'
import type { GraphicsInterfaceDrawable } from '@mlightcad/graphic-interface'

import { ApplicationContext, ApplicationDocManager } from '../../app'
import {
  EditorBaseView,
  EditorCommand,
  EditorOpenMode,
  EditorPreviewJig,
  EditorPromptPointOptions,
  EditorPromptPointResult,
  EditorPromptState,
  EditorPromptStateMachine,
  EditorPromptStateStep,
  EditorPromptStatus
} from '../../editor'
import { ApplicationI18n } from '../../i18n'
import { applicationPreviewDrawable } from '../../model/ApplicationItemDrawable'

/**
 * Dynamic preview jig for LINE command.
 */
export class ApplicationLineJig extends EditorPreviewJig<GeometryPoint2dLike> {
  /**
   * Line shown during interactive preview.
   */
  private _line: GeometryLine2d
  /** Draws {@link _line} as a preview. */
  private _drawable: GraphicsInterfaceDrawable

  /**
   * Creates a line jig.
   *
   * @param view - The associated view
   */
  constructor(view: EditorBaseView, start: GeometryPoint2dLike) {
    super(view)
    this._line = new GeometryLine2d(start, start)
    this._drawable = applicationPreviewDrawable({
      kind: 'shape',
      geometry: this._line
    })
  }

  /**
   * Gets the preview drawn by this jig.
   */
  get entity(): GraphicsInterfaceDrawable {
    return this._drawable
  }

  /**
   * Updates preview line endpoint from current cursor point.
   *
   * @param point - Current cursor/input point.
   */
  update(point: GeometryPoint2dLike) {
    this._line.endPoint = point
  }
}

/**
 * Command to create chained line segments.
 *
 * Behavior is aligned with AutoCAD LINE:
 * - After the first point, each confirmed next point immediately creates one segment.
 * - `Close` creates the closing segment to the first point and ends command.
 */
export class ApplicationLineCmd extends EditorCommand {
  /**
   * Last endpoint created by LINE command.
   *
   * Used by "Continue" option at next LINE start.
   */
  private static _lastEndpoint?: GeometryPoint2d

  /**
   * Creates LINE command instance.
   */
  constructor() {
    super()
    this.mode = EditorOpenMode.Write
  }

  /**
   * Command entry point.
   *
   * Supports chained point input with a `Close` option.
   *
   * @param context - Current application/document context.
   */
  async execute(context: ApplicationContext) {
    const points: GeometryPoint2d[] = []
    const hasContinuePoint = () => !!ApplicationLineCmd._lastEndpoint
    const getContinuePoint = () =>
      ApplicationLineCmd._lastEndpoint
        ? new GeometryPoint2d(ApplicationLineCmd._lastEndpoint)
        : undefined
    const syncLastEndpoint = () => {
      const current = getCurrentPoint()
      if (current) {
        ApplicationLineCmd._lastEndpoint = new GeometryPoint2d(current)
      }
    }
    const appendPoint = (point: GeometryPoint2dLike) => {
      points.push(new GeometryPoint2d(point))
    }
    const getCurrentPoint = () => points[points.length - 1]
    const appendSegment = (endPoint: GeometryPoint2dLike) => {
      const startPoint = getCurrentPoint()
      if (!startPoint) return
      const segment = new GeometryLine2d(
        new GeometryPoint2d(startPoint),
        endPoint
      )
      context.doc.modelSync.addItems({ kind: 'shape', geometry: segment })
      appendPoint(endPoint)
    }
    const closeSegment = () => {
      if (points.length <= 1) return
      const first = points[0]
      const current = getCurrentPoint()
      if (!current) return
      const isSamePoint = first.x === current.x && first.y === current.y
      if (!isSamePoint) {
        appendSegment(first)
      }
    }

    const startPointPrompt = new EditorPromptPointOptions(
      hasContinuePoint()
        ? ApplicationI18n.t('jig.line.firstPointOrContinue')
        : ApplicationI18n.t('jig.line.firstPoint')
    )
    if (hasContinuePoint()) {
      startPointPrompt.keywords.add(
        ApplicationI18n.t('jig.line.keywords.continue.display'),
        ApplicationI18n.t('jig.line.keywords.continue.global'),
        ApplicationI18n.t('jig.line.keywords.continue.local')
      )
    }
    const startPointResult =
      await ApplicationDocManager.instance.editor.getPoint(startPointPrompt)
    if (startPointResult.status === EditorPromptStatus.OK) {
      appendPoint(startPointResult.value!)
    } else if (
      startPointResult.status === EditorPromptStatus.Keyword &&
      startPointResult.stringResult === 'Continue' &&
      hasContinuePoint()
    ) {
      appendPoint(getContinuePoint()!)
    } else {
      return
    }

    type LineState = EditorPromptState<
      EditorPromptPointOptions,
      EditorPromptPointResult
    >
    type StepResult = EditorPromptStateStep
    /**
     * State-machine node that prompts for subsequent line points.
     */
    class NextPointState implements LineState {
      /**
       * Builds point prompt for the next vertex with dynamic line preview.
       *
       * @returns Configured point prompt with runtime keywords.
       */
      buildPrompt() {
        const prompt = new EditorPromptPointOptions(
          ApplicationI18n.t('jig.line.nextPointWithOptions')
        )
        if (points.length > 1) {
          prompt.keywords.add(
            ApplicationI18n.t('jig.line.keywords.close.display'),
            ApplicationI18n.t('jig.line.keywords.close.global'),
            ApplicationI18n.t('jig.line.keywords.close.local')
          )
        }
        const basePoint = getCurrentPoint()
        if (basePoint) {
          prompt.useDashedLine = true
          prompt.useBasePoint = true
          prompt.basePoint = new GeometryPoint2d(basePoint)
          prompt.jig = new ApplicationLineJig(context.view, basePoint)
        }
        // AutoCAD LINE: Enter at "next point" ends the command without adding a segment.
        prompt.allowNone = true
        return prompt
      }

      /**
       * Handles point/keyword input and controls loop continuation.
       *
       * @param result - Point prompt result for this step.
       * @returns State-machine step result.
       */
      async handleResult(result: EditorPromptPointResult): Promise<StepResult> {
        if (result.status === EditorPromptStatus.OK) {
          appendSegment(result.value!)
          return 'continue'
        }
        if (result.status === EditorPromptStatus.Keyword) {
          const keyword = result.stringResult ?? ''
          if (keyword === 'Close' && points.length > 1) {
            closeSegment()
            return 'finish'
          }
          return 'continue'
        }
        return 'finish'
      }
    }

    const machine = new EditorPromptStateMachine<
      EditorPromptPointOptions,
      EditorPromptPointResult
    >()
    machine.setState(new NextPointState())
    await machine.run(prompt => ApplicationDocManager.instance.editor.getPoint(prompt))
    syncLastEndpoint()
  }
}
