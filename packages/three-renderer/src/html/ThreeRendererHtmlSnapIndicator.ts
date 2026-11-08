import { CommonColor } from '@mlightcad/common'

import { threeRendererHtmlCssColor } from './ThreeRendererHtmlColorUtil'
import { ThreeRendererHtmlElement, type ThreeRendererHtmlElementOptions } from './ThreeRendererHtmlElement'

/**
 * Options for a square snap marker.
 */
export interface ThreeRendererHtmlSnapIndicatorOptions extends ThreeRendererHtmlElementOptions {
  /** Border color of the snap square */
  color: CommonColor
}

/**
 * Small square HTML marker used to show a custom snap lock point during jigs.
 */
export class ThreeRendererHtmlSnapIndicator extends ThreeRendererHtmlElement {
  constructor(options: ThreeRendererHtmlSnapIndicatorOptions) {
    super(ThreeRendererHtmlSnapIndicator.createElement(options.color), options)
  }

  private static createElement(color: CommonColor): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'ml-html-snap-indicator'
    el.style.cssText =
      'width:10px;height:10px;border:2px solid ' +
      `${threeRendererHtmlCssColor(color)};background:transparent;` +
      'box-sizing:border-box;pointer-events:none;' +
      'transform:translate(-50%,-50%);'
    return el
  }
}
