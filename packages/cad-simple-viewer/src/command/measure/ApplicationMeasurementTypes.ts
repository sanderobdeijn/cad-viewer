import type { GraphicsInterfaceLineWeight } from '@mlightcad/graphic-interface'
/** Measurement kinds that can be persisted in a sidecar JSON file. */
export type ApplicationMeasurementType =
  | 'distance'
  | 'angle'
  | 'area'
  | 'arc'
  | 'point'

/** 2D world point stored in a measurement sidecar. */
export interface ApplicationMeasurementPoint2d {
  x: number
  y: number
}

/** Drawing style stored in the sidecar (CSS-friendly + world-space sizes). */
export interface ApplicationMeasurementSidecarStyle {
  color: string
  /** Always hairline (`0`) on write; legacy non-zero values are ignored on parse. */
  lineWeight: GraphicsInterfaceLineWeight
  /** Authoring badge font size in CSS pixels (legacy / UI). */
  fontSize: number
  /**
   * Badge text height in world units. Prefer this over {@link fontSize} when
   * restoring overlays so size is independent of camera zoom.
   */
  textHeightWcs?: number
  /**
   * Distance-measurement arrow-head length in world units. Prefer this when
   * restoring overlays so arrow size is independent of camera zoom.
   */
  arrowSizeWcs?: number
  /**
   * Legacy canvas stroke width in world units. Ignored on parse; never written.
   */
  strokeWidthWcs?: number
}

export interface ApplicationMeasurementDistanceGeometry {
  type: 'distance'
  start: ApplicationMeasurementPoint2d
  end: ApplicationMeasurementPoint2d
}

export interface ApplicationMeasurementAngleGeometry {
  type: 'angle'
  vertex: ApplicationMeasurementPoint2d
  arm1: ApplicationMeasurementPoint2d
  arm2: ApplicationMeasurementPoint2d
}

export interface ApplicationMeasurementAreaGeometry {
  type: 'area'
  points: ApplicationMeasurementPoint2d[]
}

export interface ApplicationMeasurementArcGeometry {
  type: 'arc'
  center: ApplicationMeasurementPoint2d
  radius: number
  start: ApplicationMeasurementPoint2d
  end: ApplicationMeasurementPoint2d
  /**
   * Point on the measured sweep. Distinguishes the major arc from the
   * complementary minor arc after a JSON round-trip. Omitted in legacy
   * sidecars, which always restore the shorter arc.
   */
  through?: ApplicationMeasurementPoint2d
}

export interface ApplicationMeasurementPointGeometry {
  type: 'point'
  position: ApplicationMeasurementPoint2d
}

export type ApplicationMeasurementGeometry =
  | ApplicationMeasurementDistanceGeometry
  | ApplicationMeasurementAngleGeometry
  | ApplicationMeasurementAreaGeometry
  | ApplicationMeasurementArcGeometry
  | ApplicationMeasurementPointGeometry

/** One committed measurement in a sidecar file. */
export interface ApplicationMeasurementRecord {
  id: string
  type: ApplicationMeasurementType
  layoutId?: string
  style: ApplicationMeasurementSidecarStyle
  geometry: ApplicationMeasurementGeometry
}

/** Sidecar JSON document for measurement overlays. */
export interface ApplicationMeasurementSidecarFile {
  version: 1
  drawingName?: string
  measurements: ApplicationMeasurementRecord[]
}
