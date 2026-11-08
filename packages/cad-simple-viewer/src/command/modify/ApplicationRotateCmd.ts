import type { ModelItem } from '@mlightcad/geometry-engine'
import {
  GeometryPoint2d,
  GeometryPoint2dLike,
  GeometryTol
} from '@mlightcad/geometry-engine'

import { ApplicationContext, ApplicationDocManager } from '../../app'
import {
  EditorCommand,
  EditorOpenMode,
  EditorPromptAngleOptions,
  EditorPromptPointOptions,
  EditorPromptStatus
} from '../../editor'
import { ApplicationI18n } from '../../i18n'
import { resolveSelectedItems } from '../../service'
import { createRotationMatrix } from '../../util/ApplicationGeTransform'
import {
  ApplicationRotatePreviewJig,
  ApplicationRotateStaticJig
} from './ApplicationRotatePreviewJig'

/**
 * Command to rotate selected entities around a base point.
 *
 * Supported workflow:
 * 1) Select entities (or reuse preselection),
 * 2) Specify base point,
 * 3) Specify rotation angle, or choose `Copy` / `Reference`,
 * 4) Apply rotation to originals or append rotated copies.
 */
export class ApplicationRotateCmd extends EditorCommand {
  /**
   * Creates the ROTATE command. Drawing geometry may only be rotated in Write mode.
   */
  constructor() {
    super()
    this.mode = EditorOpenMode.Write
  }

  /**
   * Builds a world-space rotation matrix around a given base point.
   *
   * @param basePoint - Rotation origin.
   * @param angleRad - Rotation angle in radians.
   * @returns Composite transform that rotates around `basePoint`.
   */
  static createRotationMatrix = createRotationMatrix

  /**
   * Adds one localized ROTATE keyword to an angle prompt.
   *
   * @param prompt - Angle prompt that should expose the keyword.
   * @param key - Translation key suffix describing which keyword to add.
   */
  private addKeyword(
    prompt: EditorPromptAngleOptions,
    key: 'copy' | 'reference' | 'points'
  ) {
    prompt.keywords.add(
      ApplicationI18n.t(`jig.rotate.keywords.${key}.display`),
      ApplicationI18n.t(`jig.rotate.keywords.${key}.global`),
      ApplicationI18n.t(`jig.rotate.keywords.${key}.local`)
    )
  }

  /**
   * Shows a localized warning for invalid reference-point input.
   *
   * @param key - Warning message key suffix.
   */
  private warnInvalidInput(key: 'referencePoints') {
    this.notify(ApplicationI18n.t(`jig.rotate.invalid.${key}`), 'warning')
  }

  /**
   * Computes the planar direction angle from one point to another.
   *
   * @param start - Start/reference point.
   * @param end - End/target point.
   * @returns Direction angle in degrees, or `undefined` when points are coincident.
   */
  private computeAngleDeg(
    start: GeometryPoint2dLike,
    end: GeometryPoint2dLike
  ): number | undefined {
    const dx = end.x - start.x
    const dy = end.y - start.y
    if (!GeometryTol.isPositive(Math.hypot(dx, dy))) return undefined
    return (Math.atan2(dy, dx) * 180) / Math.PI
  }

  /**
   * Prompts for a reference angle used by the ROTATE `Reference` option.
   *
   * The user can either enter the angle directly or define it from two points.
   * When the point-based definition is degenerate, the command warns and asks again.
   *
   * @param context - Current application/document context.
   * @param sourceEntities - Entities used to build transient preview geometry.
   * @param basePoint - Rotation base point shared by subsequent angle prompts.
   * @returns Reference angle in degrees, or `undefined` when input is canceled.
   */
  private async promptReferenceAngle(
    context: ApplicationContext,
    sourceEntities: ModelItem[],
    basePoint: GeometryPoint2d
  ): Promise<number | undefined> {
    while (true) {
      const prompt = new EditorPromptAngleOptions(
        ApplicationI18n.t('jig.rotate.referenceAngleOrPoints')
      )
      this.addKeyword(prompt, 'points')
      prompt.useBasePoint = true
      prompt.useDashedLine = true
      prompt.basePoint = basePoint
      prompt.allowNegative = true
      prompt.allowZero = true
      prompt.useDefaultValue = true
      prompt.defaultValue = 0
      prompt.jig = new ApplicationRotateStaticJig<number>(context.view, sourceEntities)

      const result = await ApplicationDocManager.instance.editor.getAngle(prompt)
      if (result.status === EditorPromptStatus.OK) {
        return result.value ?? 0
      }
      if (
        result.status === EditorPromptStatus.Keyword &&
        result.stringResult === 'Points'
      ) {
        const firstPrompt = new EditorPromptPointOptions(
          ApplicationI18n.t('jig.rotate.firstReferencePoint')
        )
        firstPrompt.jig = new ApplicationRotateStaticJig<GeometryPoint2d>(
          context.view,
          sourceEntities
        )
        const firstResult =
          await ApplicationDocManager.instance.editor.getPoint(firstPrompt)
        if (firstResult.status !== EditorPromptStatus.OK) return undefined

        const secondPrompt = new EditorPromptPointOptions(
          ApplicationI18n.t('jig.rotate.secondReferencePoint')
        )
        secondPrompt.useBasePoint = true
        secondPrompt.useDashedLine = true
        secondPrompt.basePoint = new GeometryPoint2d(firstResult.value!)
        secondPrompt.jig = new ApplicationRotateStaticJig<GeometryPoint2d>(
          context.view,
          sourceEntities
        )
        const secondResult =
          await ApplicationDocManager.instance.editor.getPoint(secondPrompt)
        if (secondResult.status !== EditorPromptStatus.OK) return undefined

        const angle = this.computeAngleDeg(
          firstResult.value!,
          secondResult.value!
        )
        if (angle == null) {
          this.warnInvalidInput('referencePoints')
          continue
        }
        return angle
      }
      return undefined
    }
  }

  /**
   * Prompts for the final rotation angle and optional ROTATE sub-modes.
   *
   * The prompt supports `Copy` to preserve originals and `Reference` to derive
   * the final rotation from an existing angle and a new target angle.
   *
   * @param context - Current application/document context.
   * @param sourceEntities - Entities selected for rotation.
   * @param basePoint - Rotation base point.
   * @returns Rotation settings, or `undefined` when input is canceled.
   */
  private async promptRotationAngle(
    context: ApplicationContext,
    sourceEntities: ModelItem[],
    basePoint: GeometryPoint2d
  ) {
    let copyMode = false

    while (true) {
      const prompt = new EditorPromptAngleOptions(
        ApplicationI18n.t('jig.rotate.rotationAngleOrOptions')
      )
      this.addKeyword(prompt, 'copy')
      this.addKeyword(prompt, 'reference')
      prompt.useBasePoint = true
      prompt.useDashedLine = true
      prompt.basePoint = basePoint
      prompt.allowNegative = true
      prompt.allowZero = true
      // AutoCAD ROTATE: Enter at angle prompt ends without rotating.
      prompt.allowNone = true
      prompt.jig = new ApplicationRotatePreviewJig(
        context.view,
        sourceEntities,
        basePoint
      )

      const result = await ApplicationDocManager.instance.editor.getAngle(prompt)
      if (result.status === EditorPromptStatus.OK) {
        return {
          copyMode,
          angleRad: ((result.value ?? 0) * Math.PI) / 180
        }
      }

      if (result.status !== EditorPromptStatus.Keyword) return undefined

      const keyword = result.stringResult ?? ''
      if (keyword === 'Copy') {
        copyMode = true
        continue
      }

      if (keyword !== 'Reference') return undefined

      const referenceAngleDeg = await this.promptReferenceAngle(
        context,
        sourceEntities,
        basePoint
      )
      if (referenceAngleDeg == null) return undefined

      const newAnglePrompt = new EditorPromptAngleOptions(
        ApplicationI18n.t('jig.rotate.newAngle')
      )
      newAnglePrompt.useBasePoint = true
      newAnglePrompt.useDashedLine = true
      newAnglePrompt.basePoint = basePoint
      newAnglePrompt.allowNegative = true
      newAnglePrompt.allowZero = true
      newAnglePrompt.allowNone = true
      newAnglePrompt.jig = new ApplicationRotatePreviewJig(
        context.view,
        sourceEntities,
        basePoint,
        referenceAngleDeg
      )

      const newAngleResult =
        await ApplicationDocManager.instance.editor.getAngle(newAnglePrompt)
      if (newAngleResult.status !== EditorPromptStatus.OK) return undefined

      return {
        copyMode,
        angleRad:
          (((newAngleResult.value ?? 0) - referenceAngleDeg) * Math.PI) / 180
      }
    }
  }

  /**
   * Executes ROTATE using selection reuse, base-point input, and angle prompts.
   *
   * The command rotates the original entities in place unless the user chooses
   * `Copy`, in which case rotated clones are appended to model space instead.
   *
   * @param context - Current application/document context.
   */
  async execute(context: ApplicationContext) {
    const selectionSet = context.view.selectionSet
    const resolved = await resolveSelectedItems(context, {
      promptKey: 'rotate'
    })
    if (!resolved) return

    const { items: sourceEntities } = resolved

    const basePointPrompt = new EditorPromptPointOptions(
      ApplicationI18n.t('jig.rotate.basePoint')
    )
    basePointPrompt.jig = new ApplicationRotateStaticJig<GeometryPoint2d>(
      context.view,
      sourceEntities
    )
    // AutoCAD ROTATE: Enter at base point cancels without rotating.
    basePointPrompt.allowNone = true
    const basePointResult =
      await ApplicationDocManager.instance.editor.getPoint(basePointPrompt)
    if (basePointResult.status !== EditorPromptStatus.OK) {
      selectionSet.clear()
      return
    }

    const basePoint = new GeometryPoint2d(basePointResult.value!)
    const rotation = await this.promptRotationAngle(
      context,
      sourceEntities,
      basePoint
    )
    if (!rotation) {
      selectionSet.clear()
      return
    }

    const matrix = createRotationMatrix(basePoint, rotation.angleRad)

    const entityService = context.doc.entityService
    if (rotation.copyMode) {
      entityService.cloneAndTransform(sourceEntities, matrix)
    } else {
      entityService.transformItems(sourceEntities, matrix)
    }

    selectionSet.clear()
  }
}
