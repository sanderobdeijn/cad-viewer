/**
 * Canvas and drawing-display colours that are independent of {@link AcEdUiTheme}.
 *
 * `AcEdUiTheme` and the `colorTheme` setting drive chrome tokens (CSS
 * variables). This module holds helpers for the CAD viewport:
 *
 * - **Background** — the `modelBackgroundColor` setting controls the canvas
 *   clear colour and ACI-7 foreground inversion.
 * - **UI colour theme** — `colorTheme` only affects viewer chrome, not
 *   canvas or ACI-7 rendering.
 *
 * Shared colour constants and luminance helpers are defined in
 * `@mlightcad/graphic-interface` (`AcGiContext.ts`) and re-exported here
 * for editor callers.
 */
export {
  ACGI_DARK_THEME_FOREGROUND,
  ACGI_LIGHT_THEME_FOREGROUND,
  ACGI_MODEL_SPACE_BACKGROUND,
  ACGI_PAPER_SPACE_BACKGROUND,
  acgiContrastingForegroundColor,
  acgiForegroundColorForBackground,
  acgiIsLightBackground
} from '@mlightcad/graphic-interface'

import {
  ACGI_MODEL_SPACE_BACKGROUND,
  acgiIsLightBackground
} from '@mlightcad/graphic-interface'

import { AcApSettingManager } from '../../app/AcApSettingManager'

/**
 * Reads the canvas background colour from the settings.
 *
 * @returns Packed 24-bit RGB suitable for the renderer clear colour.
 */
export function readBackgroundColor(): number {
  return AcApSettingManager.instance.get('modelBackgroundColor') & 0xffffff
}

/**
 * Returns black for a light background colour and white for a dark one.
 *
 * Used by {@link AcApSwitchBgCmd} to flip the background of a space.
 *
 * @param rgb - Current background as packed `0xRRGGBB`.
 * @returns The opposite of black and white, as packed `0xRRGGBB`.
 */
export function toggleBlackWhiteBackgroundColor(rgb: number): number {
  return acgiIsLightBackground(rgb ?? ACGI_MODEL_SPACE_BACKGROUND)
    ? 0x000000
    : 0xffffff
}

/**
 * Chooses a CSS cursor colour that contrasts with the canvas background.
 *
 * Returns `'black'` on light backgrounds and `'white'` on dark backgrounds so
 * the crosshair and other SVG/CSS cursors remain visible. The decision is
 * delegated to {@link acgiIsLightBackground}.
 *
 * @param backgroundColor - Current renderer clear colour as packed
 *   `0xRRGGBB` RGB.
 * @returns `'black'` or `'white'` for use as a CSS colour keyword.
 *
 * @example
 * ```typescript
 * const cursor = cursorColorForBackground(view.backgroundColor)
 * editor.setCursorColor(cursor)
 * ```
 *
 * @see {@link AcEdCursorManager.syncCursorBackground}
 */
export function cursorColorForBackground(
  backgroundColor: number
): 'white' | 'black' {
  return acgiIsLightBackground(backgroundColor) ? 'black' : 'white'
}
