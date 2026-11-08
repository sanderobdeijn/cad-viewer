/**
 * Vue wrappers around shared toolbar SVG strings.
 *
 * Drawing-command glyphs unique to the Vue editor stay as local `.svg` files.
 */

import {
  ICON_CLEAR_MEASUREMENTS,
  ICON_MARKUP_EXPORT,
  ICON_MARKUP_IMPORT,
  ICON_MEASURE,
  ICON_MEASURE_ANGLE,
  ICON_MEASURE_ARC,
  ICON_MEASURE_AREA,
  ICON_MEASURE_CONTINUOUS,
  ICON_MEASURE_DISTANCE,
  ICON_MEASURE_POINT,
  ICON_MEASUREMENT_PANEL,
  ICON_PAN,
  ICON_SELECT,
  ICON_SWITCH_BG,
  ICON_ZOOM_EXTENT,
  ICON_ZOOM_WINDOW
} from '@mlightcad/cad-simple-viewer/icons'

import { applicationSvgIcon } from './applicationSvgIcon'

export const select = applicationSvgIcon(ICON_SELECT, 'IconSelect')
export const pan = applicationSvgIcon(ICON_PAN, 'IconPan')
export const zoomToExtent = applicationSvgIcon(ICON_ZOOM_EXTENT, 'IconZoomToExtent')
export const zoomToBox = applicationSvgIcon(ICON_ZOOM_WINDOW, 'IconZoomToBox')
export const switchBg = applicationSvgIcon(ICON_SWITCH_BG, 'IconSwitchBg')
export const measure = applicationSvgIcon(ICON_MEASURE, 'IconMeasure')
export const measureDistance = applicationSvgIcon(
  ICON_MEASURE_DISTANCE,
  'IconMeasureDistance'
)
export const measureContinuous = applicationSvgIcon(
  ICON_MEASURE_CONTINUOUS,
  'IconMeasureContinuous'
)
export const measureAngle = applicationSvgIcon(ICON_MEASURE_ANGLE, 'IconMeasureAngle')
export const measureArea = applicationSvgIcon(ICON_MEASURE_AREA, 'IconMeasureArea')
export const measureArc = applicationSvgIcon(ICON_MEASURE_ARC, 'IconMeasureArc')
export const measurePoint = applicationSvgIcon(ICON_MEASURE_POINT, 'IconMeasurePoint')
export const clearMeasurements = applicationSvgIcon(
  ICON_CLEAR_MEASUREMENTS,
  'IconClearMeasurements'
)
export const importIcon = applicationSvgIcon(ICON_MARKUP_IMPORT, 'IconImport')
export const exportIcon = applicationSvgIcon(ICON_MARKUP_EXPORT, 'IconExport')
export const measurementPanel = applicationSvgIcon(
  ICON_MEASUREMENT_PANEL,
  'IconMeasurementPanel'
)
