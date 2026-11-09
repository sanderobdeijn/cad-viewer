# CAD Simple Viewer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@mlightcad/cad-simple-viewer.svg)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)

This package provides the **high-performance** core components of a CAD viewer such as document management, command handling, and collaboration between the UI and rendering engines. It's designed for optimal performance when handling large CAD files.

This module doesn't depend on any UI framework and doesn't provide any UI except canvas. If you want to integrate a high-performance CAD viewer into a web application with your own UI, this module is the correct choice. It fully supports **mobile layout and touch interaction**—responsive chrome for phones and tablets, plus pinch-to-zoom, single-finger pan, and tap-to-select—so hosts can ship a mobile-friendly viewer without a separate mobile stack.

## Key Features
- Document management optimized for large files
- Efficient command stack
- Optimized integration with rendering engines
- Performance-focused settings and context management
- Framework-agnostic design for maximum flexibility

## When Should You Choose cad-simple-viewer?

Use `cad-simple-viewer` if you need **core CAD logic only** (document management, command stack, rendering engine integration) without any UI framework dependencies. This package is ideal if:

- You want to build your **own custom UI** or integrate CAD functionality into a non-Vue or non-web environment.
- You require maximum flexibility and performance for handling large CAD files, and plan to connect the logic to your own rendering or UI layer.
- You want a framework-agnostic solution that provides only the essential CAD operations and canvas rendering.

**Recommended for:** Custom integrations, headless CAD processing, or advanced users building highly tailored CAD solutions.

## Directory Structure (partial)
- `src/app/` – Document/context management, settings
- `src/command/` – Command implementations (open, zoom, select, etc.)
- `src/editor/` – Command stack, input handling, global functions
- `src/service/` – Entity services
- `src/view/` – Layout and scene management
- `src/util/` – Utilities

## Installation

```bash
npm install @mlightcad/cad-simple-viewer
```

## Usage

Please refer to [cad-simple-viewer-example](https://github.com/mlight-lee/cad-simple-viewer-example) on basic usage and advanced usage.

To learn about the built-in notification center (and how to replace the default bell UI while still receiving its alerts), see [docs/notification-center.md](./docs/notification-center.md).

For the plain-DOM toolbar engine (`UIToolbar`, shortcut bar, and host customization), see [docs/toolbar.md](./docs/toolbar.md).

`cad-simple-viewer` always starts from a blank drawing created with `ApplicationDocManager.newDocument()`; drawings are not loaded from or saved to files. It provides comprehensive support for **modifying drawings in real-time**. You can add, edit, and delete entities within the drawing, and the viewer will automatically update to reflect these changes.

When you modify entities, you're working directly with the underlying drawing database. The viewer automatically detects these changes and updates the display accordingly. This real-time synchronization ensures that:

- All modifications are immediately visible

This capability makes `cad-simple-viewer` suitable for applications that need to not only display CAD files but also allow users to interact with and modify the drawing content.

**Important Note**: The usage patterns in `cad-simple-viewer` are **very similar to AutoCAD RealDWG**. If you're familiar with AutoCAD RealDWG development, you'll find the API structure and workflow nearly identical. The main difference is that we use the [**realdwg-web API**](https://mlight-lee.github.io/realdwg-web/) instead of the native RealDWG libraries.

In [cad-simple-viewer-example](https://github.com/mlight-lee/cad-simple-viewer-example) it demonstrates how to create one drawing with [**realdwg-web API**](https://mlight-lee.github.io/realdwg-web/).

## Available Exports

### Core Classes

- `ApplicationContext` - Main application context
- `ApplicationDocManager` - Document management
- `ApplicationDocument` - Individual document handling
- `ApplicationSettingManager` - Settings management

### Services

- `ApplicationEntityService` - Entity selection, transform, and edit helpers
- `applicationRunServiceEdit` - Transactional edits outside command transactions

### Commands

- `ApplicationOpenCmd` - Open file command
- `ApplicationZoomCmd` - Zoom command
- `ApplicationPanCmd` - Pan command
- `ApplicationSelectCmd` - Selection command

### Editor Components

- `Editor` - Main editor class
- `EditorCommandStack` - Command stack management
- `EditorSelectionSet` - Selection handling
- `EditorInputPoint` - Input point management

### View Components

- `ThreeRendererScene` - Scene management
- `ThreeRendererLayoutView` - Layout view handling
- `ThreeRendererView2d` - 2D view management

## Role in MLightCAD
This package acts as the core logic layer, connecting the frontend UI with the rendering engines and managing all document-related operations.

## License

MIT