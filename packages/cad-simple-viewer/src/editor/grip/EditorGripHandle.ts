import { GeometryPoint2dLike } from '@mlightcad/geometry-engine'
import { injectMlGripHandleCss } from '@mlightcad/three-renderer'

import {
  applyGripAppearanceToHost,
  type EditorGripAppearance} from './EditorGripAppearance'

/** Visual state of a grip handle. */
export type EditorGripHandleState = 'normal' | 'hover' | 'hot'

/**
 * Interactive DOM grip square rendered in container-local screen coordinates.
 */
export class EditorGripHandle {
  private readonly _el: HTMLElement
  private _state: EditorGripHandleState = 'normal'

  constructor(
    private readonly _host: HTMLElement,
    appearance: EditorGripAppearance
  ) {
    injectMlGripHandleCss()

    const hostPosition = getComputedStyle(this._host).position
    if (hostPosition === 'static') {
      this._host.style.position = 'relative'
    }

    this._el = document.createElement('div')
    this._el.className = 'ml-grip-handle ml-grip-handle-normal'
    this.applyAppearance(appearance)
    this._host.appendChild(this._el)
  }

  get element(): HTMLElement {
    return this._el
  }

  get state(): EditorGripHandleState {
    return this._state
  }

  setState(state: EditorGripHandleState) {
    if (this._state === state) return
    this._state = state
    this._el.className = `ml-grip-handle ml-grip-handle-${state}`
  }

  setPosition(pos: GeometryPoint2dLike) {
    this._el.style.left = `${pos.x}px`
    this._el.style.top = `${pos.y}px`
  }

  applyAppearance(appearance: EditorGripAppearance) {
    applyGripAppearanceToHost(this._host, appearance)
  }

  destroy() {
    this._el.remove()
  }
}
