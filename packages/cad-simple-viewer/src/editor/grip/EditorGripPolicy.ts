import { EditorOpenMode } from '../view/EditorOpenMode'

/**
 * Returns whether grips should be suppressed for the given selection count,
 * matching AutoCAD GRIPOBJLIMIT behavior.
 *
 * When `gripObjLimit` is `0`, grips are always shown. Otherwise grips are
 * suppressed when `selectionCount` exceeds the limit.
 */
function shouldSuppressGripsForSelectionCount(
  selectionCount: number,
  gripObjLimit: number
): boolean {
  if (gripObjLimit <= 0) {
    return false
  }
  return selectionCount > gripObjLimit
}

/**
 * Returns whether grip handles should be shown for the given view state.
 */
export function editorShouldShowGrips(
  openMode: EditorOpenMode,
  editorActive: boolean,
  selectionCount: number,
  gripObjLimit: number
): boolean {
  if (openMode !== EditorOpenMode.Write) {
    return false
  }
  if (editorActive) {
    return false
  }
  return !shouldSuppressGripsForSelectionCount(selectionCount, gripObjLimit)
}
