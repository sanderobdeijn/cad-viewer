<script setup lang="ts">
/**
 * Vertical main toolbar for cad-viewer, backed by shared {@link AcUiToolbar}.
 */
import {
  acapBindToolbarDocState,
  AcApDocManager,
  AcApI18n,
  AcUiToolbar,
  type AcUiToolbarItem,
  ICON_ANNOTATION_HIDE,
  ICON_ANNOTATION_SHOW,
  ICON_CLEAR_MEASUREMENTS,
  ICON_MARKUP_EXPORT,
  ICON_MARKUP_IMPORT,
  ICON_MEASURE,
  ICON_MEASURE_ANGLE,
  ICON_MEASURE_ARC,
  ICON_MEASURE_AREA,
  ICON_MEASURE_CONTINUOUS,
  ICON_MEASURE_DISTANCE,
  ICON_MEASURE_POINT,
  ICON_MEASUREMENT_PANEL,
  ICON_PAN,
  ICON_SELECT,
  ICON_SWITCH_BG,
  ICON_ZOOM_EXTENT,
  ICON_ZOOM_ORIGINAL,
  ICON_ZOOM_SMART,
  ICON_ZOOM_WINDOW,
  isMeasurementVisible
} from '@mlightcad/cad-simple-viewer'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import { useDocument, useSettings } from '../../composable'

const features = useSettings()
const { isDocumentOpening, openMode: docOpenMode } = useDocument()

const hostRef = ref<HTMLElement | null>(null)
let toolbar: AcUiToolbar | undefined
let unbindDoc: (() => void) | undefined

const measurementVisible = ref(isMeasurementVisible())

const syncMeasurementVisibility = () => {
  measurementVisible.value = isMeasurementVisible()
}

/** Prefer AcApI18n; keys are resolved at runtime by AcUiToolbar. */
const i18n = {
  // eslint-disable-next-line @intlify/vue-i18n/no-dynamic-keys -- toolbar label keys are data-driven
  t: (key: string) => AcApI18n.t(key)
}

const handleLocaleChanged = () => {
  // vue-i18n is synced first (listener registered in locale/i18n.ts at module load).
  toolbar?.refreshLocale()
}

const toolbarSeparator = (): AcUiToolbarItem => ({
  id: `separator-${Math.random().toString(36).slice(2, 8)}`,
  type: 'separator'
})

const buildItems = (): AcUiToolbarItem[] => {
  const items: AcUiToolbarItem[] = [
    {
      id: 'select',
      label: 'main.verticalToolbar.select.text',
      icon: ICON_SELECT,
      command: 'select'
    },
    {
      id: 'pan',
      label: 'main.verticalToolbar.pan.text',
      icon: ICON_PAN,
      command: 'pan'
    },
    {
      id: 'zoom',
      label: 'main.verticalToolbar.zoom.text',
      icon: ICON_ZOOM_EXTENT,
      childrenUi: 'toolbar',
      childIcon: 'selected',
      selectedChildId: 'zoom-extent',
      children: [
        {
          id: 'zoom-saved',
          label: 'main.verticalToolbar.zoomSaved.text',
          icon: ICON_ZOOM_ORIGINAL,
          command: 'zoom\nsaved'
        },
        {
          id: 'zoom-extent',
          label: 'main.verticalToolbar.zoomToExtent.text',
          icon: ICON_ZOOM_EXTENT,
          command: 'zoom\nall'
        },
        {
          id: 'zoom-smart-extents',
          label: 'main.verticalToolbar.zoomSmartExtents.text',
          icon: ICON_ZOOM_SMART,
          command: 'zoom\nsmart'
        },
        {
          id: 'zoom-window',
          label: 'main.verticalToolbar.zoomToBox.text',
          icon: ICON_ZOOM_WINDOW,
          command: 'zoom\nwindow'
        }
      ]
    },
    {
      id: 'switch-bg',
      label: 'main.verticalToolbar.switchBg.text',
      icon: ICON_SWITCH_BG,
      command: 'switchbg'
    },
    {
      id: 'measure',
      label: 'main.verticalToolbar.measure.text',
      icon: ICON_MEASURE,
      childrenUi: 'sticky-toolbar',
      children: [
        {
          id: 'measure-distance',
          label: 'main.verticalToolbar.measureDistance.text',
          icon: ICON_MEASURE_DISTANCE,
          command: 'measuredistance'
        },
        {
          id: 'measure-continuous',
          label: 'main.verticalToolbar.measureContinuous.text',
          icon: ICON_MEASURE_CONTINUOUS,
          command: 'measurecontinuous'
        },
        {
          id: 'measure-angle',
          label: 'main.verticalToolbar.measureAngle.text',
          icon: ICON_MEASURE_ANGLE,
          command: 'measureangle'
        },
        {
          id: 'measure-area',
          label: 'main.verticalToolbar.measureArea.text',
          icon: ICON_MEASURE_AREA,
          command: 'measurearea'
        },
        {
          id: 'measure-arc',
          label: 'main.verticalToolbar.measureArc.text',
          icon: ICON_MEASURE_ARC,
          command: 'measurearc'
        },
        {
          id: 'measure-point',
          label: 'main.verticalToolbar.measurePoint.text',
          icon: ICON_MEASURE_POINT,
          command: 'measurepoint'
        },
        {
          id: 'measurement-panel',
          label: 'main.verticalToolbar.measurementPanel.text',
          icon: ICON_MEASUREMENT_PANEL,
          command: 'measurementpanel'
        },
        {
          id: 'measurement-vis',
          label: measurementVisible.value
            ? 'main.verticalToolbar.hideMeasurements.text'
            : 'main.verticalToolbar.showMeasurements.text',
          icon: measurementVisible.value
            ? ICON_ANNOTATION_HIDE
            : ICON_ANNOTATION_SHOW,
          command: 'measurementvis',
          toggle: {
            getValue: () => measurementVisible.value,
            on: {
              label: 'main.verticalToolbar.hideMeasurements.text',
              icon: ICON_ANNOTATION_HIDE
            },
            off: {
              label: 'main.verticalToolbar.showMeasurements.text',
              icon: ICON_ANNOTATION_SHOW
            }
          }
        },
        {
          id: 'clear-measurements',
          label: 'main.verticalToolbar.clearMeasurements.text',
          icon: ICON_CLEAR_MEASUREMENTS,
          command: 'clearmeasurements'
        },
        toolbarSeparator(),
        {
          id: 'measurement-import',
          label: 'main.verticalToolbar.measurementImport.text',
          icon: ICON_MARKUP_IMPORT,
          command: 'measurementimport'
        },
        {
          id: 'measurement-export',
          label: 'main.verticalToolbar.measurementExport.text',
          icon: ICON_MARKUP_EXPORT,
          command: 'measurementexport'
        }
      ]
    }
  ]

  void docOpenMode
  return items
}

const ensureToolbar = () => {
  const host = hostRef.value
  if (!host || toolbar) return
  toolbar = new AcUiToolbar({
    host,
    placement: 'right',
    // Match AcUiShortCutToolbar shell `right: 12px`.
    edgeOffset: 12,
    items: buildItems(),
    i18n,
    collapsible: true,
    onCommand: command => {
      if (isDocumentOpening.value || !command) return
      AcApDocManager.instance.sendStringToExecute(command)
    }
  })
  unbindDoc = acapBindToolbarDocState(toolbar)
  // Re-measure after the host has a real canvas-sized box (see host CSS note).
  void nextTick(() => {
    toolbar?.refresh()
  })
}

const destroyToolbar = () => {
  unbindDoc?.()
  unbindDoc = undefined
  toolbar?.destroy()
  toolbar = undefined
}

const refreshToolbarItems = () => {
  toolbar?.updateItems(buildItems())
}

onMounted(() => {
  const docs = AcApDocManager.instance
  docs.editor.events.commandEnded.addEventListener(syncMeasurementVisibility)
  docs.events.documentActivated.addEventListener(syncMeasurementVisibility)
  AcApI18n.events.localeChanged.addEventListener(handleLocaleChanged)
  syncMeasurementVisibility()

  if (features.isShowToolbar) {
    ensureToolbar()
  }
})

onUnmounted(() => {
  const docs = AcApDocManager.instance
  docs.editor.events.commandEnded.removeEventListener(syncMeasurementVisibility)
  docs.events.documentActivated.removeEventListener(syncMeasurementVisibility)
  AcApI18n.events.localeChanged.removeEventListener(handleLocaleChanged)
  destroyToolbar()
})

watch(
  () => features.isShowToolbar,
  show => {
    if (show) {
      ensureToolbar()
      refreshToolbarItems()
    } else {
      destroyToolbar()
    }
  }
)

watch([measurementVisible, docOpenMode], () => {
  refreshToolbarItems()
})

watch(isDocumentOpening, opening => {
  toolbar?.setDocState({ isOpening: opening })
})
</script>

<template>
  <div
    ref="hostRef"
    class="ml-vertical-toolbar-host"
    :hidden="!features.isShowToolbar"
    aria-hidden="true"
  />
</template>

<style>
/*
 * Keep the overlay host filling the canvas main area so syncPosition can
 * vertically center the bar on the right edge.
 */
.ml-vertical-toolbar-host,
.ml-vertical-toolbar-host.ml-ex-ui-toolbar-host {
  position: absolute;
  inset: 0;
  width: auto;
  height: auto;
  z-index: 3;
  pointer-events: none;
}

.ml-vertical-toolbar-host .ml-ex-ui-toolbar,
.ml-vertical-toolbar-host .ml-ex-ui-subtoolbar,
.ml-vertical-toolbar-host .ml-ex-ui-dropdown {
  pointer-events: auto;
}
</style>
