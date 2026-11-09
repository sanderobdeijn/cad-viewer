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
        type: 'UserSpecified',
        name: 'Continuous',
        standardFlag: 0,
        description: 'Solid line',
        totalPatternLength: 0
      },
      lineTypeScale: 1,
      lineWeight: GraphicsInterfaceLineWeight.ByLineWeightDefault,
      transparency: new CommonTransparency(),
      thickness: 0,
      drawOrder: 0
    }
  }
}
