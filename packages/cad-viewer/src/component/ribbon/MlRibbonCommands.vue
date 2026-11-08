<script setup lang="ts">
import '@mlightcad/ribbon/style.css'

import {
  Delete,
  DocumentCopy,
  Hide,
  RefreshRight,
  View
} from '@element-plus/icons-vue'
import {
  acapCssColor,
  AcApDocManager,
  acapDrawStyleKindForCommand,
  acapGetMeasurementColor,
  acapGetMeasurementCustomTextHeightWcs,
  acapGetMeasurementFontSize,
  acapGetMeasurementTextHeightMode,
  AcApQNewCmd,
  acapScreenPxToWcs,
  acapSetMeasurementDrawColor,
  acapSetMeasurementTextHeight,
  AcApSettingManager,
  type AcApSettingManagerEventArgs,
  type AcEdCommandEventArgs,
  AcEdOpenMode,
  type AcTrView2d,
  acuiOpenTextHeightDialog,
  acuiResolveTextHeightDialogInitials,
  acuiResolveTextHeightPatch,
  applyMeasurementStyleToSelection,
  getActiveMeasurementStyle,
  getEffectiveMeasurementUnits,
  getMeasurementSnapshot,
  getSelectedMeasurementId,
  isMeasurementVisible,
  MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING,
  refreshMeasurementValueLabels,
  setMeasurementUnitOverride,
  subscribeMeasurementSelection
} from '@mlightcad/cad-simple-viewer'
import {
  AcCmColor,
  AcDbAngleUnits,
  AcDbLinearUnits
} from '@mlightcad/data-model'
import {
  FileMenuItemModel,
  MlRibbon,
  RibbonGroupModel,
  RibbonItemModel,
  RibbonLocaleTexts,
  RibbonTabModel
} from '@mlightcad/ribbon'
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDocument } from '../../composable'
import { markComponentConfigRaw } from '../../composable/markComponentConfigRaw'
import {
  arcCenterStartAngle,
  arcCenterStartEnd,
  arcCenterStartLength,
  arcStartCenterAngle,
  arcStartCenterEnd,
  arcStartCenterLength,
  arcStartEndAngle,
  arcStartEndDirection,
  arcStartEndRadius,
  arcThreePoints,
  circleCenterDiameter,
  circleCenterRadius,
  circleTanTanRadius,
  circleTanTanTan,
  circleThreePoints,
  circleTwoPoints,
  ellipseArc,
  ellipseCenter,
  line,
  move,
  multiPoints,
  offset,
  polygon,
  polyline,
  rect,
  setting
} from '../../svg'
import {
  clearMeasurements,
  exportIcon,
  importIcon,
  measureAngle,
  measureArc,
  measureArea,
  measureContinuous,
  measureDistance,
  measurementPanel,
  measurePoint
} from '../../svg/toolbarIcons'
import MlRibbonFileName from './MlRibbonFileName.vue'
import MlRibbonMeasurementUnitsPanel from './MlRibbonMeasurementUnitsPanel.vue'
import MlRibbonPropertyColorDropdown from './MlRibbonPropertyColorDropdown.vue'
import MlRibbonTextHeightButton from './MlRibbonTextHeightButton.vue'
import { classifyOverlaySelection } from './overlaySelectionKind'

/** Shared control width for color / text-height in overlay Style panels. */
const OVERLAY_STYLE_CONTROL_WIDTH = '120px'

/** Authoring mode for overlay text height (Fit to screen vs world height). */
type OverlayTextHeightMode = 'adaptive' | 'custom'

const ribbonContainerRef = ref<HTMLElement>()
const { isDocumentOpening, openMode: docOpenMode } = useDocument()
const { t, locale } = useI18n()
const isMeasurementOverlayVisible = ref(true)
const measurementDrawColor = shallowRef(new AcCmColor())
const measurementDrawColorDisplay = ref('#7b8794')
const measurementTextHeightMode = ref<OverlayTextHeightMode>(
  acapGetMeasurementTextHeightMode()
)
const measurementTextHeightWcs = ref<number | undefined>(
  acapGetMeasurementCustomTextHeightWcs()
)
let textHeightDialogOpen = false
const measurementLunits = ref(AcDbLinearUnits.Decimal)
const measurementLuprec = ref(4)
const measurementAunits = ref(AcDbAngleUnits.DecimalDegrees)
const measurementAuprec = ref(0)
const measurementLengthUnit = ref<number>(
  MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING
)
const isRibbonDisabled = computed(() => isDocumentOpening.value)
const activeRibbonTabId = ref('home')

/**
 * Returns the database currently attached to the active document, if any.
 */
const getCurrentDatabase = () => AcApDocManager.instance?.curDocument?.database

const syncMeasurementVisibility = () => {
  isMeasurementOverlayVisible.value = isMeasurementVisible()
}

/** Updates the measurement unit controls when the unit settings change. */
const handleSettingChange = (args: AcApSettingManagerEventArgs) => {
  switch (args.key) {
    case 'linearUnits':
    case 'linearPrecision':
    case 'angularUnits':
    case 'angularPrecision':
    case 'insertionUnits':
      syncMeasurementUnitControls()
      refreshCurrentMeasurementLabels()
      break
    default:
      break
  }
}

const handleDocumentActivated = () => {
  lastActivatedMeasurementId = undefined
  syncMeasurementVisibility()
  syncMeasurementStyleControls()
  syncMeasurementUnitControls()
}

let unsubscribeMeasurementSelection: (() => void) | undefined
let lastActivatedMeasurementId: string | undefined
let overlayTabActivationScheduled = false
let overlayTabActivationDisposed = false

/**
 * Reads the live CAD + overlay selection for {@link classifyOverlaySelection}.
 */
const overlaySelectionSnapshot = () => {
  const view = AcApDocManager.instance?.curView
  return {
    selectedGroups: view?.htmlTransientManager?.getSelectedGroups(),
    cadEntityCount: view?.selectionSet?.count ?? 0,
    measurementSelected: getSelectedMeasurementId() != null
  }
}

/**
 * When the ribbon is showing, selecting only measurements switches to the
 * Measurement tab. Mixed selections (drawing entities + overlay, …) and
 * deselect do not change the tab; only a newly selected exclusive overlay
 * does.
 */
const activateRibbonTabForOverlaySelection = () => {
  const kind = classifyOverlaySelection(overlaySelectionSnapshot())

  if (kind === 'mixed') return

  if (kind === 'measurement') {
    const measurementId = getSelectedMeasurementId()
    const measurementNewlySelected =
      measurementId !== lastActivatedMeasurementId
    lastActivatedMeasurementId = measurementId
    if (measurementNewlySelected) {
      activeRibbonTabId.value = 'measurement'
    }
    return
  }

  lastActivatedMeasurementId = undefined
}

/**
 * Coalesce overlay selection notifications from one box-select into a single
 * tab decision after every group in that gesture has been selected.
 */
const scheduleActivateRibbonTabForOverlaySelection = () => {
  if (overlayTabActivationScheduled) return
  overlayTabActivationScheduled = true
  queueMicrotask(() => {
    overlayTabActivationScheduled = false
    if (overlayTabActivationDisposed) return
    activateRibbonTabForOverlaySelection()
  })
}

/**
 * Switches to Measurement while a drawing command is active so
 * color / text-height can be changed before the overlay is committed.
 */
const activateRibbonTabForDrawCommand = (args: AcEdCommandEventArgs) => {
  const kind = acapDrawStyleKindForCommand(args.command?.globalName)
  if (kind === 'measure') {
    activeRibbonTabId.value = 'measurement'
  }
}

/**
 * After a measurement draw command ends, restore the tab from the current
 * exclusive overlay selection.
 */
const activateRibbonTabAfterDrawCommand = (args: AcEdCommandEventArgs) => {
  if (!acapDrawStyleKindForCommand(args.command?.globalName)) return
  lastActivatedMeasurementId = undefined
  scheduleActivateRibbonTabForOverlaySelection()
}

onMounted(() => {
  AcApSettingManager.instance.events.modified.addEventListener(
    handleSettingChange
  )
  AcApDocManager.instance.editor.events.commandWillStart.addEventListener(
    activateRibbonTabForDrawCommand
  )
  AcApDocManager.instance.editor.events.commandEnded.addEventListener(
    syncMeasurementVisibility
  )
  AcApDocManager.instance.editor.events.commandEnded.addEventListener(
    activateRibbonTabAfterDrawCommand
  )
  AcApDocManager.instance.events.documentActivated.addEventListener(
    handleDocumentActivated
  )
  unsubscribeMeasurementSelection = subscribeMeasurementSelection(
    syncMeasurementStyleControls
  )
  syncMeasurementStyleControls()
  handleDocumentActivated()
})

onUnmounted(() => {
  overlayTabActivationDisposed = true
  unsubscribeMeasurementSelection?.()
  unsubscribeMeasurementSelection = undefined
  AcApSettingManager.instance.events.modified.removeEventListener(
    handleSettingChange
  )
  AcApDocManager.instance.editor.events.commandWillStart.removeEventListener(
    activateRibbonTabForDrawCommand
  )
  AcApDocManager.instance.editor.events.commandEnded.removeEventListener(
    syncMeasurementVisibility
  )
  AcApDocManager.instance.editor.events.commandEnded.removeEventListener(
    activateRibbonTabAfterDrawCommand
  )
  AcApDocManager.instance.events.documentActivated.removeEventListener(
    handleDocumentActivated
  )
})

const syncMeasurementStyleControls = () => {
  const selected = getActiveMeasurementStyle()
  if (selected) {
    measurementDrawColor.value = selected.color.clone()
    measurementDrawColorDisplay.value = acapCssColor(selected.color)
    const view = AcApDocManager.instance?.curView as AcTrView2d | undefined
    const measureId = getSelectedMeasurementId()
    const wcs =
      selected.textHeightWcs != null && selected.textHeightWcs > 0
        ? selected.textHeightWcs
        : measureId
          ? getMeasurementSnapshot(measureId)?.style.textHeightWcs
          : undefined
    const resolvedWcs =
      wcs != null && wcs > 0
        ? wcs
        : view
          ? acapScreenPxToWcs(selected.fontSize, view)
          : undefined
    measurementTextHeightMode.value = 'custom'
    measurementTextHeightWcs.value = resolvedWcs
  } else {
    const db = getCurrentDatabase()
    if (db) {
      const color = acapGetMeasurementColor()
      measurementDrawColor.value = color.clone()
      measurementDrawColorDisplay.value = acapCssColor(color)
    }
    measurementTextHeightMode.value = acapGetMeasurementTextHeightMode()
    measurementTextHeightWcs.value =
      measurementTextHeightMode.value === 'custom'
        ? acapGetMeasurementCustomTextHeightWcs()
        : undefined
  }
  scheduleActivateRibbonTabForOverlaySelection()
}

const handleMeasurementDrawColorChange = (value?: AcCmColor) => {
  if (!value) return
  acapSetMeasurementDrawColor(value)
  measurementDrawColor.value = value.clone()
  measurementDrawColorDisplay.value = acapCssColor(value)
  const view = AcApDocManager.instance?.curView as AcTrView2d | undefined
  if (view) applyMeasurementStyleToSelection(view, { color: value })
}

/**
 * Opens the shared text-height dialog for Measurement overlays.
 */
const handleMeasurementTextHeightClick = async () => {
  if (textHeightDialogOpen) return
  const view = AcApDocManager.instance?.curView as AcTrView2d | undefined
  if (!view) return
  textHeightDialogOpen = true
  try {
    const selected = getActiveMeasurementStyle()
    const hasSelection = selected != null
    const measureId = getSelectedMeasurementId()
    const fontSizePx = selected?.fontSize ?? acapGetMeasurementFontSize()
    const selectedTextHeightWcs = hasSelection
      ? (selected?.textHeightWcs ??
        (measureId
          ? getMeasurementSnapshot(measureId)?.style.textHeightWcs
          : undefined))
      : acapGetMeasurementCustomTextHeightWcs()
    const initials = acuiResolveTextHeightDialogInitials({
      hasSelection,
      sessionMode: hasSelection ? 'custom' : acapGetMeasurementTextHeightMode(),
      fontSizePx,
      selectedTextHeightWcs,
      view
    })
    const result = await acuiOpenTextHeightDialog({
      view,
      ...initials
    })
    if (!result) return
    const patch = acuiResolveTextHeightPatch(
      view,
      result,
      initials.initialFontSizePx
    )
    acapSetMeasurementTextHeight(
      patch.textHeightMode,
      patch.textHeightMode === 'custom'
        ? (patch.textHeightWcs ?? patch.fontSize)
        : patch.fontSize
    )
    applyMeasurementStyleToSelection(view, patch)
    syncMeasurementStyleControls()
  } finally {
    textHeightDialogOpen = false
  }
}

const syncMeasurementUnitControls = () => {
  const units = getEffectiveMeasurementUnits()
  measurementLunits.value = units.lunits
  measurementLuprec.value = units.luprec
  measurementAunits.value = units.aunits
  measurementAuprec.value = units.auprec
  measurementLengthUnit.value = units.lengthUnit
}

const refreshCurrentMeasurementLabels = () => {
  const db = getCurrentDatabase()
  const view = AcApDocManager.instance?.curView as AcTrView2d | undefined
  if (!db || !view) return
  refreshMeasurementValueLabels(view, db)
}

const applyMeasurementUnitOverride = (
  patch: Partial<{
    lunits: number
    luprec: number
    aunits: number
    auprec: number
    lengthUnit: number
  }>
) => {
  setMeasurementUnitOverride(patch)
  syncMeasurementUnitControls()
  refreshCurrentMeasurementLabels()
}

const handleMeasurementLunitsChange = (value: number) => {
  applyMeasurementUnitOverride({ lunits: value })
}

const handleMeasurementLuprecChange = (value: number) => {
  applyMeasurementUnitOverride({ luprec: value })
}

const handleMeasurementAunitsChange = (value: number) => {
  applyMeasurementUnitOverride({ aunits: value })
}

const handleMeasurementAuprecChange = (value: number) => {
  applyMeasurementUnitOverride({ auprec: value })
}

const handleMeasurementLengthUnitChange = (value: number) => {
  applyMeasurementUnitOverride({ lengthUnit: value })
}

/**
 * Read: measurement only. Write: all tabs.
 * Contextual tabs keep the visibility their builders already set.
 */
const applyOpenModeTabVisibility = (
  tabs: RibbonTabModel[],
  openMode: AcEdOpenMode
): RibbonTabModel[] => {
  return tabs.map(tab => {
    if (tab.contextual) return tab
    const visible =
      tab.id === 'measurement' ? true : openMode === AcEdOpenMode.Write
    return { ...tab, visible }
  })
}

const buildBaseTabs = (
  openMode: AcEdOpenMode,
  measurementVisible: boolean
): RibbonTabModel[] => {
  const ribbonTooltips = {
    line: t('main.ribbon.tooltip.line'),
    polyline: t('main.ribbon.tooltip.polyline'),
    circle: t('main.ribbon.tooltip.circle'),
    arc: t('main.ribbon.tooltip.arc'),
    ellipse: t('main.ribbon.tooltip.ellipse'),
    rect: t('main.ribbon.tooltip.rect'),
    point: t('main.ribbon.tooltip.point'),
    text: t('main.ribbon.tooltip.text'),
    move: t('main.ribbon.tooltip.move'),
    rotate: t('main.ribbon.tooltip.rotate'),
    copy: t('main.ribbon.tooltip.copy'),
    erase: t('main.ribbon.tooltip.erase'),
    offset: t('main.ribbon.tooltip.offset'),
    drawingUnits: t('main.ribbon.tooltip.drawingUnits')
  }
  const ribbonDropdownOptionTooltips = {
    circleCenterRadius: t('main.ribbon.tooltip.circleOption.centerRadius'),
    circleCenterDiameter: t('main.ribbon.tooltip.circleOption.centerDiameter'),
    circleTwoPoint: t('main.ribbon.tooltip.circleOption.twoPoint'),
    circleThreePoint: t('main.ribbon.tooltip.circleOption.threePoint'),
    circleTanTanRadius: t('main.ribbon.tooltip.circleOption.tanTanRadius'),
    circleTanTanTan: t('main.ribbon.tooltip.circleOption.tanTanTan'),
    arcThreePoint: t('main.ribbon.tooltip.arcOption.threePoint'),
    arcStartCenterEnd: t('main.ribbon.tooltip.arcOption.startCenterEnd'),
    arcStartCenterAngle: t('main.ribbon.tooltip.arcOption.startCenterAngle'),
    arcStartCenterLength: t('main.ribbon.tooltip.arcOption.startCenterLength'),
    arcStartEndAngle: t('main.ribbon.tooltip.arcOption.startEndAngle'),
    arcStartEndDirection: t('main.ribbon.tooltip.arcOption.startEndDirection'),
    arcStartEndRadius: t('main.ribbon.tooltip.arcOption.startEndRadius'),
    arcCenterStartEnd: t('main.ribbon.tooltip.arcOption.centerStartEnd'),
    arcCenterStartAngle: t('main.ribbon.tooltip.arcOption.centerStartAngle'),
    arcCenterStartLength: t('main.ribbon.tooltip.arcOption.centerStartLength'),
    rectang: t('main.ribbon.tooltip.rectOption.rectangle'),
    polygon: t('main.ribbon.tooltip.rectOption.polygon'),
    ellipse: t('main.ribbon.tooltip.ellipseOption.ellipse'),
    ellipseArc: t('main.ribbon.tooltip.ellipseOption.arc')
  }
  const verticalToolbarDescriptions = {
    measureDistance: t('main.verticalToolbar.measureDistance.description'),
    measureContinuous: t('main.verticalToolbar.measureContinuous.description'),
    measureAngle: t('main.verticalToolbar.measureAngle.description'),
    measureArea: t('main.verticalToolbar.measureArea.description'),
    measureArc: t('main.verticalToolbar.measureArc.description'),
    measurePoint: t('main.verticalToolbar.measurePoint.description'),
    clearMeasurements: t('main.verticalToolbar.clearMeasurements.description'),
    measurementImport: t('main.verticalToolbar.measurementImport.description'),
    measurementExport: t('main.verticalToolbar.measurementExport.description'),
    hideMeasurements: t('main.verticalToolbar.hideMeasurements.description'),
    showMeasurements: t('main.verticalToolbar.showMeasurements.description')
  }

  const measureItems: RibbonItemModel[] = [
    {
      id: 'cmd-tool-measure-distance',
      type: 'button',
      label: t('main.verticalToolbar.measureDistance.text'),
      tooltip: verticalToolbarDescriptions.measureDistance,
      size: 'large',
      props: { icon: measureDistance }
    },
    {
      id: 'cmd-tool-measure-continuous',
      type: 'button',
      label: t('main.verticalToolbar.measureContinuous.text'),
      tooltip: verticalToolbarDescriptions.measureContinuous,
      size: 'large',
      props: { icon: measureContinuous }
    },
    {
      id: 'cmd-tool-measure-angle',
      type: 'button',
      label: t('main.verticalToolbar.measureAngle.text'),
      tooltip: verticalToolbarDescriptions.measureAngle,
      size: 'large',
      props: { icon: measureAngle }
    },
    {
      id: 'cmd-tool-measure-area',
      type: 'button',
      label: t('main.verticalToolbar.measureArea.text'),
      tooltip: verticalToolbarDescriptions.measureArea,
      size: 'large',
      props: { icon: measureArea }
    },
    {
      id: 'cmd-tool-measure-arc',
      type: 'button',
      label: t('main.verticalToolbar.measureArc.text'),
      tooltip: verticalToolbarDescriptions.measureArc,
      size: 'large',
      props: { icon: measureArc }
    },
    {
      id: 'cmd-tool-measure-point',
      type: 'button',
      label: t('main.verticalToolbar.measurePoint.text'),
      tooltip: verticalToolbarDescriptions.measurePoint,
      size: 'large',
      props: { icon: measurePoint }
    },
    {
      id: 'cmd-tool-measurement-panel',
      type: 'button',
      label: t('main.verticalToolbar.measurementPanel.text'),
      tooltip: t('main.verticalToolbar.measurementPanel.description'),
      size: 'large',
      props: { icon: measurementPanel }
    },
    {
      id: 'cmd-tool-measurement-vis',
      type: 'toggle',
      label: t('main.verticalToolbar.showMeasurements.text'),
      tooltip: measurementVisible
        ? verticalToolbarDescriptions.hideMeasurements
        : verticalToolbarDescriptions.showMeasurements,
      size: 'large',
      props: {
        modelValue: measurementVisible,
        activeIcon: View,
        inactiveIcon: Hide,
        activeLabel: t('main.verticalToolbar.showMeasurements.text'),
        inactiveLabel: t('main.verticalToolbar.hideMeasurements.text'),
        activeValue: 'cmd-tool-measurement-vis',
        inactiveValue: 'cmd-tool-measurement-vis'
      }
    }
  ]

  const measurementManageItems: RibbonItemModel[] = [
    {
      id: 'cmd-tool-measurement-import',
      type: 'button',
      label: t('main.verticalToolbar.measurementImport.text'),
      tooltip: verticalToolbarDescriptions.measurementImport,
      size: 'small',
      props: { icon: importIcon }
    },
    {
      id: 'cmd-tool-measurement-export',
      type: 'button',
      label: t('main.verticalToolbar.measurementExport.text'),
      tooltip: verticalToolbarDescriptions.measurementExport,
      size: 'small',
      props: { icon: exportIcon }
    },
    {
      id: 'cmd-tool-clear-measurements',
      type: 'button',
      label: t('main.verticalToolbar.clearMeasurements.text'),
      tooltip: verticalToolbarDescriptions.clearMeasurements,
      size: 'small',
      props: { icon: clearMeasurements }
    }
  ]

  const measurementStyleItems: RibbonItemModel[] = [
    {
      id: 'measurement-draw-color',
      type: 'custom',
      size: 'small',
      tooltip: t('main.verticalToolbar.measurementColor.description'),
      props: {
        component: MlRibbonPropertyColorDropdown,
        componentProps: {
          modelValue: measurementDrawColor.value,
          displayColor: measurementDrawColorDisplay.value,
          placeholder: t('main.ribbon.property.color'),
          controlWidth: OVERLAY_STYLE_CONTROL_WIDTH,
          'onUpdate:modelValue': handleMeasurementDrawColorChange
        }
      }
    },
    {
      id: 'measurement-draw-text-height',
      type: 'custom',
      size: 'small',
      tooltip: t('main.verticalToolbar.measurementFontSize.description'),
      props: {
        component: MlRibbonTextHeightButton,
        componentProps: {
          mode: measurementTextHeightMode.value,
          textHeightWcs: measurementTextHeightWcs.value,
          fitLabel: t('main.verticalToolbar.measurementFontSize.fit'),
          wcsLabel: t('main.verticalToolbar.measurementFontSize.wcs'),
          placeholder: t('main.verticalToolbar.measurementFontSize.text'),
          ariaLabel: t('main.verticalToolbar.measurementFontSize.description'),
          controlWidth: OVERLAY_STYLE_CONTROL_WIDTH,
          onClick: handleMeasurementTextHeightClick
        }
      }
    }
  ]

  const measurementGroups: RibbonGroupModel[] = [
    {
      id: 'measurement-measure',
      title: t('main.ribbon.group.measurement'),
      orientation: 'row',
      collections: [
        {
          id: 'measurement-main',
          layout: 'row',
          items: measureItems
        },
        {
          id: 'measurement-manage',
          layout: 'column',
          rows: 3,
          items: measurementManageItems
        }
      ]
    },
    {
      id: 'measurement-style',
      title: t('main.ribbon.group.style'),
      orientation: 'row',
      collections: [
        {
          id: 'measurement-style-main',
          layout: 'column',
          rows: 3,
          items: measurementStyleItems
        }
      ]
    },
    {
      id: 'measurement-length-units',
      title: t('main.ribbon.group.lengthUnits'),
      orientation: 'row',
      collections: [
        {
          id: 'measurement-length-units-main',
          layout: 'column',
          rows: 3,
          items: [
            {
              id: 'measurement-length-units-type',
              type: 'custom',
              size: 'small',
              props: {
                component: MlRibbonMeasurementUnitsPanel,
                componentProps: {
                  kind: 'length',
                  field: 'unitType',
                  unitType: measurementLunits.value,
                  precision: measurementLuprec.value,
                  lengthUnit: measurementLengthUnit.value,
                  'onUpdate:unitType': handleMeasurementLunitsChange,
                  'onUpdate:precision': handleMeasurementLuprecChange,
                  'onUpdate:lengthUnit': handleMeasurementLengthUnitChange
                }
              }
            },
            {
              id: 'measurement-length-units-precision',
              type: 'custom',
              size: 'small',
              props: {
                component: MlRibbonMeasurementUnitsPanel,
                componentProps: {
                  kind: 'length',
                  field: 'precision',
                  unitType: measurementLunits.value,
                  precision: measurementLuprec.value,
                  lengthUnit: measurementLengthUnit.value,
                  'onUpdate:unitType': handleMeasurementLunitsChange,
                  'onUpdate:precision': handleMeasurementLuprecChange,
                  'onUpdate:lengthUnit': handleMeasurementLengthUnitChange
                }
              }
            },
            {
              id: 'measurement-length-units-unit',
              type: 'custom',
              size: 'small',
              props: {
                component: MlRibbonMeasurementUnitsPanel,
                componentProps: {
                  kind: 'length',
                  field: 'lengthUnit',
                  unitType: measurementLunits.value,
                  precision: measurementLuprec.value,
                  lengthUnit: measurementLengthUnit.value,
                  'onUpdate:unitType': handleMeasurementLunitsChange,
                  'onUpdate:precision': handleMeasurementLuprecChange,
                  'onUpdate:lengthUnit': handleMeasurementLengthUnitChange
                }
              }
            }
          ]
        }
      ]
    },
    {
      id: 'measurement-angle-units',
      title: t('main.ribbon.group.angleUnits'),
      orientation: 'row',
      collections: [
        {
          id: 'measurement-angle-units-main',
          layout: 'column',
          rows: 3,
          items: [
            {
              id: 'measurement-angle-units-type',
              type: 'custom',
              size: 'small',
              props: {
                component: MlRibbonMeasurementUnitsPanel,
                componentProps: {
                  kind: 'angle',
                  field: 'unitType',
                  unitType: measurementAunits.value,
                  precision: measurementAuprec.value,
                  'onUpdate:unitType': handleMeasurementAunitsChange,
                  'onUpdate:precision': handleMeasurementAuprecChange
                }
              }
            },
            {
              id: 'measurement-angle-units-precision',
              type: 'custom',
              size: 'small',
              props: {
                component: MlRibbonMeasurementUnitsPanel,
                componentProps: {
                  kind: 'angle',
                  field: 'precision',
                  unitType: measurementAunits.value,
                  precision: measurementAuprec.value,
                  'onUpdate:unitType': handleMeasurementAunitsChange,
                  'onUpdate:precision': handleMeasurementAuprecChange
                }
              }
            }
          ]
        }
      ]
    }
  ]

  const tabs: RibbonTabModel[] = [
    {
      id: 'home',
      title: t('main.ribbon.tab.home'),
      groups: [
        {
          id: 'home-draw',
          title: t('main.ribbon.group.draw'),
          orientation: 'row',
          footerMenuItems: [
            {
              id: 'cmd-point',
              type: 'button',
              label: t('main.ribbon.command.point'),
              tooltip: ribbonTooltips.point,
              props: { icon: multiPoints }
            }
          ],
          collections: [
            {
              id: 'home-draw-main',
              layout: 'row',
              items: [
                {
                  id: 'cmd-line',
                  type: 'button',
                  label: t('main.ribbon.command.line'),
                  tooltip: ribbonTooltips.line,
                  size: 'large',
                  props: { icon: line }
                },
                {
                  id: 'cmd-polyline',
                  type: 'button',
                  label: t('main.ribbon.command.polyline'),
                  tooltip: ribbonTooltips.polyline,
                  size: 'large',
                  props: { icon: polyline }
                },
                {
                  id: 'cmd-circle',
                  type: 'dropdown',
                  label: t('main.ribbon.command.circle'),
                  tooltip: ribbonTooltips.circle,
                  size: 'large',
                  props: {
                    icon: circleCenterRadius,
                    options: [
                      {
                        value: 'circle-center-radius',
                        label: t('main.ribbon.circle.centerRadius'),
                        tooltip:
                          ribbonDropdownOptionTooltips.circleCenterRadius,
                        icon: circleCenterRadius
                      },
                      {
                        value: 'circle-center-diameter',
                        label: t('main.ribbon.circle.centerDiameter'),
                        tooltip:
                          ribbonDropdownOptionTooltips.circleCenterDiameter,
                        icon: circleCenterDiameter
                      },
                      {
                        value: 'circle-2-point',
                        label: t('main.ribbon.circle.twoPoint'),
                        tooltip: ribbonDropdownOptionTooltips.circleTwoPoint,
                        icon: circleTwoPoints
                      },
                      {
                        value: 'circle-3-point',
                        label: t('main.ribbon.circle.threePoint'),
                        tooltip: ribbonDropdownOptionTooltips.circleThreePoint,
                        icon: circleThreePoints
                      },
                      {
                        value: 'circle-tan-tan-radius',
                        label: t('main.ribbon.circle.tanTanRadius'),
                        tooltip:
                          ribbonDropdownOptionTooltips.circleTanTanRadius,
                        icon: circleTanTanRadius
                      },
                      {
                        value: 'circle-tan-tan-tan',
                        label: t('main.ribbon.circle.tanTanTan'),
                        tooltip: ribbonDropdownOptionTooltips.circleTanTanTan,
                        icon: circleTanTanTan
                      }
                    ]
                  }
                },
                {
                  id: 'cmd-arc',
                  type: 'dropdown',
                  label: t('main.ribbon.command.arc'),
                  tooltip: ribbonTooltips.arc,
                  size: 'large',
                  props: {
                    icon: arcThreePoints,
                    options: [
                      {
                        value: 'arc-3-point',
                        label: t('main.ribbon.arc.threePoint'),
                        tooltip: ribbonDropdownOptionTooltips.arcThreePoint,
                        icon: arcThreePoints
                      },
                      {
                        value: 'arc-start-center-end',
                        label: t('main.ribbon.arc.startCenterEnd'),
                        tooltip: ribbonDropdownOptionTooltips.arcStartCenterEnd,
                        icon: arcStartCenterEnd
                      },
                      {
                        value: 'arc-start-center-angle',
                        label: t('main.ribbon.arc.startCenterAngle'),
                        tooltip:
                          ribbonDropdownOptionTooltips.arcStartCenterAngle,
                        icon: arcStartCenterAngle
                      },
                      {
                        value: 'arc-start-center-length',
                        label: t('main.ribbon.arc.startCenterLength'),
                        tooltip:
                          ribbonDropdownOptionTooltips.arcStartCenterLength,
                        icon: arcStartCenterLength
                      },
                      {
                        value: 'arc-start-end-angle',
                        label: t('main.ribbon.arc.startEndAngle'),
                        tooltip: ribbonDropdownOptionTooltips.arcStartEndAngle,
                        icon: arcStartEndAngle
                      },
                      {
                        value: 'arc-start-end-direction',
                        label: t('main.ribbon.arc.startEndDirection'),
                        tooltip:
                          ribbonDropdownOptionTooltips.arcStartEndDirection,
                        icon: arcStartEndDirection
                      },
                      {
                        value: 'arc-start-end-radius',
                        label: t('main.ribbon.arc.startEndRadius'),
                        tooltip: ribbonDropdownOptionTooltips.arcStartEndRadius,
                        icon: arcStartEndRadius
                      },
                      {
                        value: 'arc-center-start-end',
                        label: t('main.ribbon.arc.centerStartEnd'),
                        tooltip: ribbonDropdownOptionTooltips.arcCenterStartEnd,
                        icon: arcCenterStartEnd
                      },
                      {
                        value: 'arc-center-start-angle',
                        label: t('main.ribbon.arc.centerStartAngle'),
                        tooltip:
                          ribbonDropdownOptionTooltips.arcCenterStartAngle,
                        icon: arcCenterStartAngle
                      },
                      {
                        value: 'arc-center-start-length',
                        label: t('main.ribbon.arc.centerStartLength'),
                        tooltip:
                          ribbonDropdownOptionTooltips.arcCenterStartLength,
                        icon: arcCenterStartLength
                      }
                    ]
                  }
                }
              ]
            },
            {
              id: 'home-draw-compact-tools',
              layout: 'column',
              rows: 3,
              items: [
                {
                  id: 'cmd-rect',
                  type: 'dropdown',
                  label: t('main.ribbon.command.rect'),
                  tooltip: ribbonTooltips.rect,
                  hideLabel: true,
                  size: 'small',
                  props: {
                    icon: rect,
                    options: [
                      {
                        value: 'rectang',
                        label: t('main.ribbon.command.rectangle'),
                        tooltip: ribbonDropdownOptionTooltips.rectang,
                        icon: rect
                      },
                      {
                        value: 'polygon',
                        label: t('main.ribbon.command.polygon'),
                        tooltip: ribbonDropdownOptionTooltips.polygon,
                        icon: polygon
                      }
                    ]
                  }
                },
                {
                  id: 'cmd-ellipse',
                  type: 'dropdown',
                  label: t('main.ribbon.command.ellipse'),
                  tooltip: ribbonTooltips.ellipse,
                  hideLabel: true,
                  size: 'small',
                  props: {
                    icon: ellipseCenter,
                    options: [
                      {
                        value: 'ellipse',
                        label: t('main.ribbon.ellipse.ellipse'),
                        tooltip: ribbonDropdownOptionTooltips.ellipse,
                        icon: ellipseCenter
                      },
                      {
                        value: 'ellipse-arc',
                        label: t('main.ribbon.ellipse.arc'),
                        tooltip: ribbonDropdownOptionTooltips.ellipseArc,
                        icon: ellipseArc
                      }
                    ]
                  }
                }
              ]
            }
          ]
        },
        {
          id: 'home-modify',
          title: t('main.ribbon.group.modify'),
          orientation: 'row',
          collections: [
            {
              id: 'home-modify-main',
              layout: 'column',
              rows: 3,
              items: [
                {
                  id: 'cmd-move',
                  type: 'button',
                  label: t('main.ribbon.command.move'),
                  tooltip: ribbonTooltips.move,
                  size: 'small',
                  props: { icon: move }
                },
                {
                  id: 'cmd-rotate',
                  type: 'button',
                  label: t('main.ribbon.command.rotate'),
                  tooltip: ribbonTooltips.rotate,
                  size: 'small',
                  props: { icon: RefreshRight }
                },
                {
                  id: 'cmd-copy',
                  type: 'button',
                  label: t('main.ribbon.command.copy'),
                  tooltip: ribbonTooltips.copy,
                  size: 'small',
                  props: { icon: DocumentCopy }
                }
              ]
            },
            {
              id: 'home-modify-secondary',
              layout: 'column',
              rows: 3,
              items: [
                {
                  id: 'cmd-erase',
                  type: 'button',
                  label: t('main.ribbon.command.erase'),
                  tooltip: ribbonTooltips.erase,
                  size: 'small',
                  props: { icon: Delete }
                },
                {
                  id: 'cmd-offset',
                  type: 'button',
                  label: t('main.ribbon.command.offset'),
                  tooltip: ribbonTooltips.offset,
                  size: 'small',
                  props: { icon: offset }
                }
              ]
            }
          ]
        },
        {
          id: 'home-utilities',
          title: t('main.ribbon.group.utilities'),
          orientation: 'row',
          collections: [
            {
              id: 'home-utilities-main',
              layout: 'row',
              items: [
                {
                  id: 'cmd-drawing-units',
                  type: 'button',
                  label: t('main.ribbon.command.drawingUnits'),
                  tooltip: ribbonTooltips.drawingUnits,
                  size: 'large',
                  props: {
                    icon: setting,
                    labelWrapLines: 2,
                    labelWrapWidth: 'max-content'
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]

  tabs.push({
    id: 'measurement',
    title: t('main.ribbon.tab.measurement'),
    groups: measurementGroups
  })

  return markComponentConfigRaw(applyOpenModeTabVisibility(tabs, openMode))
}

const ribbonData = computed(() => {
  locale.value
  const openMode = docOpenMode.value
  const measurementVisible = isMeasurementOverlayVisible.value
  // Track measurement draw style so Measurement ribbon controls refresh.
  measurementDrawColor.value
  measurementDrawColorDisplay.value
  measurementTextHeightMode.value
  measurementTextHeightWcs.value
  measurementLunits.value
  measurementLuprec.value
  measurementAunits.value
  measurementAuprec.value
  measurementLengthUnit.value
  const commandByItemId = new Map<string, string>()
  commandByItemId.set('cmd-line', 'line')
  commandByItemId.set('cmd-polyline', 'pline')
  commandByItemId.set('cmd-circle', 'circle')
  commandByItemId.set('circle-center-radius', 'circle')
  commandByItemId.set('circle-center-diameter', 'circle\\nDiameter')
  commandByItemId.set('circle-2-point', 'circle\\n2P')
  commandByItemId.set('circle-3-point', 'circle\\n3P')
  commandByItemId.set('circle-tan-tan-radius', 'circle')
  commandByItemId.set('circle-tan-tan-tan', 'circle')
  commandByItemId.set('cmd-arc', 'arc')
  commandByItemId.set('arc-3-point', 'arc\\n3 Point')
  commandByItemId.set('arc-start-center-end', 'arc\\nStart Center End')
  commandByItemId.set('arc-start-center-angle', 'arc\\nStart Center Angle')
  commandByItemId.set(
    'arc-start-center-length',
    'arc\\nStart Center Chord Length'
  )
  commandByItemId.set('arc-start-end-angle', 'arc\\nStart End Angle')
  commandByItemId.set('arc-start-end-direction', 'arc\\nStart End Direction')
  commandByItemId.set('arc-start-end-radius', 'arc\\nStart End Radius')
  commandByItemId.set('arc-center-start-end', 'arc\\nCenter Start End')
  commandByItemId.set('arc-center-start-angle', 'arc\\nCenter Start Angle')
  commandByItemId.set(
    'arc-center-start-length',
    'arc\\nCenter Start Chord Length'
  )
  commandByItemId.set('cmd-ellipse', 'ellipse')
  commandByItemId.set('ellipse', 'ellipse')
  commandByItemId.set('ellipse-arc', 'ellipse\\nArc')
  commandByItemId.set('cmd-rect', 'rectang')
  commandByItemId.set('rectang', 'rectang')
  commandByItemId.set('polygon', 'polygon')
  commandByItemId.set('cmd-point', 'point')
  commandByItemId.set('cmd-move', 'move')
  commandByItemId.set('cmd-rotate', 'rotate')
  commandByItemId.set('cmd-copy', 'copy')
  commandByItemId.set('cmd-erase', 'erase')
  commandByItemId.set('cmd-offset', 'offset')
  commandByItemId.set('cmd-drawing-units', 'units')
  commandByItemId.set('cmd-tool-measure-distance', 'measuredistance')
  commandByItemId.set('cmd-tool-measure-continuous', 'measurecontinuous')
  commandByItemId.set('cmd-tool-measure-angle', 'measureangle')
  commandByItemId.set('cmd-tool-measure-area', 'measurearea')
  commandByItemId.set('cmd-tool-measure-arc', 'measurearc')
  commandByItemId.set('cmd-tool-measure-point', 'measurepoint')
  commandByItemId.set('cmd-tool-measurement-panel', 'measurementpanel')
  commandByItemId.set('cmd-tool-measurement-vis', 'measurementvis')
  commandByItemId.set('cmd-tool-measurement-import', 'measurementimport')
  commandByItemId.set('cmd-tool-measurement-export', 'measurementexport')
  commandByItemId.set('cmd-tool-clear-measurements', 'clearmeasurements')

  const tabs: RibbonTabModel[] = buildBaseTabs(openMode, measurementVisible)
  return {
    tabs,
    commandByItemId
  }
})

watch(
  () =>
    ribbonData.value.tabs
      .filter(tab => tab.visible !== false && !tab.contextual)
      .map(tab => tab.id),
  tabIds => {
    if (tabIds.length === 0) return
    if (!tabIds.includes(activeRibbonTabId.value)) {
      activeRibbonTabId.value = tabIds[0]
    }
  },
  { immediate: true }
)

const fileMenuItems = computed<FileMenuItemModel[]>(() => {
  locale.value
  const items: FileMenuItemModel[] = [
    {
      id: 'QNew',
      label: t('main.mainMenu.new')
    },
    {
      id: 'DrawingUnits',
      label: t('main.mainMenu.drawingUnits')
    }
  ]
  items.push({
    id: 'About',
    label: t('main.mainMenu.about'),
    divided: true
  })
  return items
})

const ribbonTexts = computed<RibbonLocaleTexts>(() => {
  locale.value
  return {
    fileMenuLabel: t('main.toolPalette.missingResources.file')
  }
})

const handleRibbonItemClick = (payload: {
  tabId: string
  groupId: string
  itemId: string
}) => {
  if (isRibbonDisabled.value) return
  const command = ribbonData.value.commandByItemId.get(payload.itemId)
  if (!command) return
  AcApDocManager.instance.sendStringToExecute(command)
}

const handleFileMenuSelect = async (command: string) => {
  if (isRibbonDisabled.value) return
  if (command === 'QNew') {
    const cmd = new AcApQNewCmd()
    cmd.trigger(AcApDocManager.instance.context)
  } else if (command === 'DrawingUnits') {
    AcApDocManager.instance.sendStringToExecute('units')
  } else if (command === 'About') {
    AcApDocManager.instance.sendStringToExecute('about')
  }
}
</script>

<template>
  <div
    ref="ribbonContainerRef"
    :aria-disabled="isRibbonDisabled"
    class="ml-ribbon-toolbar-container"
  >
    <ml-ribbon
      v-model:active-tab="activeRibbonTabId"
      :disabled="isRibbonDisabled"
      :file-menu-items="fileMenuItems"
      :minimized="false"
      :show-file-menu="true"
      :show-open-backstage="false"
      :tabs="ribbonData.tabs"
      :texts="ribbonTexts"
      hide-key-tips-toggle
      hide-layout-switcher
      @file-menu-select="handleFileMenuSelect"
      @item-click="handleRibbonItemClick"
    >
    </ml-ribbon>
    <ml-ribbon-file-name :container-el="ribbonContainerRef" />
  </div>
</template>

<style>
.ml-ribbon-toolbar-container {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  z-index: 6;
}

.ml-ribbon-toolbar-container
  .ml-ribbon-item-host.is-large.type-button.is-label-wrap
  .ml-ribbon-item-host__label {
  white-space: pre-line;
}
</style>
