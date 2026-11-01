
import { AcDbObject } from '../base/AcDbObject'

/**
 * Nongraphical `DICTIONARYVAR` object (`AcDbDictionaryVar`).
 *
 * Used for variables such as `CANNOSCALE` stored under
 * `AcDbVariableDictionary` in the named object dictionary.
 */
export class AcDbDictionaryVar extends AcDbObject {
  private _schema = 0
  private _value = ''

  /** Schema / type number (DXF group 280). */
  get schema() {
    return this._schema
  }
  set schema(value: number) {
    this._schema = value
  }

  /** Variable value (DXF group 1), e.g. `"1:100"` for CANNOSCALE. */
  get value() {
    return this._value
  }
  set value(value: string) {
    this._value = value
  }
}
