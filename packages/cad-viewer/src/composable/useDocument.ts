import {
  APPLICATION_UNTITLED_DOC_TITLE,
  ApplicationDocManager,
  ApplicationDocument,
  ApplicationDocumentEventArgs,
  EditorOpenMode
} from '@mlightcad/cad-simple-viewer'
import {
  computed,
  type ComputedRef,
  type DeepReadonly,
  onMounted,
  readonly,
  type Ref,
  ref
} from 'vue'

import { i18n } from '../locale'

/**
 * Reactive view of the active CAD document and its open lifecycle.
 *
 * Returned by {@link useDocument}. All refs are shared module singletons, so
 * every caller observes the same document state.
 */
export interface UseDocumentReturn {
  /**
   * Whether a document open operation is currently in progress.
   *
   * Becomes `true` when {@link ApplicationDocManager.events.documentToBeOpened} fires
   * or when {@link beginDocumentOpening} is called manually, and becomes
   * `false` when the document is activated, opening fails, or
   * {@link endDocumentOpening} is called manually.
   */
  isDocumentOpening: DeepReadonly<Ref<boolean>>

  /**
   * Current or pending document access mode.
   *
   * During an open request this reflects the mode carried by
   * {@link ApplicationDocumentEventArgs.mode} from `documentToBeOpened`. After
   * activation it mirrors {@link ApplicationDocument.openMode}.
   */
  openMode: DeepReadonly<Ref<EditorOpenMode>>

  /**
   * File name of the active document.
   *
   * Mirrors {@link ApplicationDocument.fileName}. Empty for a new untitled document
   * that has not been saved or opened from disk.
   */
  fileName: DeepReadonly<Ref<string>>

  /**
   * Display title of the active document.
   *
   * Mirrors {@link ApplicationDocument.docTitle}. For a new document this is
   * {@link APPLICATION_UNTITLED_DOC_TITLE} until a file is opened.
   */
  docTitle: DeepReadonly<Ref<string>>

  /**
   * User-facing document label for UI display.
   *
   * Resolves to {@link docTitle} when present, otherwise falls back to
   * {@link fileName}. When the document is unsaved, localizes
   * {@link APPLICATION_UNTITLED_DOC_TITLE} via `main.document.untitled`.
   */
  displayName: ComputedRef<string>

  /**
   * Marks the viewer as entering a document open operation.
   *
   * Prefer relying on {@link ApplicationDocManager.events.documentToBeOpened} when
   * possible. Call this manually only for open flows that bypass the manager
   * events but still need UI affordances such as disabling the ribbon.
   */
  beginDocumentOpening: () => void

  /**
   * Marks the viewer as leaving a document open operation.
   *
   * Prefer relying on {@link ApplicationDocManager.events.documentActivated} or the
   * `failed-to-open-file` event. Call this manually to pair with
   * {@link beginDocumentOpening} in custom open handlers.
   */
  endDocumentOpening: () => void

}

/** Shared flag indicating whether a document open operation is in progress. */
const isDocumentOpening = ref(false)

/** Shared current or pending document access mode. */
const openMode = ref<EditorOpenMode>(EditorOpenMode.Read)

/** Shared active document file name sourced from {@link ApplicationDocument.fileName}. */
const fileName = ref('')

/** Shared active document title sourced from {@link ApplicationDocument.docTitle}. */
const docTitle = ref('')

/**
 * Resolves the user-facing document label from raw title and file name.
 *
 * @param title - {@link ApplicationDocument.docTitle}
 * @param name - {@link ApplicationDocument.fileName}
 */
function resolveDisplayName(title: string, name: string): string {
  if (title === APPLICATION_UNTITLED_DOC_TITLE && !name) {
    return i18n.global.t('main.document.untitled')
  }
  return title || name
}

/** Shared computed label for UI surfaces that show the current document name. */
const displayName = computed(() => {
  void i18n.global.locale.value
  return resolveDisplayName(docTitle.value, fileName.value)
})

/** Structured error code from the latest failed open attempt. */

/** Whether lifecycle listeners have already been attached to the doc manager. */
let isBound = false

/** Manager instance that {@link isBound} listeners are attached to. */
let boundManager: ApplicationDocManager | null = null

/** Polling timer used while waiting for {@link ApplicationDocManager.instance}. */
let retryTimer: ReturnType<typeof setInterval> | undefined

/**
 * Returns the existing {@link ApplicationDocManager} singleton without throwing.
 *
 * Useful before the viewer finishes initialization, when
 * {@link ApplicationDocManager.instance} is not yet available.
 *
 * @returns The initialized manager, or `null` when the viewer has not been created
 */
function getExistingDocManager(): ApplicationDocManager | null {
  const singleton = ApplicationDocManager as unknown as {
    _instance?: ApplicationDocManager
  }
  return singleton._instance ?? null
}

/**
 * Copies document metadata from {@link ApplicationDocument} into the shared reactive refs.
 *
 * @param doc - Document to read from. When omitted, the currently active
 *   document from {@link ApplicationDocManager.curDocument} is used.
 */
function syncFromDocument(doc?: ApplicationDocument) {
  const document = doc ?? getExistingDocManager()?.curDocument
  if (!document) return

  openMode.value = document.openMode
  fileName.value = document.fileName
  docTitle.value = document.docTitle
}

/**
 * Sets {@link isDocumentOpening} to `true`.
 */
function beginDocumentOpening() {
  isDocumentOpening.value = true
}

/**
 * Sets {@link isDocumentOpening} to `false`.
 */
function endDocumentOpening() {
  isDocumentOpening.value = false
}

/**
 * Handles {@link ApplicationDocManager.events.documentToBeOpened}.
 *
 * Starts the opening state early and applies the requested open mode from the
 * event payload so UI can react before activation completes.
 *
 * @param args - Document lifecycle event arguments emitted by the manager
 */
function onDocumentToBeOpened(args: ApplicationDocumentEventArgs) {
  beginDocumentOpening()
  openMode.value = args.mode
}

/**
 * Handles {@link ApplicationDocManager.events.documentActivated}.
 *
 * Ends the opening state and synchronizes file name, title, and open mode
 * from the activated document.
 *
 * @param args - Document lifecycle event arguments emitted by the manager
 */
function onDocumentActivated(args: ApplicationDocumentEventArgs) {
  endDocumentOpening()
  syncFromDocument(args.doc)
}

/**
 * Stops the retry timer used while waiting for viewer initialization.
 */
function stopRetryTimer() {
  if (!retryTimer) return
  clearInterval(retryTimer)
  retryTimer = undefined
}

/**
 * Removes lifecycle listeners from the currently bound manager.
 */
function unbind() {
  if (!boundManager) return

  boundManager.events.documentToBeOpened.removeEventListener(
    onDocumentToBeOpened
  )
  boundManager.events.documentActivated.removeEventListener(onDocumentActivated)
  isBound = false
  boundManager = null
}

/**
 * Attempts to connect lifecycle listeners to {@link ApplicationDocManager.instance}.
 *
 * On success, the current document state is synchronized immediately and
 * listeners are registered for future open, activation, and failure events.
 *
 * @returns `true` when binding succeeded; otherwise `false`
 */
function tryBind() {
  const manager = getExistingDocManager()

  if (isBound && (!manager || boundManager !== manager)) {
    unbind()
  }

  if (!manager) return false
  if (isBound) {
    syncFromDocument(manager.curDocument)
    return true
  }

  try {
    syncFromDocument(manager.curDocument)
    manager.events.documentToBeOpened.addEventListener(onDocumentToBeOpened)
    manager.events.documentActivated.addEventListener(onDocumentActivated)
    boundManager = manager
    isBound = true
    stopRetryTimer()
    return true
  } catch {
    return false
  }
}

/**
 * Ensures lifecycle listeners are bound, polling until the viewer exists.
 *
 * This is invoked synchronously from {@link useDocument} and again on mount
 * for components created before {@link ApplicationDocManager.createInstance}.
 */
function ensureBound() {
  if (tryBind() || retryTimer) return

  retryTimer = setInterval(() => {
    tryBind()
  }, 50)
}

/**
 * Tracks the active CAD document and its open lifecycle for UI consumers.
 *
 * This composable centralizes reactive document metadata from
 * {@link ApplicationDocManager} and {@link ApplicationDocument}, including:
 * - Current or pending document open mode
 * - Whether a document open operation is in progress
 * - Current document file name and display title
 *
 * Behavior:
 * - Initializes from the currently active document once the viewer exists
 * - Retries binding after mount when the viewer has not been created yet
 * - Updates {@link openMode} as soon as `documentToBeOpened` fires
 * - Synchronizes {@link fileName}, {@link docTitle}, and {@link openMode}
 *   when `documentActivated` fires
 *
 * @returns Shared reactive document state and manual open-state helpers
 */
export function useDocument(): UseDocumentReturn {
  ensureBound()

  onMounted(() => {
    ensureBound()
  })

  return {
    isDocumentOpening: readonly(isDocumentOpening),
    openMode: readonly(openMode),
    fileName: readonly(fileName),
    docTitle: readonly(docTitle),
    displayName,
    beginDocumentOpening,
    endDocumentOpening,
  }
}
