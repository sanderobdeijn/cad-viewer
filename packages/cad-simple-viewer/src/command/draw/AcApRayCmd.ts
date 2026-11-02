import {
  AcDbRay,
  GeometryPoint2d,
  GeometryPoint2dLike,
  GeometryTol
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
  start: GeometryPoint2dLike,
  through: GeometryPoint2dLike
): GeometryPoint2d | undefined {
  const direction = new GeometryPoint2d(through).sub(start)
  if (!GeometryTol.isPositive(direction.length())) return undefined
  return direction.normalize()
}

/**
 * Dynamic preview jig for RAY command.
 */
class AcApRayJig extends AcEdPreviewJig<GeometryPoint2dLike> {
  private readonly _startPoint: GeometryPoint2d
  private readonly _ray: AcDbRay

  constructor(view: AcEdBaseView, start: GeometryPoint2dLike) {
    super(view)
    this._startPoint = new GeometryPoint2d(start)
    this._ray = new AcDbRay()
    this._ray.basePoint = new GeometryPoint2d(start)
    this._ray.unitDir = new GeometryPoint2d(1, 0)
  }

  get entity() {
    return this._ray
  }

  update(point: GeometryPoint2dLike) {
    const unitDir = resolveUnitDirection(this._startPoint, point)
    if (!unitDir) return
    this._ray.basePoint = new GeometryPoint2d(this._startPoint)
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

    const startPoint = new GeometryPoint2d(startPointResult.value!)

    while (true) {
      const throughPointPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.ray.throughPoint')
      )
      throughPointPrompt.useDashedLine = true
      throughPointPrompt.useBasePoint = true
      throughPointPrompt.basePoint = new GeometryPoint2d(startPoint)
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
      ray.basePoint = new GeometryPoint2d(startPoint)
      ray.unitDir = unitDir
      db.tables.blockTable.modelSpace.appendEntity(ray)
    }
  }
}
