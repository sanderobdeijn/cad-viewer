import { AcCmColor, AcCmColorMethod } from '@mlightcad/common'

import {
  AcApSettingManager,
  type AcApSettings
} from '../../app/AcApSettingManager'

/** CSS custom property for grip square edge length (`GRIPSIZE`). */
export const ML_UI_GRIP_SIZE_VAR = '--ml-ui-grip-size'
/** CSS custom property for idle grip fill (`GRIPCOLOR`). */
export const ML_UI_GRIP_NORMAL_VAR = '--ml-ui-grip-normal'
/** CSS custom property for hover / hot grip fill (`GRIPHOT`). */
export const ML_UI_GRIP_HOT_VAR = '--ml-ui-grip-hot'

/** Fallback grip size in CSS pixels when `GRIPSIZE` is unavailable. */
export const DEFAULT_GRIP_SIZE_PX = 8

/** Visual appearance of grip handles derived from the grip settings. */
export interface AcEdGripAppearance {
  /** Grip square edge length in CSS pixels (`GRIPSIZE`). */
  size: number
  /** CSS color for unheated grips (`GRIPCOLOR`). */
  colorCss: string
  /** CSS color for hot / hovered grips (`GRIPHOT`). */
  hotColorCss: string
}

/**
 * Writes CAD entity square-grip appearance onto a host so `.ml-grip-handle`
 * inherits `GRIPSIZE` / `GRIPCOLOR` / `GRIPHOT`. Overlay measure
 * endpoint circles keep their own colored-dot styling and ignore these vars.
 */
export function applyGripAppearanceToHost(
  host: HTMLElement,
  appearance: AcEdGripAppearance
): void {
  host.style.setProperty(ML_UI_GRIP_SIZE_VAR, `${appearance.size}px`)
  host.style.setProperty(ML_UI_GRIP_NORMAL_VAR, appearance.colorCss)
  host.style.setProperty(ML_UI_GRIP_HOT_VAR, appearance.hotColorCss)
}

function aciIndexToCss(index: number): string {
  const color = new AcCmColor(AcCmColorMethod.ByACI, index)
  return color.cssColor ?? `rgb(${color.red}, ${color.green}, ${color.blue})`
}

/**
 * Reads grip appearance from the grip size and colour settings.
 */
export function readGripAppearance(): AcEdGripAppearance {
  const settings = AcApSettingManager.instance
  const size = settings.get('gripSize')

  return {
    size: size > 0 && Number.isFinite(size) ? size : DEFAULT_GRIP_SIZE_PX,
    colorCss: aciIndexToCss(settings.get('gripColor')),
    hotColorCss: aciIndexToCss(settings.get('gripHotColor'))
  }
}

/** Settings that affect grip handle appearance. */
export const GRIP_APPEARANCE_SETTINGS = new Set<keyof AcApSettings>([
  'gripSize',
  'gripColor',
  'gripHotColor'
])

export function isGripAppearanceSetting(key: keyof AcApSettings): boolean {
  return GRIP_APPEARANCE_SETTINGS.has(key)
}
