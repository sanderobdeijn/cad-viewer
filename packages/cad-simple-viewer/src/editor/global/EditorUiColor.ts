/**
 * Canvas and drawing-display colours that are independent of {@link EditorUiTheme}.
 *
 * `EditorUiTheme` and the `colorTheme` setting drive chrome tokens (CSS
 * variables). This module holds helpers for the CAD viewport:
 *
 * - **Background** — the `modelBackgroundColor` setting controls the canvas
 *   clear colour and ACI-7 foreground inversion.
 * - **UI colour theme** — `colorTheme` only affects viewer chrome, not
 *   canvas or ACI-7 rendering.
 *
 * Shared colour constants and luminance helpers are defined in
 * `@mlightcad/graphic-interface` (`GraphicsInterfaceContext.ts`) and re-exported here
 * for editor callers.
 */
export {
  GRAPHICS_INTERFACE_DARK_THEME_FOREGROUND,
  GRAPHICS_INTERFACE_LIGHT_THEME_FOREGROUND,
  GRAPHICS_INTERFACE_MODEL_SPACE_BACKGROUND,
  GRAPHICS_INTERFACE_PAPER_SPACE_BACKGROUND,
  graphicsInterfaceContrastingForegroundColor,
  graphicsInterfaceForegroundColorForBackground,
  graphicsInterfaceIsLightBackground
} from '@mlightcad/graphic-interface'

import {
  GRAPHICS_INTERFACE_MODEL_SPACE_BACKGROUND,
  graphicsInterfaceIsLightBackground
} from '@mlightcad/graphic-interface'

import { ApplicationSettingManager } from '../../app/ApplicationSettingManager'

/**
 * Reads the canvas background colour from the settings.
 *
 * @returns Packed 24-bit RGB suitable for the renderer clear colour.
 */
export function readBackgroundColor(): number {
  return ApplicationSettingManager.instance.get('modelBackgroundColor') & 0xffffff
}

/**
 * Returns black for a light background colour and white for a dark one.
 *
 * Used by {@link ApplicationSwitchBgCmd} to flip the background of a space.
 *
 * @param rgb - Current background as packed `0xRRGGBB`.
 * @returns The opposite of black and white, as packed `0xRRGGBB`.
 */
export function toggleBlackWhiteBackgroundColor(rgb: number): number {
  return graphicsInterfaceIsLightBackground(rgb ?? GRAPHICS_INTERFACE_MODEL_SPACE_BACKGROUND)
    ? 0x000000
    : 0xffffff
}

/**
 * Chooses a CSS cursor colour that contrasts with the canvas background.
 *
 * Returns `'black'` on light backgrounds and `'white'` on dark backgrounds so
 * the crosshair and other SVG/CSS cursors remain visible. The decision is
 * delegated to {@link graphicsInterfaceIsLightBackground}.
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
 * @see {@link EditorCursorManager.syncCursorBackground}
 */
export function cursorColorForBackground(
  backgroundColor: number
): 'white' | 'black' {
  return graphicsInterfaceIsLightBackground(backgroundColor) ? 'black' : 'white'
}
