import { ApplicationFontUtil } from './ApplicationFontUtil'
import { applicationI18nTranslate, type ApplicationTranslateFn } from './ApplicationI18nTranslate'

/**
 * Formats one missing font with its replacement name for notification text.
 *
 * @param t - Translation function (key + `{param}` interpolation).
 * @param fontName - Missing font face name.
 * @returns Localized string naming the font and its replacement.
 */
export function applicationResolveFontMissedReplacement(
  t: ApplicationTranslateFn,
  fontName: string
): string {
  return t('main.message.fontMissedReplacement', {
    font: fontName,
    replacement: ApplicationFontUtil.getReplacementFontName(fontName)
  })
}

/**
 * Formats several missing fonts with replacement names.
 *
 * @param t - Translation function (key + `{param}` interpolation).
 * @param fontNames - Missing font face names.
 * @returns Comma-separated localized replacement strings.
 */
export function applicationResolveFontsMissedReplacement(
  t: ApplicationTranslateFn,
  fontNames: string[]
): string {
  return fontNames
    .map(fontName => applicationResolveFontMissedReplacement(t, fontName))
    .join(', ')
}

/**
 * Formats several missing fonts with replacement using {@link ApplicationI18n}.
 *
 * @param fontNames - Missing font face names.
 * @returns Comma-separated localized replacement strings.
 */
export function applicationFormatFontsMissedReplacement(fontNames: string[]): string {
  return applicationResolveFontsMissedReplacement(applicationI18nTranslate, fontNames)
}
