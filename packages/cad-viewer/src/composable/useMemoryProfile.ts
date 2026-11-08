import {
  ApplicationDocManager,
  ApplicationMemoryProfiler,
  type ApplicationMemorySnapshot,
  formatMemoryBytes,
  ThreeRendererView2d} from '@mlightcad/cad-simple-viewer'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDocument } from './useDocument'

export { formatMemoryBytes }
export type { ApplicationMemorySnapshot }

/** Latest snapshot produced by the MEM command (consumed when the palette mounts). */
let pendingSnapshot: ApplicationMemorySnapshot | null = null

/**
 * Stores a snapshot collected by {@link ApplicationMemCmd} for the palette to pick up.
 */
export function publishMemorySnapshot(snapshot: ApplicationMemorySnapshot): void {
  pendingSnapshot = snapshot
}

/**
 * Takes any snapshot published by the MEM command (one-shot).
 */
export function takePublishedMemorySnapshot(): ApplicationMemorySnapshot | null {
  const snapshot = pendingSnapshot
  pendingSnapshot = null
  return snapshot
}

/**
 * Collects and holds the current drawing memory snapshot for the Memory palette.
 */
export function useMemoryProfile() {
  const { t } = useI18n()
  const { fileName, docTitle } = useDocument()
  const snapshot = ref<ApplicationMemorySnapshot | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const collectedAtLabel = computed(() => {
    if (!snapshot.value) return ''
    return new Date(snapshot.value.collectedAt).toLocaleTimeString()
  })

  const summaryRows = computed(() => snapshot.value?.summary ?? [])

  const maxSummaryBytes = computed(() => {
    let max = 0
    for (const row of summaryRows.value) {
      if (row.id === 'heap') continue
      if (row.bytes > max) max = row.bytes
    }
    return max || 1
  })

  const collectNow = async (): Promise<ApplicationMemorySnapshot> => {
    const docManager = ApplicationDocManager.instance
    const view = docManager.curView as ThreeRendererView2d
    return ApplicationMemoryProfiler.collect(view)
  }

  /**
   * Adopts a command-published snapshot when one is pending.
   *
   * @returns `true` when a published snapshot was applied
   */
  const adoptPublishedSnapshot = (): boolean => {
    const published = takePublishedMemorySnapshot()
    if (!published) return false
    snapshot.value = published
    error.value = null
    return true
  }

  const refresh = async () => {
    if (loading.value) return
    loading.value = true
    error.value = null
    try {
      snapshot.value = await ApplicationDocManager.instance.withBusyIndicator(
        () => collectNow(),
        t('main.toolPalette.memoryProfile.collecting')
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      snapshot.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * Applies a command-published snapshot when present; otherwise collects one.
   */
  const hydrateOrRefresh = async () => {
    if (adoptPublishedSnapshot()) return
    await refresh()
  }

  return {
    snapshot,
    loading,
    error,
    collectedAtLabel,
    summaryRows,
    maxSummaryBytes,
    fileName,
    docTitle,
    refresh,
    adoptPublishedSnapshot,
    hydrateOrRefresh,
    formatMemoryBytes
  }
}
