
import { AcDbObject } from '../base/AcDbObject'

/**
 * Nongraphical SCALE object (`AcDbScale`) stored in `ACAD_SCALELIST`.
 *
 * The annotation scale factor used for annotative objects is
 * {@link drawingUnits} / {@link paperUnits}.
 */
export class AcDbScale extends AcDbObject {
  private _classVersion = 0
  private _scaleName = ''
  private _paperUnits = 1
  private _drawingUnits = 1
  /** DXF group 290 — unit scale / temporary flag as written by AutoCAD. */
  private _isUnitScale = false

  get classVersion() {
    return this._classVersion
  }
  set classVersion(value: number) {
    this._classVersion = value
  }

  /** Human-readable scale name (DXF group 300), e.g. `"1:50"`. */
  get scaleName() {
    return this._scaleName
  }
  set scaleName(value: string) {
    this._scaleName = value
  }

  /** Paper units (DXF group 140). */
  get paperUnits() {
    return this._paperUnits
  }
  set paperUnits(value: number) {
    this._paperUnits = value > 0 ? value : 1
  }

  /** Drawing (model) units (DXF group 141). */
  get drawingUnits() {
    return this._drawingUnits
  }
  set drawingUnits(value: number) {
    this._drawingUnits = value > 0 ? value : 1
  }

  get isUnitScale() {
    return this._isUnitScale
  }
  set isUnitScale(value: boolean) {
    this._isUnitScale = value
  }

  /**
   * Scale factor that converts paper size to model size
   * (`drawingUnits / paperUnits`).
   */
  get scaleFactor() {
    return this._drawingUnits / this._paperUnits
  }
}
