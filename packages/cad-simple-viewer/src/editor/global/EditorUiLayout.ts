/**
 * Shared sizes and z-index tiers for the viewer chrome.
 */

/**
 * Z-index for screen-space stroke canvases (measure lines, arcs,
 * fills). Kept below capsule labels; see {@link ML_UI_Z_CANVAS_HTML_OVERLAY}.
 *
 * Must match `.ml-html-canvas` in `@mlightcad/three-renderer`.
 */
export const ML_UI_Z_CANVAS_HTML_STROKE = 1

/**
 * Z-index for world-anchored HTML labels (CSS2D measure capsules).
 *
 * Above stroke canvases ({@link ML_UI_Z_CANVAS_HTML_STROKE}); below command
 * line and modal dialogs.
 */
export const ML_UI_Z_CANVAS_HTML_OVERLAY = 2

/**
 * Z-index for the floating shortcut toolbar (erase + selection extensions).
 *
 * Above draw-style session chrome; below modal dialogs.
 */
export const ML_UI_Z_SHORTCUT_TOOLBAR = 46

/**
 * Z-index for the built-in notification bell / panel.
 *
 * Above shortcut / entity-pick chrome; below modal dialogs (~10050).
 */
export const ML_UI_Z_NOTIFICATION = 48
