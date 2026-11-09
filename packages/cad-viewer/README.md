# CAD Viewer Component

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@mlightcad/cad-viewer.svg)](https://www.npmjs.com/package/@mlightcad/cad-viewer)

CAD Viewer is a **high-performance** Vue 3 component for creating and editing CAD drawings **entirely in the browser without requiring any backend server**. It provides a modern user interface, state management, and seamless integration with optimized rendering engines for smooth browser-based CAD workflows with exceptional performance.

## Key Features

- **High-performance** CAD editing and viewing with smooth 60+ FPS rendering
- **No backend required** - Everything runs entirely in the browser
- **Always a new drawing** - The viewer opens with a blank drawing; drawings are not loaded from or saved to files
- **Easy integration** - No server setup or backend infrastructure needed for third-party integration
- **Customizable UI** - Control visibility of toolbars, command line, coordinates, and performance stats
- Modern UI optimized for large CAD file handling
- State management for entities and settings
- Integration with optimized SVG and THREE.js renderers
- Dialogs, toolbars, and command line interface
- Vue 3 component for embedding high-performance CAD viewers in your own apps

## When Should You Choose cad-viewer?

Use `cad-viewer` if you want a **ready-to-use Vue 3 component** for viewing and editing CAD files with a modern UI, dialogs, toolbars, and state management. This package is ideal if:

- You want to quickly embed a high-performance CAD viewer/editor into your Vue application with minimal setup.
- You need support for both local file loading (from user's computer) and remote file loading (from URLs).
- You need a solution that handles file loading, rendering, entity management, and user interactions out of the box.
- You want seamless integration with optimized SVG and THREE.js renderers, internationalization, and theming.
- You do **not** want to build your own UI from scratch.

**Recommended for:** Most web applications, dashboards, or platforms that need to display CAD files with a polished user interface.

## Browser-Only Architecture

This Vue 3 component operates entirely in the browser with **no backend dependencies**.

- **Zero server requirements** - Deploy the component anywhere with just static file hosting
- **Complete data privacy** - CAD files never leave the user's device, whether loaded locally or from URLs
- **Local file support** - Users can load files directly from their computer using the built-in file dialog
- **Remote file support** - Automatically load files from URLs when provided
- **Instant integration** - No complex backend setup or API configuration needed
- **Offline capability** - Works without internet connectivity once loaded
- **Third-party friendly** - Easy to embed in any Vue 3 application without server-side concerns

## Directory Structure (partial)

- `src/app/` – Application entry, store, and main logic
- `src/component/` – UI components (dialogs, toolbars, status bar, etc.)
- `src/composable/` – Vue composables for state and logic
- `src/locale/` – Internationalization files
- `src/style/` – Stylesheets
- `src/svg/` – SVG assets

## Installation

```bash
npm install @mlightcad/cad-viewer
```

## Usage

Please refer to sub-package `cad-viewer-example` as one example.

### Basic Usage

Firstly, add the following dependencies into your package.json.

- @element-plus/icons-vue
- @mlightcad/cad-simple-viewer
- @mlightcad/cad-viewer
- @vueuse/core
- element-plus
- vue
- vue-i18n

Then create one vue component as follows.

```vue
<template>
  <div>
    <MlCADViewer :background="0x808080" />
  </div>
</template>

<script setup lang="ts">
import 'uno.css'
import 'element-plus/dist/index.css'
import 'element-plus/dist/index.css'

import {
  i18n,
  MlCadViewer
} from '@mlightcad/cad-viewer'
import ElementPlus from 'element-plus'
import { createApp } from 'vue'

const initApp = () => {
  const app = createApp(MlCadViewer)
  app.use(i18n)
  app.use(ElementPlus)
  app.mount('#app')
}

initApp()
</script>
```

## MlCadViewer Component

The `MlCadViewer` is the main Vue 3 component that provides a complete CAD viewing and editing interface. It includes toolbars, a command line, status bar, and various dialogs for a full-featured CAD experience.

### Component Properties

The `MlCadViewer` component accepts the following props:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `background` | `number` | `undefined` | Background color as 24-bit hexadecimal RGB (e.g., `0x000000` for black, `0x808080` for gray). |
| `theme` | `'light' \| 'dark'` | `'dark'` | Initial UI theme of the CAD viewer. On mount, this prop initializes the `colorTheme` setting (`0 = dark`, `1 = light`). After that, the viewer theme is driven by `colorTheme`, so runtime changes from the status bar theme button, the `COLORTHEME` command or direct setting updates stay synchronized across `cad-viewer` and `cad-simple-viewer`. |
### UI Settings

The `MlCadViewer` reads its UI visibility from the global `ApplicationSettingManager` (provided by `@mlightcad/cad-simple-viewer`). Configure these flags anywhere before rendering the viewer to customize the UI.

Settings resolve in three layers (later wins): built-in defaults, user preferences in `localStorage`, and session overrides. Only user preferences are persisted. Use `{ persist: false }` for host layout (for example hide the command line on mobile) so the change does not leak into other products or later visits on the same origin.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `isShowToolbar` | `boolean` | `true` | Controls toolbar visibility |
| `isShowCommandLine` | `boolean` | `true` | Controls command line visibility |
| `isShowCoordinate` | `boolean` | `true` | Controls coordinate display visibility |
| `isShowEntityInfo` | `boolean` | `false` | Controls entity info card visibility |
| `isShowRibbon` | `boolean` | `true` | Controls ribbon visibility |
| `isShowStats` | `boolean` | `false` | Controls performance statistics display |

#### Example (recommended)
```vue
<template>
  <MlCadViewer />
</template>

<script setup lang="ts">
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { ApplicationSettingManager } from '@mlightcad/cad-simple-viewer'

// Optional: isolate this product's preferences on a shared origin
ApplicationSettingManager.configure({
  storageKey: 'mlightcad.settings.cad-viewer'
})

// Host layout before mount — session only (does not write localStorage)
ApplicationSettingManager.instance.apply(
  {
    isShowCommandLine: false
    // isShowToolbar: false,
    // isShowStats: true,
    // isShowCoordinate: false,
    // isShowEntityInfo: false
  },
  { persist: false }
)
</script>
```

#### Notes

- Settings are global and immediately reflected by `MlCadViewer`.
- You can change them at runtime using the same `ApplicationSettingManager.instance` reference.
- Property setters (for example `isShowToolbar = false`) and the in-app settings menu persist user preferences by default.
- On the same origin, give each product its own `storageKey` via `ApplicationSettingManager.configure` so preferences do not cross-contaminate. Call `configure` before the first settings read/write.

### Component Features

The `MlCadViewer` component includes:

- **Ribbon** - File operations (including local file opening), CAD commands, and settings
- **Toolbars** - Drawing tools, zoom controls, and selection tools
- **Command Line** - AutoCAD-style command input
- **Status Bar** - Current position, zoom level, and system status
- **Dialog Manager** - Modal dialogs for various operations
- **File Reader** - Local file loading via file dialog and drag-and-drop support
- **Entity Info** - Detailed information about selected entities
- **Theme Support** - Dark/light mode driven by the `colorTheme` setting

### Event Handling

The component automatically handles various events:

- **File Loading** - Supports local file loading (via file dialog), drag-and-drop, and URL-based file loading
- **Error Messages** - Displays user-friendly error messages for failed operations
- **System Messages** - Shows status updates and operation feedback

### Advanced Usage

Please refer to [readme of cad-simple-viewer](../cad-simple-viewer/README.md) to learn the following advanced usage.

- Create drawing or modify drawing

## Available Exports

### Main Component

- `MlCADViewer` - The main CAD viewer component

### Commands

- `ApplicationLogCmd` - Log command
- `ApplicationMissedDataCmd` - Missed data command
- `ApplicationPointStyleCmd` - Point style command

### Components

- `MlPointStyleDlg` - Point style dialog
- Various layout and UI components

### Composables

- `useCommands` - Command management
- `useCurrentPos` - Current position tracking
- `useDark` - Reactive dark-mode state backed by the `colorTheme` setting
- `useDialogManager` - Dialog management
- `useFileTypes` - File type utilities
- `useMissedData` - Missed data handling
- `useSettings` - Settings management

### Theme Synchronization

The viewer UI theme is synchronized through the `colorTheme` setting on `ApplicationSettingManager`. The `COLORTHEME` command changes the same setting.

- `colorTheme = 0` means dark theme.
- `colorTheme = 1` means light theme.
- The `theme` prop provides the initial value when `MlCadViewer` mounts.
- Clicking the status bar theme button updates `colorTheme`.
- Any runtime change to `colorTheme` is reflected automatically in viewer UI.
- The exported `useDark` composable wraps `colorTheme` instead of maintaining an isolated local dark-mode state.

### Locale

- `i18n` - Internationalization instance
- English language files

### Styles

- CSS and SCSS files for styling
- Dark mode support
- Element Plus integration

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build the library
pnpm build

# Preview the build
pnpm preview
```

## License

MIT
