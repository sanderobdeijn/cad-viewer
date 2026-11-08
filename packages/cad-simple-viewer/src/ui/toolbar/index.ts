/**
 * Shared plain-DOM toolbar engine.
 *
 * @module ui/toolbar
 * @packageDocumentation
 */

export type { UIResolvedToolbarChrome } from './resolveToolbarChrome'
export { uiResolveToolbarChrome } from './resolveToolbarChrome'
export {
  uiFilterVisibleToolbarItems,
  uiIsToolbarItemDisabled,
  uiIsToolbarItemVisible,
  uiItemRequiresDocument,
  uiResolveEffectiveToolbarItem,
  uiResolveParentToolbarDisplay,
  uiResolveSelectedChildItem
} from './resolveToolbarItemState'
export {
  uiCopyDynamicToolbarChildren,
  uiExpandToolbarItemConfigs,
  uiIndexToolbarItems,
  uiIsDynamicToolbarChildren,
  uiIsToolbarChildrenStrip,
  uiIsToolbarPresetRef,
  uiIsToolbarSeparatorItem,
  uiPreserveDynamicToolbarChildren,
  uiResolveToolbarChildrenUi,
  uiToolbarItemsIncludeItem
} from './toolbarItemUtils'
export type {
  UISubToolbarOptions,
  UISubToolbarPosition,
  UIToolbarChildIconMode,
  UIToolbarChildrenUi,
  UIToolbarChromeOptions,
  UIToolbarDocState,
  UIToolbarI18n,
  UIToolbarItem,
  UIToolbarItemConfig,
  UIToolbarOptions,
  UIToolbarOverflow,
  UIToolbarPlacement,
  UIToolbarPresetRef,
  UIToolbarSeparator,
  UIToolbarSize
} from './types'
export { UIDropdownMenu } from './UIDropdownMenu'
export { UISubToolbar } from './UISubToolbar'
export type { UISubToolbarMountOptions } from './UISubToolbar'
export { UIToolbar } from './UIToolbar'
export type { UIToolbarMountOptions } from './UIToolbar'
export {
  uiEnsureToolbarStyles,
  uiRemoveToolbarStylesIfUnused
} from './UIToolbarStyles'
export { uiComputeWrapPackSlot } from './uiWrapPackLayout'
