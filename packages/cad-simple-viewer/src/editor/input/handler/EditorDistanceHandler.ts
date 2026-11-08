import { EditorNumericalHandler } from './EditorNumericalHandler'

/**
 * Validates distance input.
 * Distances must be numeric and normally non-negative (AutoCAD behavior).
 */
export class EditorDistanceHandler extends EditorNumericalHandler {}
