import type {
  UIToolbarChildrenUi,
  UIToolbarItem,
  UIToolbarItemConfig,
  UIToolbarPresetRef,
  UIToolbarSeparator
} from './types'

/**
 * Resolves how nested children are presented. Defaults to `'menu'`.
 *
 * @param item - Parent toolbar item.
 */
export function uiResolveToolbarChildrenUi(
  item: UIToolbarItem
): UIToolbarChildrenUi {
  return item.childrenUi ?? 'menu'
}

/** Returns whether {@link childrenUi} is an icon sub-toolbar (sticky or dismissible). */
export function uiIsToolbarChildrenStrip(
  childrenUi: UIToolbarChildrenUi
): boolean {
  return childrenUi === 'toolbar' || childrenUi === 'sticky-toolbar'
}

/** Returns whether a toolbar config entry is a visual separator. */
export function uiIsToolbarSeparatorItem(
  item: UIToolbarItemConfig
): item is UIToolbarSeparator {
  return 'type' in item && item.type === 'separator'
}

/** Returns whether a toolbar config entry references a built-in preset button. */
export function uiIsToolbarPresetRef(
  item: UIToolbarItemConfig
): item is UIToolbarPresetRef {
  return 'preset' in item && typeof item.preset === 'string'
}

/**
 * Returns whether {@link children} is supplied by a getter rather than a static array.
 *
 * Dynamic children (for example drawing layouts) must not be snapshotted when
 * cloning or expanding toolbar items.
 *
 * @param item - Toolbar item to inspect.
 */
export function uiIsDynamicToolbarChildren(item: UIToolbarItem): boolean {
  return (
    typeof Object.getOwnPropertyDescriptor(item, 'children')?.get === 'function'
  )
}

/**
 * Attaches a getter that rebuilds submenu children each time they are read.
 *
 * @param item - Parent toolbar item.
 * @param getChildren - Factory invoked on each `children` access.
 * @returns `item` with a live `children` getter.
 */
export function uiCopyDynamicToolbarChildren(
  item: UIToolbarItem,
  getChildren: () => UIToolbarItem[]
): UIToolbarItem {
  Object.defineProperty(item, 'children', {
    configurable: true,
    enumerable: true,
    get: getChildren
  })
  return item
}

/**
 * Copies a live `children` getter from `source` onto `target` when present.
 *
 * @param target - Clone that should keep dynamic children.
 * @param source - Original item that may define a children getter.
 * @returns Whether a getter was copied.
 */
export function uiPreserveDynamicToolbarChildren(
  target: UIToolbarItem,
  source: UIToolbarItem
): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(source, 'children')
  if (typeof descriptor?.get !== 'function') return false
  uiCopyDynamicToolbarChildren(target, descriptor.get)
  return true
}

/** Returns whether a resolved toolbar item list includes the given button id. */
export function uiToolbarItemsIncludeItem(
  items: UIToolbarItem[],
  itemId: string
): boolean {
  return items.some(item => {
    if (uiIsToolbarSeparatorItem(item)) return false
    if (item.id === itemId) return true
    return item.children
      ? uiToolbarItemsIncludeItem(item.children, itemId)
      : false
  })
}

/** Registers button items (and nested children) in a preset lookup map. */
export function uiIndexToolbarItems(
  items: UIToolbarItem[],
  map: Map<string, UIToolbarItem>
): void {
  for (const item of items) {
    if (uiIsToolbarSeparatorItem(item)) continue
    map.set(item.id, item)
    if (!uiIsDynamicToolbarChildren(item) && item.children?.length) {
      uiIndexToolbarItems(item.children, map)
    }
  }
}

/**
 * Resolves preset references and nested children in a toolbar config list.
 *
 * @param items - Raw toolbar configuration entries.
 * @param presets - Built-in items keyed by id.
 */
export function uiExpandToolbarItemConfigs(
  items: UIToolbarItemConfig[],
  presets: Map<string, UIToolbarItem>
): UIToolbarItem[] {
  return items.flatMap(item => {
    const expanded = uiExpandToolbarItemConfig(item, presets)
    return expanded ? [expanded] : []
  })
}

function uiExpandToolbarItemConfig(
  item: UIToolbarItemConfig,
  presets: Map<string, UIToolbarItem>
): UIToolbarItem | null {
  if (uiIsToolbarSeparatorItem(item)) {
    return {
      type: 'separator',
      id: item.id ?? `separator-${Math.random().toString(36).slice(2, 9)}`
    }
  }

  if (uiIsToolbarPresetRef(item)) {
    const preset = presets.get(item.preset)
    if (!preset) {
      console.warn(
        `[cad-simple-viewer] Unknown toolbar preset "${item.preset}".`
      )
      return null
    }
    return uiCloneToolbarItem(preset)
  }

  const buttonItem = item as UIToolbarItem
  if (uiIsDynamicToolbarChildren(buttonItem)) {
    return uiCloneToolbarItem(buttonItem)
  }
  if (buttonItem.children?.length) {
    return {
      ...buttonItem,
      children: uiExpandToolbarItemConfigs(
        buttonItem.children as UIToolbarItemConfig[],
        presets
      )
    }
  }

  return buttonItem
}

function uiCloneToolbarItem(item: UIToolbarItem): UIToolbarItem {
  const clone: UIToolbarItem = { ...item, children: item.children }
  if (uiPreserveDynamicToolbarChildren(clone, item)) {
    return clone
  }
  if (!item.children?.length) {
    return clone
  }
  return {
    ...clone,
    children: item.children.map(child => uiCloneToolbarItem(child))
  }
}
