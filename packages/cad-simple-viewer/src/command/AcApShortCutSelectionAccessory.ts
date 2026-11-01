/**
 * Selection-driven color / text-height buttons mounted on the shortcut toolbar.
 *
 * @module AcApShortCutSelectionAccessory
 * @packageDocumentation
 */

import { AcCmColor } from '@mlightcad/data-model'

import { resolveUiTheme } from '../editor/global/AcEdUiTheme'
import { AcApI18n } from '../i18n'
import { AcUiAciColorDialog } from '../ui/AcUiAciColorDialog'
import type { AcUiDrawStyleKind } from '../ui/AcUiDrawStyle'
import type { AcUiShortCutToolbar } from '../ui/AcUiShortCutToolbar'
import type { AcUiSimpleToolbarItem } from '../ui/AcUiSimpleToolbar'
import {
  acuiOpenTextHeightDialog,
  acuiResolveTextHeightDialogInitials,
  acuiResolveTextHeightPatch
} from '../ui/AcUiTextHeightDialogHelpers'
import { ICON_TEXT_HEIGHT } from '../ui/icons'
import {
  acapGetMeasurementCustomTextHeightWcs,
  acapGetMeasurementFontSize,
  acapGetMeasurementTextHeightMode,
  acapSetMeasurementDrawColor,
  acapSetMeasurementTextHeight
} from '../util/AcApMeasurementUtil'
import type { AcTrView2d } from '../view'
import {
  applyMeasurementStyleToSelection,
  getActiveMeasurementStyle,
  getMeasurementSnapshot,
  getSelectedMeasurementId
} from './measure/AcApMeasurementStore'

function colorFromAci(index: number): AcCmColor {
  const color = new AcCmColor()
  color.colorIndex = index
  return color
}

function createColorIcon(css: string): HTMLElement {
  const wrap = document.createElement('span')
  wrap.className = 'ml-ui-simple-toolbar__icon'
  wrap.style.cssText =
    'display:inline-flex;width:18px;height:18px;align-items:center;justify-content:center'
  const fill = document.createElement('span')
  fill.style.cssText = `display:block;width:12px;height:12px;border-radius:50%;border:1px solid #666;background:${css}`
  wrap.appendChild(fill)
  return wrap
}

/**
 * Builds and syncs shortcut-toolbar extension items for measurement selection.
 */
export function acapBindShortCutSelectionAccessory(
  view: AcTrView2d,
  shortcut: AcUiShortCutToolbar,
  getKind: () => AcUiDrawStyleKind | undefined
): () => void {
  let colorDialogOpen = false
  let textHeightDialogOpen = false

  const sync = () => {
    const kind = getKind()
    if (kind == null) {
      shortcut.setExtensionItems([])
      return
    }

    if (getSelectedMeasurementId() == null) {
      shortcut.setExtensionItems([])
      return
    }

    let colorCss = '#7b8794'
    const style = getActiveMeasurementStyle()
    if (style) colorCss = `rgb(${style.color.red},${style.color.green},${style.color.blue})`

    const items: AcUiSimpleToolbarItem[] = [
      {
        id: 'selection-color',
        icon: () => createColorIcon(colorCss),
        label: AcApI18n.t('main.drawStyle.color'),
        onClick: () => {
          void openColor()
        }
      },
      {
        id: 'selection-text-height',
        icon: ICON_TEXT_HEIGHT,
        label: AcApI18n.t('main.drawStyle.fontSize'),
        onClick: () => {
          void openTextHeight()
        }
      }
    ]
    shortcut.setExtensionItems(items)
  }

  const openColor = async () => {
    if (colorDialogOpen) return
    colorDialogOpen = true
    try {
      let initial: number | null = null
      const style = getActiveMeasurementStyle()
      if (style?.color.isByACI && style.color.colorIndex != null) {
        initial = style.color.colorIndex
      }
      const index = await AcUiAciColorDialog.open({
        host: view.container,
        theme: resolveUiTheme(view.container),
        initialIndex: initial,
        labels: {
          title: AcApI18n.t('main.colorPicker.title'),
          close: AcApI18n.t('main.colorPicker.close'),
          ok: AcApI18n.t('main.colorPicker.ok'),
          cancel: AcApI18n.t('main.colorPicker.cancel'),
          index: AcApI18n.t('main.colorPicker.index'),
          rgb: AcApI18n.t('main.colorPicker.rgb'),
          input: AcApI18n.t('main.colorPicker.input'),
          inputPlaceholder: AcApI18n.t('main.colorPicker.inputPlaceholder')
        }
      })
      if (index == null) return
      const color = colorFromAci(index)
      acapSetMeasurementDrawColor(color)
      applyMeasurementStyleToSelection(view, { color })
      sync()
    } finally {
      colorDialogOpen = false
    }
  }

  const openTextHeight = async () => {
    if (textHeightDialogOpen) return
    textHeightDialogOpen = true
    try {
      const selectedMeasure = getActiveMeasurementStyle()
      const hasSelection = selectedMeasure != null
      const sessionMode =
        selectedMeasure?.textHeightMode ?? acapGetMeasurementTextHeightMode()
      const fontSizePx =
        selectedMeasure?.fontSize ?? acapGetMeasurementFontSize()
      const measureId = getSelectedMeasurementId()
      const selectedTextHeightWcs = hasSelection
        ? selectedMeasure?.textHeightWcs ??
          (measureId
            ? getMeasurementSnapshot(measureId)?.style.textHeightWcs
            : undefined)
        : acapGetMeasurementCustomTextHeightWcs()

      const initials = acuiResolveTextHeightDialogInitials({
        hasSelection,
        sessionMode: sessionMode ?? 'adaptive',
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
      sync()
    } finally {
      textHeightDialogOpen = false
    }
  }

  return sync
}
