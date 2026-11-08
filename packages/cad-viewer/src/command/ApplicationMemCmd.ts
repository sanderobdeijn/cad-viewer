import {
  ApplicationContext,
  ApplicationI18n,
  ApplicationMemoryProfiler,
  EditorCommand,
  ThreeRendererView2d
} from '@mlightcad/cad-simple-viewer'

import { store } from '../app'
import { publishMemorySnapshot } from '../composable/useMemoryProfile'

/**
 * Opens the Memory profiling palette for diagnosing drawing memory usage.
 *
 * Collects the snapshot under the application busy overlay before opening the
 * palette so the spinner stays visible for the expensive work.
 */
export class ApplicationMemCmd extends EditorCommand {
  async execute(context: ApplicationContext) {
    const snapshot = await this.withBusyIndicator(
      () => ApplicationMemoryProfiler.collect(context.view as ThreeRendererView2d),
      ApplicationI18n.t('main.message.collectingMemoryProfile')
    )

    publishMemorySnapshot(snapshot)
    store.memoryProfileTick++
    store.dialogs.activePaletteTab = 'memoryProfile'
    store.dialogs.toolPalette = true
  }
}
