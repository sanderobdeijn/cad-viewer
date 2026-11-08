/**
 * Tree-shakeable UI surface for the offline HTML viewer-runtime IIFE.
 *
 * Vite aliases `@mlightcad/cad-simple-viewer` to this file when building
 * `viewer-runtime.iife.js` so the bundle never walks the full package barrel
 * (`app` / `command` / DocManager).
 *
 * @module ui-html-entry
 * @packageDocumentation
 */

export {
  editorApplyCanvasTouchCalloutStyles,
  editorClearDomSelection,
  editorGuardCanvasTouchCallout
} from './editor/input/ui/EditorCanvasTouchCalloutGuard'
export { EditorEntityPickCancelChrome } from './editor/input/ui/EditorEntityPickCancelChrome'
export {
  EDITOR_TOUCH_POINT_LONG_PRESS_MS,
  EDITOR_TOUCH_POINT_MOVE_CANCEL_PX
} from './editor/input/ui/EditorTouchPointTiming'
export {
  editorIsMobileOrPadUi,
  editorIsMobileUiLayout
} from './editor/global/EditorUiLayout'
export { UIAciColorDialog } from './ui/UIAciColorDialog'
export type {
  UIAciColorDialogLabels,
  UIAciColorDialogOptions
} from './ui/UIAciColorDialog'
export { UIFullscreenPanel } from './ui/UIFullscreenPanel'
export type {
  UIFullscreenPanelLabels,
  UIFullscreenPanelOptions
} from './ui/UIFullscreenPanel'
export { UIHelpPanel } from './ui/UIHelpPanel'
export type {
  UIHelpPanelLabels,
  UIHelpPanelOptions,
  UIHelpPanelShowOptions
} from './ui/UIHelpPanel'
export { UIMobileSessionPanel } from './ui/UIMobileSessionPanel'
export type {
  UIMobileSessionPanelLabels,
  UIMobileSessionPanelOptions,
  UIMobileSessionPanelState,
  UIMobileSessionPanelCallbacks,
  UIMobileSessionKeyword,
  UIMobileSessionMetricTexts
} from './ui/UIMobileSessionPanel'
export { UIShortCutToolbar } from './ui/UIShortCutToolbar'
export type {
  UIShortCutToolbarActionState,
  UIShortCutToolbarOptions
} from './ui/UIShortCutToolbar'
export { UISimpleToolbar } from './ui/UISimpleToolbar'
export type { UISimpleToolbarItem } from './ui/UISimpleToolbar'
export { EditorOpenMode } from './editor/view/EditorOpenMode'
export { UIToolbar } from './ui/toolbar/UIToolbar'
export type { UIToolbarMountOptions } from './ui/toolbar/UIToolbar'
export {
  uiEnsureToolbarStyles,
  uiRemoveToolbarStylesIfUnused
} from './ui/toolbar/UIToolbarStyles'
export { uiCopyDynamicToolbarChildren } from './ui/toolbar/toolbarItemUtils'
export type {
  UIToolbarDocState,
  UIToolbarI18n,
  UIToolbarItem,
  UIToolbarPlacement,
  UIToolbarChildrenUi
} from './ui/toolbar/types'
export { UITextHeightDialog } from './ui/UITextHeightDialog'
export type {
  UITextHeightDialogLabels,
  UITextHeightDialogOptions,
  UITextHeightDialogResult,
  UITextHeightMode
} from './ui/UITextHeightDialog'
export {
  uiLocalIsoDate,
  uiShouldShowTouchPointTutorialFromPrefs,
  UITouchPointTutorial
} from './ui/touch-point-tutorial'
export type {
  UITouchPointTutorialConfig,
  UITouchPointTutorialLabels,
  UITouchPointTutorialPrefs
} from './ui/touch-point-tutorial'
export {
  createIconElement,
  ICON_CLOSE,
  ICON_ERASE,
  ICON_TEXT_HEIGHT
} from './ui/icons'
