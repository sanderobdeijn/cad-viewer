import { GraphicsInterfaceSubEntityTraits } from './GraphicsInterfaceSubEntityTraits'

export interface GraphicsInterfaceContextOptions {
  /** Segments a full circle is drawn with; see {@link GraphicsInterfaceContext.circleSides}. */
  circleSides?: number
  /** RGB used when the resolved color is foreground (ACI 7) on a dark background. */
  foregroundOnDark?: number
  /** RGB used when the resolved color is foreground (ACI 7) on a light background. */
  foregroundOnLight?: number
  /** Whether the current draw background is dark. */
  backgroundIsDark?: boolean
  /** Fallback RGB when the resolved color has no concrete RGB value. */
  fallbackRgb?: number
}

/**
 * Draw-time context used to resolve semantic entity colors into pixel RGB values.
 *
 * ACI 7 (foreground / contrast color) depends on the current background, so RGB
 * resolution must happen in the renderer with this context rather than on traits.
 */
export class GraphicsInterfaceContext {
  /**
   * Segments a full circle is drawn with. When unset, tessellation uses the
   * default number of segments.
   */
  circleSides?: number
  /** RGB used when the resolved color is foreground (ACI 7) on a dark background. */
  foregroundOnDark: number
  /** RGB used when the resolved color is foreground (ACI 7) on a light background. */
  foregroundOnLight: number
  /** Whether the current draw background is dark. */
  backgroundIsDark: boolean
  /** Fallback RGB when the resolved color has no concrete RGB value. */
  fallbackRgb?: number

  constructor(options: GraphicsInterfaceContextOptions = {}) {
    this.circleSides = options.circleSides
    this.foregroundOnDark =
      options.foregroundOnDark ?? GRAPHICS_INTERFACE_DARK_THEME_FOREGROUND
    this.foregroundOnLight =
      options.foregroundOnLight ?? GRAPHICS_INTERFACE_LIGHT_THEME_FOREGROUND
    this.backgroundIsDark = options.backgroundIsDark ?? true
    this.fallbackRgb = options.fallbackRgb ?? 0xffffff
  }

  /**
   * Resolves {@link GraphicsInterfaceSubEntityTraits.color} to a pixel RGB value.
   */
  resolveSubEntityTraitsRgb(traits: GraphicsInterfaceSubEntityTraits): number {
    const color = traits.color
    if (color.isForeground) {
      return this.backgroundIsDark
        ? this.foregroundOnDark
        : this.foregroundOnLight
    }
    if (color.isByLayer || color.isByBlock) {
      return this.fallbackRgb ?? 0xffffff
    }
    return color.RGB ?? this.fallbackRgb ?? 0xffffff
  }

  /**
   * Creates a draw-time context from the current canvas background colour.
   */
  static fromBackgroundColor(
    backgroundColor: number = GRAPHICS_INTERFACE_MODEL_SPACE_BACKGROUND
  ): GraphicsInterfaceContext {
    return new GraphicsInterfaceContext({
      foregroundOnDark: GRAPHICS_INTERFACE_DARK_THEME_FOREGROUND,
      foregroundOnLight: GRAPHICS_INTERFACE_LIGHT_THEME_FOREGROUND,
      backgroundIsDark: !graphicsInterfaceIsLightBackground(backgroundColor),
      fallbackRgb: 0xffffff
    })
  }
}

/** AutoCAD model-space default background: RGB(0, 0, 0). */
export const GRAPHICS_INTERFACE_MODEL_SPACE_BACKGROUND = 0x000000

/** ACI-7 foreground on a dark canvas background. */
export const GRAPHICS_INTERFACE_DARK_THEME_FOREGROUND = 0xffffff

/** ACI-7 foreground on a light canvas background. */
export const GRAPHICS_INTERFACE_LIGHT_THEME_FOREGROUND = 0x000000

/** AutoCAD paper-space default background: RGB(255, 255, 255). */
export const GRAPHICS_INTERFACE_PAPER_SPACE_BACKGROUND = 0xffffff

/** ITU-R BT.601 luma threshold used by {@link graphicsInterfaceIsLightBackground}. */
const GRAPHICS_INTERFACE_LIGHT_BACKGROUND_LUMA_THRESHOLD = 128

/** Default draw context matching a dark AutoCAD model-space background. */
export const DEFAULT_ACGI_CONTEXT = new GraphicsInterfaceContext({
  foregroundOnDark: GRAPHICS_INTERFACE_DARK_THEME_FOREGROUND,
  foregroundOnLight: GRAPHICS_INTERFACE_LIGHT_THEME_FOREGROUND,
  backgroundIsDark: true,
  fallbackRgb: 0xffffff
})

/**
 * Whether a packed RGB colour is perceptually light (paper-like).
 */
export function graphicsInterfaceIsLightBackground(color: number): boolean {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  return (
    0.299 * r + 0.587 * g + 0.114 * b > GRAPHICS_INTERFACE_LIGHT_BACKGROUND_LUMA_THRESHOLD
  )
}

/**
 * ACI-7 foreground that contrasts with the canvas background.
 */
export function graphicsInterfaceForegroundColorForBackground(
  backgroundColor: number
): number {
  const context = GraphicsInterfaceContext.fromBackgroundColor(backgroundColor)
  return context.backgroundIsDark
    ? context.foregroundOnDark
    : context.foregroundOnLight
}

/**
 * ACI-7 foreground that contrasts with a light or dark UI theme flag.
 */
export function graphicsInterfaceContrastingForegroundColor(isLight: boolean): number {
  return isLight ? GRAPHICS_INTERFACE_LIGHT_THEME_FOREGROUND : GRAPHICS_INTERFACE_DARK_THEME_FOREGROUND
}

/**
 * Convenience wrapper when only the canvas background is available.
 */
export function graphicsInterfaceResolveSubEntityTraitsRgbFromBackground(
  traits: GraphicsInterfaceSubEntityTraits,
  backgroundColor: number
): number {
  return GraphicsInterfaceContext.fromBackgroundColor(
    backgroundColor
  ).resolveSubEntityTraitsRgb(traits)
}
