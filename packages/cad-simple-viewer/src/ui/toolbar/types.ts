/**
 * Shared toolbar item and chrome types for {@link UIToolbar}.
 *
 * @module toolbar/types
 * @packageDocumentation
 */

import type { EditorOpenMode } from '../../editor/view/EditorOpenMode'

/** Toolbar edge placement relative to the viewer host element. */
export type UIToolbarPlacement = 'top' | 'bottom' | 'left' | 'right'

/**
 * Overflow behavior when toolbar buttons exceed the host bounds.
 *
 * - `'menu'`: show a ⋯ button; overflow items open in a dropdown menu.
 * - `'wrap'`: continue on additional rows (horizontal) or columns (vertical).
 */
export type UIToolbarOverflow = 'menu' | 'wrap'

/**
 * Sizing along the toolbar layout axis: width for horizontal bars, height for vertical bars.
 *
 * - `'auto'`: natural size from button content (default).
 * - `'stretch'`: fill the available host width or height and space buttons evenly.
 */
export type UIToolbarSize = 'auto' | 'stretch'

/**
 * How a sub-toolbar aligns along the parent toolbar's main axis.
 *
 * - `'front'`: first sub-toolbar button aligns with the first toolbar button
 *   (default)
 * - `'end'`: last sub-toolbar button aligns with the last toolbar button
 * - `'center'`: centers the sub-toolbar on the parent toolbar
 * - `'auto'`: align to the parent button
 *
 * Ignored when the sub-toolbar {@link UIToolbarChromeOptions.size} is
 * `'stretch'`.
 */
export type UISubToolbarPosition = 'front' | 'end' | 'center' | 'auto'

/**
 * Shared layout and chrome options for the main toolbar and sub-toolbars.
 *
 * Sub-toolbars inherit unset fields from the main toolbar unless overridden via
 * {@link UIToolbarOptions.subToolbar}.
 */
export interface UIToolbarChromeOptions {
  /**
   * Inset from the host edge where the toolbar is anchored in px.
   * Top/bottom placement uses top or bottom; left/right uses left or right.
   * @default 8
   */
  edgeOffset?: number
  /**
   * Minimum inset from the host edges orthogonal to {@link edgeOffset} in px.
   *
   * - Horizontal toolbar (top/bottom): spacing from the top and bottom edges.
   * - Vertical toolbar (left/right): spacing from the left and right edges.
   *
   * Used when the toolbar is at its maximum cross-axis size (for example wrap
   * overflow) and for cross-axis positioning clamps.
   * @default 0
   */
  sideOffset?: number
  /** When true, render button labels below icons on icon toolbars. */
  showLabels?: boolean
  /**
   * Sizing along the toolbar layout axis: width for horizontal bars, height for
   * vertical bars.
   * @default 'auto'
   */
  size?: UIToolbarSize
  /** Overflow behavior when buttons exceed the host bounds. */
  overflow?: UIToolbarOverflow
  /**
   * When false, hides the toolbar container border line.
   * @default true
   */
  showBorder?: boolean
  /**
   * When true, each toolbar button draws a permanent outer border.
   * When false, buttons stay frameless until hover / active.
   * @default false
   */
  showButtonBorder?: boolean
  /**
   * When false, omits visual separators between toolbar button groups.
   * @default true
   */
  showSeparators?: boolean
  /**
   * When true, parent buttons with children show a small corner triangle.
   * Phone layouts typically set this to false.
   * @default true
   */
  showChildrenIndicator?: boolean
}

/**
 * Sub-toolbar overrides: chrome fields plus optional axis alignment.
 *
 * Unset chrome fields inherit from the main toolbar.
 */
export interface UISubToolbarOptions extends Partial<UIToolbarChromeOptions> {
  /**
   * Aligns the strip along the parent toolbar axis.
   * @default 'front'
   */
  position?: UISubToolbarPosition
  /**
   * When true, opening a nested sub-toolbar hides the ancestor strip so only
   * the new strip is visible (saves vertical space on phone). When false,
   * nested strips stack beside/above the ancestor (pad/desktop).
   *
   * Also, when true, measurement dock panels, sub-toolbars,
   * and menus are mutually exclusive: opening one closes the others.
   * @default false
   */
  replaceOnNested?: boolean
}

/**
 * Controls how a parent button icon relates to its submenu selection.
 *
 * - `'fixed'`: parent keeps its own `icon` (default).
 * - `'selected'`: parent shows the selected child's `icon`.
 */
export type UIToolbarChildIconMode = 'fixed' | 'selected'

/**
 * How nested `children` are presented when the parent button is clicked.
 *
 * - `'menu'`: popover dropdown with icon + label (default). Closes on outside click.
 * - `'toolbar'`: icon sub-toolbar beside the parent. Closes when a child button
 *   is clicked, or on canvas / outside click.
 * - `'sticky-toolbar'`: icon sub-toolbar that stays open until the parent button
 *   is clicked again, or another parent opens a different strip. Child and
 *   canvas clicks do not dismiss it.
 */
export type UIToolbarChildrenUi = 'menu' | 'toolbar' | 'sticky-toolbar'

/** Visual separator between toolbar button groups. */
export interface UIToolbarSeparator {
  type: 'separator'
  /** Optional stable id for debugging. */
  id?: string
}

/** Reference to a built-in toolbar button when composing a custom layout. */
export interface UIToolbarPresetRef {
  preset: string
}

/**
 * Minimal i18n surface used by the toolbar engine.
 *
 * Hosts adapt their own locale tables (plugin `UII18n`, HTML `AcExHtmlI18n`,
 * vue-i18n) to this shape.
 */
export interface UIToolbarI18n {
  t(key: string, params?: Record<string, string>): string
}

/**
 * Document-related toolbar state. Driven by the host or
 * {@link applicationBindToolbarDocState} — the UI never imports DocManager.
 */
export interface UIToolbarDocState {
  /** Whether an active document is loaded. */
  hasDocument: boolean
  /** True while a document is opening (disables command buttons). */
  isOpening: boolean
  /** Current document open mode used for {@link UIToolbarItem.minOpenMode}. */
  openMode: EditorOpenMode
}

/**
 * Configuration for a single toolbar button or submenu entry.
 */
export interface UIToolbarItem {
  /** Stable identifier used for DOM attributes and debugging. */
  id: string
  /** When `'separator'`, renders a divider instead of a button. */
  type?: 'button' | 'separator'
  /** i18n key resolved via {@link UIToolbarI18n.t}. */
  label?: string
  /** Inline SVG string, DOM element, or factory that produces an icon element. */
  icon?: string | HTMLElement | (() => HTMLElement)
  /** CAD command string forwarded to {@link UIToolbarMountOptions.onCommand}. */
  command?: string
  /** Custom click handler. Used when no command is set (e.g. theme toggle). */
  action?: () => void
  /**
   * Popover-style click handler that receives the anchor button element.
   * When set, takes precedence over `command` and `action`.
   */
  anchorAction?: (anchor: HTMLElement) => void
  /**
   * When false, the button stays enabled without an open document.
   * Defaults to true when `command` is set, otherwise false.
   */
  requiresDocument?: boolean
  /** Minimum open mode required to show this item (Write shows in Write only). */
  minOpenMode?: EditorOpenMode
  /** Static or dynamic disabled state evaluated at render time. */
  disabled?: boolean | (() => boolean)
  /** Nested submenu items shown when the button is clicked.
   * May be a live getter so the list can depend on the active document. */
  children?: UIToolbarItem[]
  /**
   * Presentation of {@link children}. Defaults to `'menu'` (popover dropdown).
   */
  childrenUi?: UIToolbarChildrenUi
  /**
   * When the button has `children`, controls whether the parent icon follows the
   * selected submenu item. Defaults to `'fixed'`.
   */
  childIcon?: UIToolbarChildIconMode
  /** Initial submenu selection when {@link childIcon} is `'selected'`. */
  selectedChildId?: string
  /** Two-state button that merges `on` or `off` branch fields based on `getValue`. */
  toggle?: {
    /** Returns whether the toggle is in the "on" branch. */
    getValue: () => boolean
    /** Fields applied when `getValue` returns true. */
    on: Partial<UIToolbarItem>
    /** Fields applied when `getValue` returns false. */
    off: Partial<UIToolbarItem>
  }
}

/** Resolved toolbar entry: button, separator, or preset reference in config. */
export type UIToolbarItemConfig =
  | UIToolbarItem
  | UIToolbarSeparator
  | UIToolbarPresetRef

/**
 * Standalone toolbar configuration shared by hosts that compose item lists.
 */
export interface UIToolbarOptions extends UIToolbarChromeOptions {
  /** When false, the toolbar is not created. */
  enabled?: boolean
  /** Edge placement relative to `host`. */
  placement?: UIToolbarPlacement
  /** Toolbar items, `'default'`, or a custom list (may include presets and separators). */
  items?: UIToolbarItemConfig[] | 'default'
  /**
   * Root toolbar item ids to omit after resolving {@link items} and
   * {@link appendItems}. Does not recurse into submenu children.
   */
  excludeItems?: string[]
  /** Extra items merged into `items` (default: appended at the end). */
  appendItems?: UIToolbarItemConfig[]
  /**
   * Insert `appendItems` after the root toolbar item with this id.
   * Ignored when {@link appendItemsBefore} is set.
   */
  appendItemsAfter?: string
  /**
   * Insert `appendItems` before the root toolbar item with this id.
   * Takes precedence over {@link appendItemsAfter}.
   */
  appendItemsBefore?: string
  /** When true, show a collapse/expand toggle at the end of the toolbar. */
  collapsible?: boolean
  /** Initial collapsed state when {@link collapsible} is true. */
  defaultCollapsed?: boolean
  /**
   * Canvas element that receives the floating toolbar.
   */
  mountTarget?: HTMLElement
  /**
   * When true, the toolbar is laid out as a flex sibling of the canvas inside
   * the canvas parent instead of floating over the drawing.
   * @default false
   */
  inCanvasParent?: boolean
  /**
   * Sub-toolbar chrome and position overrides. Unset chrome fields inherit from
   * the main toolbar.
   */
  subToolbar?: UISubToolbarOptions
}
