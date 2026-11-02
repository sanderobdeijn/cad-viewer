import {
  computed,
  inject,
  type InjectionKey,
  type MaybeRef,
  provide,
  type Ref,
  ref,
  toValue
} from 'vue'

import { en } from './en'
import type {
  MlLocale,
  MlLocaleId,
  MlLocaleName,
  MlLocalePartial
} from './types'

export { en } from './en'
export type { MlLocale, MlLocaleId, MlLocaleName, MlLocalePartial } from './types'

/** Built-in packs keyed by cad-viewer locale id. */
export const locales: Record<MlLocaleName, MlLocale> = {
  en
}

function canonicalLocaleName(value: string): MlLocaleName | undefined {
  return Object.prototype.hasOwnProperty.call(locales, value)
    ? (value as MlLocaleName)
    : undefined
}

export function isMlLocaleName(value: string): value is MlLocaleId {
  return canonicalLocaleName(value) != null
}

/** Injection key used by {@link provideLocale} / {@link useLocale}. */
export const localeContextKey: InjectionKey<Ref<MlLocale>> = Symbol('mlLocale')

const globalLocale = ref<MlLocale>(en)

export type MlLocaleInput = MlLocaleId | MlLocale | MlLocalePartial

/**
 * Merge a partial locale onto a base pack. Missing keys keep the base value.
 */
export function mergeLocale(base: MlLocale, patch?: MlLocalePartial): MlLocale {
  if (!patch) return base
  return {
    name: patch.name ?? base.name,
    toolPalette: {
      moreMenu: patch.toolPalette?.moreMenu ?? base.toolPalette.moreMenu,
      dock: {
        ...base.toolPalette.dock,
        ...patch.toolPalette?.dock
      }
    },
    overflowTabs: {
      ...base.overflowTabs,
      ...patch.overflowTabs
    }
  }
}

function resolveLocale(locale: MlLocaleInput): MlLocale {
  if (typeof locale === 'string') {
    const name = canonicalLocaleName(locale)
    return name ? locales[name] : en
  }
  return mergeLocale(en, locale)
}

/**
 * Set the global default locale for all components that do not have a
 * nearer {@link provideLocale} in the Vue tree.
 *
 * Accepts the locale id `'en'`, a full pack, or a partial pack merged onto
 * English defaults.
 *
 * @example
 * ```ts
 * import { setLocale } from '@mlightcad/ui-components'
 * setLocale({ overflowTabs: { moreTabs: 'More' } })
 * ```
 */
export function setLocale(locale: MlLocaleInput) {
  globalLocale.value = resolveLocale(locale)
}

/** Current global locale (the fallback used when nothing is provided). */
export function getLocale(): MlLocale {
  return globalLocale.value
}

/**
 * Provide a locale for the current component tree. Must be called
 * synchronously during `setup()` (including `<script setup>`); Vue `provide`
 * does not work outside that context.
 *
 * Accepts a ref or computed so the UI updates when the app language changes.
 *
 * @example
 * ```ts
 * // in setup() or <script setup>
 * const locale = computed(() => i18n.locale.value)
 * provideLocale(locale)
 * ```
 */
export function provideLocale(locale: MaybeRef<MlLocaleInput>) {
  const localeRef = computed(() => resolveLocale(toValue(locale)))
  provide(localeContextKey, localeRef)
  return localeRef
}

/**
 * Resolve the active locale: nearest provided locale, else the global locale.
 */
export function useLocale() {
  const locale = inject(localeContextKey, globalLocale)
  return { locale }
}

export { globalLocale }
