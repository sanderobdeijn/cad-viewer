import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'

import type { ApplicationItemContents } from '../../model/ApplicationItemGeometry'
import { EditorOsnapResolver } from '../input/EditorOsnapResolver'
import { EditorMarkerManager } from '../input/marker'
import { EditorBaseView } from '../view/EditorBaseView'
import { EditorGripPreviewJig } from './EditorGripPreviewJig'

/** Moves the grip of an item by an offset, changing the drawing. */
export type EditorGripMove = (
  entityId: string,
  gripIndex: number,
  offset: GeometryPoint2dLike
) => void

export interface EditorGripEditTarget {
  entityId: string
  gripIndex: number
  gripBaseWcs: GeometryPoint2dLike
}

/**
 * Handles an in-progress grip drag: preview on move, commit or cancel on end.
 */
export class EditorGripEditSession {
  private readonly _view: EditorBaseView
  private readonly _target: EditorGripEditTarget
  private readonly _jig: EditorGripPreviewJig
  private readonly _onEnd: () => void
  private readonly _moveGrip: EditorGripMove
  private readonly _osnapMarkerManager: EditorMarkerManager

  private _boundMouseMove = (e: MouseEvent) => this.onMouseMove(e)
  private _boundMouseUp = (e: MouseEvent) => this.onMouseUp(e)
  private _boundKeyDown = (e: KeyboardEvent) => this.onKeyDown(e)

  constructor(
    view: EditorBaseView,
    item: ApplicationItemContents,
    target: EditorGripEditTarget,
    onEnd: () => void,
    moveGrip: EditorGripMove
  ) {
    this._view = view
    this._target = target
    this._onEnd = onEnd
    this._moveGrip = moveGrip
    this._osnapMarkerManager = new EditorMarkerManager(view)
    this._jig = new EditorGripPreviewJig(
      view,
      item,
      target.gripIndex,
      target.gripBaseWcs
    )

    document.addEventListener('mousemove', this._boundMouseMove)
    document.addEventListener('mouseup', this._boundMouseUp)
    document.addEventListener('keydown', this._boundKeyDown)
  }

  onMouseMove(e: MouseEvent) {
    const wcs = this.resolveWcs(e)
    this._jig.update(wcs)
    this._jig.render()
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button !== 0) return
    const wcs = this.resolveWcs(e)
    const offset = this._jig.computeOffset(wcs)
    this._moveGrip(this._target.entityId, this._target.gripIndex, offset)
    this.finish()
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return
    e.preventDefault()
    this.cancel()
  }

  cancel() {
    this.finish()
  }

  private finish() {
    this._jig.end()
    this._osnapMarkerManager.clear()
    this._view.osnapResolver.clearAcquiredCenters()
    document.removeEventListener('mousemove', this._boundMouseMove)
    document.removeEventListener('mouseup', this._boundMouseUp)
    document.removeEventListener('keydown', this._boundKeyDown)
    this._onEnd()
  }

  private resolveWcs(e: MouseEvent): GeometryPoint2dLike {
    const canvasPos = this._view.viewportToCanvas({
      x: e.clientX,
      y: e.clientY
    })
    const wcs = this._view.screenToWorld(canvasPos)
    const cursorWcs = { x: wcs.x, y: wcs.y }

    const snapPoint = this._view.osnapResolver.resolve({
      cursorWcs,
      lastPoint: this._target.gripBaseWcs
    })
    this._osnapMarkerManager.setHintMarkers(
      EditorOsnapResolver.displayCenterMarks(
        this._view.osnapResolver.acquiredCenterMarks,
        snapPoint
      )
    )

    if (snapPoint) {
      this._osnapMarkerManager.showOrRepositionMarker(
        snapPoint,
        EditorOsnapResolver.osnapModeToMarkerType(snapPoint.type)
      )
      return { x: snapPoint.x, y: snapPoint.y }
    }

    this._osnapMarkerManager.hideMarker()
    return cursorWcs
  }
}
