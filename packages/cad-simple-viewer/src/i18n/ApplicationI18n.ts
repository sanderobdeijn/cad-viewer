import { CommonEventManager } from '@mlightcad/common'

import { EditorCommandStack } from '../editor/command/EditorCommandStack'

/**
 * Language/locale id used in the application.
 * Matches the naming style used by vue-i18n ("Locale").
 */
export type ApplicationLocale = 'en'

/**
 * A single locale message tree.
 * Leaf values are strings, inner nodes are nested objects of the same shape.
 * This mirrors vue-i18n's LocaleMessage structure.
 */
export interface ApplicationLocaleMessage {
  [key: string]: string | ApplicationLocaleMessage
}

/**
 * The whole messages map: locale -> locale message tree.
 * This mirrors vue-i18n's "LocaleMessages".
 */
export type ApplicationLocaleMessages = Record<ApplicationLocale, ApplicationLocaleMessage>

/**
 * Options for translation lookup.
 */
export interface ApplicationTranslateOptions {
  fallback?: string
}

/**
 * Event arguments for locale changed events.
 */
export interface ApplicationLocaleChangedEventArgs {
  /** The old locale value */
  old: ApplicationLocale
  /** The new locale value */
  new: ApplicationLocale
}

/**
 * A framework-agnostic i18n registry with vue-i18n-like API names.
 *
 * Key methods:
 * - getLocaleMessages(): returns all messages (for vue-i18n { messages })
 * - getLocaleMessage(locale): returns single locale messages
 * - setLocaleMessage(locale, messages): replace locale messages
 * - mergeLocaleMessage(locale, messages): deep-merge into existing locale (fixed)
 * - t(locale, key, options): translation helper for core code (no Vue required)
 */
export class ApplicationI18n {
  private static _messages: ApplicationLocaleMessages = {
    en: {}
  }

  /**
   * @private
   *
   * Stores the currently active locale used by the translation
   * system. Defaults to `"en"`.
   *
   * This value is used by `t(key, options)` when no locale
   * parameter is provided.
   */
  private static _currentLocale: ApplicationLocale = 'en'

  /**
   * Return the whole messages map (for vue-i18n initialisation).
   */
  public static get messages(): Readonly<ApplicationLocaleMessages> {
    return this._messages
  }

  /** Supported events */
  public static readonly events = {
    /** Fired when locale changed */
    localeChanged: new CommonEventManager<ApplicationLocaleChangedEventArgs>()
  }

  /**
   * Return the messages object for a single locale.
   */
  public static getLocaleMessage(
    locale: ApplicationLocale
  ): Readonly<ApplicationLocaleMessage> {
    return this._messages[locale]
  }

  /**
   * Deep-merge a message dictionary into an existing locale.
   */
  public static mergeLocaleMessage<L extends ApplicationLocale>(
    locale: L,
    messages: ApplicationLocaleMessage
  ): void {
    deepMerge(this._messages[locale], messages)
  }

  /**
   * Register a plugin's messages.
   * Alias for mergeLocaleMessage for consistency with vue-i18n.
   */
  public static registerMessage<L extends ApplicationLocale>(
    locale: L,
    messages: ApplicationLocaleMessage
  ): void {
    this.mergeLocaleMessage(locale, messages)
  }

  /**
   * Set the current active locale for translation.
   *
   * @param locale - Locale to activate (`"en"`)
   *
   * @remarks
   * This method updates the internal locale state used by all
   * future calls to `t(key, options)`. After calling this method,
   * {@link ApplicationI18n.events.localeChanged} fires so hosts (e.g. vue-i18n)
   * can sync. Calling with the already-active locale is a no-op.
   *
   * @example
   * ```ts
   * ApplicationI18n.setCurrentLocale('en')
   * console.log(ApplicationI18n.t('core.start'))   // uses Chinese messages
   * ```
   */
  public static setCurrentLocale(locale: ApplicationLocale): void {
    if (this._currentLocale === locale) return
    const old = this._currentLocale
    this._currentLocale = locale
    this.events.localeChanged.dispatch({ old, new: this._currentLocale })
  }

  /**
   * Get the currently active locale.
   *
   * @returns The locale currently used for translation.
   *
   * @example
   * ```ts
   * console.log(ApplicationI18n.currentLocale)  // "en"
   * ```
   */
  public static get currentLocale(): ApplicationLocale {
    return this._currentLocale
  }

  /**
   * Translate a dotted key path using the registry (no Vue required).
   *
   * @param key - dotted path, e.g. "core.start" or "pluginX.button.ok"
   * @param options - optional fallback
   * @returns translated string or fallback/key if not found
   */
  public static t(key: string, options?: ApplicationTranslateOptions): string {
    const locale = this._currentLocale
    const root = this._messages[locale]
    const parts = key.split('.')
    let cur = root

    for (const part of parts) {
      if (!cur || typeof cur !== 'object') {
        return options?.fallback ?? key
      }
      cur = cur[part] as ApplicationLocaleMessage
    }

    return typeof cur === 'string' ? cur : (options?.fallback ?? key)
  }

  /**
   * Build a dotted localization key for a command message entry.
   *
   * @param groupName - Command group name (e.g. `"ACAD"`, `"USER"`)
   * @param cmdName - Global command name
   * @param key - Message key under the command entry
   * @returns dotted path, e.g. `"command.ACAD.zoom.description"`
   */
  public static cmdKey(
    groupName: string,
    cmdName: string,
    key: string
  ): string {
    return `command.${groupName}.${cmdName.toLowerCase()}.${key}`
  }

  /**
   * Get a localized command message by group, command name, and key.
   *
   * @param groupName - Command group name
   * @param cmdName - Global command name
   * @param key - Message key under the command entry
   * @returns localized string
   */
  public static cmd(groupName: string, cmdName: string, key: string): string {
    return this.t(this.cmdKey(groupName, cmdName, key))
  }

  /**
   * Get localized command description
   * @param groupName - Command group name
   * @param cmdName - Global command name
   * @returns - The localized command description.
   */
  public static cmdDescription(groupName: string, cmdName: string) {
    return this.cmd(groupName, cmdName, 'description')
  }

  /**
   * Get localized command prommpt message
   * @param groupName - Command group name
   * @param cmdName - Global command name
   * @returns - The localized command prompt message.
   */
  public static cmdPrompt(groupName: string, cmdName: string) {
    return this.cmd(groupName, cmdName, 'prompt')
  }

  /**
   * Get a localized message for a system-group command entry.
   *
   * @param cmdName - Global command name
   * @param key - Message key under the command entry
   * @returns localized string
   */
  public static sysCmd(cmdName: string, key: string): string {
    return this.cmd(EditorCommandStack.SYSTEMT_COMMAND_GROUP_NAME, cmdName, key)
  }

  /**
   * Build the localization key for a system-group command message entry.
   */
  public static sysCmdKey(cmdName: string, key: string): string {
    return this.cmdKey(
      EditorCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      cmdName,
      key
    )
  }

  /**
   * Get a localized message for a user-group command entry.
   *
   * @param cmdName - Global command name
   * @param key - Message key under the command entry
   * @returns localized string
   */
  public static userCmd(cmdName: string, key: string): string {
    return this.cmd(EditorCommandStack.DEFAUT_COMMAND_GROUP_NAME, cmdName, key)
  }

  /**
   * Build the localization key for a user-group command message entry.
   */
  public static userCmdKey(cmdName: string, key: string): string {
    return this.cmdKey(EditorCommandStack.DEFAUT_COMMAND_GROUP_NAME, cmdName, key)
  }

  /**
   * Tries to find command in system group and gets its localized command description
   * @param cmdName - Global command name
   * @returns - The localized command description
   */
  public static sysCmdDescription(name: string) {
    return this.cmdDescription(
      EditorCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
      name
    )
  }

  /**
   * Tries to find command in user group and gets its localized command description
   * @param cmdName - Global command name
   * @returns - The localized command description
   */
  public static userCmdDescription = (name: string) => {
    return this.cmdDescription(EditorCommandStack.DEFAUT_COMMAND_GROUP_NAME, name)
  }

  /**
   * Tries to find command in system group and gets its localized command prompt message
   * @param cmdName - Global command name
   * @returns - The localized command prompt message
   */
  public static sysCmdPrompt(name: string) {
    return this.cmdPrompt(EditorCommandStack.SYSTEMT_COMMAND_GROUP_NAME, name)
  }

  /**
   * Tries to find command in user group and gets its localized command prompt message
   * @param cmdName - Global command name
   * @returns - The localized command prompt message
   */
  public static userCmdPrompt = (name: string) => {
    return this.cmdPrompt(EditorCommandStack.DEFAUT_COMMAND_GROUP_NAME, name)
  }
}

/**
 * Utility: deep merge two LocaleMessage objects.
 * - Returns a new object (immutability-friendly).
 * - If both values are plain objects, merge recursively.
 * - Otherwise prefer `source`'s value.
 */
function deepMerge(target: ApplicationLocaleMessage, source: ApplicationLocaleMessage) {
  for (const key of Object.keys(source)) {
    const src = source[key]
    const tgt = target[key]

    if (isObject(tgt) && isObject(src)) {
      deepMerge(tgt, src)
    } else {
      target[key] = src
    }
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
