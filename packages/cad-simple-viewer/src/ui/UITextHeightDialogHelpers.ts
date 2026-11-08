/**
 * Shared helpers for opening the text-height dialog.
 *
 * @module UITextHeightDialogHelpers
 * @packageDocumentation
 */

import { applicationScreenPxToWcs, applicationWcsToScreenPx } from '../command/overlay/ApplicationOverlayDrawUtil'
import { resolveUiTheme } from '../editor/global/EditorUiTheme'
import { ApplicationI18n } from '../i18n'
import type { ThreeRendererView2d } from '../view'
import {
  UITextHeightDialog,
  type UITextHeightDialogResult,
  type UITextHeightMode
} from './UITextHeightDialog'

/** Options for {@link uiOpenTextHeightDialog}. */
export interface UIOpenTextHeightDialogOptions {
  view: ThreeRendererView2d
  initialMode: UITextHeightMode
  initialFontSizePx: number
  initialTextHeightWcs?: number
}

/** Input for {@link uiResolveTextHeightDialogInitials}. */
export interface UITextHeightDialogInitialsInput {
  /** True when a measurement overlay is selected. */
  hasSelection: boolean
  /** Session or selected authoring mode. */
  sessionMode: UITextHeightMode
  /** Screen font size (CSS px) for adaptive / calculator seed. */
  fontSizePx: number
  /** Known world height from the selected overlay, or session custom when idle. */
  selectedTextHeightWcs?: number
  /** View used to derive WCS from {@link fontSizePx} when needed. */
  view: ThreeRendererView2d
}

/**
 * Opens the shared text-height dialog with i18n labels and screen→WCS conversion.
 */
export async function uiOpenTextHeightDialog(
  options: UIOpenTextHeightDialogOptions
): Promise<UITextHeightDialogResult | null> {
  return UITextHeightDialog.open({
    host: options.view.container,
    theme: resolveUiTheme(options.view.container),
    initialMode: options.initialMode,
    initialFontSizePx: options.initialFontSizePx,
    initialTextHeightWcs: options.initialTextHeightWcs,
    screenPxToWcs: px => applicationScreenPxToWcs(px, options.view),
    labels: {
      title: ApplicationI18n.t('main.textHeight.title'),
      close: ApplicationI18n.t('main.textHeight.close'),
      ok: ApplicationI18n.t('main.textHeight.ok'),
      cancel: ApplicationI18n.t('main.textHeight.cancel'),
      adaptive: ApplicationI18n.t('main.textHeight.adaptive'),
      custom: ApplicationI18n.t('main.textHeight.custom'),
      customPlaceholder: ApplicationI18n.t('main.textHeight.customPlaceholder'),
      fromScreen: ApplicationI18n.t('main.textHeight.fromScreen'),
      fromScreenHint: ApplicationI18n.t('main.textHeight.fromScreenHint'),
      screenPxPlaceholder: ApplicationI18n.t('main.textHeight.screenPxPlaceholder'),
      screenUnit: ApplicationI18n.t('main.textHeight.screenUnit'),
      convert: ApplicationI18n.t('main.textHeight.convert')
    }
  })
}

/**
 * Resolves dialog seeds when editing a selection vs the session draw style.
 *
 * Selected overlays always open on Custom with the first element's world
 * height (baking Fit-to-screen size from {@link fontSizePx} when the overlay
 * has no stored WCS). Do not pass the session custom WCS while a selection is
 * active — that would leak draw defaults into the selected element.
 */
export function uiResolveTextHeightDialogInitials(
  input: UITextHeightDialogInitialsInput
): {
  initialMode: UITextHeightMode
  initialFontSizePx: number
  initialTextHeightWcs?: number
} {
  const fontSizePx =
    input.fontSizePx > 0 && Number.isFinite(input.fontSizePx)
      ? input.fontSizePx
      : 13
  if (input.hasSelection) {
    const wcs =
      input.selectedTextHeightWcs != null &&
      input.selectedTextHeightWcs > 0
        ? input.selectedTextHeightWcs
        : applicationScreenPxToWcs(fontSizePx, input.view)
    return {
      initialMode: 'custom',
      initialFontSizePx: Math.max(
        1,
        Math.round(applicationWcsToScreenPx(wcs, input.view))
      ),
      initialTextHeightWcs: wcs
    }
  }
  return {
    initialMode: input.sessionMode,
    initialFontSizePx: fontSizePx,
    initialTextHeightWcs:
      input.sessionMode === 'custom' &&
      input.selectedTextHeightWcs != null &&
      input.selectedTextHeightWcs > 0
        ? input.selectedTextHeightWcs
        : undefined
  }
}

/**
 * Converts a dialog result into fontSize / WCS fields for style application.
 */
export function uiResolveTextHeightPatch(
  view: ThreeRendererView2d,
  result: UITextHeightDialogResult,
  fallbackFontSizePx: number
): {
  textHeightMode: UITextHeightMode
  fontSize: number
  textHeightWcs?: number
} {
  if (result.mode === 'custom' && result.textHeightWcs != null) {
    const fontSize = Math.max(
      1,
      Math.round(applicationWcsToScreenPx(result.textHeightWcs, view))
    )
    return {
      textHeightMode: 'custom',
      fontSize,
      textHeightWcs: result.textHeightWcs
    }
  }
  return {
    textHeightMode: 'adaptive',
    fontSize: fallbackFontSizePx
  }
}
