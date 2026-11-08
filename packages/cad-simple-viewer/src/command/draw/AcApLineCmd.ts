import { AcDbLine } from '@mlightcad/data-model'
import {
  GeometryPoint2d,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdPromptPointResult,
  AcEdPromptState,
  AcEdPromptStateMachine,
  AcEdPromptStateStep,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

/**
 * Dynamic preview jig for LINE command.
 */
export class AcApLineJig extends AcEdPreviewJig<GeometryPoint2dLike> {
  /**
   * Transient line entity reused during interactive preview.
   */
  private _line: AcDbLine

  /**
   * Creates a line jig.
   *
   * @param view - The associated view
   */
  constructor(view: AcEdBaseView, start: GeometryPoint2dLike) {
    super(view)
    this._line = new AcDbLine(start, start)
  }

  /**
   * Gets transient line entity used by this jig.
   */
  get entity(): AcDbLine {
    return this._line
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
export class AcApLineCmd extends AcEdCommand {
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
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Command entry point.
   *
   * Supports chained point input with a `Close` option.
   *
   * @param context - Current application/document context.
   */
  async execute(context: AcApContext) {
    const points: GeometryPoint2d[] = []
    const hasContinuePoint = () => !!AcApLineCmd._lastEndpoint
    const getContinuePoint = () =>
      AcApLineCmd._lastEndpoint
        ? new GeometryPoint2d(AcApLineCmd._lastEndpoint)
        : undefined
    const syncLastEndpoint = () => {
      const current = getCurrentPoint()
      if (current) {
        AcApLineCmd._lastEndpoint = new GeometryPoint2d(current)
      }
    }
    const appendPoint = (point: GeometryPoint2dLike) => {
      points.push(new GeometryPoint2d(point))
    }
    const getCurrentPoint = () => points[points.length - 1]
    const appendSegment = (endPoint: GeometryPoint2dLike) => {
      const startPoint = getCurrentPoint()
      if (!startPoint) return
      const segment = new AcDbLine(new GeometryPoint2d(startPoint), endPoint)
      context.doc.modelSync.add(segment)
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

    const startPointPrompt = new AcEdPromptPointOptions(
      hasContinuePoint()
        ? AcApI18n.t('jig.line.firstPointOrContinue')
        : AcApI18n.t('jig.line.firstPoint')
    )
    if (hasContinuePoint()) {
      startPointPrompt.keywords.add(
        AcApI18n.t('jig.line.keywords.continue.display'),
        AcApI18n.t('jig.line.keywords.continue.global'),
        AcApI18n.t('jig.line.keywords.continue.local')
      )
    }
    const startPointResult =
      await AcApDocManager.instance.editor.getPoint(startPointPrompt)
    if (startPointResult.status === AcEdPromptStatus.OK) {
      appendPoint(startPointResult.value!)
    } else if (
      startPointResult.status === AcEdPromptStatus.Keyword &&
      startPointResult.stringResult === 'Continue' &&
      hasContinuePoint()
    ) {
      appendPoint(getContinuePoint()!)
    } else {
      return
    }

    type LineState = AcEdPromptState<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >
    type StepResult = AcEdPromptStateStep
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
        const prompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.line.nextPointWithOptions')
        )
        if (points.length > 1) {
          prompt.keywords.add(
            AcApI18n.t('jig.line.keywords.close.display'),
            AcApI18n.t('jig.line.keywords.close.global'),
            AcApI18n.t('jig.line.keywords.close.local')
          )
        }
        const basePoint = getCurrentPoint()
        if (basePoint) {
          prompt.useDashedLine = true
          prompt.useBasePoint = true
          prompt.basePoint = new GeometryPoint2d(basePoint)
          prompt.jig = new AcApLineJig(context.view, basePoint)
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
      async handleResult(result: AcEdPromptPointResult): Promise<StepResult> {
        if (result.status === AcEdPromptStatus.OK) {
          appendSegment(result.value!)
          return 'continue'
        }
        if (result.status === AcEdPromptStatus.Keyword) {
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

    const machine = new AcEdPromptStateMachine<
      AcEdPromptPointOptions,
      AcEdPromptPointResult
    >()
    machine.setState(new NextPointState())
    await machine.run(prompt => AcApDocManager.instance.editor.getPoint(prompt))
    syncLastEndpoint()
  }
}
