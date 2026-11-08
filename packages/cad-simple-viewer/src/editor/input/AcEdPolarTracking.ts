/**
 * Polar and orthogonal cursor tracking for interactive point input.
 *
 * Reads the polar tracking settings (as the AutoCAD **POLARMODE**, **POLARANG**
 * and **POLARADDANG** variables) together with the angle settings (**ANGBASE**
 * and **ANGDIR**), then constrains the
 * cursor to the nearest allowed tracking direction relative to a reference point.
 * Used by {@link AcEdFloatingInput} during `getPoint`-style acquisition.
 *
 * @see https://help.autodesk.com/view/ACD/2027/ENU/?guid=GUID-3E0AAC2C-0756-4626-B79C-ED8DAB930EA3
 * @packageDocumentation
 */

import {
  GeometryMathUtil,
  GeometryPoint2dLike
} from '@mlightcad/geometry-engine'

import { AcApSettingManager } from '../../app/AcApSettingManager'
import { constrainToOrtho, isOrthoModeEnabled } from './AcEdOrthoMode'

/**
 * **POLARMODE** bit mask: polar tracking enabled (status bar “Polar Tracking”).
 *
 * When this bit is set, alignment paths use **POLARANG** increments (and optional
 * **POLARADDANG** angles when {@link POLARMODE_ADDITIONAL_ANGLES} is also set).
 * When clear, object-snap tracking is limited to orthogonal directions only.
 *
 * @see https://help.autodesk.com/view/ACD/2027/ENU/?guid=GUID-D91628CC-9975-4DBF-8D02-10B23A6F3ED5
 */
export const POLARMODE_POLAR_TRACKING = 2

/**
 * **POLARMODE** bit mask: include additional absolute angles from **POLARADDANG**.
 *
 * Has no effect unless {@link POLARMODE_POLAR_TRACKING} is also enabled.
 *
 * @see https://help.autodesk.com/view/ACD/2027/ENU/?guid=GUID-D91628CC-9975-4DBF-8D02-10B23A6F3ED5
 */
export const POLARMODE_ADDITIONAL_ANGLES = 4

/**
 * Options for assembling the set of tracking angles in display space.
 */
interface AcEdBuildTrackingDisplayAnglesOptions {
  /**
   * When `true`, includes 0°, 90°, 180°, and 270° in the candidate set.
   *
   * Set when **ORTHOMODE** is on so polar tracking also snaps to orthogonal
   * directions, matching AutoCAD combined ortho + polar behavior.
   */
  includeOrtho: boolean
}

/** Returns the value when it is a finite number, otherwise the fallback. */
function finiteOr(value: unknown, fallback: number): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

/**
 * Returns the current **POLARMODE** bitcode for polar and object-snap tracking.
 *
 * Relevant bits include {@link POLARMODE_POLAR_TRACKING} (bit 2) and
 * {@link POLARMODE_ADDITIONAL_ANGLES} (bit 4). Other bits (0, 8, …) are stored
 * but not interpreted by this module yet.
 *
 * @returns Integer bit sum of **POLARMODE** (default `0` when unset).
 * @see https://help.autodesk.com/view/ACD/2027/ENU/?guid=GUID-D91628CC-9975-4DBF-8D02-10B23A6F3ED5
 */
export function getPolarmode(): number {
  return finiteOr(AcApSettingManager.instance.get('polarMode'), 0)
}

/**
 * Returns the polar angle increment **POLARANG** in degrees.
 *
 * Defines spacing of polar tracking alignment paths (common values: 90, 45, 30,
 * 22.5, 18, 15, 10, 5).
 *
 * @returns Increment in degrees (default `90` when unset).
 * @see https://help.autodesk.com/view/ACD/2027/ENU/?guid=GUID-0CF67F9E-F953-43D6-9227-0D56E0E693ED
 */
export function getPolarang(): number {
  return finiteOr(AcApSettingManager.instance.get('polarAngle'), 90)
}

/**
 * Returns the additional polar tracking angles string **POLARADDANG**.
 *
 * Up to ten absolute angles in degrees, separated by semicolons (`;`). Unlike
 * **POLARANG**, entries are absolute display angles, not increments. Only applied
 * when {@link POLARMODE_ADDITIONAL_ANGLES} is set in **POLARMODE**.
 *
 * @returns Semicolon-separated angle list, or `''` when unset.
 * @see https://help.autodesk.com/view/ACD/2027/ENU/?guid=GUID-73162BAB-C98D-4159-A653-E4C7D4CB38C3
 */
export function getPolaraddang(): string {
  return AcApSettingManager.instance.get('polarAdditionalAngles') ?? ''
}

/**
 * Returns whether polar tracking is enabled (**POLARMODE** bit 2).
 *
 * Corresponds to the status bar polar tracking toggle and {@link POLARMODE_POLAR_TRACKING}.
 *
 * @returns `true` when bit 2 of **POLARMODE** is set; otherwise `false`.
 * @see https://help.autodesk.com/view/ACD/2027/ENU/?guid=GUID-D91628CC-9975-4DBF-8D02-10B23A6F3ED5
 */
export function isPolarTrackingEnabled(): boolean {
  return (getPolarmode() & POLARMODE_POLAR_TRACKING) !== 0
}

/**
 * Converts a WCS angle (radians, CCW from +X) to the drawing display angle.
 *
 * Applies **ANGBASE** as the zero direction and negates when **ANGDIR** is `1`
 * (clockwise positive), then normalizes to \([0, 2\pi)\). Matches
 * {@link AcDbFormatter} display-angle conventions.
 *
 * @param radians - Raw WCS angle in radians.
 * @param angbase - **ANGBASE** zero direction in radians.
 * @param angdir - **ANGDIR** (`0` = CCW positive, `1` = CW positive).
 * @returns Normalized display angle in radians.
 * @internal
 */
function toDisplayAngleRadians(
  radians: number,
  angbase: number,
  angdir: number
): number {
  let angle = radians - angbase
  if (angdir === 1) {
    angle = -angle
  }
  return GeometryMathUtil.normalizeAngle(angle)
}

/**
 * Converts a display angle back to WCS radians.
 *
 * Inverse of {@link toDisplayAngleRadians}.
 *
 * @param displayRadians - Display-space angle in radians.
 * @param angbase - **ANGBASE** zero direction in radians.
 * @param angdir - **ANGDIR** (`0` = CCW positive, `1` = CW positive).
 * @returns Normalized WCS angle in radians.
 * @internal
 */
function fromDisplayAngleRadians(
  displayRadians: number,
  angbase: number,
  angdir: number
): number {
  let angle = displayRadians
  if (angdir === 1) {
    angle = -angle
  }
  return GeometryMathUtil.normalizeAngle(angle + angbase)
}

/**
 * Parses **POLARADDANG** into a list of absolute angles in degrees.
 *
 * Each segment between `;` is trimmed and parsed as a number. Invalid tokens are
 * skipped. Results are normalized to \([0, 360)\). At most ten angles are kept,
 * per AutoCAD limits.
 *
 * @param value - Raw **POLARADDANG** string (for example `"15;30;60"`).
 * @returns Absolute angles in degrees, in parse order.
 * @internal
 */
function parsePolaraddangDegrees(value: string): number[] {
  if (!value.trim()) return []

  const angles: number[] = []
  for (const part of value.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const degrees = Number(trimmed)
    if (!Number.isFinite(degrees)) continue
    angles.push(((degrees % 360) + 360) % 360)
    if (angles.length >= 10) break
  }
  return angles
}

/**
 * Builds the set of candidate tracking angles in display space (radians).
 *
 * Candidates depend on **POLARMODE**, **POLARANG**, **POLARADDANG**, and whether
 * orthogonal directions should be included (typically when **ORTHOMODE** is on).
 *
 * @param options - Controls inclusion of 90° orthogonal directions.
 * @returns Unique display angles in radians; empty when polar tracking is off and
 *   `includeOrtho` is `false`.
 * @internal
 */
function buildTrackingDisplayAnglesRadians(
  options: AcEdBuildTrackingDisplayAnglesOptions
): number[] {
  const polarmode = getPolarmode()
  const usePolar = (polarmode & POLARMODE_POLAR_TRACKING) !== 0
  const useAdditional = (polarmode & POLARMODE_ADDITIONAL_ANGLES) !== 0

  const degreeSet = new Set<number>()

  if (options.includeOrtho) {
    for (const degrees of [0, 90, 180, 270]) {
      degreeSet.add(degrees)
    }
  }

  if (usePolar) {
    const increment = getPolarang()
    if (increment > 0) {
      const steps = Math.max(1, Math.round(360 / increment))
      for (let i = 0; i < steps; i++) {
        degreeSet.add((((i * increment) % 360) + 360) % 360)
      }
    }

    if (useAdditional) {
      for (const degrees of parsePolaraddangDegrees(getPolaraddang())) {
        degreeSet.add(degrees)
      }
    }
  }

  return [...degreeSet].map(GeometryMathUtil.degToRad)
}

/**
 * Returns the smallest angular distance between two angles on a circle.
 *
 * @param a - First angle in radians.
 * @param b - Second angle in radians.
 * @returns Minimal absolute difference in \([0, \pi]\).
 * @internal
 */
function smallestAngleDelta(a: number, b: number): number {
  const diff = Math.abs(GeometryMathUtil.normalizeAngle(a - b))
  return Math.min(diff, Math.PI * 2 - diff)
}

/**
 * Picks the candidate display angle closest to a target angle.
 *
 * @param target - Cursor direction in display radians.
 * @param candidates - Non-empty list of allowed display angles in radians.
 * @returns The candidate with the smallest angular distance to `target`.
 * @internal
 */
function nearestDisplayAngle(target: number, candidates: number[]): number {
  let best = candidates[0]!
  let bestDelta = smallestAngleDelta(target, best)

  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i]!
    const delta = smallestAngleDelta(target, candidate)
    if (delta < bestDelta) {
      bestDelta = delta
      best = candidate
    }
  }

  return best
}

/**
 * Constrains a point to the nearest polar and/or orthogonal tracking angle.
 *
 * Behavior summary:
 *
 * - Neither **ORTHOMODE** nor polar tracking (bit 2): returns `point` unchanged.
 * - **ORTHOMODE** only: delegates to {@link constrainToOrtho}.
 * - Polar tracking (and optionally ortho): keeps distance from `reference`,
 *   snaps direction to the nearest allowed display angle from **POLARANG** /
 *   **POLARADDANG** / orthogonal set, then maps back to WCS using **ANGBASE**
 *   and **ANGDIR**.
 *
 * @param point - Current cursor position in WCS (typically after OSNAP).
 * @param reference - Tracking base point (last point or prompt base point).
 * @returns Constrained WCS point on the nearest tracking ray, or `point` when
 *   tracking does not apply or distance to `reference` is negligible.
 * @see https://help.autodesk.com/view/ACD/2027/ENU/?guid=GUID-3E0AAC2C-0756-4626-B79C-ED8DAB930EA3
 */
export function constrainToTracking(
  point: GeometryPoint2dLike,
  reference: GeometryPoint2dLike
): GeometryPoint2dLike {
  const settings = AcApSettingManager.instance
  const angleBase = settings.get('angleBase')
  const angleDirection = settings.get('angleDirection')
  const ortho = isOrthoModeEnabled()
  const polar = isPolarTrackingEnabled()

  if (!ortho && !polar) {
    return point
  }

  if (ortho && !polar) {
    return constrainToOrtho(point, reference)
  }

  const dx = point.x - reference.x
  const dy = point.y - reference.y
  const distance = Math.hypot(dx, dy)
  if (distance < 1e-10) {
    return point
  }

  const wcsAngle = Math.atan2(dy, dx)
  const displayAngle = toDisplayAngleRadians(
    wcsAngle,
    angleBase,
    angleDirection
  )
  const candidates = buildTrackingDisplayAnglesRadians({
    includeOrtho: ortho
  })

  if (candidates.length === 0) {
    return point
  }

  const lockedDisplay = nearestDisplayAngle(displayAngle, candidates)
  const lockedWcs = fromDisplayAngleRadians(
    lockedDisplay,
    angleBase,
    angleDirection
  )

  return {
    x: reference.x + distance * Math.cos(lockedWcs),
    y: reference.y + distance * Math.sin(lockedWcs)
  }
}

/**
 * Toggles **POLARMODE** bit 2 (polar tracking on/off) and persists the new value.
 *
 * Preserves all other **POLARMODE** bits (orthogonal-only tracking source,
 * additional angles, shift-to-acquire, etc.).
 *
 * @returns The new **POLARMODE** value after the toggle.
 * @see https://help.autodesk.com/view/ACD/2027/ENU/?guid=GUID-D91628CC-9975-4DBF-8D02-10B23A6F3ED5
 */
export function togglePolarTracking(): number {
  const current = getPolarmode()
  const next =
    (current & POLARMODE_POLAR_TRACKING) !== 0
      ? current & ~POLARMODE_POLAR_TRACKING
      : current | POLARMODE_POLAR_TRACKING
  AcApSettingManager.instance.set('polarMode', next)
  return next
}
