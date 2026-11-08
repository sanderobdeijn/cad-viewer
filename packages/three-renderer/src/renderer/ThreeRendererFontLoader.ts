import { DefaultFontLoader } from '@mlightcad/mtext-renderer'

import { ThreeRendererMTextRenderer } from './ThreeRendererMTextRenderer'

export class ThreeRendererFontLoader extends DefaultFontLoader {
  onFontUrlChanged(url: string): void {
    ThreeRendererMTextRenderer.getInstance().setFontUrl(url)
  }
}
