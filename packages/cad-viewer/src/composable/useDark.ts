import {
  type ApplicationColorTheme,
  ApplicationSettingManager,
  editorApplyUiTheme} from '@mlightcad/cad-simple-viewer'
import { computed, ref } from 'vue'

const currentTheme = ref<ApplicationColorTheme>('dark')
let isThemeSyncInitialized = false

function applyThemeToDom(theme: ApplicationColorTheme) {
  if (typeof document === 'undefined') return

  const html = document.documentElement
  html.classList.toggle('dark', theme === 'dark')
  // Keep simple-viewer chrome tokens (--ml-ui-*) and theme subscribers in sync.
  editorApplyUiTheme(theme, html)
}

function updateCurrentTheme(theme: ApplicationColorTheme) {
  currentTheme.value = theme
  applyThemeToDom(theme)
}

/** Follows the colour theme setting. */
export function ensureColorThemeSync() {
  if (isThemeSyncInitialized) return
  isThemeSyncInitialized = true

  const settings = ApplicationSettingManager.instance
  updateCurrentTheme(settings.get('colorTheme'))
  settings.events.modified.addEventListener(args => {
    if (args.key === 'colorTheme') {
      updateCurrentTheme(args.value as ApplicationColorTheme)
    }
  })
}

export function setColorTheme(theme: ApplicationColorTheme) {
  updateCurrentTheme(theme)
  ensureColorThemeSync()
  const settings = ApplicationSettingManager.instance
  if (settings.get('colorTheme') !== theme) {
    settings.set('colorTheme', theme)
  }
}

export const isDark = computed<boolean>({
  get: () => currentTheme.value === 'dark',
  set: value => {
    setColorTheme(value ? 'dark' : 'light')
  }
})

export const toggleDark = () => {
  setColorTheme(isDark.value ? 'light' : 'dark')
}

applyThemeToDom(currentTheme.value)
