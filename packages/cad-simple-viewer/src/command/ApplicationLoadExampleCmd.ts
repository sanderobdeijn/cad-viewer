import { GeometryPolyline2d } from '@mlightcad/geometry-engine'

import { ApplicationContext } from '../app'
import { ApplicationSettingManager } from '../app/ApplicationSettingManager'
import { EditorCommand, EditorOpenMode } from '../editor'
import { convertLengthValue } from '../util'

/** INSUNITS code for millimeters */
const MILLIMETERS = 4

/** Width of the example rectangle in millimeters */
export const EXAMPLE_WIDTH_MM = 2000
/** Height of the example rectangle in millimeters */
export const EXAMPLE_HEIGHT_MM = 1000

/**
 * Command that adds an example drawing: a rectangle of 2000 mm by 1000 mm
 * with its lower-left corner at 0,0.
 *
 * The size is converted to the drawing units, so the rectangle has the same
 * real size whatever units the drawing uses. A unitless drawing is treated as
 * millimeters.
 */
export class ApplicationLoadExampleCmd extends EditorCommand {
  constructor() {
    super()
    this.mode = EditorOpenMode.Write
  }

  async execute(context: ApplicationContext) {
    const units = ApplicationSettingManager.instance.get('insertionUnits') ?? 0
    const width = convertLengthValue(EXAMPLE_WIDTH_MM, MILLIMETERS, units)
    const height = convertLengthValue(EXAMPLE_HEIGHT_MM, MILLIMETERS, units)

    const rect = new GeometryPolyline2d(
      [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height }
      ],
      true
    )
    context.doc.modelSync.addItems({ kind: 'shape', geometry: rect })
    context.view.zoomToFitDrawing()
  }
}
