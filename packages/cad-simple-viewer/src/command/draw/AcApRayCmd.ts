import {
  AcDbRay,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGeTol
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

function resolveUnitDirection(
  start: AcGePoint2dLike,
  through: AcGePoint2dLike
): AcGePoint2d | undefined {
  const direction = new AcGePoint2d(through).sub(start)
  if (!AcGeTol.isPositive(direction.length())) return undefined
  return direction.normalize()
}

/**
 * Dynamic preview jig for RAY command.
 */
class AcApRayJig extends AcEdPreviewJig<AcGePoint2dLike> {
  private readonly _startPoint: AcGePoint2d
  private readonly _ray: AcDbRay

  constructor(view: AcEdBaseView, start: AcGePoint2dLike) {
    super(view)
    this._startPoint = new AcGePoint2d(start)
    this._ray = new AcDbRay()
    this._ray.basePoint = new AcGePoint2d(start)
    this._ray.unitDir = new AcGePoint2d(1, 0)
  }

  get entity() {
    return this._ray
  }

  update(point: AcGePoint2dLike) {
    const unitDir = resolveUnitDirection(this._startPoint, point)
    if (!unitDir) return
    this._ray.basePoint = new AcGePoint2d(this._startPoint)
    this._ray.unitDir = unitDir
  }
}

/**
 * Command to create one or more rays from a common start point.
 */
export class AcApRayCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const db = context.doc.database
    const startPointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.ray.startPoint')
    )
    const startPointResult =
      await AcApDocManager.instance.editor.getPoint(startPointPrompt)
    if (startPointResult.status !== AcEdPromptStatus.OK) return

    const startPoint = new AcGePoint2d(startPointResult.value!)

    while (true) {
      const throughPointPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.ray.throughPoint')
      )
      throughPointPrompt.useDashedLine = true
      throughPointPrompt.useBasePoint = true
      throughPointPrompt.basePoint = new AcGePoint2d(startPoint)
      throughPointPrompt.jig = new AcApRayJig(context.view, startPoint)

      const throughPointResult =
        await AcApDocManager.instance.editor.getPoint(throughPointPrompt)
      if (throughPointResult.status !== AcEdPromptStatus.OK) break

      const unitDir = resolveUnitDirection(
        startPoint,
        throughPointResult.value!
      )
      if (!unitDir) continue

      const ray = new AcDbRay()
      ray.basePoint = new AcGePoint2d(startPoint)
      ray.unitDir = unitDir
      db.tables.blockTable.modelSpace.appendEntity(ray)
    }
  }
}
