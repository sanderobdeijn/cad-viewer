
import {
  AcDbSymbolTableRecord,
  AcDbSymbolTableRecordAttrs
} from './AcDbSymbolTableRecord'

/**
 * Interface defining the attributes for registered application table records.
 */
export type AcDbRegAppTableRecordAttrs = AcDbSymbolTableRecordAttrs

/**
 * Represents records in the AcDbRegAppTable (known as the APPID symbol table in AutoCAD and DXF).
 * Each of these records represents an application ID used to identify a group of Extended Entity
 * Data attached to objects in the drawing database.
 */
export class AcDbRegAppTableRecord extends AcDbSymbolTableRecord<AcDbRegAppTableRecordAttrs> {
  /**
   * Creates a new AcDbRegAppTableRecord instance.
   *
   * @param attrs - Input attribute values, or the application name as a string
   */
  constructor(attrs?: Partial<AcDbRegAppTableRecordAttrs> | string) {
    if (typeof attrs === 'string') {
      attrs = { name: attrs }
    }
    super(attrs)
  }
}

