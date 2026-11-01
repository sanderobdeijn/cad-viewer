import {
  AcApDocManager,
  AcApSettingManager,
  eventBus
} from '@mlightcad/cad-simple-viewer'
import { reactive } from 'vue'

/**
 * Missed Data Composable
 *
 * Tracks fonts that the current drawing references but that are missing. State
 * is shared module-wide so every caller sees the same reactive map (status-bar
 * warning, Resources palette).
 */

/**
 * Reactive state returned by {@link useMissedData}.
 */
export interface UseMissedDataReturn {
  fonts: Map<string, string>
}

const fontMapping = reactive(new Map<string, string>())

let initialized = false

function syncFromCurrentView(): void {
  try {
    const view = AcApDocManager.instance?.curView
    if (!view) return

    const storedFontMapping = AcApSettingManager.instance.fontMapping

    fontMapping.clear()
    for (const missedFont of Object.keys(view.missedData.fonts ?? {})) {
      fontMapping.set(missedFont, storedFontMapping[missedFont] ?? '')
    }
  } catch {
    // Viewer may not be fully initialized yet; keep previous state.
  }
}

function ensureInitialized(): void {
  if (initialized) return
  initialized = true

  AcApDocManager.instance.events.documentActivated.addEventListener(() => {
    fontMapping.clear()
    syncFromCurrentView()
    // Refresh notification center (font-missed) for the newly active document.
    eventBus.emit('missed-data-changed', {})
  })

  eventBus.on('font-not-found', () => {
    syncFromCurrentView()
  })

  eventBus.on('missed-data-changed', () => {
    syncFromCurrentView()
  })

  syncFromCurrentView()
}

/**
 * Access shared reactive state for missing fonts.
 */
export function useMissedData(): UseMissedDataReturn {
  ensureInitialized()

  return {
    fonts: fontMapping
  }
}
