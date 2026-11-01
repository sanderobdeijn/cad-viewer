
import { AcDbObject, type AcDbObjectId } from '../base/AcDbObject'

/**
 * Nongraphical GROUP object (DXF GROUP).
 *
 * Minimal fields: name, unnamed/selectable flags, and soft-pointers to
 * member entity handles.
 */
export class AcDbGroup extends AcDbObject {
  private _name = ''
  private _unnamed = false
  private _selectable = true
  private _entityIds: AcDbObjectId[] = []

  get name() {
    return this._name
  }
  set name(value: string) {
    this._name = value
  }

  get unnamed() {
    return this._unnamed
  }
  set unnamed(value: boolean) {
    this._unnamed = value
  }

  get selectable() {
    return this._selectable
  }
  set selectable(value: boolean) {
    this._selectable = value
  }

  get entityIds(): readonly AcDbObjectId[] {
    return this._entityIds
  }
  set entityIds(value: readonly AcDbObjectId[]) {
    this._entityIds = [...value]
  }

  addEntityId(id: AcDbObjectId) {
    this._entityIds.push(id)
  }
}

