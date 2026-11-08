import * as THREE from 'three'

import { ThreeRendererRenderContext } from '../renderer/ThreeRendererRenderContext'
import { ThreeRendererStyleManager } from '../style/ThreeRendererStyleManager'

/**
 * Base class for all drawable object
 */
export class ThreeRendererObject extends THREE.Object3D {
  private _context: ThreeRendererRenderContext

  constructor(context: ThreeRendererRenderContext) {
    super()
    this._context = context
  }

  get renderContext() {
    return this._context
  }

  get styleManager(): ThreeRendererStyleManager {
    return this._context.styleManager
  }

  /**
   * @inheritdoc
   */
  copy(object: ThreeRendererObject, recursive?: boolean) {
    this._context = object._context
    return super.copy(object, recursive)
  }
}
