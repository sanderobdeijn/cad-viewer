import { AcCmColor } from '@mlightcad/common'

import { AcDbBlockTableRecord } from '../database/AcDbBlockTableRecord'
import { AcDbDatabase } from '../database/AcDbDatabase'
import {
  AcDbDimStyleTableRecord,
  AcDbDimStyleTableRecordAttrs
} from '../database/AcDbDimStyleTableRecord'
import { AcDbLayerTableRecord } from '../database/AcDbLayerTableRecord'
import { AcDbLinetypeTableRecord } from '../database/AcDbLinetypeTableRecord'
import { AcDbTextStyleTableRecord } from '../database/AcDbTextStyleTableRecord'
import { AcDbLayout } from '../object/layout/AcDbLayout'
import { DEFAULT_TEXT_STYLE } from './AcDbConstants'

/** Line weight of layer 0 in a new drawing: the default line weight. */
const NEW_DRAWING_LAYER_LINE_WEIGHT = -3
/** Active dimension style of a new drawing. */
const NEW_DRAWING_DIM_STYLE = 'ISO-25'
const NEW_DRAWING_STANDARD_DIM_STYLE: Partial<AcDbDimStyleTableRecordAttrs> = {
  dimasz: 2.5,
  dimexo: 0.625,
  dimcen: 2.5,
  dimtxt: 2.5,
  dimzin: 0,
  dimtzin: 0,
  dimtad: 0
}
const NEW_DRAWING_ISO_DIM_STYLE: Partial<AcDbDimStyleTableRecordAttrs> = {
  dimasz: 2.5,
  dimexo: 0.625,
  dimdli: 3.75,
  dimexe: 1.25,
  dimtxt: 2.5,
  dimcen: 2.5,
  dimaltf: 0.03937007874016,
  dimgap: 0.625,
  dimtad: 1,
  dimzin: 8,
  dimaltd: 3,
  dimtofl: 1,
  dimdec: 2,
  dimtdec: 2,
  dimalttd: 3,
  dimdsep: ',',
  dimtzin: 8
}

/**
 * Creates the default content of a drawing database.
 */
export class AcDbDataGenerator {
  readonly db: AcDbDatabase
  constructor(db: AcDbDatabase) {
    this.db = db
  }
  /**
   * Creates the content of a blank metric drawing: layer 0, the ByBlock, ByLayer
   * and Continuous linetypes, the Standard and Annotative text styles, the
   * Standard, Annotative and ISO-25 dimension styles, and the Model, Layout1 and
   * Layout2 layouts.
   */
  createNewDrawing() {
    this.createDefaultLayer()
    this.db.tables.layerTable.getAt('0')!.lineWeight =
      NEW_DRAWING_LAYER_LINE_WEIGHT
    this.createDefaultLineType()
    for (const name of [DEFAULT_TEXT_STYLE, 'Annotative']) {
      this.db.tables.textStyleTable.add(
        new AcDbTextStyleTableRecord({
          name,
          standardFlag: 0,
          fixedTextHeight: 0,
          widthFactor: 1,
          obliqueAngle: 0,
          textGenerationFlag: 0,
          lastHeight: 2.5,
          font: 'arial',
          bigFont: '',
          extendedFont: 'Arial'
        })
      )
    }
    const dimStyles: Partial<AcDbDimStyleTableRecordAttrs>[] = [
      { ...NEW_DRAWING_STANDARD_DIM_STYLE, name: DEFAULT_TEXT_STYLE },
      { ...NEW_DRAWING_ISO_DIM_STYLE, name: 'Annotative', dimscale: 0 },
      { ...NEW_DRAWING_ISO_DIM_STYLE, name: NEW_DRAWING_DIM_STYLE }
    ]
    for (const attrs of dimStyles) {
      this.db.tables.dimStyleTable.add(
        new AcDbDimStyleTableRecord({
          ...attrs,
          dimtxsty: DEFAULT_TEXT_STYLE
        })
      )
    }
    this.db.dimstyle = NEW_DRAWING_DIM_STYLE

    this.addNewDrawingLayout('Model', 0, this.db.tables.blockTable.modelSpace)
    ;['Layout1', 'Layout2'].forEach((name, index) => {
      const paperSpace = new AcDbBlockTableRecord()
      paperSpace.name =
        AcDbBlockTableRecord.PAPER_SPACE_NAME_PREFIX + (index || '')
      this.db.tables.blockTable.add(paperSpace)
      this.addNewDrawingLayout(name, index + 1, paperSpace)
    })
  }

  private addNewDrawingLayout(
    name: string,
    tabOrder: number,
    blockTableRecord: AcDbBlockTableRecord
  ) {
    const layout = new AcDbLayout()
    layout.layoutName = name
    layout.tabOrder = tabOrder
    layout.blockTableRecordId = blockTableRecord.objectId
    layout.limits.min.copy({ x: 0, y: 0 })
    layout.limits.max.copy({ x: 12, y: 9 })
    this.db.objects.layout.setAt(name, layout)
    blockTableRecord.layoutId = layout.objectId
  }

  createDefaultLayer() {
    const defaultColor = new AcCmColor()
    defaultColor.colorIndex = 7 // white
    return this.db.tables.layerTable.add(
      new AcDbLayerTableRecord({
        name: '0',
        standardFlags: 0,
        linetype: 'Continuous',
        lineWeight: 0,
        isOff: false,
        color: defaultColor,
        isPlottable: true
      })
    )
  }

  createDefaultLineType() {
    this.db.tables.linetypeTable.add(
      new AcDbLinetypeTableRecord({
        name: 'ByBlock',
        standardFlag: 0,
        description: '',
        totalPatternLength: 0
      })
    )
    this.db.tables.linetypeTable.add(
      new AcDbLinetypeTableRecord({
        name: 'ByLayer',
        standardFlag: 0,
        description: '',
        totalPatternLength: 0
      })
    )
    this.db.tables.linetypeTable.add(
      new AcDbLinetypeTableRecord({
        name: 'Continuous',
        standardFlag: 0,
        description: 'Solid line',
        totalPatternLength: 0
      })
    )
  }

  createDefaultTextStyle() {
    this.db.tables.textStyleTable.add(
      new AcDbTextStyleTableRecord({
        name: DEFAULT_TEXT_STYLE,
        standardFlag: 0,
        fixedTextHeight: 0,
        widthFactor: 1,
        obliqueAngle: 0,
        textGenerationFlag: 0,
        lastHeight: 0.2,
        font: 'SimKai',
        bigFont: '',
        extendedFont: 'SimKai'
      })
    )
  }

  createDefaultDimStyle() {
    this.db.tables.dimStyleTable.add(
      new AcDbDimStyleTableRecord({
        name: DEFAULT_TEXT_STYLE,
        dimtxsty: DEFAULT_TEXT_STYLE
      })
    )
  }

  createDefaultLayout() {
    const layout = new AcDbLayout()
    layout.layoutName = 'Model'
    layout.tabOrder = 0
    layout.blockTableRecordId = this.db.tables.blockTable.modelSpace.objectId
    layout.limits.min.copy({ x: 0, y: 0 })
    layout.limits.max.copy({ x: 1000000, y: 1000000 })
    layout.extents.min.copy({ x: 0, y: 0, z: 0 })
    layout.extents.max.copy({ x: 1000000, y: 1000000, z: 0 })
    this.db.objects.layout.setAt(layout.layoutName, layout)
    this.db.tables.blockTable.modelSpace.layoutId = layout.objectId
  }
}
