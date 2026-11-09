import { ApplicationI18n } from '../i18n/ApplicationI18n'

/**
 * Translation function used by notification message formatters.
 *
 * @param key - Locale message key (e.g. `main.message.fetchingDrawingFile`).
 * @param params - Optional `{name}` placeholders to interpolate.
 * @returns Localized string.
 */
export type ApplicationTranslateFn = (
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
export function applicationApplyTemplateParams(
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
 * {@link ApplicationTranslateFn} backed by {@link ApplicationI18n} with `{param}` interpolation.
 *
 * @param key - Locale message key.
 * @param params - Optional placeholders.
 * @returns Localized, interpolated string.
 */
export function applicationI18nTranslate(
  key: string,
  params?: Record<string, string | number>
): string {
  return applicationApplyTemplateParams(ApplicationI18n.t(key), params)
}
