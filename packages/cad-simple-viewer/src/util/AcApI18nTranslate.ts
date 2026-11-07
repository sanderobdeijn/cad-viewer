import { AcApI18n } from '../i18n/AcApI18n'

/**
 * Translation function used by notification message formatters.
 *
 * @param key - Locale message key (e.g. `main.message.fontsNotFound`).
 * @param params - Optional `{name}` placeholders to interpolate.
 * @returns Localized string.
 */
export type AcApTranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string

/**
 * Applies `{name}` placeholders in a locale template string.
 *
 * @param template - Template containing `{param}` tokens.
 * @param params - Values to substitute for each token.
 * @returns Interpolated string (unchanged when `params` is omitted).
 */
export function acapApplyTemplateParams(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template
  let text = template
  for (const [key, value] of Object.entries(params)) {
    text = text.split(`{${key}}`).join(String(value))
  }
  return text
}

/**
 * {@link AcApTranslateFn} backed by {@link AcApI18n} with `{param}` interpolation.
 *
 * @param key - Locale message key.
 * @param params - Optional placeholders.
 * @returns Localized, interpolated string.
 */
export function acapI18nTranslate(
  key: string,
  params?: Record<string, string | number>
): string {
  return acapApplyTemplateParams(AcApI18n.t(key), params)
}
