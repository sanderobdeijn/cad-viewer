/**
 * Shared timing for touch precise point capture.
 *
 * Kept in a tiny module so other packages can share the same values via the
 * main package export without depending on {@link ./EditorTouchPointSession}.
 */

/**
 * Long-press delay before precise capture activates (simulated mouse or
 * snap loupe), in milliseconds.
 */
export const EDITOR_TOUCH_POINT_LONG_PRESS_MS = 500

/**
 * Pointer movement in CSS pixels that cancels a pending long-press so the
 * gesture can be treated as a pan instead of a pick.
 */
export const EDITOR_TOUCH_POINT_MOVE_CANCEL_PX = 10
