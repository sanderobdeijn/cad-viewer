
import { AcDbObject, AcDbObjectId } from '../base/AcDbObject'

/**
 * DWG/DXF-resident object (`ACDB_BLOCKREPRESENTATION_DATA`) that stores a soft
 * pointer (group code 340) from an evaluated dynamic-block INSERT back to its
 * original dynamic {@link AcDbBlockTableRecord}.
 *
 * This is **not** a public ObjectARX API class. AutoCAD keeps it as an
 * undocumented database object under the INSERT extension dictionary
 * (`AcDbBlockRepresentation` → `AcDbRepData`). Application code should use
 * {@link AcDbDynBlockReference.dynamicBlockTableRecord} instead.
 *
 * Kept only so converters can materialize the object graph and
 * {@link AcDbDynBlockReference} can resolve the definition handle.
 *
 * @internal
 */
export class AcDbBlockRepresentationData extends AcDbObject {
  private _blockId: AcDbObjectId = ''

  /**
   * Object id of the original dynamic block table record.
   */
  get blockId(): AcDbObjectId {
    return this._blockId
  }
  set blockId(value: AcDbObjectId) {
    this._blockId = value ?? ''
  }
}
