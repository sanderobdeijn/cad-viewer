# @mlightcad/cad-simple-ui-plugin

Framework-agnostic toolbar and measurement palette UI for [`@mlightcad/cad-simple-viewer`](https://github.com/mlightcad/cad-viewer).

This plugin provides ready-to-use CAD viewer chrome without Vue, React, or Element Plus. All UI uses plain DOM and respects the cad-simple-viewer `--ml-ui-*` theme tokens.

## Features

- Configurable toolbar with predefined CAD commands, separators, and preset references
- Nested sub-toolbars (sticky or dismissible) and optional popover menus, with flyout arrows
- Toolbar placement: `top`, `bottom`, `left`, `right`
- Optional in-canvas-parent layout: sit against the canvas edge instead of floating over it
- Default toolbar differs by layout: compact phone bar, pad without Select/Pan, full desktop icon strip
- UI theme follows `COLORTHEME` sysvar and `--ml-ui-*` tokens on `host` automatically
- Chrome DevTools-style **dock panel** with tabs, open/close, dock side (bottom/left/right), and resize handle
- Dock panel closes via the close button
- Optional collapsible toolbar: hide tool buttons and show only a chevron toggle

## Install

```bash
pnpm add @mlightcad/cad-simple-ui-plugin @mlightcad/cad-simple-viewer @mlightcad/data-model
```

## Quick start

Load the plugin after creating the document manager. Apply the initial UI theme on `host` first so theme/placement buttons work even before a drawing is opened:

```typescript
import { AcApDocManager, acedApplyUiTheme } from '@mlightcad/cad-simple-viewer'
import { acuiCreateSimpleUiPlugin } from '@mlightcad/cad-simple-ui-plugin'

const host = document.getElementById('viewer-host')!

acedApplyUiTheme('dark', host)

AcApDocManager.createInstance({ container: host })

await AcApDocManager.instance.pluginManager.loadPlugin(
  acuiCreateSimpleUiPlugin({
    host,
    toolbar: {
      placement: 'right',
      items: 'default'
    }
  })
)
```

### Lazy registration (smaller initial bundle)

Import from `@mlightcad/cad-simple-ui-plugin/register` so the main plugin bundle is loaded only when you register it:

```typescript
import { acuiRegisterSimpleUiPlugin } from '@mlightcad/cad-simple-ui-plugin/register'

await acuiRegisterSimpleUiPlugin(AcApDocManager.instance.pluginManager, {
  host,
  toolbar: { placement: 'right', items: 'default' }
})
```

### Example app pattern (`cad-simple-viewer-example`)

The [vanilla example](../cad-simple-viewer-example) **defers viewer and plugin initialization until the user opens a file** (local upload or predefined sample). That keeps the first paint lightweight:

1. Page load — only file picker UI; no `AcApDocManager` yet.
2. First open — `acedApplyUiTheme`, `AcApDocManager.createInstance`, then `acuiRegisterSimpleUiPlugin`.
3. Subsequent opens — reuse the same viewer instance.

You can adopt the same pattern or load the plugin at startup (see Quick start above). Both are supported.

The default toolbar does not include every command the old inline demo had (for example pickbox and line-weight toggles). Add them with `appendItems` when needed:

```typescript
toolbar: {
  items: 'default',
  appendItems: [
    {
      id: 'pickbox',
      label: 'Set Pickbox',
      requiresDocument: true,
      action: () => {
        const valueText = window.prompt('Set pick box size (integer):', '10')
        if (valueText == null) return
        const pickboxValue = Number.parseInt(valueText, 10)
        if (!Number.isFinite(pickboxValue) || pickboxValue <= 0) return
        AcApDocManager.instance.sendStringToExecute(`PICKBOX\n${pickboxValue}`)
      }
    }
  ]
}
```

By default `appendItems` are added at the end of the toolbar. Use `appendItemsAfter` or `appendItemsBefore` to insert next to an existing root item id (for example after `layer`). When both are set, `appendItemsBefore` takes precedence.

```typescript
toolbar: {
  items: 'default',
  appendItems: [{ id: 'agent', label: 'Agent', command: 'agent' }],
  appendItemsAfter: 'zoom'
}
```

The built-in theme toggle button updates `COLORTHEME` when a document is open, or applies `acedApplyUiTheme` on `host` when no document is loaded.

### Dock panel

The measurement tab is enabled automatically when the resolved toolbar includes its button, and renders as a tab in the dock panel.

```typescript
acuiCreateSimpleUiPlugin({
  host,
  dockPanel: {
    defaultSide: 'left', // 'top' | 'bottom' | 'left' | 'right' (default: 'left')
    defaultOpen: false,
    defaultHeight: 240,
    defaultWidth: 280
  }
})
```

Dock panel behavior:

- Close via the panel close button or `setDockPanelOpen(false)`
- `setDockPanelOpen(true)` opens the dock without changing the active tab
- Default dock side is **left**; override with `dockPanel.defaultSide`
- By default the dock mounts on the viewer canvas parent (inside `host`), so sibling header toolbars are not stretched
- Override mount element with `dockPanel.mountTarget` when needed
- Drag the resize handle on the panel edge to adjust height or width
- Multiple tabs supported (the measurements tab is registered automatically when its toolbar button is present)
- Canvas area shrinks when the panel is open (flex layout on `host`)

Runtime dock panel controls:

```typescript
const plugin = docManager.pluginManager.getPlugin(
  SIMPLE_UI_PLUGIN_NAME
) as AcApSimpleUiPlugin

plugin.isDockPanelOpen()
plugin.setDockPanelOpen(true)
plugin.getDockPanelSide() // 'left' | 'right' | 'top' | 'bottom'
plugin.getDockPanelSize()
plugin.setDockPanelSize(320)
```

You can enable an empty dock panel for future tabs without a toolbar button:

```typescript
acuiCreateSimpleUiPlugin({
  host,
  dockPanel: { enabled: true }
})
```

### Collapsible toolbar

Set `toolbar.collapsible: true` to append a chevron toggle at the end of the toolbar. When collapsed, only the toggle button is shown; the dock panel is closed automatically.

```typescript
toolbar: {
  placement: 'right',
  items: 'default',
  collapsible: true,
  defaultCollapsed: false // optional, default false
}
```

### In-canvas-parent toolbar

By default the toolbar floats over the drawing (`position: absolute`). Set `toolbar.inCanvasParent: true` to place it as a flex sibling of the canvas inside the **same parent the dock panel uses** (the viewer canvas parent when it lies inside `host`). The toolbar then sits against the canvas edge instead of covering it. `placement` still picks the edge; `edgeOffset` and `sideOffset` still apply as the gap from the canvas and the orthogonal insets.

```typescript
toolbar: {
  placement: 'bottom',
  inCanvasParent: true,
  edgeOffset: 0
}
```

Phone layouts can enable this without affecting desktop overlay chrome:

```typescript
layouts: {
  phone: {
    toolbar: {
      placement: 'bottom',
      inCanvasParent: true
    }
  }
}
```

### Responsive layouts (phone / pad / desktop)

By default the plugin uses `layout: 'auto'` and follows viewport width via `acedGetUiLayout()` from `@mlightcad/cad-simple-viewer`:

| Kind | Viewport | Chrome | Default buttons (`items: 'default'`) |
| --- | --- | --- | --- |
| **phone** | ≤600px | Bottom bar, full width (`size: 'stretch'`), labels, `edgeOffset: 0`, not collapsible, no flyout arrows. Nested strips use `replaceOnNested: true`. | `zoom` (saved / extents / smart extents / window), `measure`, `layout`, `settings` (simulated mouse, placement, theme, background, reading mode, language) |
| **pad** | 601–960px | Same floating chrome as desktop (right, icons only, `edgeOffset: 8`). | Desktop set **without** `select` and `pan` (`excludeItems: ['select', 'pan']`). Touch drag pans; a long-press starts window/crossing box select. |
| **desktop** | >960px | Right-side floating icon toolbar. | `select`, `pan`, `zoom` (saved / extents / smart extents / window), `layout`, `measure`, then `settings` (simulated mouse, placement, theme, background, reading mode, language). **Open** is not shown; add it with `{ preset: 'open' }` or `acuiToolbarPreset('open')`. |

Phone does **not** inherit top-level `toolbar.items`, `appendItems`, or chrome (placement, labels, size). It only inherits `enabled`, `mountTarget`, and `inCanvasParent`. Pad and desktop inherit the full top-level `toolbar` baseline on top of the built-ins above.

To show Select / Pan on pad again:

```typescript
layouts: {
  pad: {
    toolbar: {
      excludeItems: []
    }
  }
}
```

```typescript
acuiCreateSimpleUiPlugin({
  host,
  layout: 'auto', // default; or force 'phone' | 'pad' | 'desktop'
  toolbar: {
    placement: 'right',
    items: 'default',
    collapsible: true,
    appendItems: [{ id: 'agent', command: 'agent' }],
    appendItemsAfter: 'layout'
  },
  layouts: {
    phone: {
      toolbar: {
        // optional overrides; phone inherits enabled/mountTarget/inCanvasParent
        // subToolbar.position: 'front' (default) | 'end' | 'center' | 'auto'
      }
    }
  }
})
```

`toolbar.subToolbar` can override chrome (`showLabels`, `size`, …) and **`position`**:

| Value | Behavior |
| --- | --- |
| `front` (default) | First sub-toolbar button aligns with the first toolbar button |
| `end` | Last sub-toolbar button aligns with the last toolbar button |
| `center` | Center the sub-toolbar on the parent toolbar |
| `auto` | Align to the parent button |

`position` is ignored when the sub-toolbar `size` is `'stretch'`.

Runtime controls:

```typescript
plugin.getLayout() // 'phone' | 'pad' | 'desktop'
plugin.setLayout('auto') // or force a specific kind
```

Toolbar configuration is typed as `AcUiToolbarOptions`. Use `excludeItems` to omit root button ids after `items` / `appendItems` are resolved (pad built-ins already exclude `select` and `pan`).

## Custom toolbar

Toolbar buttons are configured through `toolbar.items`. You can start from the built-in set, extend it, or replace it entirely. Pad still applies `excludeItems: ['select', 'pan']` unless you override it with `layouts.pad.toolbar`.

### Replace the full toolbar at runtime

Use `appendItems` only when you want to keep the built-in default and add a few buttons. To **replace the entire toolbar**, call `setToolbarItems` on the loaded plugin. Auto or forced layout switches then keep that item list and only update chrome (placement, size, labels):

```typescript
import {
  SIMPLE_UI_PLUGIN_NAME,
  type AcApSimpleUiPlugin,
  acuiCreateToolbarLayoutSwitcher,
  acuiToolbarPreset
} from '@mlightcad/cad-simple-ui-plugin'

const plugin = docManager.pluginManager.getPlugin(
  SIMPLE_UI_PLUGIN_NAME
) as AcApSimpleUiPlugin

plugin.setToolbarItems([
  acuiToolbarPreset('select'),
  acuiToolbarPreset('pan')
])

// Optional: prepend a submenu button that switches between full layouts
plugin.setToolbarItems(
  [
    acuiToolbarPreset('select'),
    { id: 'line', label: 'Line', command: 'line', requiresDocument: true }
  ],
  acuiCreateToolbarLayoutSwitcher({
    presets: [
      { id: 'view', label: 'View tools' },
      { id: 'draw', label: 'Draw tools' }
    ],
    currentId: 'draw',
    onSelect: presetId => applyLayout(presetId)
  })
)
```

See `cad-simple-viewer-example` (`demoToolbarPresets.ts`) for a working layout switcher prepended to the **viewer toolbar** (via `acuiCreateToolbarLayoutSwitcher` + `setToolbarItems`). The example dev toolbar also includes a layout dropdown that calls the same preset helpers.

### `AcUiToolbarItem` fields

| Field | Description |
|-------|-------------|
| `id` | Unique button id |
| `label` | Tooltip / aria-label (i18n key or plain text if using custom items only) |
| `icon` | Inline SVG string, DOM element, or factory `() => HTMLElement` |
| `command` | Passed to `AcApDocManager.sendStringToExecute` (supports `\n`, e.g. `'zoom\nall'`) |
| `action` | Custom click handler (e.g. open a dialog). Used when no `command` is set |
| `anchorAction` | Popover-style handler that receives the anchor button element. Takes precedence over `command` and `action` |
| `requiresDocument` | When `false`, button stays enabled before a drawing is opened |
| `minOpenMode` | Hide below this open mode (e.g. `AcEdOpenMode.Write`) |
| `children` | Nested items shown as a sub-toolbar or popover when the parent is clicked |
| `childrenUi` | `'menu'` (popover, default), `'toolbar'` (closes on child or canvas click), or `'sticky-toolbar'` (stays until the parent is clicked again) |
| `childIcon` | `'fixed'` (default): parent keeps its own icon; `'selected'`: parent icon follows the active child item |
| `selectedChildId` | Initial submenu selection when `childIcon` is `'selected'` |
| `toggle` | Two-state button with `getValue`, `on`, and `off` branches |
| `type` | `'separator'` renders a divider; omit for buttons |
| `preset` | Reference a built-in button by id (custom layouts only; use `{ preset: 'pan' }`) |
| `disabled` | `boolean` or `() => boolean` |

Built-in preset ids include: `open` (not on the default toolbar; local picker, or a data-source menu), `select`, `pan`, `zoom` (saved / extents / smart extents / window), `measure`, `toolbar-placement`, `switch-bg`, `theme`, and nested ids such as `placement-top`, `measure-distance`, `locale-en`, `locale-zh`, `locale-cs`, `locale-tr`, etc.

### 1. Default toolbar + extra buttons

Keep all predefined buttons and append your own at the end:

```typescript
import { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'
import { acuiCreateSimpleUiPlugin } from '@mlightcad/cad-simple-ui-plugin'

acuiCreateSimpleUiPlugin({
  toolbar: {
    placement: 'right',
    items: 'default',
    appendItems: [
      {
        id: 'my-redline',
        label: 'Redline',
        command: 'pline',
        minOpenMode: AcEdOpenMode.Write
      }
    ]
  }
})
```

### 2. Custom layout with built-in presets and separators

Pick built-in buttons by id and group them with separators — no need to duplicate icons, labels, or submenu definitions:

```typescript
import {
  acuiCreateSimpleUiPlugin,
  acuiCreateToolbarSeparator,
  acuiToolbarPreset
} from '@mlightcad/cad-simple-ui-plugin'

acuiCreateSimpleUiPlugin({
  toolbar: {
    placement: 'right',
    items: [
      acuiToolbarPreset('select'),
      acuiToolbarPreset('pan'),
      acuiToolbarPreset('zoom'),
      acuiCreateToolbarSeparator('sep-tools'),
      acuiToolbarPreset('measure'),
      acuiCreateToolbarSeparator('sep-settings'),
      acuiToolbarPreset('switch-bg'),
      acuiToolbarPreset('theme')
    ]
  }
})
```

Equivalent object form:

```typescript
items: [
  { preset: 'select' },
  { preset: 'pan' },
  { type: 'separator', id: 'sep-tools' },
  { preset: 'measure' }
]
```

### 3. Fully custom toolbar

Replace the default set with your own list:

```typescript
acuiCreateSimpleUiPlugin({
  toolbar: {
    placement: 'top',
    items: [
      {
        id: 'select',
        label: 'Select',
        icon: '<svg ...>...</svg>',
        command: 'select'
      },
      {
        id: 'pan',
        label: 'Pan',
        command: 'pan'
      },
      {
        id: 'zoom',
        label: 'Zoom',
        children: [
          { id: 'zoom-all', label: 'Zoom Extents', command: 'zoom\nall' },
          { id: 'zoom-window', label: 'Zoom Window', command: 'zoom\nwindow' }
        ]
      }
    ]
  }
})
```

### 4. Button with icon and command

```typescript
{
  id: 'line',
  label: 'Draw Line',
  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M4 16 L16 4"/></svg>',
  command: 'line'
}
```

`currentColor` in SVG inherits the toolbar text color and follows light/dark theme.

### 5. Text-only button (no icon)

```typescript
{
  id: 'save',
  label: 'Save',
  command: 'qsave'
}
```

### 6. Submenu / sub-toolbar (nested commands)

Popover menu (default when `childrenUi` is omitted):

```typescript
{
  id: 'draw',
  label: 'Draw',
  icon: drawIconSvg,
  childIcon: 'fixed', // default — parent icon stays the same
  children: [
    { id: 'line', label: 'Line', command: 'line' },
    { id: 'circle', label: 'Circle', command: 'circle' }
  ]
}
```

Icon sub-toolbar beside the parent. Measure, Toolbar Position, and Language use `'toolbar'` so clicking a child button or the canvas closes the strip:

```typescript
{
  id: 'measure',
  label: 'Measure',
  icon: measureIconSvg,
  childrenUi: 'toolbar',
  children: [
    { id: 'measure-distance', label: 'Distance', command: 'measuredistance' },
    { id: 'measure-area', label: 'Area', command: 'measurearea' }
  ]
}
```

When the parent icon should reflect the active submenu item:

```typescript
{
  id: 'my-measure',
  label: 'Measure',
  icon: measureIconSvg,
  childIcon: 'selected',
  selectedChildId: 'my-measure-area',
  children: [
    { id: 'my-measure-distance', label: 'Distance', icon: distanceIcon, command: 'measuredistance' },
    { id: 'my-measure-area', label: 'Area', icon: areaIcon, command: 'measurearea' }
  ]
}
```

Built-in buttons using `childIcon: 'selected'`: `toolbar-placement`. `measure` uses a fixed parent icon.

Built-in `childrenUi`: `measure` and `toolbar-placement` are `'toolbar'`. Custom items default to `'menu'`. Use `'sticky-toolbar'` to keep a strip open until the parent is clicked again.

Submenu flyout direction follows toolbar placement (e.g. arrow points left when the toolbar is on the right).

### 7. Custom action (no CAD command)

```typescript
{
  id: 'help',
  label: 'Help',
  requiresDocument: false,
  action: () => window.open('/help', '_blank')
}
```

### 8. Toggle button

```typescript
{
  id: 'grid',
  toggle: {
    getValue: () => gridVisible,
    on: { label: 'Hide Grid', icon: gridOnIcon, action: () => setGridVisible(false) },
    off: { label: 'Show Grid', icon: gridOffIcon, action: () => setGridVisible(true) }
  }
}
```

### 9. Disable toolbar

```typescript
acuiCreateSimpleUiPlugin({
  toolbar: { enabled: false }
})
```

### Complete example

```typescript
import { AcApDocManager, AcEdOpenMode, acedApplyUiTheme } from '@mlightcad/cad-simple-viewer'
import { acuiCreateSimpleUiPlugin } from '@mlightcad/cad-simple-ui-plugin'

const viewerPane = document.getElementById('viewerPane')!

acedApplyUiTheme('dark', viewerPane)

AcApDocManager.createInstance({ container: document.getElementById('cad-container')! })

await AcApDocManager.instance.pluginManager.loadPlugin(
  acuiCreateSimpleUiPlugin({
    host: viewerPane,
    toolbar: {
      placement: 'right',
      items: 'default',
      appendItems: [
        {
          id: 'draw-tools',
          label: 'Draw',
          children: [
            { id: 'line', label: 'Line', command: 'line' },
            { id: 'circle', label: 'Circle', command: 'circle' }
          ]
        }
      ]
    }
  })
)
```

## API

| Export | Description |
|--------|-------------|
| `acuiCreateSimpleUiPlugin(options)` | Returns an `AcApPlugin` instance |
| `acuiRegisterSimpleUiPlugin(pluginManager, options)` | Eager-load helper |
| `AcUiSimpleUiPluginOptions` | Plugin configuration type |
| `AcUiToolbarItem` | Single toolbar button definition |
| `AcUiToolbarChildrenUi` | `'menu' \| 'toolbar' \| 'sticky-toolbar'` |
| `AcUiToolbarItemConfig` | Button, separator, or preset reference in toolbar config |
| `acuiCreateToolbarSeparator(id?)` | Helper that creates a separator entry |
| `acuiToolbarPreset(id)` | Helper that references a built-in button |
| `acuiCreateDefaultToolbarPresetMap()` | Built-in items keyed by id (advanced use) |
| `AcUiToolbarPlacement` | `'top' \| 'bottom' \| 'left' \| 'right'` |

## See also

- [cad-simple-viewer-example](../cad-simple-viewer-example) — vanilla TypeScript demo (lazy init on first file open; uses `acuiRegisterSimpleUiPlugin`)
- [cad-viewer](../cad-viewer) — full Vue + Element Plus application shell
