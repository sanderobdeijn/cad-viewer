import { ApplicationContext } from '../../app'
import { EditorCommand, EditorOpenMode } from '../../editor'
import type { ThreeRendererView2d } from '../../view'
import {
  isMeasurementVisible,
  setMeasurementVisible
} from './ApplicationMeasurementStore'

/**
 * Toggle measurement overlay visibility on the current layout.
 */
export class ApplicationMeasurementVisibilityCmd extends EditorCommand {
  constructor() {
    super()
    this.mode = EditorOpenMode.Read
  }

  async execute(context: ApplicationContext) {
    const view = context.view as ThreeRendererView2d
    setMeasurementVisible(view, !isMeasurementVisible())
  }
}
