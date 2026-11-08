# Toolbar

`@mlightcad/cad-simple-viewer` ships a plain-DOM toolbar engine under `src/ui/toolbar`, plus two lighter helpers used on the canvas:

| Component | Role |
|---|---|
| **`UIToolbar`** | Full floating viewer toolbar: placement, overflow, sub-toolbars, menus, collapse, open-mode gating |
| **`UIShortCutToolbar`** | Top-right erase bar with an accessory slot and optional collapse |
| **`UISimpleToolbar`** | Low-level icon strip with overflow “⋯” menu (building block for the shortcut bar) |

Hosts can compose **preset buttons** and layout defaults on top of `UIToolbar`. This guide focuses on the engine APIs in `cad-simple-viewer` so you can mount your own toolbar or customize one without the plugin.

---

## 1. Architecture

```
Host (plugin / HTML shell / your app)
        │
        ├─ builds UIToolbarItem[] (+ optional presets / separators)
        ├─ supplies UIToolbarI18n + onCommand
        └─ optionally applicationBindToolbarDocState(toolbar)
                │
                ▼
         UIToolbar  ← floating chrome on host / canvas
                │
                ├─ UIDropdownMenu   (childrenUi: 'menu')
                └─ UISubToolbar    (childrenUi: 'toolbar' | 'sticky-toolbar')

Canvas shortcut chrome (independent):
  UIShortCutToolbar → UISimpleToolbar + accessoryHost
```

Key points:

- **UI never imports `ApplicationDocManager`.** Document / open-mode state is injected via `setDocState` or `applicationBindToolbarDocState`.
- **Commands are strings.** Leaf items with `command` call `onCommand(command)`; the host decides how to execute (typically `ApplicationDocManager.instance.sendStringToExecute`).
- **Theme tokens** use `--ml-ui-*` (same as the command line and notification center).
- **Export surface:** `import { UIToolbar, … } from '@mlightcad/cad-simple-viewer'` (re-exported from `src/ui/toolbar`).

---

## 2. Quick start: mount `UIToolbar`

```ts
import {
  ApplicationDocManager,
  ApplicationI18n,
  UIToolbar,
  applicationBindToolbarDocState,
  type UIToolbarItem
} from '@mlightcad/cad-simple-viewer'

const host = document.getElementById('viewer')!
const items: UIToolbarItem[] = [
  {
    id: 'zoom-extents',
    label: 'toolbar.zoomExtent',
    icon: myZoomExtentsSvg,
    command: 'ZOOM E'
  },
  { type: 'separator' },
  {
    id: 'settings',
    label: 'toolbar.settings',
    icon: mySettingsSvg,
    requiresDocument: false,
    childrenUi: 'menu',
    children: [
      {
        id: 'theme-toggle',
        label: 'toolbar.theme',
        icon: myThemeSvg,
        requiresDocument: false,
        action: () => toggleTheme()
      }
    ]
  }
]

const toolbar = new UIToolbar({
  host,
  placement: 'right',
  items,
  i18n: { t: (key, params) => ApplicationI18n.t(key, params) },
  onCommand: command => {
    ApplicationDocManager.instance.sendStringToExecute(command)
  },
  collapsible: true,
  overflow: 'menu',
  edgeOffset: 8
})

const unbind = applicationBindToolbarDocState(toolbar)

// later
unbind()
toolbar.destroy()
```

Minimum required mount options:

| Option | Purpose |
|---|---|
| `host` | Element that receives the toolbar root (usually the canvas container) |
| `placement` | `'top' \| 'bottom' \| 'left' \| 'right'` |
| `items` | Resolved `UIToolbarItem[]` (buttons / separators) |
| `i18n` | `{ t(key, params?) }` for labels and tooltips |
| `onCommand` | Invoked for leaf items that set `command` |

---

## 3. Chrome options

Shared by the main bar and (via inheritance) sub-toolbars. Set on `UIToolbarMountOptions` / `UIToolbarOptions`:

| Option | Default | Notes |
|---|---|---|
| `edgeOffset` | `8` | Inset from the anchored host edge (px) |
| `sideOffset` | `0` | Minimum inset on the orthogonal edges |
| `showLabels` | `false` | Labels under icons (typical phone bottom bar) |
| `size` | `'auto'` | `'stretch'` fills host width/height and spaces buttons |
| `overflow` | `'menu'` | `'menu'` → ⋯ dropdown; `'wrap'` → extra rows/columns |
| `showBorder` | `true` | Outer toolbar border |
| `showButtonBorder` | `false` | Permanent per-button frame |
| `showSeparators` | `true` | Visual separators between groups |
| `showChildrenIndicator` | `true` | Corner triangle on parents with children |
| `collapsible` | `false` | Append a collapse / expand chevron |
| `defaultCollapsed` | `false` | Initial collapsed state when collapsible |
| `inCanvasParent` | `false` | Lay out as a flex sibling of the canvas instead of floating |
| `overlayHost` | `host` | Positioning host for strips / menus when the mount is small |
| `subToolbar` | — | Chrome / `position` / `replaceOnNested` overrides for strips |

### Sub-toolbar alignment

`subToolbar.position`:

- `'front'` (default) — align first buttons
- `'end'` — align last buttons
- `'center'` — center on the parent bar
- `'auto'` — align to the parent button

`subToolbar.replaceOnNested: true` hides the ancestor strip when opening a nested strip (phone space-saving) and treats dock panels / strips / menus as mutually exclusive via `onExclusiveOpen`.

---

## 4. Customizing items

### 4.1 Button shape (`UIToolbarItem`)

```ts
const item: UIToolbarItem = {
  id: 'measure',                 // stable DOM / debug id
  label: 'toolbar.measure',      // i18n key
  icon: '<svg>...</svg>',        // string | HTMLElement | () => HTMLElement
  command: 'DIST',               // → onCommand
  // action: () => {},           // custom click (no command)
  // anchorAction: (el) => {},   // popover anchored to the button
  requiresDocument: true,        // default true when command is set
  minOpenMode: EditorOpenMode.Write,
  disabled: false,               // or () => boolean
  childrenUi: 'sticky-toolbar',
  childIcon: 'selected',         // parent icon follows selected child
  selectedChildId: 'dist',
  children: [ /* … */ ]
}
```

Activation precedence for a leaf click: **`anchorAction` → `command` → `action`**.

### 4.2 Children presentation (`childrenUi`)

| Value | Behavior |
|---|---|
| `'menu'` (default) | Popover with icon + label; closes on outside click |
| `'toolbar'` | Icon strip beside the parent; closes on child or outside click |
| `'sticky-toolbar'` | Strip stays open until the parent is toggled or another parent opens |

`childIcon: 'selected'` makes the parent show the selected child’s icon (useful for placement / theme switchers).

### 4.3 Separators

```ts
{ type: 'separator' }
// or
{ type: 'separator', id: 'after-nav' }
```

### 4.4 Toggle buttons

Two-state items merge `on` / `off` fields from `getValue()`:

```ts
{
  id: 'measurement-visibility',
  toggle: {
    getValue: () => isMeasurementVisible(),
    on: { label: 'toolbar.hideMeasurements', icon: ICON_HIDE, action: () => hide() },
    off: { label: 'toolbar.showMeasurements', icon: ICON_SHOW, action: () => show() }
  }
}
```

### 4.5 Dynamic children

When the submenu depends on the active document (e.g. layouts), attach a **getter** instead of a static array so re-renders always see fresh data. Helpers:

- `uiCopyDynamicToolbarChildren(item, () => buildChildren())`
- `uiIsDynamicToolbarChildren(item)`
- `uiPreserveDynamicToolbarChildren(target, source)`

### 4.6 Config composition helpers

When building lists from presets / append / exclude, use:

| Helper | Purpose |
|---|---|
| `uiToolbarPreset('zoom')` | `{ preset: 'zoom' }` reference |
| `uiExpandToolbarItemConfigs(configs, resolvePreset)` | Expand presets + separators into items |
| `uiCreateToolbarSeparator()` | Separator factory |
| `uiFilterVisibleToolbarItems(items, openMode)` | Apply open-mode / visibility rules |

Preset **catalogs** (concrete button definitions for `'select'`, `'measure'`, …) live in host packages, not in the engine.

---

## 5. Document state and open mode

Items can require a document and/or a minimum `EditorOpenMode` (`Read` / `Write`). Drive that state from the host:

```ts
import { applicationBindToolbarDocState } from '@mlightcad/cad-simple-viewer'

// Automatic: listen to DocManager documentActivated / documentToBeOpened
const unbind = applicationBindToolbarDocState(toolbar)

// Or manual:
toolbar.setDocState({
  hasDocument: true,
  isOpening: false,
  openMode: EditorOpenMode.Write
})
```

While `isOpening` is true, command buttons are disabled. Items with `requiresDocument: false` stay available without a drawing.

---

## 6. Runtime API

| Method | Purpose |
|---|---|
| `updateItems(items)` | Replace the button list and re-render |
| `setPlacement(placement)` | Move to another host edge |
| `setEdgeOffset` / `setSideOffset` | Adjust insets |
| `setCollapsed(collapsed)` | Collapse to the toggle only (`collapsible` must be true) |
| `setVisible(visible)` | Show / hide the whole bar |
| `setSelectedChild(parentId, childId)` | Update submenu selection + optional parent icon |
| `setDocState(partial)` | Update document / open-mode gating |
| `reparentTo(newHost)` | Move the root to another mount element |
| `syncInParentLayout()` | Re-apply flex sibling layout after canvas reparent |
| `getLayerButtonAnchor()` | Expand if needed and return the `layer` button element |
| `destroy()` | Tear down listeners and DOM |

Getters: `placement`, `isCollapsed`, `isVisible`, `replaceOnNested`.

---

## 7. Shortcut toolbar (`UIShortCutToolbar`)

Floating **erase** chrome at the top-right of the view container. Created automatically when draw-style / selection accessories need it (`applicationGetShortCutToolbar` / install helpers), or mount it yourself:

```ts
import {
  UIShortCutToolbar,
  ApplicationSettingManager
} from '@mlightcad/cad-simple-viewer'

const shortcut = new UIShortCutToolbar({
  container: view.container,
  collapsible: true,          // default true — shows collapse chevron
  defaultCollapsed: false,
  topOffsetPx: 12,
  actions: {
    erase: () => run('ERASE')
  },
  getActionState: () => ({
    erase: hasSelection
  })
})

// Visibility follows settings unless forceVisible: true
ApplicationSettingManager.instance.isShowShortCutToolbar = false
```

### Customization points

| API | Purpose |
|---|---|
| `setActions` / `setActionState` / `setActionStateProvider` | Wire or refresh erase |
| `setExtensionItems(items)` | Prepend icon buttons before core actions (`UISimpleToolbarItem[]`) |
| `accessoryHost` | Mount draw-style / selection controls (color, text height) |
| `setAccessoryActive(true)` | Show the divider between accessory and core |
| `setTopOffset(px)` | Sit below a status / message bar |
| `setCollapsed` / `toggleCollapsed` / `isCollapsed` | Collapse chrome |
| `dispose()` | Tear down |

`UISimpleToolbar` alone is useful when you need a themed icon strip without the shortcut shell (horizontal / vertical, overflow menu, `setItems` / `setExtensionItems` / `updateItem`).

---

## 8. Styling and z-index

- Styles are injected by `uiEnsureToolbarStyles()` (called from `UIToolbar`). Classes use the `ml-ex-ui-toolbar*` prefix.
- Shortcut shell styles use `ml-ui-shortcut-toolbar-shell` / `ml-ui-simple-toolbar*`.
- Theme: `editorApplyUiTheme` / `resolveUiTheme` (`--ml-ui-bg`, `--ml-ui-border`, `--ml-ui-accent`, …).
- Shortcut bar z-index: `ML_UI_Z_SHORTCUT_TOOLBAR` in `EditorUiLayout` (below the notification bell).

---

## 9. Checklist for a custom toolbar

1. Decide mount `host` and `placement`.
2. Build `UIToolbarItem[]` (commands, actions, children, toggles).
3. Provide `i18n.t` and `onCommand`.
4. Call `applicationBindToolbarDocState` (or `setDocState`) so open-mode gating works.
5. Optionally enable `collapsible`, tune `overflow` / `size` / `subToolbar`.
6. Keep the shortcut bar for erase if you hide or omit that command from the main toolbar.
7. On teardown: unbind doc state and `toolbar.destroy()`.
