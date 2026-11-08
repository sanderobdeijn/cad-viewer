import type { ModelItem } from '@mlightcad/geometry-engine'
import {
  GeometryMatrix3d,
  GeometryPoint2d,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'

import { ApplicationContext, ApplicationDocManager } from '../../app'
import {
  EditorCommand,
  EditorOpenMode,
  EditorPromptIntegerOptions,
  EditorPromptKeywordOptions,
  EditorPromptPointOptions,
  EditorPromptStatus,
  scaleCopyDisplacement
} from '../../editor'
import { ApplicationI18n } from '../../i18n'
import {
  type ApplicationItemContents,
  transformItem
} from '../../model/ApplicationItemGeometry'
import { resolveSelectedItems } from '../../service'
import { ApplicationCopyPreviewJig } from './ApplicationCopyPreviewJig'

type CopyMode = 'Single' | 'Multiple'

interface CopyArrayPlacement {
  copyCount: number
  endPoint: GeometryPoint2d
  fitMode: boolean
}

/**
 * Command to copy selected entities by cloning and translating them.
 *
 * Supported AutoCAD-like workflow:
 * 1) Select entities (or reuse preselection),
 * 2) Specify base point or choose `Displacement` / `Mode` / `Multiple`,
 * 3) Specify placement point, or create an evenly spaced array,
 * 4) Append cloned copies without modifying the originals.
 */
export class ApplicationCopyCmd extends EditorCommand {
  private static _defaultMode: CopyMode = 'Multiple'

  /**
   * Creates the COPY command. Drawing geometry may only be copied in Write mode.
   */
  constructor() {
    super()
    this.mode = EditorOpenMode.Write
  }

  /**
   * Adds one localized keyword entry to a point/keyword prompt.
   *
   * @param prompt - Prompt instance that should expose the keyword.
   * @param key - Translation key suffix describing which keyword to add.
   */
  private addKeyword(
    prompt: EditorPromptPointOptions | EditorPromptKeywordOptions,
    key: 'array' | 'displacement' | 'fit' | 'mode' | 'multiple' | 'single'
  ) {
    prompt.keywords.add(
      ApplicationI18n.t(`jig.copy.keywords.${key}.display`),
      ApplicationI18n.t(`jig.copy.keywords.${key}.global`),
      ApplicationI18n.t(`jig.copy.keywords.${key}.local`)
    )
  }

  /**
   * Computes the vector from a copy base point to a target point.
   *
   * @param basePoint - Copy base point.
   * @param targetPoint - Destination point selected by the user.
   * @returns Translation vector that moves a clone from base to target.
   */
  private computeDisplacement(
    basePoint: GeometryPoint2dLike,
    targetPoint: GeometryPoint2dLike
  ) {
    return new GeometryPoint2d(targetPoint).sub(basePoint)
  }

  /**
   * Scales a displacement for one copy in a repeated copy/array operation.
   *
   * @param displacement - Raw placement displacement from the base point.
   * @param factor - One-based copy index.
   * @param copyCount - Total number of copies to generate.
   * @param fitMode - Whether indexed copies should be distributed across the full span.
   * @returns Displacement assigned to the requested copy index.
   */
  private scaleDisplacement(
    displacement: GeometryPoint2dLike,
    factor: number,
    copyCount: number,
    fitMode: boolean
  ) {
    return scaleCopyDisplacement(displacement, factor, copyCount, fitMode)
  }

  /**
   * Adds cloned entities to the drawing. The view follows the model, so each
   * placement shows while the COPY loop continues.
   *
   * @param context - Active command context
   * @param copies - Cloned entities to add
   */
  private appendCopies(context: ApplicationContext, copies: ApplicationItemContents[]) {
    if (copies.length === 0) {
      return
    }
    context.doc.modelSync.addItems(copies)
  }

  /**
   * Clones source entities and translates each clone batch into its final position.
   *
   * @param sourceEntities - Entities to duplicate.
   * @param displacement - Raw placement displacement from base point to end point.
   * @param copyCount - Number of translated copy batches to produce.
   * @param fitMode - Whether batches should be distributed evenly across the full displacement.
   * @returns Newly cloned and transformed entities ready to append to model space.
   */
  private buildCopies(
    sourceEntities: ModelItem[],
    displacement: GeometryPoint2dLike,
    copyCount: number = 1,
    fitMode: boolean = false
  ) {
    const copies: ApplicationItemContents[] = []

    for (let factor = 1; factor <= copyCount; factor++) {
      const stepDisplacement = this.scaleDisplacement(
        displacement,
        factor,
        copyCount,
        fitMode
      )
      const matrix = new GeometryMatrix3d().makeTranslation(
        stepDisplacement.x,
        stepDisplacement.y,
        0
      )
      copies.push(...sourceEntities.map(item => transformItem(item, matrix)))
    }

    return copies
  }

  /**
   * Prompts the user to choose between single-copy and repeated-copy behavior.
   *
   * @param currentMode - Mode shown as the current default in the prompt.
   * @returns Selected mode, the current mode on empty input, or `undefined` on cancel/error.
   */
  private async promptCopyMode(currentMode: CopyMode) {
    const prompt = new EditorPromptKeywordOptions(
      ApplicationI18n.t('jig.copy.modePrompt')
    )
    prompt.allowNone = true
    this.addKeyword(prompt, 'single')
    this.addKeyword(prompt, 'multiple')
    const defaultKeyword = prompt.keywords.findByGlobalName(currentMode)
    if (defaultKeyword) {
      prompt.keywords.default = defaultKeyword
    }

    const result = await ApplicationDocManager.instance.editor.getKeywords(prompt)
    if (result.status === EditorPromptStatus.None) {
      return currentMode
    }
    if (result.status !== EditorPromptStatus.OK) {
      return undefined
    }

    const keyword = result.stringResult ?? ''
    if (keyword === 'Single' || keyword === 'Multiple') {
      return keyword
    }
    return currentMode
  }

  /**
   * Collects array placement settings for the `Array` COPY option.
   *
   * The routine first asks for the number of items, then asks for the final
   * placement point. If the user chooses `Fit`, the returned placement marks
   * copies as evenly distributed across the overall span.
   *
   * @param context - Current application/document context.
   * @param sourceEntities - Entities used to build the transient preview.
   * @param basePoint - Array start point shared by all placements.
   * @returns Array placement settings, or `undefined` when input is canceled.
   */
  private async promptArrayPlacement(
    context: ApplicationContext,
    sourceEntities: ModelItem[],
    basePoint: GeometryPoint2d
  ): Promise<CopyArrayPlacement | undefined> {
    const itemCountPrompt = new EditorPromptIntegerOptions(
      ApplicationI18n.t('jig.copy.arrayItemCount'),
      2
    )
    itemCountPrompt.lowerLimit = 2
    itemCountPrompt.allowNegative = false
    itemCountPrompt.allowZero = false

    const itemCountResult =
      await ApplicationDocManager.instance.editor.getInteger(itemCountPrompt)
    if (itemCountResult.status !== EditorPromptStatus.OK) {
      return undefined
    }

    const itemCount = itemCountResult.value ?? 2
    const copyCount = Math.max(1, itemCount - 1)

    while (true) {
      const pointPrompt = new EditorPromptPointOptions(
        ApplicationI18n.t('jig.copy.arraySecondPointOrFit')
      )
      this.addKeyword(pointPrompt, 'fit')
      pointPrompt.useBasePoint = true
      pointPrompt.useDashedLine = true
      pointPrompt.basePoint = basePoint
      pointPrompt.jig = new ApplicationCopyPreviewJig(
        context.view,
        sourceEntities,
        basePoint,
        copyCount
      )

      const pointResult =
        await ApplicationDocManager.instance.editor.getPoint(pointPrompt)
      if (pointResult.status === EditorPromptStatus.OK) {
        return {
          copyCount,
          endPoint: new GeometryPoint2d(pointResult.value!),
          fitMode: false
        }
      }

      if (
        pointResult.status === EditorPromptStatus.Keyword &&
        pointResult.stringResult === 'Fit'
      ) {
        const fitPrompt = new EditorPromptPointOptions(
          ApplicationI18n.t('jig.copy.arrayFitSecondPoint')
        )
        fitPrompt.useBasePoint = true
        fitPrompt.useDashedLine = true
        fitPrompt.basePoint = basePoint
        fitPrompt.jig = new ApplicationCopyPreviewJig(
          context.view,
          sourceEntities,
          basePoint,
          copyCount,
          true
        )

        const fitResult =
          await ApplicationDocManager.instance.editor.getPoint(fitPrompt)
        if (fitResult.status === EditorPromptStatus.OK) {
          return {
            copyCount,
            endPoint: new GeometryPoint2d(fitResult.value!),
            fitMode: true
          }
        }
      }

      return undefined
    }
  }

  /**
   * Runs the placement loop that repeatedly creates copies until the command ends.
   *
   * @param context - Current application/document context.
   * @param sourceEntities - Entities selected for copying.
   * @param basePoint - Base/displacement point used by the current copy session.
   * @param copyMode - Whether the loop should stop after one placement or continue.
   * @param useDisplacementPrompt - Whether prompt text should describe displacement instead of second point placement.
   */
  private async executeCopyLoop(
    context: ApplicationContext,
    sourceEntities: ModelItem[],
    basePoint: GeometryPoint2d,
    copyMode: CopyMode,
    useDisplacementPrompt: boolean = false
  ) {
    while (true) {
      const pointPrompt = new EditorPromptPointOptions(
        ApplicationI18n.t(
          useDisplacementPrompt
            ? 'jig.copy.displacementOrArray'
            : 'jig.copy.secondPointOrArray'
        )
      )
      this.addKeyword(pointPrompt, 'array')
      pointPrompt.useBasePoint = true
      pointPrompt.useDashedLine = true
      pointPrompt.basePoint = basePoint
      // AutoCAD COPY: Enter at placement prompt ends without adding another copy.
      pointPrompt.allowNone = true
      pointPrompt.jig = new ApplicationCopyPreviewJig(
        context.view,
        sourceEntities,
        basePoint
      )

      const pointResult =
        await ApplicationDocManager.instance.editor.getPoint(pointPrompt)
      if (pointResult.status === EditorPromptStatus.OK) {
        const copies = this.buildCopies(
          sourceEntities,
          this.computeDisplacement(basePoint, pointResult.value!)
        )
        this.appendCopies(context, copies)
        if (copyMode === 'Single') return
        continue
      }

      if (
        pointResult.status === EditorPromptStatus.Keyword &&
        pointResult.stringResult === 'Array'
      ) {
        const placement = await this.promptArrayPlacement(
          context,
          sourceEntities,
          basePoint
        )
        if (!placement) continue

        const copies = this.buildCopies(
          sourceEntities,
          this.computeDisplacement(basePoint, placement.endPoint),
          placement.copyCount,
          placement.fitMode
        )
        this.appendCopies(context, copies)
        if (copyMode === 'Single') return
        continue
      }

      return
    }
  }

  /**
   * Executes COPY using AutoCAD-like selection, base-point, and placement prompts.
   *
   * Existing selection is reused when available; otherwise the command requests
   * a new selection. The command then resolves copy mode/base point options and
   * appends cloned entities into model space for each accepted placement.
   *
   * @param context - Current application/document context.
   */
  async execute(context: ApplicationContext) {
    const selectionSet = context.view.selectionSet
    const resolved = await resolveSelectedItems(context, {
      promptKey: 'copy'
    })
    if (!resolved) return

    const sourceEntities = resolved.items
    if (sourceEntities.length === 0) {
      selectionSet.clear()
      return
    }

    let copyMode = ApplicationCopyCmd._defaultMode
    let basePoint: GeometryPoint2d | undefined
    let useDisplacementPrompt = false

    while (!basePoint) {
      const pointPrompt = new EditorPromptPointOptions(
        ApplicationI18n.t('jig.copy.basePointOrOptions')
      )
      pointPrompt.allowNone = true
      this.addKeyword(pointPrompt, 'displacement')
      this.addKeyword(pointPrompt, 'mode')
      if (copyMode !== 'Multiple') {
        this.addKeyword(pointPrompt, 'multiple')
      }

      const pointResult =
        await ApplicationDocManager.instance.editor.getPoint(pointPrompt)
      if (pointResult.status === EditorPromptStatus.OK) {
        basePoint = new GeometryPoint2d(pointResult.value!)
        break
      }

      if (pointResult.status === EditorPromptStatus.None) {
        basePoint = new GeometryPoint2d(0, 0)
        useDisplacementPrompt = true
        break
      }

      if (pointResult.status !== EditorPromptStatus.Keyword) {
        selectionSet.clear()
        return
      }

      const keyword = pointResult.stringResult ?? ''
      if (keyword === 'Displacement') {
        basePoint = new GeometryPoint2d(0, 0)
        useDisplacementPrompt = true
        break
      }

      if (keyword === 'Multiple') {
        copyMode = 'Multiple'
        continue
      }

      if (keyword !== 'Mode') {
        selectionSet.clear()
        return
      }

      const modeResult = await this.promptCopyMode(copyMode)
      if (!modeResult) {
        selectionSet.clear()
        return
      }
      copyMode = modeResult
      ApplicationCopyCmd._defaultMode = modeResult
    }

    await this.executeCopyLoop(
      context,
      sourceEntities,
      basePoint,
      copyMode,
      useDisplacementPrompt
    )
    selectionSet.clear()
  }
}
