# CAD-Viewer（中文）

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md)

[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-simple-viewer.svg?label=cad-simple-viewer)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)
[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-viewer.svg?label=cad-viewer)](https://www.npmjs.com/package/@mlightcad/cad-viewer)

<a href="https://trendshift.io/repositories/16129?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-16129" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/16129/daily?language=TypeScript" alt="mlightcad%2Fcad-viewer | Trendshift" width="250" height="55"/></a>

CAD-Viewer 是一款`完全运行在浏览器端、无需依赖任何后端服务`的 CAD 图纸编辑器。每次会话都从一张新的空白图纸开始；不支持从文件加载图纸，也不支持保存到文件。
几何处理和渲染直接在浏览器中完成，非常适合离线使用以及对隐私敏感的工作场景。

- [**🌐 主页**](https://mlightcad.com/)
- **🌐 在线演示**：[Netlify](https://mlightcad.netlify.app/) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/)
- **🌐 API 文档**：[Read the Docs](https://cad-viewer.readthedocs.io/en/latest/)（支持版本切换）· [MCP 服务器](https://gitmcp.io/mlightcad/cad-viewer)
- [**🌐 项目 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- DEV.to: [@mlightcad](https://dev.to/mlightcad)
- 稀土掘金: [@mlightcad](https://juejin.cn/column/7501992214283501579)

## 功能特性

- **高性能**：大体量图纸也能以流畅的 60+ FPS 渲染
- **无需后端**：文件在浏览器本地解析与处理
- **数据更安全**：文件不离开本地设备，保护隐私
- **易于集成**：无需服务器或后端基础设施
- 模块化架构，便于第三方系统集成
- **移动端布局与触控**：`@mlightcad/cad-simple-viewer` 内置响应式手机/平板布局与触控手势（双指缩放、单指平移、点选），无需单独的移动端应用即可在移动浏览器中使用
- 支持离线与在线编辑流程
- 基于 THREE.js 的 3D 渲染引擎，包含多项性能优化
- 面向可扩展与二次开发，适配 CMS、Notion、微信等平台

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 24
- [pnpm](https://pnpm.io/) >= 10

### 安装

```bash
git clone https://github.com/mlightcad/cad-viewer.git
cd cad-viewer
pnpm install
```

### 开发

```bash
# 启动完整版查看器（cad-viewer）
pnpm dev

# 或启动简易版查看器
pnpm dev:simple
```

### 构建

```bash
pnpm build
```

### 预览

```bash
# 预览完整版查看器
pnpm preview

# 预览简易版查看器
pnpm preview:simple
```

## 使用说明

初次使用 CAD Viewer？**[用户指南](https://mlightcad.com/cad-viewer/docs/)** 提供了分步说明，涵盖查看器界面、桌面端与触屏操作、批注和测量工具。

### 桌面浏览器操作
- **选择**：鼠标左键单击实体
- **缩放**：滚动鼠标滚轮上/下
- **平移**：按住鼠标中键拖拽
- **删除**：选中实体后按 `Del` 键

### 平板/手机浏览器操作
- **选择**：轻触实体
- **缩放**：双指捏合放大/缩小
- **平移**：单指拖动移动视图

## 插件系统（Plugin System）

CAD-Viewer 在 [`@mlightcad/cad-simple-viewer`](packages/cad-simple-viewer) 中提供可扩展的**插件系统**。插件实现 `AcApPlugin` 接口，通过 `onLoad` / `onUnload` 接入查看器生命周期，常见用途包括注册命令、挂载 UI、或接入导出/导入流程。

通过 `AcApDocManager.instance.pluginManager` 加载插件（`loadPlugin`、`registerLazyPlugin`，或在创建文档管理器时使用 `plugins.fromConfig`）。插件支持**懒加载**：应用启动时只注册轻量 stub，用户首次执行相关命令时才下载完整 bundle。

本 monorepo 内置多个官方插件，各司其职，可按需组合。**各插件的安装、注册方式与 API 说明请直接阅读对应包的 README**（见下方链接）。

### 官方插件一览

| 包名 | 作用 | 命令 / 能力 |
|------|------|-------------|
| [`@mlightcad/cad-simple-ui-plugin`](packages/cad-simple-ui-plugin) | 为 `cad-simple-viewer` 提供**工具栏与测量列表面板 UI**（纯 DOM，不依赖 Vue/React） | `measurementpanel`、默认工具栏（视图、测量、主题、语言） |

### `@mlightcad/cad-simple-ui-plugin` — 简易查看器的 UI 层

[`cad-simple-viewer`](packages/cad-simple-viewer) 有意只提供 **CAD 核心与画布**，不包含应用级界面。若你在自有 Web 应用中嵌入简易查看器，又不想引入完整 Vue 版 [`cad-viewer`](packages/cad-viewer) 外壳，**`cad-simple-ui-plugin` 即推荐的 UI 插件**。

主要能力：

- **可配置工具栏**（四边任意放置、内置 CAD 命令、嵌套菜单、自定义按钮）
- **停靠面板**：含**测量**标签页
- **主题同步**：跟随 `COLORTHEME` 系统变量及 host 上的 `--ml-ui-*` CSS 变量
- **语言同步**：跟随 `AcApI18n`（英 / 中 / 捷克语 / 土耳其语）

全部 UI 为框架无关的纯 DOM 实现。完整 Vue 版 [`cad-viewer`](packages/cad-viewer) 自带 Element Plus 界面，**不需要**此插件；仅在直接基于 `cad-simple-viewer` 集成时使用 `cad-simple-ui-plugin`。

→ **快速开始、工具栏定制与配置项：** [packages/cad-simple-ui-plugin/README.md](packages/cad-simple-ui-plugin/README.md)

## 性能优化

CAD-Viewer 针对复杂图纸渲染进行了多项优化，可在保持高帧率的同时处理大规模图纸：

- **自定义着色器材质**：在 GPU 侧高效绘制复杂线型与剖面填充
- **几何体合批**：对相同材质的点/线/面进行合并，显著减少 draw call
- **实例化渲染**：针对重复几何体进行实例化优化
- **缓冲几何优化**：高效的内存管理与几何合并，降低 GPU 开销
- **材质缓存**：复用相似实体的材质以减少状态切换
- **WebGL 优化**：充分利用现代 WebGL 的硬件加速能力

这些优化使得 CAD-Viewer 能够在渲染大量复杂实体的同时保持交互顺畅。

## 路线图（Roadmap）

本项目的目标是打造一个**运行在浏览器中的、功能完整的二维 AutoCAD 系统**（查看器 + 编辑器），具备模块化架构，并且可与各类前端框架无关地进行集成。

图例说明：

-   [x] 已完成
-   [ ] 计划中
-   [ ] ⏳ 进行中

### 核心文件与数据层

#### 数据模型

-   [x] 统一的实体数据模型
-   [x] 图层表支持
-   [x] 块（Block）/ 插入（Insert）结构
-   [ ] ⏳ Handle 与对象 ID 管理：当前 objectId 与 handle 相同，并且以字符串表示，而不是 bigint（int64）
-   [ ] ⏳ XData / 扩展字典支持
-   [ ] 代理实体（Proxy Entity）处理

### 渲染与性能

#### 渲染引擎

-   [x] 基于 WebGL 的渲染（Three.js）
-   [x] 仅针对 2D 的优化渲染管线
-   [x] 基于图层的场景组织
-   [x] 布局（Layout）/ 图纸空间（Paper Space）渲染
-   [ ] 视口（Viewport）实体支持

#### 性能优化

-   [x] 几何体合并与批处理
-   [x] 空间索引（基础）
-   [x] 高级空间索引（R-tree / BVH）
-   [ ] 细节层次（LOD）渲染
-   [ ] 超大图纸的多画布 / 分块渲染

### 查看与导航

#### 视图控制

-   [x] 平移（Pan）
-   [x] 缩放（滚轮 / 框选缩放）
-   [x] 适配视图 / 显示范围
-   [ ] 命名视图
-   [ ] 视图历史（撤销 / 重做视图变更）

#### 显示控制

-   [x] 线宽显示
-   [ ] 线型比例
-   [x] 背景 / 主题切换

### 选择与交互

#### 选择

-   [x] 单个实体选择
-   [x] 选中实体高亮
-   [x] 窗口选择（Window Selection）
-   [x] 交叉选择（Crossing Selection）
-   [x] 选择过滤（按类型 / 图层）
-   [x] 循环选择（Selection Cycling）

#### 捕捉（OSNAP）

-   [x] 端点（Endpoint）
-   [x] 中点（Midpoint）
-   [x] 圆心（Center）
-   [x] 交点（Intersection）
-   [ ] 垂足 / 切点（Perpendicular / Tangent）
-   [x] 最近点（Nearest）
-   [ ] 捕捉追踪（Snap Tracking）

### 编辑与修改

#### 基础编辑

-   [x] 实体编辑框架
-   [x] 移动（Move）
-   [x] 复制（Copy）
-   [x] 旋转（Rotate）
-   [ ] 缩放（Scale）
-   [x] 删除（Delete）
-   [x] 撤销 / 重做（Undo / Redo）

#### 几何编辑

-   [x] 夹点（Grip Points）
-   [ ] 拉伸（Stretch）
-   [ ] 修剪（Trim）
-   [ ] 延伸（Extend）
-   [x] 偏移（Offset）
-   [ ] 分解（Explode）
-   [ ] 连接 / 圆角 / 倒角（2D）

### 绘制与创建工具

#### 基础实体

-   [x] 直线（Line）
-   [x] 多段线（Polyline）
-   [x] 样条曲线（Spline）
-   [x] 圆（Circle）
-   [x] 圆弧（Arc）
-   [x] 椭圆（Ellipse）
-   [x] 矩形 / 多边形（Rectangle / Polygon）

#### 高级实体

-   [x] 填充（Hatch）
-   [ ] 文本（单行 / 多行）
-   [ ] 标注（线性、对齐、角度）
-   [ ] 块创建与插入

### 测量

-   [x] 距离
-   [x] 弧长
-   [x] 面积
-   [x] 角度
-   [ ] 坐标
-   [ ] 实体统计（长度、面积、数量）

### 标注

-   [x] 距离
-   [ ] 角度
-   [ ] 坐标

### 属性与 UI 面板

#### 属性面板（Property Palette）

-   [x] 选中实体属性
-   [ ] 颜色、线型编辑
-   [x] 属性修改实时更新

#### 面板与界面

-   [ ] 块管理器
-   [x] 命令历史 / 控制台
-   [x] 状态栏（捕捉、正交、网格）

#### 命令系统

-   [x] 命令注册机制
-   [x] 命令别名
-   [x] 命令提示（AutoCAD 风格）

### 集成与可扩展性

#### 框架集成

-   [x] 与前端框架无关的核心设计
-   [ ] React 集成示例
-   [x] Vue 集成示例
-   [ ] OpenLayers / 地图集成
-   [ ] CMS / Notion 嵌入

#### 插件系统

-   [x] 插件 API
-   [ ] 自定义实体支持
-   [x] 自定义命令

### 离线与在线编辑

#### 离线编辑器

-   [x] 浏览器本地编辑
-   [ ] 保存变更集 / 差异（diff）
-   [ ] IndexedDB 持久化

#### 在线编辑器

-   [ ] 后端 API 设计
-   [ ] 用户认证
-   [ ] 文件版本管理
-   [ ] 多用户访问控制
-   [ ] 实时协作（未来）

### 平台目标

-   [ ] 微信小程序查看器
-   [x] 移动端浏览器支持（响应式布局与触控）

### 文档与社区

-   [x] 架构文档
-   [x] API 参考文档
-   [ ] 贡献指南
-   [x] 示例项目
-   [x] 路线图与变更日志维护

该路线图刻意拆分得较为细致，以便贡献者能够清楚地了解 **已有功能**、**缺失功能** 以及 **最需要帮助的方向**。

## 参与贡献（Contributing）

欢迎各种形式的贡献！你可以通过提交 issue 或 pull request 来修复 bug、添加新功能或提出建议。  
在提交 bug 报告时，如果能提供有问题的图纸链接，将有助于问题的复现与修复。

## 许可证

cad-viewer monorepo 主体采用 [MIT](LICENSE) 授权。