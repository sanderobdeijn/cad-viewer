import { GeometryVector2d } from './GeometryVector2d'
import { GeometryVector3d } from './GeometryVector3d'

export type GeometryVector = GeometryVector2d | GeometryVector3d
export type GeometryVectorLike = {
  x: number
  y: number
  z?: number
}
