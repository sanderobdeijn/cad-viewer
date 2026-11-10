import { CommonEventManager, log } from '@mlightcad/common'

import {
  ApplicationArcCmd,
  ApplicationCircleCmd,
  ApplicationCopyCmd,
  ApplicationDimLinearCmd,
  ApplicationEllipseCmd,
  ApplicationEraseCmd,
  ApplicationHideObjectsCmd,
  ApplicationLineCmd,
  ApplicationLoadExampleCmd,
  ApplicationMoveCmd,
  ApplicationOffsetCmd,
  ApplicationPanCmd,
  ApplicationPointCmd,
  ApplicationPolygonCmd,
  ApplicationPolylineCmd,
  ApplicationQNewCmd,
  ApplicationRectCmd,
  ApplicationRegenCmd,
  ApplicationRotateCmd,
  ApplicationSelectCmd,
  ApplicationSwitchBgCmd,
  ApplicationSysVarCmd,
  ApplicationUnisolateObjectsCmd,
  ApplicationZoomCmd,
  resetMeasurementSession
} from '../command'
import { registerMeasureCommands } from '../command/measure/ApplicationRegisterMeasureCommands'
import {
  EditorCalculateSizeCallback,
  EditorCommand,
  EditorCommandStack,
  EditorOpenMode
} from '../editor'
import { APPLICATION_MODEL_SPACE_ID } from '../model/ApplicationItemDrawable'
import { isScriptQuitCommand, parseScriptLines } from '../util/ApplicationScriptParser'
import { ThreeRendererView2d } from '../view'
import { ApplicationBusyIndicator } from './ApplicationBusyIndicator'
import { applicationBindCommandServices } from './ApplicationCommandServices'
import { ApplicationContext } from './ApplicationContext'
import { ApplicationDocument } from './ApplicationDocument'
import { ApplicationOpenDatabaseOptions } from './ApplicationOpenDatabaseOptions'
import { APPLICATION_SETTING_COMMANDS } from './ApplicationSettingManager'
import {
  applicationDisposeNotificationService,
  applicationInstallNotificationService,
  type UINotificationBellPlacement
} from './notification'

/**
 * Built-in command alias table used when users do not provide explicit alias overrides.
 *
 * Rules:
 * - Key is the command global name in uppercase.
 * - Value is one or more aliases in uppercase.
 * - This table is intentionally partial; commands not listed here simply have no default aliases.
 *
 * Notes:
 * - Runtime lookup is case-insensitive because all aliases are normalized to uppercase.
 * - User-provided aliases in `ApplicationDocManagerOptions.commandAliases` have higher priority
 *   and will fully replace the defaults for the same command name.
 */
const DEFAULT_COMMAND_ALIASES: Record<string, string[]> = {
  ARC: ['A'],
  CIRCLE: ['C'],
  ELLIPSE: ['EL'],
  ERASE: ['E'],
  DIMLINEAR: ['DLI'],
  MEASUREDISTANCE: ['DI', 'DIST'],
  MEASUREAREA: ['AA', 'AREA'],
  MEASUREANGLE: ['ANG'],
  LINE: ['L'],
  MLINE: ['ML'],
  MTEXT: ['T'],
  MOVE: ['M'],
  OFFSET: ['O'],
  COPY: ['CO'],
  ROTATE: ['RO'],
  PAN: ['P'],
  POINT: ['PO'],
  POLYGON: ['POL'],
  PLINE: ['PL'],
  RAY: ['RA'],
  RECTANG: ['REC'],
  REGEN: ['RE'],
  SELECT: ['SE'],
  XLINE: ['XL'],
  ZOOM: ['Z'],
  READINGMODE: ['RM']
}

/**
 * Event arguments for document-related events.
 */
export interface ApplicationDocumentEventArgs {
  /** The document involved in the event */
  doc: ApplicationDocument
  /** The access mode used for the document open lifecycle */
  mode: EditorOpenMode
}

/**
 * Options for creating ApplicationDocManager instance
 */
export interface ApplicationDocManagerOptions {
  /**
   * Optional HTML container element for rendering. If not provided, a new container will be created
   */
  container?: HTMLElement
  /**
   * Width of the canvas element. If not provided, use container's width
   */
  width?: number
  /**
   * Height of the canvas element. If not provided, use container's height
   */
  height?: number
  /**
   * The flag whether to auto resize canvas when container size changed. Default is false.
   */
  autoResize?: boolean
  /**
   * Host element for the busy overlay (e.g. HTML export spinner).
   * Set to the viewer shell so the mask covers ribbon, toolbars, and status bar.
   * Defaults to the canvas container when omitted.
   */
  busyIndicatorHost?: HTMLElement

  /**
   * Optional command alias overrides.
   *
   * Key is command global name, value is one alias or alias list.
   * If a command is not configured here, built-in default aliases are used.
   *
   * @example
   * ```typescript
   * commandAliases: {
   *   LINE: ['L', 'LN'],
   *   CIRCLE: 'CI'
   * }
   * ```
   */
  commandAliases?: Record<string, string | string[]>

  /**
   * Built-in notification center.
   *
   * The default DOM UI is
   * positioned relative to the canvas host, not the browser window.
   *
   * - omitted / `true`: install event bridge + default DOM bell UI
   * - `false`: do not install bridge or UI (host handles events itself)
   * - `{ showDefaultUi: false }`: bridge only — host should call
   *   {@link applicationSetNotificationCenter} to supply UI (as cad-viewer does)
   */
  notificationCenter?:
    | boolean
    | {
        /**
         * Host for the default bell/panel. Defaults to the active view canvas
         * container (`curView.container`).
         */
        host?: HTMLElement
        /** When false, skip the built-in DOM UI. Default true. */
        showDefaultUi?: boolean
        /**
         * Corner for the built-in notification bell.
         *
         * When omitted: `bottom-right`.
         * Change later with {@link applicationSetNotificationUiPlacement}.
         */
        placement?: UINotificationBellPlacement
      }
}

/**
 * Document manager that handles CAD document lifecycle and provides the main entry point for the CAD viewer.
 *
 * This singleton class manages:
 * - Document creation and opening (from URLs or file content)
 * - View and context management
 * - Command registration and execution
 * - Event handling for document lifecycle
 *
 * The manager follows a singleton pattern to ensure only one instance manages the application state.
 */
export class ApplicationDocManager {
  /** The document and the view it is drawn in. */
  private _context!: ApplicationContext
  /** View created at construct time. */
  private _mainView!: ThreeRendererView2d
  /** Host element for the busy overlay (e.g. HTML export spinner). */
  private _busyIndicatorHost: HTMLElement
  /** Busy overlay for long-running command operations */
  private _busyIndicator: ApplicationBusyIndicator
  /** Command manager */
  private _commandManager: EditorCommandStack
  /**
   * Alias overrides provided by caller options.
   *
   * Storage format:
   * - Key: normalized command global name (uppercase)
   * - Value: normalized alias list (uppercase, deduplicated)
   *
   * The map is prepared once during manager initialization and reused when
   * registering built-in and system-variable commands.
   */
  private _commandAliasOverrides: Map<string, string[]>
  /** Singleton instance */
  private static _instance?: ApplicationDocManager

  /** Events fired during document lifecycle */
  public readonly events = {
    /** Fired before a document starts opening */
    documentToBeOpened: new CommonEventManager<ApplicationDocumentEventArgs>(),
    /** Fired when a new document is created */
    documentCreated: new CommonEventManager<ApplicationDocumentEventArgs>(),
    /** Fired when a document becomes active */
    documentActivated: new CommonEventManager<ApplicationDocumentEventArgs>(),
    /** Fired before a document is activated */
    /** Fired before a document is closed and destroyed */
    documentToBeDestroyed: new CommonEventManager<ApplicationDocumentEventArgs>(),
    /** Fired after a document has been closed */
    documentDestroyed: new CommonEventManager<ApplicationDocumentEventArgs>()
  }

  /**
   * Private constructor for singleton pattern.
   *
   * Creates an empty document with a 2D view and sets up the application context.
   * Registers default commands and creates an example document.
   *
   * @param options -Options for creating ApplicationDocManager instance
   * @private
   */
  private constructor(options: ApplicationDocManagerOptions = {}) {
    this._commandAliasOverrides = this.normalizeCommandAliasConfig(
      options.commandAliases
    )

    // Create one empty drawing
    const doc = new ApplicationDocument()

    const initialSize = options.container?.getBoundingClientRect() ?? {
      width: 300,
      height: 150
    }
    const callback: EditorCalculateSizeCallback = () => {
      if (options.autoResize) {
        const container = options.container
        if (container) {
          return {
            width: Math.max(1, Math.floor(container.clientWidth)),
            height: Math.max(1, Math.floor(container.clientHeight))
          }
        }
        const box = options.container?.getBoundingClientRect()
        return {
          width: Math.max(1, Math.floor(box?.width ?? initialSize.width)),
          height: Math.max(1, Math.floor(box?.height ?? initialSize.height))
        }
      } else {
        return {
          width: options.width ?? initialSize.width,
          height: options.height ?? initialSize.height
        }
      }
    }
    const view = new ThreeRendererView2d({
      container: options.container,
      calculateSizeCallback: callback
    })
    this._mainView = view
    this._context = new ApplicationContext(view, doc)

    this._commandManager = new EditorCommandStack()
    this.registerCommands()
    const busyHost = options.busyIndicatorHost ?? view.container
    this._busyIndicatorHost = busyHost
    this._busyIndicator = new ApplicationBusyIndicator(busyHost)
    applicationBindCommandServices({
      showMessage: (message, type, msgKey) =>
        this.editor.showMessage(message, type, msgKey),
      showBusyIndicator: message => this.showBusyIndicator(message),
      hideBusyIndicator: () => this.hideBusyIndicator(),
      withBusyIndicator: (work, message) =>
        this.withBusyIndicator(work, message)
    })

    this.events.documentCreated.dispatch({
      doc,
      mode: doc.openMode
    })

    if (options.notificationCenter !== false) {
      const ncOptions =
        typeof options.notificationCenter === 'object'
          ? options.notificationCenter
          : {}
      applicationInstallNotificationService(this, {
        host: ncOptions.host,
        showDefaultUi: ncOptions.showDefaultUi !== false,
        placement: ncOptions.placement,
        enableBridge: true
      })
    }
  }

  /**
   * Creates the singleton instance with an optional canvas element.
   *
   * This method should be called before accessing the `instance` property
   * if you want to provide a specific canvas element.
   *
   * @param options -Options for creating ApplicationDocManager instance
   * @returns The singleton instance
   */
  static createInstance(options: ApplicationDocManagerOptions = {}) {
    if (ApplicationDocManager._instance == null) {
      ApplicationDocManager._instance = new ApplicationDocManager(options)
    }
    return this._instance
  }

  /**
   * Gets the singleton instance of the document manager.
   * Throw one exception if the instance isn't created yet.
   *
   * @returns The singleton document manager instance
   */
  static get instance() {
    if (!ApplicationDocManager._instance) {
      throw new Error('ApplicationDocManager instance is not created yet!')
    }
    return ApplicationDocManager._instance
  }

  /**
   * Returns the singleton when {@link createInstance} has finished, otherwise
   * `undefined`. Safe to call while the constructor is still running.
   */
  static tryGetInstance(): ApplicationDocManager | undefined {
    return ApplicationDocManager._instance
  }

  /**
   * Destroy the view and close the document
   */
  async destroy() {
    // Abort progressive convert before documents go away so in-flight
    // entity commits do not read a torn-down singleton.
    this._mainView.abortConversion()

    this._context.dispose()
    this._context.doc.destroy()
    this._mainView.dispose()
    applicationDisposeNotificationService()
    ApplicationDocManager._instance = undefined
  }

  /**
   * Gets the current application context.
   *
   * The context binds the current document with its associated view.
   *
   * @returns The current application context
   */
  get context() {
    return this._context
  }

  /**
   * Gets the currently open CAD document.
   *
   * @returns The current document instance
   */
  get curDocument() {
    return this.context.doc
  }

  /**
   * Canvas created with {@link createInstance}.
   */
  get mainView(): ThreeRendererView2d {
    return this._mainView
  }

  /**
   * Gets the current 2D view used to display the drawing.
   *
   * @returns The current 2D view instance
   */
  get curView() {
    return this.context.view as ThreeRendererView2d
  }

  /**
   * Gets the editor instance for handling user input.
   *
   * @returns The current editor instance
   */
  get editor() {
    return this.context.view.editor
  }

  /**
   * Gets command manager to look up and register commands
   *
   * @returns The command manager
   */
  get commandManager() {
    return this._commandManager
  }

  /**
   * Creates a blank drawing in a new document session (or reuses the current
   * unused Untitled). The new drawing is presented as unsaved.
   *
   * @param options - Optional database opening options merged with write mode
   * @returns Promise that resolves to true if the document was successfully created
   *
   * @example
   * ```typescript
   * const success = await docManager.newDocument();
   * ```
   */
  async newDocument(options?: ApplicationOpenDatabaseOptions) {
    const openOptions = this.setOptions({
      ...options,
      mode: EditorOpenMode.Write
    })
    const replaced = !this.curDocument.isReusableUntitled
    if (replaced) {
      this.resetDrawing()
    }
    this.onBeforeOpenDocument(openOptions, !replaced)
    const isSuccess = await this.context.doc.createNewDrawing(openOptions)
    this.onAfterOpenDocument(isSuccess, openOptions)
    return isSuccess
  }

  /**
   * Redraws the current view.
   */
  regen() {
    return this.context.regen()
  }

  /**
   * Search through all of the local and translated names in all of the command groups in the command stack
   * starting at the top of the stack trying to find a match with cmdName. If a match is found, the matched
   * EditorCommand object is returned. Otherwise undefined is returned to indicate that the command could not
   * be found. If more than one command of the same name is present in the command stack (that is, in
   * separate command groups), then the first one found is used.
   *
   * The command which is compatible with the open mode of the current document is only returned
   *
   * @param cmdName - Input the command name to search for
   * @returns Return the matched EditorCommand object if a match is found and compatible with the open mode of
   * the current document. Otherwise, return undefined.
   */
  lookupLocalCmd(cmdName: string) {
    return this._commandManager.lookupLocalCmd(
      cmdName,
      this.curDocument.openMode
    )
  }

  /**
   * Search through all of the global and untranslated names in all of the command groups in the command
   * stack starting at the top of the stack trying to find a match with cmdName. If a match is found, the
   * matched EditorCommand object is returned. Otherwise undefined is returned to indicate that the command
   * could not be found. If more than one command of the same name is present in the command stack (that
   * is, in separate command groups), then the first one found is used.
   *
   * The command is only returned if it is compatible with that open mode of the current document.
   * Higher value modes are compatible with lower value modes.
   *
   * @param cmdName - Input the command name to search for
   * @returns Return the matched EditorCommand object if a match is found and compatible with the open mode
   * of the current document. Otherwise, return undefined.
   */
  lookupGlobalCmd(cmdName: string) {
    return this._commandManager.lookupGlobalCmd(
      cmdName,
      this.curDocument.openMode
    )
  }

  /**
   * Fuzzy search for commands by prefix using the command iterator.
   *
   * This method iterates through all commands in all command groups and returns those
   * whose global or local names start with the provided prefix. The search is case-insensitive.
   * Only commands which are compatible with that open mode of the current document are returned.
   * Higher value modes are compatible with lower value modes.
   *
   * @param prefix - The prefix string to search for. Case-insensitive.
   * @returns An array of objects containing matched commands and their corresponding group names.
   */
  searchCommandsByPrefix(prefix: string) {
    return this._commandManager.searchCommandsByPrefix(
      prefix,
      this.curDocument.openMode
    )
  }

  /**
   * Registers all default commands available in the CAD viewer.
   *
   * This method sets up the command system by registering built-in commands including:
   * - log: Output debug information in console
   * - open: Open document
   * - qnew: Quick new document
   * - pan: Pan/move the view
   * - select: Select entities
   * - zoom: Zoom in/out
   *
   * All commands are registered under the system command group.
   */
  private registerCommands() {
    const register = this._commandManager
    /**
     * Helper for registering one built-in system command with resolved aliases.
     *
     * Alias resolution order:
     * 1. User override from `options.commandAliases`
     * 2. Built-in defaults from `DEFAULT_COMMAND_ALIASES`
     * 3. Empty list (no alias)
     *
     * @param cmdGlobalName - Global command name (language-neutral)
     * @param cmdLocalName - Localized/display command name
     * @param cmd - Command implementation instance
     */
    const addSystemCommand = (
      cmdGlobalName: string,
      cmdLocalName: string,
      cmd: EditorCommand
    ) => {
      const defaults =
        DEFAULT_COMMAND_ALIASES[cmdGlobalName.toUpperCase()] ?? []
      register.addCommand(
        EditorCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
        cmdGlobalName,
        cmdLocalName,
        cmd,
        this.resolveCommandAliases(cmdGlobalName, defaults)
      )
    }

    addSystemCommand('arc', 'arc', new ApplicationArcCmd())
    addSystemCommand('circle', 'circle', new ApplicationCircleCmd())
    addSystemCommand('ellipse', 'ellipse', new ApplicationEllipseCmd())
    addSystemCommand('erase', 'erase', new ApplicationEraseCmd())
    addSystemCommand('hideobjects', 'hideobjects', new ApplicationHideObjectsCmd())
    addSystemCommand('dimlinear', 'dimlinear', new ApplicationDimLinearCmd())
    registerMeasureCommands(addSystemCommand)
    addSystemCommand('line', 'line', new ApplicationLineCmd())
    addSystemCommand('loadexample', 'loadexample', new ApplicationLoadExampleCmd())
    addSystemCommand('copy', 'copy', new ApplicationCopyCmd())
    addSystemCommand('move', 'move', new ApplicationMoveCmd())
    addSystemCommand('offset', 'offset', new ApplicationOffsetCmd())
    addSystemCommand('rotate', 'rotate', new ApplicationRotateCmd())
    addSystemCommand('pan', 'pan', new ApplicationPanCmd())
    addSystemCommand('point', 'point', new ApplicationPointCmd())
    addSystemCommand('polygon', 'polygon', new ApplicationPolygonCmd())
    addSystemCommand('pline', 'pline', new ApplicationPolylineCmd())
    addSystemCommand('qnew', 'qnew', new ApplicationQNewCmd())
    addSystemCommand('rectang', 'rectang', new ApplicationRectCmd())
    addSystemCommand('regen', 'regen', new ApplicationRegenCmd())
    addSystemCommand('select', 'select', new ApplicationSelectCmd())
    addSystemCommand('switchbg', 'switchbg', new ApplicationSwitchBgCmd())
    addSystemCommand(
      'unisolateobjects',
      'unisolateobjects',
      new ApplicationUnisolateObjectsCmd()
    )
    addSystemCommand('zoom', 'zoom', new ApplicationZoomCmd())

    // Settings can be changed by the name of the system variable they replace
    Object.keys(APPLICATION_SETTING_COMMANDS).forEach(name => {
      register.addCommand(
        EditorCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
        name,
        name,
        new ApplicationSysVarCmd(),
        this.resolveCommandAliases(name, [])
      )
    })
  }

  /**
   * Normalizes external command alias configuration into an internal map.
   *
   * Normalization rules:
   * - Command names and aliases are trimmed and converted to uppercase.
   * - Empty command names are ignored.
   * - Alias strings are deduplicated per command.
   * - Alias values identical to the command name are ignored.
   *
   * This method does not validate cross-command conflicts; conflict checks are
   * handled by `EditorCommandStack.addCommand` during registration.
   *
   * @param config - Optional command alias configuration from user options
   * @returns Normalized alias override map keyed by command global name
   */
  private normalizeCommandAliasConfig(
    config?: ApplicationDocManagerOptions['commandAliases']
  ) {
    const map = new Map<string, string[]>()
    if (!config) {
      return map
    }

    Object.entries(config).forEach(([commandName, aliases]) => {
      const normalizedCommandName = commandName.trim().toUpperCase()
      if (!normalizedCommandName) {
        return
      }
      const aliasList = Array.isArray(aliases) ? aliases : [aliases]
      const normalizedAliases = new Set<string>()
      aliasList.forEach(alias => {
        const normalizedAlias = alias.trim().toUpperCase()
        if (normalizedAlias && normalizedAlias !== normalizedCommandName) {
          normalizedAliases.add(normalizedAlias)
        }
      })
      map.set(normalizedCommandName, [...normalizedAliases])
    })

    return map
  }

  /**
   * Resolves the final alias list for a command.
   *
   * Behavior:
   * - If the user configured aliases for this command, return that list directly.
   * - Otherwise, return normalized built-in defaults.
   *
   * All returned aliases are uppercase and deduplicated. Any alias equal to the
   * command name itself is dropped to avoid redundant/ambiguous registration.
   *
   * @param commandName - Command global name
   * @param defaultAliases - Built-in default aliases for this command
   * @returns Final aliases used for command registration
   */
  private resolveCommandAliases(commandName: string, defaultAliases: string[]) {
    const normalizedCommandName = commandName.trim().toUpperCase()
    const configuredAliases = this._commandAliasOverrides.get(
      normalizedCommandName
    )

    if (configuredAliases) {
      return [...configuredAliases]
    }

    const normalizedDefaults = new Set<string>()
    defaultAliases.forEach(alias => {
      const normalizedAlias = alias.trim().toUpperCase()
      if (normalizedAlias && normalizedAlias !== normalizedCommandName) {
        normalizedDefaults.add(normalizedAlias)
      }
    })
    return [...normalizedDefaults]
  }

  /**
   * Executes a command by its string name.
   *
   * This method looks up a registered command by name and executes it with the current context.
   * It checks if the command's required mode is compatible with the document's current mode.
   * If the command is not found or not compatible, an error is thrown.
   *
   * @param cmdStr - The command string to execute (e.g., 'pan', 'zoom', 'select')
   * @throws {Error} If the command is not found or if the command's mode is not compatible with the document's mode
   *
   * @example
   * ```typescript
   * docManager.sendStringToExecute('zoom');
   * docManager.sendStringToExecute('pan');
   * ```
   */
  sendStringToExecute(cmdStr: string) {
    void this.executeCommandString(cmdStr).catch(error => {
      const message = error instanceof Error ? error.message : String(error)
      this.editor.showMessage(message, 'error')
      log.error(`[ApplicationDocManager] Command failed: ${cmdStr}`, error)
    })
  }

  /**
   * Executes a single command script and awaits completion.
   *
   * The first line is the command name; remaining lines are queued as inputs for
   * `getPoint` / `getKeywords` / etc.
   *
   * Unlike {@link runScript}, leftover script inputs are cleared when the command
   * ends (interactive / one-shot behavior).
   *
   * @param cmdStr - Command script (first line is the command name)
   */
  async executeCommandString(cmdStr: string) {
    const lines = this.splitCommandScript(cmdStr)
    if (!lines.length) {
      throw new Error('Command string is empty')
    }

    const [cmdName, ...scriptInputs] = lines
    this.editor.clearScriptInputs()
    this.editor.enqueueScriptInputs(scriptInputs)
    await this.executeNamedCommand(cmdName, { preserveScriptInputs: false })
  }

  /**
   * Runs a multi-command AutoCAD-style `.scr` script and awaits completion.
   *
   * Lines are parsed with {@link parseScriptLines}. The first non-blank line of
   * each command is the command name; subsequent lines feed prompts until the
   * command ends. Remaining queued lines become the next command. `QUIT` /
   * `EXIT` terminate the script.
   *
   * @param script - Full script text
   */
  async runScript(script: string) {
    const lines = parseScriptLines(script)
    this.editor.clearScriptInputs()
    this.editor.enqueueScriptInputs(lines)

    while (this.editor.hasScriptInputs()) {
      const cmdName = this.consumeNextScriptCommandName()
      if (cmdName == null) {
        break
      }
      if (isScriptQuitCommand(cmdName)) {
        this.editor.clearScriptInputs()
        break
      }
      await this.executeNamedCommand(cmdName, { preserveScriptInputs: true })
    }
  }

  /**
   * Looks up and runs a registered command by name.
   *
   * When `preserveScriptInputs` is true (multi-command {@link runScript}), the
   * script input queue is left intact so the next command can continue from the
   * remaining lines. Otherwise the queue is cleared after the command finishes.
   */
  private async executeNamedCommand(
    cmdName: string,
    options: { preserveScriptInputs: boolean }
  ) {
    const documentMode = this.context.doc.openMode
    const cmd =
      this._commandManager.lookupGlobalCmd(cmdName) ??
      this._commandManager.lookupLocalCmd(cmdName, documentMode)

    if (!cmd) {
      throw new Error(`Command '${cmdName}' not found`)
    }

    // Check mode compatibility: document mode must be >= command mode
    if (documentMode < cmd.mode) {
      throw new Error(
        `Command '${cmdName}' requires mode '${EditorOpenMode[cmd.mode]}' but document is in mode '${EditorOpenMode[documentMode]}'!`
      )
    }

    // AutoCAD-style command exclusivity: cancel any in-flight command before
    // starting this one. The previous command's pending prompt is rejected
    // with `EditorPromptStatus.Cancel`, and we await its `trigger()` settlement
    // so its `commandEnded` lifecycle finishes before the new one begins.
    await this._commandManager.cancelActive()

    // markActive must run before trigger(): the first getPoint prompt is
    // opened synchronously until the first await.
    await this._commandManager.runActive(cmd, this.curView, async () => {
      try {
        await cmd.trigger(this.context)
      } finally {
        if (!options.preserveScriptInputs) {
          this.editor.clearScriptInputs()
        }
      }
    })
  }

  /**
   * Consumes blank lines, then returns the next non-blank script token as a
   * command name. Returns `undefined` when the queue is exhausted.
   */
  private consumeNextScriptCommandName(): string | undefined {
    while (this.editor.hasScriptInputs()) {
      const token = this.editor.consumeScriptInput()
      if (token == null) {
        return undefined
      }
      const trimmed = token.trim()
      if (trimmed) {
        return trimmed
      }
    }
    return undefined
  }

  /**
   * Splits command script into Enter-separated values.
   * First line is command name, remaining lines are queued inputs for getXXX.
   */
  private splitCommandScript(commandScript: string) {
    const lines = parseScriptLines(commandScript)
    if (!lines.length) return []

    // Skip leading blank / comment-stripped empties to find the command name.
    let start = 0
    while (start < lines.length && !lines[start].trim()) {
      start++
    }
    if (start >= lines.length) return []

    const cmdName = lines[start].trim()
    return [cmdName, ...lines.slice(start + 1)]
  }

  /**
   * Configures layout information for the current view.
   *
   * Sets up the active layout block table record ID and model space block table
   * record ID based on the current document's space configuration.
   *
   * Does **not** re-apply `$TILEMODE`: layout tab switches update
   * `currentSpaceId` without flipping `tilemode`, so syncing here would yank
   * the user back to paper when reactivating a session left on Model.
   * Open-time sync lives in {@link onAfterOpenDocument}.
   */
  setActiveLayout(view?: ThreeRendererView2d) {
    const currentView = view ?? (this.curView as ThreeRendererView2d)
    currentView.activeLayoutBtrId = APPLICATION_MODEL_SPACE_ID
    currentView.modelSpaceBtrId = APPLICATION_MODEL_SPACE_ID
  }

  /**
   * Performs cleanup operations before opening a new document.
   *
   * This protected method is called automatically before any document opening operation.
   * It clears the current view to prepare for the new document content.
   *
   * @protected
   */
  protected onBeforeOpenDocument(
    options?: ApplicationOpenDatabaseOptions,
    replaceCurrent = true
  ) {
    this.events.documentToBeOpened.dispatch({
      doc: this.context.doc,
      mode: this.getDocumentEventMode(options)
    })
    if (replaceCurrent) {
      // Drop overlay history before view.clear() disposes HTML.
      resetMeasurementSession()
      ApplicationZoomCmd.clearOriginalViews()
      this.curView.clear()
    }
    // `progressiveRendering` gates both stages: time-sliced mid-open paints
    // in batchConvert, and whether the open overlay waits for deferred text.
    // Camera auto-fit is started separately in onAfter when the open view
    // mode uses zoom-to-fit — not for restored VPORT/saved views.
    this.curView.progressiveRendering = options?.progressiveRendering ?? false
    this.curView.renderer.context.circleSides = options?.circleSides
    // Headless export: skip pick indexes, and optionally skip cooperative
    // yields that only matter for an interactive UI.
    this.curView.cooperativeYield = options?.cooperativeYield !== false
    const openCadScene = this.curView.cadScene
    if (openCadScene) {
      openCadScene.skipSpatialIndex = options?.skipSpatialIndex === true
    }
  }

  /**
   * Performs setup operations after a document opening attempt.
   *
   * This protected method is called automatically after any document opening operation.
   * If the document was successfully opened, it dispatches the documentActivated event,
   * sets up layout information, and zooms the view to fit the content.
   *
   * @param isSuccess - Whether the document was successfully opened
   * @protected
   */
  protected onAfterOpenDocument(
    isSuccess: boolean,
    options?: ApplicationOpenDatabaseOptions
  ) {
    if (!isSuccess) {
      this.curView.endProgressiveOpenFit()
      this.regen()
      return
    }
    const doc = this.curDocument
    const view = this.curView
    doc.destroy()
    view.addModelSpace()
    this.setActiveLayout(view)
    view.syncDisplaySettings()
    this.events.documentActivated.dispatch({
      doc,
      mode: this.getDocumentEventMode(options)
    })
    if (options?.progressiveRendering ?? false) {
      view.beginProgressiveOpenFit()
    }
    view.zoomToFitDrawing()
    view.requestOpenLineworkFrame()
    view.markLayoutAsInitialized(APPLICATION_MODEL_SPACE_ID)
  }

  /**
   * Sets up or validates database opening options.
   *
   * @param options - Optional database opening options to validate/modify
   * @returns The validated options object
   * @private
   */
  private setOptions(options?: ApplicationOpenDatabaseOptions) {
    if (options == null) {
      options = {
        progressiveRendering: false
      }
    } else {
      this.stripDeprecatedWaitForTextGeometry(options)
      if (options.progressiveRendering == null) {
        options.progressiveRendering = false
      }
    }
    return options
  }

  /**
   * Drops deprecated {@link ApplicationOpenDatabaseOptions.waitForTextGeometry}.
   *
   * Both stages of progressive rendering — mid-open paints, and whether the
   * open overlay waits for deferred text — are controlled by
   * `progressiveRendering`. The old flag is stripped so it cannot be forwarded
   * into `db.read`.
   */
  private stripDeprecatedWaitForTextGeometry(options: ApplicationOpenDatabaseOptions) {
    if (options.waitForTextGeometry == null) {
      return
    }
    delete options.waitForTextGeometry
    console.warn(
      '[ApplicationDocManager] Ignoring deprecated open option waitForTextGeometry; ' +
        'both stages of progressive rendering are controlled by progressiveRendering.'
    )
  }

  /**
   * Resolves the open mode used in document lifecycle events.
   *
   * When callers omit `mode`, document open APIs default to read mode.
   */
  private getDocumentEventMode(options?: ApplicationOpenDatabaseOptions) {
    return options?.mode ?? EditorOpenMode.Read
  }

  /**
   * Shows a spinner overlay, optionally with a message (e.g. HTML export).
   *
   * Supports nested calls via an internal reference count; the overlay stays
   * visible until the outermost matching {@link hideBusyIndicator} runs.
   */
  showBusyIndicator(message?: string): void {
    this._busyIndicator.show(message)
  }

  /**
   * Moves busy/open-file overlays onto `host`.
   *
   * @param host - Overlay parent.
   */
  setBusyIndicatorHost(host: HTMLElement): void {
    this._busyIndicatorHost = host
    this.syncBusyIndicatorHost()
  }

  /**
   * Moves the busy overlay to its host.
   */
  private syncBusyIndicatorHost(): void {
    this._busyIndicator.setHost(this._busyIndicatorHost)
  }

  /**
   * Hides the spinner overlay shown by {@link showBusyIndicator}.
   *
   * No-op when the reference count is already zero.
   */
  hideBusyIndicator(): void {
    this._busyIndicator.hide()
  }

  /**
   * Updates the message on the active busy overlay.
   *
   * @param message - New message text; pass an empty string to hide the label
   */
  setBusyIndicatorMessage(message: string): void {
    this._busyIndicator.setMessage(message)
  }

  /**
   * Runs {@link work} while the busy overlay is visible.
   *
   * The overlay is always hidden in a `finally` block, even when {@link work}
   * throws.
   */
  async withBusyIndicator<T>(
    work: () => T | Promise<T>,
    message?: string
  ): Promise<T> {
    return this._busyIndicator.withBusyIndicator(work, message)
  }

  /**
   * Replaces the drawing with a new, empty one in the same view.
   */
  private resetDrawing() {
    const oldDoc = this.curDocument
    this.events.documentToBeDestroyed.dispatch({
      doc: oldDoc,
      mode: oldDoc.openMode
    })
    oldDoc.modelSync.dispose()
    resetMeasurementSession()
    const view = this.curView
    view.clear()
    view.addModelSpace()
    this._context.dispose()
    oldDoc.destroy()
    this.events.documentDestroyed.dispatch({
      doc: oldDoc,
      mode: oldDoc.openMode
    })
    const doc = new ApplicationDocument()
    this._context = new ApplicationContext(view, doc)
    this.events.documentCreated.dispatch({
      doc,
      mode: doc.openMode
    })
  }
}
