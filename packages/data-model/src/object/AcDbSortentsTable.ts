
import { AcDbObject, type AcDbObjectId } from '../base/AcDbObject'

/**
 * Nongraphical SORTENTSTABLE object (draw-order soft-pointers).
 */
export class AcDbSortentsTable extends AcDbObject {
  private _entityIds: AcDbObjectId[] = []

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
