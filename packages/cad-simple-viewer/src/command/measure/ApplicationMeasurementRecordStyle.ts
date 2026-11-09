import type { EditorBaseView } from '../../editor'
import {
  applicationCssColor,
  applicationCssToMeasurementColor,
  type ApplicationMeasurementStyle,
  MEASUREMENT_FONT_SIZE,
  MEASUREMENT_LINE_WEIGHT
} from '../../util/ApplicationMeasurementUtil'
import { applicationScreenPxToWcs } from '../overlay/ApplicationOverlayDrawUtil'
import type { ApplicationMeasurementRecordStyle } from './ApplicationMeasurementTypes'

/** Serialize a live measurement style for its record. */
export function serializeMeasurementStyle(
  style: ApplicationMeasurementStyle,
  view?: EditorBaseView
): ApplicationMeasurementRecordStyle {
  const result: ApplicationMeasurementRecordStyle = {
    color: applicationCssColor(style.color),
    lineWeight: MEASUREMENT_LINE_WEIGHT,
    fontSize: style.fontSize
  }
  if (style.textHeightWcs != null && style.textHeightWcs > 0) {
    // Keep a height that is already baked in.
    result.textHeightWcs = style.textHeightWcs
  } else if (view) {
    // Bake the current screen font size into WCS at commit.
    result.textHeightWcs = applicationScreenPxToWcs(style.fontSize, view)
  }
  return result
}

/** Restore a live measurement style from its record CSS / numeric fields. */
export function deserializeMeasurementStyle(
  style: ApplicationMeasurementRecordStyle
): ApplicationMeasurementStyle {
  return {
    color: applicationCssToMeasurementColor(style.color),
    lineWeight: MEASUREMENT_LINE_WEIGHT,
    fontSize: style.fontSize > 0 ? style.fontSize : MEASUREMENT_FONT_SIZE,
    textHeightWcs: style.textHeightWcs
  }
}
