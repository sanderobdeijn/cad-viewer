/** Measurement HTML overlay layer name (`MEASUREMENT_LAYER` in cad-simple-viewer). */
const MEASUREMENT_LAYER = 'measurement'

/**
 * Homogeneous overlay selection used to decide whether the ribbon should
 * switch to Measurement.
 *
 * `'mixed'` covers CAD entities + overlay and any other combination of
 * distinct kinds.
 */
export type OverlaySelectionKind = 'measurement' | 'mixed' | 'none'

/** Minimal selection snapshot so classification does not touch the live view. */
export interface OverlaySelectionSnapshot {
  /** HTML overlay groups currently selected (measurement or other). */
  selectedGroups?: { layer?: string }[]
  /** Count of selected drawing entities in the CAD selection set. */
  cadEntityCount?: number
  /** Whether a measurement is selected in the measurement store. */
  measurementSelected?: boolean
}

/**
 * Classifies the current CAD + overlay selection into one exclusive kind.
 *
 * @param snapshot - Selected overlay groups, CAD entity count, and store flags.
 * @returns Exclusive overlay kind, `'mixed'` when more than one kind is present,
 *   or `'none'` when nothing relevant is selected.
 */
export function classifyOverlaySelection(
  snapshot: OverlaySelectionSnapshot
): OverlaySelectionKind {
  let hasMeasurement = false
  let hasOtherOverlay = false

  for (const group of snapshot.selectedGroups ?? []) {
    if (group.layer === MEASUREMENT_LAYER) hasMeasurement = true
    else hasOtherOverlay = true
  }

  if (!hasMeasurement && snapshot.measurementSelected) hasMeasurement = true

  const hasCadEntities = (snapshot.cadEntityCount ?? 0) > 0
  const kindCount = [
    hasMeasurement,
    hasOtherOverlay,
    hasCadEntities
  ].filter(Boolean).length

  if (kindCount > 1) return 'mixed'
  if (hasMeasurement) return 'measurement'
  return 'none'
}
