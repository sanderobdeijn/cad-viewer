# Notification Center

`@mlightcad/cad-simple-viewer` writes user-visible alerts — **open failures**, warnings, and similar — into a **Notification Center** when a drawing opens. A lightweight DOM bell UI is installed by default. Hosts (for example `@mlightcad/cad-viewer`, or your own shell) can implement the same interface and **replace** that UI while still reusing the engine-side event bridge and message formatters.

This guide covers architecture, visibility, default behavior, how to override the center, and the contract custom centers must honor.

---

## 1. Architecture

```
Engine events (message / …)
        │
        ▼
ApplicationNotificationEventBridge   ← formats title/body, writes into the current Center
        │
        ▼
ApplicationNotificationCenter        ← replaceable: default Store, or a host implementation
        │
        ├─ Default: UIDefaultNotificationUi (bell on the canvas)
        └─ Override: your UI (Vue / React / custom DOM …)
```

Key points:

- **The bridge only writes to the Center; it does not draw UI.** Swapping UI does not require re-subscribing to `eventBus`.
- **The Center is a singleton slot.** Switch it with `applicationSetNotificationCenter`; pass `null` to restore the built-in implementation.
- **Default chrome is canvas-relative**, not viewport-relative. The bell mounts on the view container (`curView.container`) unless you pass another `host`.
- **Default DOM UI is `AcUi*`** (`src/ui/UIDefaultNotificationUi.ts`); the store / bridge / service stay `AcAp*` under `src/app/notification`.
- **Copy uses `ApplicationI18n`,** which is English only. To change the wording, localize inside your custom Center.

---

## 2. Show / hide behavior

There is **no** public imperative API such as `show()` / `hide()` on the notification service. Visibility is controlled in three layers:

### 2.1 Install-time (enable or disable the system)

| `notificationCenter` option | Effect |
|---|---|
| omitted / `true` | Event bridge **on** + default bell UI **on** |
| `{ showDefaultUi: false }` | Bridge **on**, default UI **off** (host supplies UI via `applicationSetNotificationCenter`) |
| `{ showDefaultUi: true, host }` | Bridge + default UI mounted on `host` (default host: canvas container) |
| `false` | Bridge **off**, UI **off** — host owns all `eventBus` subscriptions |

```ts
import { ApplicationDocManager } from '@mlightcad/cad-simple-viewer'

// Fully disable the built-in notification system
ApplicationDocManager.createInstance({
  container: document.getElementById('viewer')!,
  notificationCenter: false
})

// Keep the bridge; hide the built-in bell (typical for cad-viewer)
ApplicationDocManager.createInstance({
  container: document.getElementById('viewer')!,
  notificationCenter: { showDefaultUi: false }
})
```

Replacing or restoring the Center at runtime also shows/hides the default UI:

```ts
import { applicationSetNotificationCenter } from '@mlightcad/cad-simple-viewer'

applicationSetNotificationCenter(myCenter) // default DOM UI is disposed
applicationSetNotificationCenter(null)     // restore built-in store + default UI (if enabled)
```

### 2.2 Default DOM UI (automatic)

`UIDefaultNotificationUi` ties chrome visibility to the notification list:

| State | Bell | Panel | Backdrop |
|---|---|---|---|
| `notifications.length === 0` | Hidden | Hidden | Hidden |
| Has messages, panel closed | Visible (badge) | Hidden | Hidden |
| Has messages, user tapped bell | Visible | Visible | Visible on phone / pad |

Interaction rules:

- **Open panel:** tap the bell.
- **Close panel:** tap the bell again, tap outside the chrome, tap the phone backdrop, or clear/remove until the list is empty (panel closes automatically).
- The panel does **not** open by itself when a new message arrives; only the badge updates.

There is no separate “force show empty panel” mode in the built-in UI.

### 2.3 Data-driven hide (any Center)

Mutations that empty the active list hide the default UI:

- `clear()`
- `remove(id)` / `removeWhere` / `removeBySource`
- A document being replaced (the bridge calls `clear()` on `documentToBeDestroyed`)

Custom Centers should drive their own show/hide from `subscribe` / reactive `notifications` (for example hide a status-bar badge when `unreadCount === 0`).

---

## 3. Default behavior (no override)

`ApplicationDocManager.createInstance()` by default:

1. Installs `ApplicationNotificationEventBridge` (generic `message` events);
2. Mounts the built-in DOM notification bell on the **canvas container** (`curView.container`).

### Theme and layout

- Styles use `--ml-ui-*` via `editorApplyUiTheme` / `resolveUiTheme` (same tokens as the shortcut toolbar and command line).
- The bell sits at the **canvas** bottom-right by default.
- Override the bell corner with `notificationCenter.placement` or `applicationSetNotificationUiPlacement` (`bottom-right` | `bottom-left` | `top-right` | `top-left`).
- The bell is **not** merged into the shortcut toolbar: notifications are system alerts, not drawing shortcuts; toggling visibility would shift toolbar buttons, and the toolbar can be hidden in settings.

### Options

```ts
import { ApplicationDocManager, applicationSetNotificationUiPlacement } from '@mlightcad/cad-simple-viewer'

ApplicationDocManager.createInstance({
  container: document.getElementById('viewer')!,
  notificationCenter: {
    // Mount node for the bell; defaults to curView.container (canvas host)
    host: document.getElementById('viewer')!,
    // true (default): show built-in bell; false: bridge only, host supplies UI
    showDefaultUi: true,
    // Optional: override layout default (phone top-right, pad/desktop bottom-right)
    placement: 'bottom-right'
  }
})

// Runtime (built-in DOM UI only)
applicationSetNotificationUiPlacement('bottom-left')
applicationSetNotificationUiPlacement(null) // restore layout defaults
```

`cad-viewer` uses `showDefaultUi: false` and registers a Vue notification center.

---

## 4. Override: implement and register your Center

### 4.1 Interface

Your object must implement `ApplicationNotificationCenter` (core methods):

`ApplicationNotificationCenter` is declared in `src/app/notification/ApplicationNotificationTypes.ts`. `ApplicationNotificationStore` in the same folder is a complete reference implementation.

Implement `subscribe` / `dispose` when possible so UI can observe list changes and resources are released when the Center is swapped.

### 4.2 When to register

Register immediately **after** `createInstance` so the default bell never flashes:

```ts
import {
  ApplicationDocManager,
  applicationSetNotificationCenter
} from '@mlightcad/cad-simple-viewer'

const container = document.getElementById('viewer')!

ApplicationDocManager.createInstance({
  container,
  notificationCenter: { showDefaultUi: false }
})

applicationSetNotificationCenter(new MyNotificationCenter())
```

On host unmount / viewer destroy:

```ts
applicationSetNotificationCenter(null) // restore built-in if still needed
await ApplicationDocManager.instance.destroy()
```

Or just `destroy()` — it tears down the bridge and the current Center.

### 4.3 Reading the current Center

```ts
import { applicationNotificationCenter } from '@mlightcad/cad-simple-viewer'

applicationNotificationCenter().warning('Custom title', 'A warning pushed by the host')
```

---

## 5. UI framework integration (Vue example)

The `@mlightcad/cad-viewer` pattern:

1. `createInstance({ notificationCenter: { showDefaultUi: false } })`
2. Implement (or adapt) `ApplicationNotificationCenter` with a reactive Vue store
3. `applicationSetNotificationCenter(adapter)`
4. Panel components read the store only — do **not** re-subscribe to `message` and similar events

Minimal adapter:

```ts
import {
  applicationSetNotificationCenter,
  type ApplicationNotificationCenter
} from '@mlightcad/cad-simple-viewer'
import { useNotificationCenter } from './myVueStore' // your reactive store

export function registerHostNotificationCenter() {
  const vue = useNotificationCenter()

  const adapter: ApplicationNotificationCenter = {
    get notifications() {
      return vue.notifications.value
    },
    get unreadCount() {
      return vue.unreadCount.value
    },
    add: n => vue.add(n),
    info: (t, m, o) => vue.info(t, m, o),
    warning: (t, m, o) => vue.warning(t, m, o),
    error: (t, m, o) => vue.error(t, m, o),
    success: (t, m, o) => vue.success(t, m, o),
    remove: id => vue.remove(id),
    clear: () => vue.clear(),
    removeWhere: p => vue.removeWhere(p),
    removeBySource: s => vue.removeBySource(s),
  }

  applicationSetNotificationCenter(adapter)
}
```

Toasts (e.g. Element Plus `ElMessage`) can:

- fire inside `adapter.add`; or
- listen to `eventBus.on('message' | 'failed-to-open-file', …)` **for toast only** — do not also write into the Center, or entries will duplicate.

Position host panels relative to the **canvas / main drawing area** (`position: absolute` on the view host), not `position: fixed` against the browser viewport. Drive panel open/close in the host (cad-viewer uses a status-bar toggle); the shared Center only owns the message list.

---

## 6. `source` and grouping

Producers can stamp a notification with a `source` string. Notifications that share a source collapse into one expandable group, and `removeBySource` clears them together. The bridge itself does not set a source.

Use `applicationGroupNotifications(notifications)` to collapse same-`source` rows (built-in bell and cad-viewer panel both use this helper).

---

## 7. Which events does the bridge forward?

When the bridge is enabled (`notificationCenter !== false`):

| Source | Center behavior |
|---|---|
| `eventBus` `message` | info / warning / error / success |
| `failed-to-open-file` | error |
| `documentToBeDestroyed` | `clear()` |

---

## 8. FAQ

**Q: Default bell still shows after I override?**  
Set `notificationCenter: { showDefaultUi: false }` on `createInstance`, and call `applicationSetNotificationCenter` before the first paint.

**Q: No notification system at all?**  
`notificationCenter: false`. Subscribe to `eventBus` yourself if you still need alerts.

**Q: How do I programmatically hide the built-in bell?**  
Clear the active list (`clear()` / remove items), or disable the default UI with `showDefaultUi: false`. There is no `hide()` method on the service.

**Q: Can I keep the default Store and only swap UI?**  
The public API replaces the whole Center. Easiest path: implement Store + UI yourself, or wrap `ApplicationNotificationStore` and drive your view from `subscribe`.

**Q: How does this relate to the command-line `showMessage`?**  
Command-line history (`EditorCommand.showMessage`) is a separate channel. Only `notify` / `eventBus.emit('message')` enter the Notification Center.

**Q: Why is the bell not at the screen corner?**  
By design it tracks the **canvas**. If the viewer is not full-window, the bell stays on the drawing area. Pass `notificationCenter.host` only when you intentionally want a different mount node.

---

## 9. API quick reference

| API | Role |
|---|---|
| `applicationSetNotificationCenter(center \| null)` | install / restore Center (also shows/hides default UI) |
| `applicationNotificationCenter()` | current Center |
| `ApplicationNotificationStore` | built-in memory store |
| `applicationGroupNotifications` | group by `source` |
| `ApplicationDocManagerOptions.notificationCenter` | bridge / default UI / canvas host |

Source: `packages/cad-simple-viewer/src/app/notification/`.
