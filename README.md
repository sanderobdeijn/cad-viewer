# CAD-Viewer

[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-simple-viewer.svg?label=cad-simple-viewer)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)
[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-viewer.svg?label=cad-viewer)](https://www.npmjs.com/package/@mlightcad/cad-viewer)

<a href="https://trendshift.io/repositories/16129?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-16129" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/16129/daily?language=TypeScript" alt="mlightcad%2Fcad-viewer | Trendshift" width="250" height="55"/></a>

cad-viewer is a CAD drawing editor that operates `entirely in the browser, without relying on any backend services`. Every session starts with a new blank drawing; drawings are not loaded from or saved to files.
Geometry processing and rendering happen directly in the browser, which makes cad-viewer ideal for offline usage and privacy-sensitive workflows.

- [**🌐 Home Page**](https://mlightcad.com/)
- **🌐 Live Demo**: [Netlify](https://mlightcad.netlify.app/) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/)
- **🌐 API Docs**: [Read the Docs](https://cad-viewer.readthedocs.io/en/latest/) (versioned) · [MCP Server](https://gitmcp.io/mlightcad/cad-viewer)
- [**🌐 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- DEV.to: [@mlightcad](https://dev.to/mlightcad)
- Juejin(稀土掘金): [@mlightcad](https://juejin.cn/column/7501992214283501579)

## Features

- **High-performance** rendering of large drawings at a smooth 60+ FPS
- **No backend required** - Files are parsed and processed entirely in the browser
- **Enhanced data security** - Files never leave your device, ensuring complete privacy
- **Easy integration** - No server setup or backend infrastructure needed
- Modular architecture for seamless third-party integration
- **Mobile layout & touch** — Responsive phone/tablet UI and touch gestures (pinch-to-zoom, single-finger pan, tap to select) built into `@mlightcad/cad-simple-viewer`, so mobile browsers work without a separate app
- Offline and online editing workflows
- THREE.js 3D rendering engines with advanced optimization techniques
- Designed for extensibility and integration with platforms like CMS, Notion, and WeChat

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 24
- [pnpm](https://pnpm.io/) >= 10

### Installation

```bash
git clone https://github.com/mlightcad/cad-viewer.git
cd cad-viewer
pnpm install
```

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Preview

```bash
pnpm preview
```

## How to Use

New to CAD Viewer? The **[User Guide](https://mlightcad.com/cad-viewer/docs/)** provides step-by-step instructions for the viewer interface, desktop and touch operations, markup, and measurement tools.

### Desktop Browser Operations
- **Select**: Left-click on entities
- **Zoom in/out**: Scroll mouse wheel up/down
- **Pan**: Hold middle mouse button and drag
- **Erase**: Select entities and press `Del` key

### Pad/Mobile Browser Operations
- **Select**: Tap on entities
- **Zoom**: Pinch with two fingers
- **Pan**: Single-finger drag

## Plugin System

CAD-Viewer is built around a modular **plugin system** in [`@mlightcad/cad-simple-viewer`](packages/cad-simple-viewer). Plugins implement the `AcApPlugin` interface and hook into viewer lifecycle via `onLoad` / `onUnload`—typically to register commands, add UI, or wire export/import pipelines.

Load plugins through `AcApDocManager.instance.pluginManager` (`loadPlugin`, `registerLazyPlugin`, or `plugins.fromConfig` when creating the document manager). Plugins support **lazy loading**: register a small stub up front and download the heavy bundle only when the user runs the related command.

## Performance

CAD-Viewer is engineered for **exceptional performance** and can handle very large drawings while maintaining high frame rates. It employs multiple advanced rendering technologies to optimize performance:

- **Custom Shader Materials**: Uses GPU-accelerated shader materials to render complex line types efficiently
- **Geometry Batching**: Merges points, lines, and areas with the same material to dramatically reduce draw calls
- **Instanced Rendering**: Optimizes rendering of repeated geometries through instancing techniques
- **Buffer Geometry Optimization**: Efficient memory management and geometry merging for reduced GPU overhead
- **Material Caching**: Reuses materials across similar entities to minimize state changes
- **WebGL Optimization**: Leverages modern WebGL features for hardware-accelerated rendering

These optimizations enable CAD-Viewer to smoothly render complex CAD drawings with thousands of entities while maintaining responsive user interactions.

## Roadmap

The goal of this project is to create a full-featured **2D AutoCAD-like system in the browser** (viewer + editor), with modular architecture and framework-agnostic integration.

Legend:
- [x] Completed
- [ ] Planned
- [ ] ⏳ In progress

### Core File & Data Layer

#### Data Model

* [x] Unified entity data model
* [x] Layer table support
* [x] Block / insert structure
* [ ] ⏳ Handle & object ID management: currently objectId is same as handle and represented as one string instead of bigint (int64).
* [ ] ⏳ XData / extension dictionary support
* [ ] Proxy entity handling

### Rendering & Performance

#### Rendering Engine

* [x] WebGL-based rendering (Three.js)
* [x] 2D-only optimized pipeline
* [x] Layer-based scene organization
* [x] Layout / paper space rendering
* [ ] Viewport entity support

#### Performance Optimization

* [x] Geometry merging & batching
* [x] Spatial indexing (basic)
* [x] Advanced spatial index (R-tree / BVH)
* [ ] Level-of-detail (LOD) rendering
* [ ] Multi-canvas / tiled rendering for very large drawings

### Viewing & Navigation

#### View Controls

* [x] Pan
* [x] Zoom (wheel / box zoom)
* [x] Fit to view / extents
* [ ] Named views

#### Display Controls

* [x] Lineweight display
* [ ] Linetype scaling
* [x] Background / theme switching

### Selection & Interaction

#### Selection

* [x] Single entity selection
* [x] Highlight selected entities
* [x] Window selection
* [x] Crossing selection
* [x] Selection filters (by type / layer)
* [x] Selection cycling

#### Snapping (OSNAP)

* [x] Endpoint
* [x] Midpoint
* [x] Center
* [x] Intersection
* [ ] Perpendicular / tangent
* [x] Nearest
* [ ] Snap tracking


### Editing & Modification

#### Basic Editing

* [x] Entity editing framework
* [x] Move
* [x] Copy
* [x] Rotate
* [ ] Scale
* [x] Delete

#### Geometry Editing

* [x] Grip points
* [ ] Stretch
* [ ] Trim
* [ ] Extend
* [x] Offset
* [ ] Explode
* [ ] Join / fillet / chamfer (2D)

### Drawing & Creation Tools

#### Basic Entities

* [x] Line
* [x] Polyline
* [x] Spline
* [x] Circle
* [x] Arc
* [x] Ellipse
* [x] Rectangle / polygon

#### Advanced Entities

* [ ] Text (single-line / multi-line)
* [ ] Dimensions (linear, aligned, angular)
* [ ] Blocks creation & insertion

### Measurement

* [x] Distance
* [x] Arc length
* [x] Area
* [x] Angle
* [ ] Coordinate
* [ ] Entity statistics (length, area, count)

### Dimension

* [x] Linear dimension
* [ ] Angle dimension
* [ ] Coordinate

### Properties & UI Panels

#### Property Palette

* [x] Selected entity properties
* [ ] Color, linetype editing
* [x] Live update on change

#### Panels & UI

* [ ] Block manager
* [x] Command history / console
* [x] Status bar (snap, ortho, grid)

#### Command System

* [x] Command registry
* [x] Command aliases
* [x] Command prompts (AutoCAD-style)

### Integration & Extensibility

#### Framework Integration

* [x] Framework-agnostic core
* [ ] React integration example
* [x] Vue integration example
* [ ] OpenLayers / Map integration
* [ ] CMS / Notion embedding

#### Plugin System

* [x] Plugin API
* [ ] Custom entity support
* [x] Custom command

### Offline & Online Editing

#### Offline Editor

* [x] Local editing in browser
* [ ] Save change set / diff
* [ ] IndexedDB persistence

#### Online Editor

* [ ] Backend API design
* [ ] User authentication
* [ ] File versioning
* [ ] Multi-user access control
* [ ] Real-time collaboration (future)

### Platform Targets

* [ ] WeChat Mini Program viewer
* [x] Mobile browser support (responsive layout & touch)

### Documentation & Community

* [x] Architecture documentation
* [x] API reference
* [ ] Contribution guide
* [x] Example projects
* [x] Roadmap & changelog maintenance

This roadmap is intentionally granular so contributors can clearly see **what exists**, **what is missing**, and **where help is needed**.

## Contributing

Contributions are welcome! Please open issues or pull requests for bug fixes, new features, or suggestions. For bug reports, providing a link to the problematic drawing will help in reproducing and fixing the issue.

## License

The cad-viewer monorepo is primarily [MIT](LICENSE) licensed.