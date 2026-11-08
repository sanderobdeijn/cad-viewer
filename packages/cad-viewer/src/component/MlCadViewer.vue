<!--
  MlCadViewer - Main CAD Viewer Component
  
  This is the primary component for creating and editing CAD drawings.
  It opens with a new blank drawing and provides a complete editing experience with
  command execution, and various viewing tools.
  
  USAGE EXAMPLE:
  MlCadViewer
  
  FEATURES:
  - Command line interface for CAD operations
  - Toolbars with common CAD tools (zoom, pan, select, etc.)
  - Entity information display
  - Dark/light theme support
  - Status bar with progress and settings
  - Customizable base URL for fonts, templates, and example files
  
  COMPONENTS INCLUDED:
  - Ribbon with CAD commands
  - Toolbars with CAD commands
  - Command line for text-based commands
  - Status bar with various controls
  - File reader for local file uploads (supports drag & drop and file dialog)
  - Entity info panel for object details
  
  EVENTS HANDLED:
  - File loading and error handling
  - Font loading notifications
  - General message display
  - File opening failures
  
  DEPENDENCIES:
  - @mlightcad/cad-simple-viewer: Core CAD functionality
  - @mlightcad/data-model: File format support
  - Element Plus: UI components
  - Vue 3 Composition API
-->

<script setup lang="ts">
/**
 * MlCadViewer Component
 *
 * A comprehensive CAD viewer component that provides a complete interface for viewing
 * and interacting with CAD files (DWG, DXF, etc.). This component integrates multiple
 * sub-components to deliver a full-featured CAD viewing experience.
 *
 * @example
 * ```vue
 * // Basic usage
 * <MlCadViewer
 * />
 *
 * // Usage with custom baseUrl for fonts
 * <MlCadViewer
 *   :base-url="'https://my-cdn.com/cad-data/'"
 * />
 *
 * // Usage with a self-hosted user-guide root
 * <MlCadViewer
 *   :docs-base-url="'https://example.com/my-product/docs/'"
 * />
 *
 * // Import statement
 * import { MlCadViewer } from '@mlightcad/cad-viewer'
 * ```
 *
 * @see {@link https://github.com/mlightcad/cad-viewer | Project Repository}
 * @see {@link https://github.com/mlightcad/cad-viewer/blob/main/packages/cad-viewer/src/component/MlCadViewer.vue | Source Code}
 */
import {
  AcApDocManager,
  AcApOpenDatabaseOptions,
  AcApSettingManager,
  AcEdOpenMode,
  eventBus
} from '@mlightcad/cad-simple-viewer'
import {
  ACDB_DRAW_CIRCLE_SIDES_DRAFT,
  ACGI_PAPER_SPACE_BACKGROUND,
  log
} from '@mlightcad/data-model'
import { ElConfigProvider, ElMessage } from 'element-plus'
import elementPlusEnglish from 'element-plus/es/locale/lang/en'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  initializeCadViewer,
  unregisterCadViewerNotificationCenter
} from '../app'
import {
  ensureColorThemeSync,
  isDark,
  provideViewerRect,
  setColorTheme,
  toggleDark,
  useDocument,
  useSettings
} from '../composable'
import { MlDialogManager, MlFontFileReader } from './common'
import { MlEntityInfo, MlToolBars } from './layout'
import { MlNotificationCenter } from './notification'
import { MlPaletteManager } from './palette'
import { MlRibbonCommands } from './ribbon'
import { MlStatusBar } from './statusBar'

const emit = defineEmits<{
  /**
   * Fired after CAD viewer is fully created and ready to use
   */
  (e: 'create'): void

  /**
   * Fired right before CAD viewer is destroyed
   */
  (e: 'destroy'): void
}>()

// Define component props with their purposes
interface Props {
  /** Background color as 24-bit hexadecimal RGB number (e.g., 0x000000) */
  background?: number
  /** Base URL for loading fonts (e.g., 'https://example.com/cad-data/') */
  baseUrl?: string
  /**
   * Absolute root URL for user-guide pages (trailing slash optional).
   * Forwarded to {@link AcApDocManagerOptions.docsBaseUrl} for in-app help links
   * (e.g. mobile magnifier). Defaults to the public mlightcad docs site.
   */
  docsBaseUrl?: string
  /**
   * The flag whether to use main thread or webwork to render drawing.
   * - true: use main thread
   * - false: use web worker
   */
  useMainThreadDraw?: boolean
  /** Initial theme of the viewer */
  theme?: 'light' | 'dark'
  /**
   * Whether opening a drawing is progressive.
   *
   * Controls both stages: mid-open paints during entity convert, and overlay
   * policy. When `false` (default), the overlay stays until entities and
   * deferred text geometry are idle. When `true`, the overlay locks the UI
   * until parse/conversion finish, then hides so pan/zoom work while scene
   * convert continues (status bar clears at CONVERSION end). Deprecated
   * `waitForTextGeometry` is ignored.
   */
  progressiveRendering?: boolean
  /**
   * @deprecated Ignored. Both stages of progressive rendering are controlled
   * by {@link progressiveRendering}. Kept so existing templates still compile.
   */
  waitForTextGeometry?: boolean
  /**
   * Maximum segments used to tessellate a full circle when drawing.
   * Lower values save memory; higher values look smoother.
   * When omitted, {@link ACDB_DRAW_CIRCLE_SIDES_DRAFT} (50) is used,
   * matching the data-model default for {@link AcApOpenDatabaseOptions.circleSides}.
   */
  circleSides?: number
  /**
   * Paper-space (layout) canvas background as packed 24-bit RGB
   * (e.g. `0xffffff` white, `0x000000` black). Defaults to white.
   * Applied as the `paperBackgroundColor` setting for this session.
   */
  paperSpaceBackground?: number
}

const props = withDefaults(defineProps<Props>(), {
  background: undefined,
  baseUrl: undefined,
  docsBaseUrl: undefined,
  useMainThreadDraw: true,
  theme: 'dark',
  progressiveRendering: false,
  circleSides: ACDB_DRAW_CIRCLE_SIDES_DRAFT,
  paperSpaceBackground: ACGI_PAPER_SPACE_BACKGROUND
})

const buildOpenOptions = (): AcApOpenDatabaseOptions => {
  AcApSettingManager.instance.set(
    'paperBackgroundColor',
    props.paperSpaceBackground,
    { persist: false }
  )
  return {
    minimumChunkSize: 1000,
    progressiveRendering: props.progressiveRendering,
    circleSides: props.circleSides
  }
}

const { t } = useI18n()
// Canvas element reference
const containerRef = ref<HTMLDivElement>()
const layoutRef = ref<HTMLDivElement>()
const headerRef = ref<HTMLElement>()

// Referenence to the root element used to switch theme
// Editor reference that gets updated after initialization
const editorRef = ref<AcApDocManager | null>(null)

// Notification center visibility
const showNotificationCenter = ref(false)

const viewerThemeClass = computed(() =>
  isDark.value ? 'ml-theme-dark' : 'ml-theme-light'
)

const features = useSettings()
const {
  beginDocumentOpening,
  endDocumentOpening,
  isDocumentOpening,
  openMode: docOpenMode
} = useDocument()
const pendingOpenMode = ref<AcEdOpenMode>()
const effectiveOpenMode = computed(
  () => pendingOpenMode.value ?? docOpenMode.value
)
const isWriteMode = computed(
  () => effectiveOpenMode.value === AcEdOpenMode.Write
)
const bodyRef = ref<HTMLElement>()
const SIDE_PANEL_MIN_FRACTION = 0.15
const SIDE_PANEL_MAX_FRACTION = 0.85
const SIDE_PANEL_KEY_STEP = 0.02
/** Share of the viewer width given to the side panel. */
const sidePanelFraction = ref(1 / 3)

const setSidePanelFraction = (fraction: number) => {
  sidePanelFraction.value = Math.min(
    SIDE_PANEL_MAX_FRACTION,
    Math.max(SIDE_PANEL_MIN_FRACTION, fraction)
  )
}

const onDividerPointerDown = (e: PointerEvent) => {
  e.preventDefault()
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

const onDividerPointerMove = (e: PointerEvent) => {
  const divider = e.currentTarget as HTMLElement
  const rect = bodyRef.value?.getBoundingClientRect()
  if (!rect || !divider.hasPointerCapture(e.pointerId)) return
  setSidePanelFraction((e.clientX - rect.left) / rect.width)
}

const onDividerKeyDown = (e: KeyboardEvent) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  e.preventDefault()
  const direction = e.key === 'ArrowLeft' ? -1 : 1
  setSidePanelFraction(
    sidePanelFraction.value + direction * SIDE_PANEL_KEY_STEP
  )
}

const headerHeightPx = ref(0)

provideViewerRect(containerRef)

let headerResizeObserver: ResizeObserver | undefined

const updateHeaderHeight = () => {
  headerHeightPx.value = headerRef.value?.getBoundingClientRect().height ?? 0
}

const bindHeaderObserver = () => {
  if (!headerRef.value) {
    headerHeightPx.value = 0
    return
  }
  headerResizeObserver?.disconnect()
  if (typeof ResizeObserver !== 'undefined') {
    headerResizeObserver = new ResizeObserver(() => {
      updateHeaderHeight()
    })
    headerResizeObserver.observe(headerRef.value)
  }
  updateHeaderHeight()
}

const beginPendingOpen = (mode: AcEdOpenMode) => {
  pendingOpenMode.value = mode
}

const endPendingOpen = () => {
  pendingOpenMode.value = undefined
}

watch(isDocumentOpening, (opening, wasOpening) => {
  if (wasOpening && !opening) {
    endPendingOpen()
  }
})

// Watch for background color changes and apply to the view
watch(
  () => props.background,
  newBg => {
    if (newBg != null) {
      AcApDocManager.instance.curView.backgroundColor = newBg
    }
  }
)

// Watch for theme changes and apply to the view
watch(
  () => props.theme,
  newTheme => {
    setColorTheme(newTheme)
  }
)

/**
 * Fills the viewer with a blank drawing.
 */
const createInitialDrawing = async () => {
  beginDocumentOpening()
  beginPendingOpen(AcEdOpenMode.Write)
  try {
    await AcApDocManager.instance.newDocument(buildOpenOptions())
  } finally {
    endDocumentOpening()
    endPendingOpen()
  }
}

// Component lifecycle: Initialize and create the initial drawing
onMounted(async () => {
  beginPendingOpen(AcEdOpenMode.Write)

  // Initialize the CAD viewer with the internal canvas
  if (containerRef.value && layoutRef.value) {
    initializeCadViewer({
      container: containerRef.value,
      busyIndicatorHost: layoutRef.value,
      baseUrl: props.baseUrl,
      docsBaseUrl: props.docsBaseUrl,
      autoResize: true,
      useMainThreadDraw: props.useMainThreadDraw
    })
    // AcApDocManager.instance is guaranteed only after viewer initialization.
    editorRef.value = AcApDocManager.instance
    ensureColorThemeSync()
  } else {
    log.warn('MlCadViewer: containerRef is unavailable on mount')
  }

  await nextTick()
  bindHeaderObserver()

  await createInitialDrawing()

  // Apply initial background color if provided
  if (props.background != null) {
    AcApDocManager.instance.curView.backgroundColor = props.background
  }

  // Set initial theme from props
  setColorTheme(props.theme)

  // FINAL STEP: viewer is now ready
  emit('create')
})

// Destroy the CAD viewer when the component is unmounted
onUnmounted(() => {
  // Notify consumers first
  emit('destroy')

  headerResizeObserver?.disconnect()
  unregisterCadViewerNotificationCenter()
  AcApDocManager.instance.destroy()
})

watch(
  [
    editorRef,
    isWriteMode,
    () => features.isShowRibbon,
    () => features.isShowToolbar
  ],
  async () => {
    await nextTick()
    bindHeaderObserver()
  },
  { immediate: true }
)

// Toast-only listeners. Notification center entries are written by the shared
// AcApNotificationEventBridge in cad-simple-viewer.
eventBus.on('message', params => {
  ElMessage({
    message: params.message,
    grouping: true,
    type: params.type,
    showClose: true
  })
})

eventBus.on('failed-to-get-avaiable-fonts', params => {
  ElMessage({
    message: t('main.message.failedToGetAvaiableFonts', { url: params.url }),
    grouping: true,
    type: 'error',
    showClose: true
  })
})

// Toggle notification center visibility
const toggleNotificationCenter = () => {
  showNotificationCenter.value = !showNotificationCenter.value
}

// Close notification center
const closeNotificationCenter = () => {
  showNotificationCenter.value = false
}
</script>

<template>
  <!-- Main CAD viewer container with complete UI layout -->
  <div
    :class="viewerThemeClass"
    :style="{ '--ml-header-height': `${headerHeightPx}px` }"
    class="ml-cad-viewer-container"
  >
    <!-- Element Plus configuration provider for internationalization -->
    <el-config-provider :locale="elementPlusEnglish">
      <div ref="layoutRef" class="ml-cad-layout">
        <!-- Header section with command ribbon -->
        <header v-if="editorRef" ref="headerRef" class="ml-cad-header">
          <ml-ribbon-commands v-if="features.isShowRibbon" />
        </header>

        <div ref="bodyRef" class="ml-cad-body">
          <!-- Optional host content beside the drawing, below the ribbon -->
          <template v-if="$slots['side-panel']">
            <aside
              :style="{ '--ml-side-panel-size': `${sidePanelFraction * 100}%` }"
              class="ml-cad-side-panel"
            >
              <slot name="side-panel" />
            </aside>
            <div
              :aria-valuenow="Math.round(sidePanelFraction * 100)"
              :aria-valuemin="SIDE_PANEL_MIN_FRACTION * 100"
              :aria-valuemax="SIDE_PANEL_MAX_FRACTION * 100"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize side panel"
              tabindex="0"
              class="ml-cad-side-panel-divider"
              @pointerdown="onDividerPointerDown"
              @pointermove="onDividerPointerMove"
              @keydown="onDividerKeyDown"
            />
          </template>

          <!-- Main content area with CAD viewing tools and controls -->
          <main class="ml-cad-main">
            <!-- Canvas element for CAD rendering -->
            <div
              :class="viewerThemeClass"
              ref="containerRef"
              class="ml-cad-container"
            ></div>

            <!-- Toolbar with common CAD operations (zoom, pan, select, etc.) -->
            <ml-tool-bars v-if="editorRef" />

            <!-- Entity properties palette for controlling entity visibility and properties -->
            <ml-palette-manager v-if="editorRef" />

            <!-- Dialog manager for modal dialogs and settings -->
            <ml-dialog-manager v-if="editorRef" />

            <!-- Notification center (anchored to the canvas / main area) -->
            <ml-notification-center
              v-if="editorRef && showNotificationCenter"
              @close="closeNotificationCenter"
            />
          </main>
        </div>

        <!-- Footer section with command line and status information -->
        <footer v-if="editorRef" class="ml-cad-footer">
          <!-- Status bar with progress, settings, and theme controls -->
          <ml-status-bar
            :is-dark="isDark"
            :toggle-dark="toggleDark"
            @toggle-notification-center="toggleNotificationCenter"
          />
        </footer>
      </div>

      <!-- Hidden components for file handling and entity information -->
      <ml-font-file-reader v-if="editorRef" />

      <!-- Entity info panel for displaying object properties -->
      <ml-entity-info v-if="editorRef" />
    </el-config-provider>
  </div>
</template>

<!-- Component-specific styles -->
<style>
/* Container element styling */
.ml-cad-container {
  position: absolute;
  inset: 0;
  display: block;
  outline: none;
  z-index: 1; /* Canvas below UI overlays inside main */
  pointer-events: auto; /* Ensure container can receive mouse events */
}

/* Main CAD viewer container styling */
.ml-cad-viewer-container {
  position: fixed;
  inset: 0;
  z-index: 2;
  pointer-events: auto;
  overflow: hidden;
}

.ml-cad-layout {
  position: relative;
  width: 100%;
  height: 100%;
}

.ml-cad-viewer-container > .el-config-provider {
  display: block;
  height: 100%;
}

.ml-cad-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 6;
}

.ml-cad-body {
  position: absolute;
  top: var(--ml-header-height);
  left: 0;
  right: 0;
  bottom: var(--ml-status-bar-height);
  display: flex;
  min-height: 0;
}

.ml-cad-main,
.ml-cad-side-panel {
  position: relative;
  min-width: 0;
  min-height: 0;
}

.ml-cad-main {
  flex: 1 1 0;
}

.ml-cad-side-panel {
  flex: 0 0 var(--ml-side-panel-size);
}

.ml-cad-side-panel-divider {
  flex: 0 0 5px;
  background: var(--el-border-color);
  cursor: col-resize;
  touch-action: none;
}

.ml-cad-side-panel-divider:hover,
.ml-cad-side-panel-divider:focus-visible {
  background: var(--el-color-primary);
  outline: none;
}

@media (max-width: 767px) {
  .ml-cad-body {
    flex-direction: column;
  }

  .ml-cad-side-panel {
    flex: 0 0 35%;
  }

  .ml-cad-side-panel-divider {
    display: none;
  }
}

.ml-cad-footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 6;
}

/* Mobile command chrome is position:fixed over the canvas; hide the
   status-bar footer so ✓ / × receive taps instead of the footer. */
.ml-cad-layout:has(.ml-mobile-cmd-active) .ml-cad-footer {
  visibility: hidden;
  pointer-events: none;
}
</style>
