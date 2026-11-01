import { AcGePoint3d, AcGeVector3d } from '@mlightcad/geometry-engine'

import { AcDbObject, type AcDbObjectId } from '../base/AcDbObject'

/**
 * Per-annotation-scale representation for an annotative MTEXT
 * (`ACDB_MTEXTOBJECTCONTEXTDATA_CLASS` / `AcDbMTextObjectContextData`).
 *
 * Text height is not stored here — derive it from the linked {@link scaleId}
 * and the entity's stored height for the default scale.
 */
export class AcDbMTextObjectContextData extends AcDbObject {
  private _classVersion = 4
  private _isDefault = false
  private _scaleId: AcDbObjectId = ''
  private _attachmentPoint = 1
  private _direction = new AcGeVector3d(1, 0, 0)
  private _insertionPoint = new AcGePoint3d()
  private _definedWidth = 0
  private _definedHeight = 0
  private _extentsWidth = 0
  private _extentsHeight = 0
  private _columnType = 0

  get classVersion() {
    return this._classVersion
  }
  set classVersion(value: number) {
    this._classVersion = value
  }

  /** True when this representation matches the entity record (DXF 290). */
  get isDefault() {
    return this._isDefault
  }
  set isDefault(value: boolean) {
    this._isDefault = value
  }

  /** Soft-pointer to the {@link AcDbScale} object (DXF 340). */
  get scaleId() {
    return this._scaleId
  }
  set scaleId(value: AcDbObjectId) {
    this._scaleId = value
  }

  get attachmentPoint() {
    return this._attachmentPoint
  }
  set attachmentPoint(value: number) {
    this._attachmentPoint = value
  }

  get direction() {
    return this._direction
  }
  set direction(value: AcGeVector3d) {
    this._direction.copy(value)
  }

  get insertionPoint() {
    return this._insertionPoint
  }
  set insertionPoint(value: AcGePoint3d) {
    this._insertionPoint.copy(value)
  }

  get definedWidth() {
    return this._definedWidth
  }
  set definedWidth(value: number) {
    this._definedWidth = value
  }

  get definedHeight() {
    return this._definedHeight
  }
  set definedHeight(value: number) {
    this._definedHeight = value
  }

  get extentsWidth() {
    return this._extentsWidth
  }
  set extentsWidth(value: number) {
    this._extentsWidth = value
  }

  get extentsHeight() {
    return this._extentsHeight
  }
  set extentsHeight(value: number) {
    this._extentsHeight = value
  }

  get columnType() {
    return this._columnType
  }
  set columnType(value: number) {
    this._columnType = value
  }
}
