import { CommonColor, CommonTransparency } from '@mlightcad/common'
import {
  GraphicsInterfaceLineWeight,
  GraphicsInterfaceSubEntityTraits
} from '@mlightcad/graphic-interface'

export class ThreeRendererSubEntityTraitsUtil {
  static createDefaultTraits(): GraphicsInterfaceSubEntityTraits {
    return {
      color: new CommonColor(),
      lineType: {
        type: 'ByLayer',
        name: 'Continuous',
        standardFlag: 0,
        description: 'Solid line',
        totalPatternLength: 0
      },
      lineTypeScale: 1,
      lineWeight: GraphicsInterfaceLineWeight.ByLayer,
      transparency: new CommonTransparency(),
      thickness: 0,
      layer: '0',
      drawOrder: 0
    }
  }
}
