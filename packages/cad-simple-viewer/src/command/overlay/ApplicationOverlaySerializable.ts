/**
 * Persistable overlay entity contract (used by measurements).
 *
 * Serialization is an instance method ({@link toRecord}). Deserialization is
 * deliberately **not** on this interface — concrete types are chosen by domain
 * factories (e.g. `createMeasureEntityFromRecord`)
 * from discriminated record geometry.
 *
 * Record schemas stay domain-specific (`ApplicationMeasurementRecord`); this
 * interface only unifies the capability.
 */
export interface ApplicationOverlaySerializable<TRecord> {
  /**
   * Build a sidecar / store snapshot of this overlay.
   *
   * @returns Domain record ready for persistence or store upsert.
   */
  toRecord(): TRecord
}
