# How to Create a Command in CAD Viewer

This guide provides step-by-step instructions for creating a new command in the CAD viewer project. 

## Step 1: Create the Command File

Create a new TypeScript file in the `src/command` directory with the naming convention `AcAp[CommandName]Cmd.ts`.

## Step 2: Define the Command Structure

A typical command consists of:

1. **Imports** - Import necessary classes and types
2. **Jig Class** (optional) - For real-time preview
3. **Command Class** - The main command implementation

### Example Structure

```typescript
import { GeometryLine2d, GeometryPoint2dLike } from '@mlightcad/geometry-engine'
import type { GraphicsInterfaceDrawable } from '@mlightcad/graphic-interface'

import { ApplicationContext, ApplicationDocManager } from '../app'
import {
  EditorBaseView,
  EditorCommand,
  EditorOpenMode,
  EditorPreviewJig,
  EditorPromptPointOptions
} from '../editor'
import { ApplicationI18n } from '../i18n'
import { applicationPreviewDrawable } from '../model'

// Jig class for real-time preview (optional)
export class AcAp[CommandName]Jig extends EditorPreviewJig<GeometryPoint2dLike> {
  private _line: GeometryLine2d
  private _drawable: GraphicsInterfaceDrawable

  constructor(view: EditorBaseView, start: GeometryPoint2dLike) {
    super(view)
    // Build the geometry and the drawable that previews it
    this._line = new GeometryLine2d(start, start)
    this._drawable = applicationPreviewDrawable({ kind: 'shape', geometry: this._line })
  }

  get entity(): GraphicsInterfaceDrawable {
    return this._drawable
  }

  update(point: GeometryPoint2dLike) {
    // Update the geometry based on user input
    this._line.endPoint = point
  }
}

/**
 * Command to create [description].
 */
export class AcAp[CommandName]Cmd extends EditorCommand {
  constructor() {
    super()
    this.mode = EditorOpenMode.Write // Set the appropriate open mode
  }

  async execute(context: ApplicationContext) {
    // Command implementation
  }
}
```

## Step 3: Implement the Command Logic

1. **Prompt for user input** using prompt options like `EditorPromptPointOptions`, `EditorPromptDistanceOptions`, etc.
2. **Handle user input** in an async function
3. **Build the geometry** once all required input is collected
4. **Add it as an item** to the document's model

### Example: Point-based Command

```typescript
async execute(context: ApplicationContext) {
  // Get first point
  const firstPointPrompt = new EditorPromptPointOptions(
    ApplicationI18n.t('jig.[command].firstPoint')
  )
  const firstPoint = await ApplicationDocManager.instance.editor.getPoint(firstPointPrompt)

  // Get subsequent points
  const nextPointPrompt = new EditorPromptPointOptions(
    ApplicationI18n.t('jig.[command].nextPoint')
  )
  nextPointPrompt.useDashedLine = true
  nextPointPrompt.useBasePoint = true
  nextPointPrompt.jig = new AcAp[CommandName]Jig(context.view, firstPoint)
  const nextPoint = await ApplicationDocManager.instance.editor.getPoint(nextPointPrompt)

  // Add the item to the document's model
  context.doc.modelSync.addItems({
    kind: 'shape',
    geometry: new GeometryLine2d(firstPoint, nextPoint)
  })
}
```

## Step 4: Add Internationalization

1. **Add jig prompts** to `src/i18n/en/jig.ts`
2. **Add command description** to `src/i18n/en/command.ts`

### Example: Jig Prompts (en/jig.ts)

```typescript
[command]: {
  firstPoint: 'Specify first point:',
  nextPoint: 'Specify next point:'
}
```

### Example: Command Description (en/command.ts)

```typescript
[command]: {
  description: 'Command description'
}
```

## Step 5: Register the Command

Add the command to the `registerCommands` method in `src/app/ApplicationDocManager.ts`:

1. **Import the command** in the imports section
2. **Register the command** in the `registerCommands` method

### Example:

```typescript
// Import
export {
  // ... other imports
  AcAp[CommandName]Cmd
} from '../command'

// Register
register.addCommand(
  EditorCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
  '[command]',
  '[command]',
  new AcAp[CommandName]Cmd()
)
```

### Command Alias

CAD Viewer supports AutoCAD-style command aliases. You can register aliases when adding a command:

```typescript
register.addCommand(
  EditorCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
  'line',
  'line',
  new ApplicationLineCmd(),
  ['L', 'LN'] // alias
)
```

Alias behavior:

1. Aliases are case-insensitive (internally normalized to uppercase).
2. Alias must be unique in the same command group.
3. Alias cannot conflict with existing global/local command names.
4. Command lookup and prefix search both support alias matching.

You can also configure aliases globally when creating `ApplicationDocManager`:

```typescript
ApplicationDocManager.createInstance({
  commandAliases: {
    LINE: ['L', 'LN'],
    CIRCLE: 'C'
  }
})
```

Rules for `commandAliases`:

1. Key is the command global name.
2. Value is one alias or alias list.
3. If a command is not configured, built-in default aliases are used.
4. If configured, user aliases replace built-in defaults for that command.

## Step 6: Update the Command Index

Add the command to the exports in `src/command/index.ts`:

```typescript
export * from './AcAp[CommandName]Cmd'
```

## Best Practices

1. **Use consistent naming conventions**
2. **Implement real-time preview** using a Jig class when appropriate
3. **Handle user cancellation** gracefully
4. **Provide clear prompts** using internationalization
5. **Follow the existing code patterns**

