<template>
  <el-config-provider :size="'small'">
    <ml-tool-palette
      class="ml-tool-palette-manager"
      :style="paletteStyle"
      v-model="store.dialogs.toolPalette"
      :title="activeTabTitle"
      :left-offset="paletteOffsets.left"
      :right-offset="paletteOffsets.right"
      :top-offset="paletteOffsets.top"
      :bottom-offset="paletteOffsets.bottom"
    >
      <ml-overflow-tabs v-model="store.dialogs.activePaletteTab" :tabs="tabs">
        <div
          v-if="store.dialogs.activePaletteTab === 'measurements'"
          class="ml-measurement-palette-wrapper"
        >
          <ml-measurement-palette />
        </div>
        <div
          v-else-if="store.dialogs.activePaletteTab === 'memoryProfile'"
          class="ml-memory-profile-wrapper"
        >
          <ml-memory-profile />
        </div>
      </ml-overflow-tabs>
    </ml-tool-palette>
  </el-config-provider>
</template>

<script setup lang="ts">
import {
  type MlOverflowTab,
  MlOverflowTabs,
  MlToolPalette
} from '@mlightcad/ui-components'
import { ElConfigProvider } from 'element-plus'
import { computed, nextTick, watch } from 'vue'

import { store } from '../../app'
import { useViewerRect } from '../../composable'
import { toolPaletteTabName, toolPaletteTitle } from '../../locale'
import MlMeasurementPalette from './MlMeasurementPalette.vue'
import MlMemoryProfile from './MlMemoryProfile.vue'

const containerRect = useViewerRect()

const DEFAULT_WIDTH = 520
const DEFAULT_HEIGHT = 500
const FLOATING_LEFT_OFFSET = 2
const FLOATING_TOP_OFFSET = 2

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max)
}

const paletteOffsets = computed(() => {
  const { top, left, width, height } = containerRect.value
  const right = left + width
  const bottom = top + height

  return {
    top,
    left,
    right: Math.max(0, window.innerWidth - right),
    bottom: Math.max(0, window.innerHeight - bottom)
  }
})

const paletteStyle = computed(() => {
  const { top, left, width, height } = containerRect.value
  const safeWidth = width > 0 ? width : DEFAULT_WIDTH
  const safeHeight = height > 0 ? height : DEFAULT_HEIGHT
  return {
    '--ml-palette-left': `${left + FLOATING_LEFT_OFFSET}px`,
    '--ml-palette-top': `${top + FLOATING_TOP_OFFSET}px`,
    '--ml-palette-width': `${Math.min(DEFAULT_WIDTH, safeWidth)}px`,
    '--ml-palette-height': `${Math.min(DEFAULT_HEIGHT, safeHeight)}px`,
    '--ml-palette-max-width': `${safeWidth}px`,
    '--ml-palette-max-height': `${safeHeight}px`
  }
})

const syncPaletteToContainer = () => {
  if (!store.dialogs.toolPalette) return

  const paletteElement = document.querySelector<HTMLElement>(
    '.ml-tool-palette-manager'
  )
  if (!paletteElement) return

  const {
    top,
    left,
    width: containerWidth,
    height: containerHeight
  } = containerRect.value
  if (containerWidth <= 0 || containerHeight <= 0) return

  const right = left + containerWidth
  const bottom = top + containerHeight
  const rect = paletteElement.getBoundingClientRect()
  const width = Math.min(rect.width || DEFAULT_WIDTH, containerWidth)
  const height = Math.min(rect.height || DEFAULT_HEIGHT, containerHeight)
  const isDockedLeft = rect.left <= left + 1
  const isDockedRight = rect.right >= right - 1
  // Geometric proximity alone is not enough: a floating palette sits only a
  // couple of pixels inside the viewer edge. Only stretch when already at
  // docked (full) height so Undock cannot be overwritten back to full-size.
  const isSideDocked =
    (isDockedLeft || isDockedRight) && height >= containerHeight - 1

  const nextLeft = isDockedLeft
    ? left
    : isDockedRight
      ? Math.max(left, right - width)
      : clamp(rect.left, left, Math.max(left, right - width))
  const nextTop = isSideDocked
    ? top
    : clamp(rect.top, top, Math.max(top, bottom - height))
  const nextHeight = isSideDocked ? containerHeight : height

  paletteElement.style.left = `${nextLeft}px`
  paletteElement.style.top = `${nextTop}px`
  paletteElement.style.width = `${width}px`
  paletteElement.style.height = `${nextHeight}px`
  paletteElement.style.maxHeight = `${containerHeight}px`
  paletteElement.style.maxWidth = `${containerWidth}px`
}

const baseTabNames = [
  'measurements',
  'memoryProfile'
] as const
const tabNames = computed((): readonly string[] => [...baseTabNames])

const tabs = computed<MlOverflowTab[]>(() => {
  return tabNames.value.map(name => {
    return {
      name,
      label: toolPaletteTabName(name)
    }
  })
})

const activeTabTitle = computed(() =>
  toolPaletteTitle(store.dialogs.activePaletteTab)
)

watch(
  [() => store.dialogs.activePaletteTab, tabNames],
  ([activeTab, names]) => {
    if (!names.includes(activeTab)) {
      store.dialogs.activePaletteTab = names[0]
    }
  },
  { immediate: true }
)

watch(
  () => [containerRect.value, store.dialogs.toolPalette],
  async () => {
    await nextTick()
    syncPaletteToContainer()
  },
  { immediate: true, deep: true }
)
</script>

<style scoped>
.ml-tool-palette-manager {
  left: var(--ml-palette-left);
  top: var(--ml-palette-top);
  width: var(--ml-palette-width);
  height: var(--ml-palette-height);
  max-width: var(--ml-palette-max-width);
  max-height: var(--ml-palette-max-height);
  z-index: 7;
}

.ml-measurement-palette-wrapper {
  overflow: hidden;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ml-missing-resources-wrapper {
  overflow: hidden;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ml-memory-profile-wrapper {
  overflow: hidden;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
