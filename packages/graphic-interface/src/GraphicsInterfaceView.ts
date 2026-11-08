import { GeometryPoint2d, GeometryVector3d } from '@mlightcad/geometry-engine'

export enum GraphicsInterfaceRenderMode {
  OPTIMIZED_2D = 0, // classic 2D
  WIREFRAME = 1,
  HIDDEN_LINE = 2,
  FLAT_SHADED = 3,
  GOURAUD_SHADED = 4,
  FLAT_SHADED_WITH_WIREFRAME = 5,
  GOURAUD_SHADED_WITH_WIREFRAME = 6
}

export enum GraphicsInterfaceOrthographicType {
  NON_ORTHOGRAPHIC = 0,
  TOP = 1,
  BOTTOM = 2,
  FRONT = 3,
  BACK = 4,
  LEFT = 5,
  RIGHT = 6
}

export enum GraphicsInterfaceDefaultLightingType {
  ONE_DISTANT_LIGHT = 0,
  TWO_DISTANT_LIGHTS = 1
}

export interface GraphicsInterfaceView {
  center: GeometryPoint2d
  viewDirectionFromTarget: GeometryVector3d
  viewTarget: GeometryPoint2d
  lensLength: number
  frontClippingPlane: number
  backClippingPlane: number
  viewHeight: number
  viewTwistAngle: number
  frozenLayers: string[]
  styleSheet: string
  renderMode: GraphicsInterfaceRenderMode
  viewMode: number
  ucsIconSetting: number
  ucsOrigin: GeometryPoint2d
  ucsXAxis: GeometryPoint2d
  ucsYAxis: GeometryPoint2d
  orthographicType: GraphicsInterfaceOrthographicType
  shadePlotSetting: number
  shadePlotObjectId?: string
  visualStyleObjectId?: string
  isDefaultLightingOn: boolean
  defaultLightingType: GraphicsInterfaceDefaultLightingType
  brightness: number
  contrast: number
  ambientColor?: number
  /** View width divided by view height (VPORT DXF group 41). */
  aspectRatio?: number
}
