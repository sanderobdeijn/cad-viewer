import { AcGePoint2d, AcGeVector3d } from '@mlightcad/geometry-engine'

export enum AcGiRenderMode {
  OPTIMIZED_2D = 0, // classic 2D
  WIREFRAME = 1,
  HIDDEN_LINE = 2,
  FLAT_SHADED = 3,
  GOURAUD_SHADED = 4,
  FLAT_SHADED_WITH_WIREFRAME = 5,
  GOURAUD_SHADED_WITH_WIREFRAME = 6
}

export enum AcGiOrthographicType {
  NON_ORTHOGRAPHIC = 0,
  TOP = 1,
  BOTTOM = 2,
  FRONT = 3,
  BACK = 4,
  LEFT = 5,
  RIGHT = 6
}

export enum AcGiDefaultLightingType {
  ONE_DISTANT_LIGHT = 0,
  TWO_DISTANT_LIGHTS = 1
}

export interface AcGiView {
  center: AcGePoint2d
  viewDirectionFromTarget: AcGeVector3d
  viewTarget: AcGePoint2d
  lensLength: number
  frontClippingPlane: number
  backClippingPlane: number
  viewHeight: number
  viewTwistAngle: number
  frozenLayers: string[]
  styleSheet: string
  renderMode: AcGiRenderMode
  viewMode: number
  ucsIconSetting: number
  ucsOrigin: AcGePoint2d
  ucsXAxis: AcGePoint2d
  ucsYAxis: AcGePoint2d
  orthographicType: AcGiOrthographicType
  shadePlotSetting: number
  shadePlotObjectId?: string
  visualStyleObjectId?: string
  isDefaultLightingOn: boolean
  defaultLightingType: AcGiDefaultLightingType
  brightness: number
  contrast: number
  ambientColor?: number
  /** View width divided by view height (VPORT DXF group 41). */
  aspectRatio?: number
}
