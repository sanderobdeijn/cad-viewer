/**
 * Enumeration defining the access modes for opening a CAD database.
 *
 * The mode with higher value is compatible with modes with lower values.
 * For example:
 * - Write mode (8) is compatible with Read (0)
 * - Read mode (0) is only compatible with itself
 *
 * @example
 * ```typescript
 * const mode = EditorOpenMode.Write;
 * if (mode >= EditorOpenMode.Write) {
 *   // Can edit the drawing
 * }
 * ```
 */
export enum EditorOpenMode {
  /** Read-only mode: allows viewing but no modifications */
  Read = 0,
  /** Write mode: allows full read/write access, compatible with Read */
  Write = 8
}
