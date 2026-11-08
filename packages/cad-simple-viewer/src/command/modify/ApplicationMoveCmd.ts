import { GeometryPoint2d } from '@mlightcad/geometry-engine'

import { ApplicationContext, ApplicationDocManager } from '../../app'
import {
  EditorCommand,
  EditorOpenMode,
  EditorPromptPointOptions,
  EditorPromptPointResult,
  EditorPromptState,
  EditorPromptStateMachine,
  EditorPromptStateStep,
  EditorPromptStatus
} from '../../editor'
import { ApplicationI18n } from '../../i18n'
import { resolveSelectedItems } from '../../service'
import { ApplicationMovePreviewJig } from './ApplicationMovePreviewJig'

/**
 * Command to move selected entities by a displacement vector.
 */
export class ApplicationMoveCmd extends EditorCommand {
  constructor() {
    super()
    this.mode = EditorOpenMode.Write
  }

  async execute(context: ApplicationContext) {
    const selectionSet = context.view.selectionSet
    const resolved = await resolveSelectedItems(context, {
      promptKey: 'move'
    })
    if (!resolved) return

    const { items: sourceEntities } = resolved

    let basePoint: GeometryPoint2d | undefined
    let displacement: GeometryPoint2d | undefined

    type MoveState = EditorPromptState<
      EditorPromptPointOptions,
      EditorPromptPointResult
    >
    type MoveStep = EditorPromptStateStep
    type MoveMachine = EditorPromptStateMachine<
      EditorPromptPointOptions,
      EditorPromptPointResult
    >

    const createDisplacementKeyword = (prompt: EditorPromptPointOptions) => {
      prompt.keywords.add(
        ApplicationI18n.t('jig.move.keywords.displacement.display'),
        ApplicationI18n.t('jig.move.keywords.displacement.global'),
        ApplicationI18n.t('jig.move.keywords.displacement.local')
      )
    }

    class BasePointState implements MoveState {
      constructor(private machine: MoveMachine) {}

      buildPrompt() {
        const prompt = new EditorPromptPointOptions(
          ApplicationI18n.t('jig.move.basePointOrDisplacement')
        )
        createDisplacementKeyword(prompt)
        prompt.allowNone = true
        return prompt
      }

      async handleResult(result: EditorPromptPointResult): Promise<MoveStep> {
        if (result.status === EditorPromptStatus.OK) {
          basePoint = new GeometryPoint2d(result.value!)
          this.machine.setState(new SecondPointState(this.machine))
          return 'continue'
        }

        if (result.status === EditorPromptStatus.None) {
          this.machine.setState(new DisplacementState())
          return 'continue'
        }

        if (
          result.status === EditorPromptStatus.Keyword &&
          result.stringResult === 'Displacement'
        ) {
          this.machine.setState(new DisplacementState())
          return 'continue'
        }

        return 'finish'
      }
    }

    class SecondPointState implements MoveState {
      constructor(private machine: MoveMachine) {}

      buildPrompt() {
        const prompt = new EditorPromptPointOptions(
          ApplicationI18n.t('jig.move.secondPointOrDisplacement')
        )
        createDisplacementKeyword(prompt)
        if (basePoint) {
          prompt.useBasePoint = true
          prompt.useDashedLine = true
          prompt.basePoint = basePoint
          prompt.jig = new ApplicationMovePreviewJig(
            context.view,
            sourceEntities,
            basePoint
          )
        }
        prompt.allowNone = true
        return prompt
      }

      async handleResult(result: EditorPromptPointResult): Promise<MoveStep> {
        if (result.status === EditorPromptStatus.OK && basePoint) {
          const secondPoint = new GeometryPoint2d(result.value!)
          displacement = new GeometryPoint2d(secondPoint).sub(basePoint)
          return 'finish'
        }

        if (
          result.status === EditorPromptStatus.Keyword &&
          result.stringResult === 'Displacement'
        ) {
          this.machine.setState(new DisplacementState())
          return 'continue'
        }

        return 'finish'
      }
    }

    class DisplacementState implements MoveState {
      buildPrompt() {
        const prompt = new EditorPromptPointOptions(
          ApplicationI18n.t('jig.move.displacement')
        )
        prompt.useBasePoint = true
        prompt.useDashedLine = true
        prompt.basePoint = new GeometryPoint2d(0, 0)
        prompt.jig = new ApplicationMovePreviewJig(
          context.view,
          sourceEntities,
          prompt.basePoint
        )
        prompt.allowNone = true
        return prompt
      }

      async handleResult(result: EditorPromptPointResult): Promise<MoveStep> {
        if (result.status === EditorPromptStatus.OK) {
          displacement = new GeometryPoint2d(result.value!)
        }
        return 'finish'
      }
    }

    const machine = new EditorPromptStateMachine<
      EditorPromptPointOptions,
      EditorPromptPointResult
    >()
    machine.setState(new BasePointState(machine))
    await machine.run(prompt => ApplicationDocManager.instance.editor.getPoint(prompt))

    if (!displacement) {
      selectionSet.clear()
      return
    }

    context.doc.entityService.translateItems(sourceEntities, displacement)
    selectionSet.clear()
  }
}
