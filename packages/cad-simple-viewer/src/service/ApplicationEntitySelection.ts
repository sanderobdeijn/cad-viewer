import type { ModelItem } from '@mlightcad/geometry-engine'

import { ApplicationContext, ApplicationDocManager } from '../app'
import { EditorPromptSelectionOptions, EditorPromptStatus } from '../editor'
import { ApplicationI18n } from '../i18n'

/**
 * Prompts for a selection and returns entity ids when the user confirms.
 *
 * @param promptKey - I18n `sysCmdPrompt` key for the selection prompt.
 * @returns Selected ids, or `undefined` when the prompt is cancelled or empty.
 */
async function promptForSelectionIds(
  promptKey: string
): Promise<string[] | undefined> {
  const selectionResult = await ApplicationDocManager.instance.editor.getSelection(
    new EditorPromptSelectionOptions(ApplicationI18n.sysCmdPrompt(promptKey))
  )
  if (
    selectionResult.status !== EditorPromptStatus.OK ||
    !selectionResult.value ||
    selectionResult.value.count === 0
  ) {
    return undefined
  }
  return selectionResult.value.ids
}

/**
 * Options for {@link resolveSelectedItems}.
 */
export interface ApplicationResolveSelectedOptions {
  /** I18n `sysCmdPrompt` key used when prompting for a selection. */
  promptKey?: string
  /** When `true`, empty selection clears the selection set. Default `true`. */
  clearOnEmpty?: boolean
}

/**
 * Result of resolving selected items from preselection or a prompt.
 */
export interface ApplicationResolveSelectedResult {
  /** Resolved items. */
  items: ModelItem[]
  /** Ids of `items`. */
  ids: string[]
}

/**
 * Resolves selected items from preselection or an interactive prompt.
 *
 * @param context - Application context with view, document, and editor access.
 * @param options - Prompt and empty-selection behavior.
 * @returns Resolved items and ids, or `undefined` when nothing is selected.
 */
export async function resolveSelectedItems(
  context: ApplicationContext,
  options: ApplicationResolveSelectedOptions = {}
): Promise<ApplicationResolveSelectedResult | undefined> {
  const selectionSet = context.view.selectionSet
  const clearOnEmpty = options.clearOnEmpty ?? true

  let selectionIds: string[] | undefined
  if (selectionSet.count > 0) {
    selectionIds = selectionSet.ids
  } else if (options.promptKey) {
    selectionIds = await promptForSelectionIds(options.promptKey)
  }

  if (!selectionIds || selectionIds.length === 0) return undefined

  const items: ModelItem[] = []
  const ids: string[] = []
  for (const id of selectionIds) {
    const item = context.doc.modelSync.item(id)
    if (item) {
      items.push(item)
      ids.push(id)
    }
  }

  if (items.length === 0) {
    if (clearOnEmpty) selectionSet.clear()
    return undefined
  }

  return { items, ids }
}

/**
 * Resolves entity ids from selection, supporting erase-style preselection handling.
 *
 * Uses the active selection set when non-empty; otherwise prompts with `promptKey`.
 *
 * @param context - Application context with view, document, and editor access.
 * @param promptKey - I18n `sysCmdPrompt` key for the selection prompt.
 * @returns Resolved entity ids, or `undefined` when nothing is selected.
 */
export async function resolveSelectedIds(
  context: ApplicationContext,
  promptKey: string
): Promise<string[] | undefined> {
  const selectionSet = context.view.selectionSet

  if (selectionSet.count > 0) {
    return selectionSet.ids
  }

  const selectionIds = await promptForSelectionIds(promptKey)
  return selectionIds && selectionIds.length > 0 ? selectionIds : undefined
}
