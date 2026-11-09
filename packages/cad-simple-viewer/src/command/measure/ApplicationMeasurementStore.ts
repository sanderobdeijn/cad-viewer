import type { ThreeRendererHtmlGroup } from '@mlightcad/three-renderer'

import {
  type ApplicationMeasurementValue,
  formatMeasurementValue,
  resetMeasurementUnitOverride
} from '../../util/ApplicationMeasurementUnits'
import {
  applicationCloneMeasurementStyle,
  type ApplicationMeasurementStyle,
  MEASUREMENT_LINE_WEIGHT
} from '../../util/ApplicationMeasurementUtil'
import type { ThreeRendererView2d } from '../../view'
import {
  APPLICATION_OVERLAY_ARROW_SIZE_PX,
  applicationScreenPxToWcs
} from '../overlay/ApplicationOverlayDrawUtil'
import { hitTestMeasurementGeometry } from './ApplicationMeasurementGeometry'
import { serializeMeasurementStyle } from './ApplicationMeasurementRecordStyle'
import type {
  ApplicationMeasurementRecord,
  ApplicationMeasurementRecordStyle
} from './ApplicationMeasurementTypes'

/** HTML transient layer for committed measurement overlays. */
export const MEASUREMENT_LAYER = 'measurement'

/** HTML transient layer for in-progress jig / live preview overlays. */
export const MEASUREMENT_LIVE_LAYER = 'measurement-live'

/** Session visibility for measurement overlays on the active layout. */
let measurementVisible = true

/** Whether measurement overlays are currently shown. */
export function isMeasurementVisible(): boolean {
  return measurementVisible
}

/** Restore the default (shown) session flag after a document open / close. */
export function resetMeasurementVisibility(): void {
  measurementVisible = true
}

/**
 * Show or hide committed measurement overlays on the active layout, plus live
 * jig overlays.
 */
export function setMeasurementVisible(
  view: ThreeRendererView2d,
  visible: boolean
): void {
  measurementVisible = visible
  const layoutId = view.activeLayoutBtrId
  const ht = view.htmlTransientManager
  for (const group of ht.groupsOnLayer(MEASUREMENT_LAYER)) {
    if (group.layoutId == null || group.layoutId === layoutId) {
      group.setVisible(visible)
    }
  }
  ht.setVisible(visible, MEASUREMENT_LIVE_LAYER)
  view.isHtmlDirty = true
}

/**
 * Optional non-HTML resources attached to a measurement {@link ThreeRendererHtmlGroup}.
 */
export interface ApplicationMeasurementGroupExtras {
  /**
   * @deprecated CAD transients are no longer used for measurements; kept empty
   * for backward-compatible call sites.
   */
  entityIds?: string[]
  /** Style used when the group was committed (and after later style edits). */
  style?: ApplicationMeasurementStyle
  /** Raw measured value used to refresh the badge when display units change. */
  value?: ApplicationMeasurementValue
  /** Serializable snapshot used by measurement import / export. */
  snapshot?: ApplicationMeasurementRecord
  /** Redraw canvas overlays after a style change (color / line weight). */
  redraw?: (style: ApplicationMeasurementStyle) => void
  /**
   * Removes non-HTML resources (viewChanged listeners).
   * HTML children and group-owned canvases are removed by the html
   * transient manager / group dispose.
   */
  dispose?: () => void
}

type MeasurementSelectionListener = () => void
type MeasurementListListener = () => void

const extrasById = new Map<string, ApplicationMeasurementGroupExtras>()
const stylesById = new Map<string, ApplicationMeasurementStyle>()
const selectionListeners = new Set<MeasurementSelectionListener>()
const listListeners = new Set<MeasurementListListener>()
let selectedMeasurementId: string | undefined

/** Style currently stored for a committed measurement group. */
export function getMeasurementStyle(
  id: string
): ApplicationMeasurementStyle | undefined {
  const style = stylesById.get(id)
  return style ? applicationCloneMeasurementStyle(style) : undefined
}

/** Id of the currently selected measurement group, if any. */
export function getSelectedMeasurementId(): string | undefined {
  return selectedMeasurementId
}

/** Notify when the selected measurement group changes. */
export function subscribeMeasurementSelection(
  listener: MeasurementSelectionListener
): () => void {
  selectionListeners.add(listener)
  return () => {
    selectionListeners.delete(listener)
  }
}

function notifyMeasurementSelection(): void {
  for (const listener of selectionListeners) listener()
}

/** Notify when committed measurements are added, removed, restored, or filtered by layout. */
export function subscribeMeasurements(
  listener: MeasurementListListener
): () => void {
  listListeners.add(listener)
  return () => {
    listListeners.delete(listener)
  }
}

export function notifyMeasurementsChanged(): void {
  for (const listener of listListeners) listener()
}

/**
 * Notify list subscribers that the active layout changed, so layout-filtered
 * views (the measurement palette) can re-query {@link listLayoutMeasurements}.
 */
export function notifyMeasurementLayoutChanged(): void {
  notifyMeasurementsChanged()
}

/**
 * Committed measurements on the active layout (records without `layoutId`
 * are treated as present on every layout).
 */
export function listLayoutMeasurements(
  view: ThreeRendererView2d
): ApplicationMeasurementRecord[] {
  const layoutId = view.activeLayoutBtrId
  return collectMeasurementRecords(view).filter(
    record => record.layoutId == null || record.layoutId === layoutId
  )
}

/**
 * Formatted badge text for a committed measurement, or an empty string when
 * the measurement has no value.
 */
export function getMeasurementValueText(id: string): string {
  const extras = extrasById.get(id)
  if (!extras?.value) return ''
  return formatMeasurementValue(extras.value)
}

function rememberStyle(id: string, style: ApplicationMeasurementStyle): void {
  stylesById.set(id, applicationCloneMeasurementStyle(style))
}

/**
 * Reformat committed measurement badges using the effective measurement units.
 * Notifies list subscribers so palettes refresh their cached value text.
 */
export function refreshMeasurementValueLabels(view: ThreeRendererView2d): void {
  for (const group of view.htmlTransientManager.groupsOnLayer(
    MEASUREMENT_LAYER
  )) {
    const extras = extrasById.get(group.id)
    if (!extras?.value) continue
    const text = formatMeasurementValue(extras.value)
    for (const child of group.children) {
      const badge = child as { setText?: (next: string) => void }
      badge.setText?.(text)
    }
  }
  view.isHtmlDirty = true
  notifyMeasurementsChanged()
}

/** Serializable snapshots of committed measurements currently on the view. */
export function collectMeasurementRecords(
  view: ThreeRendererView2d
): ApplicationMeasurementRecord[] {
  const records: ApplicationMeasurementRecord[] = []
  for (const group of view.htmlTransientManager.groupsOnLayer(
    MEASUREMENT_LAYER
  )) {
    const extras = extrasById.get(group.id)
    if (!extras?.snapshot) continue
    const live = extras.style ?? stylesById.get(group.id)
    const snapStyle = extras.snapshot.style
    let style: ApplicationMeasurementRecordStyle
    if (live) {
      // Keep live color / fontSize, force hairline lineWeight, preserve
      // creation-time textHeightWcs / arrowSizeWcs from the snapshot. Never
      // export strokeWidthWcs.
      const base = serializeMeasurementStyle(live)
      const arrowSizeWcs =
        snapStyle.arrowSizeWcs != null && snapStyle.arrowSizeWcs > 0
          ? snapStyle.arrowSizeWcs
          : extras.snapshot.type === 'distance'
            ? applicationScreenPxToWcs(APPLICATION_OVERLAY_ARROW_SIZE_PX, view)
            : undefined
      style = {
        ...base,
        lineWeight: MEASUREMENT_LINE_WEIGHT,
        textHeightWcs:
          snapStyle.textHeightWcs ?? applicationScreenPxToWcs(base.fontSize, view),
        ...(arrowSizeWcs != null && arrowSizeWcs > 0 ? { arrowSizeWcs } : {})
      }
    } else {
      const { strokeWidthWcs: _omit, ...rest } = snapStyle
      style = { ...rest, lineWeight: MEASUREMENT_LINE_WEIGHT }
    }
    records.push({
      ...extras.snapshot,
      id: group.id,
      layoutId: group.layoutId,
      style
    })
  }
  return records
}

/** Drop style / extras maps (document open). Attached groups are left for view.clear(). */
export function resetMeasurementStyleState(): void {
  extrasById.clear()
  stylesById.clear()
  selectedMeasurementId = undefined
  notifyMeasurementSelection()
  notifyMeasurementsChanged()
}

/**
 * Run a measurement mutation, then tell listeners the list may have changed.
 *
 * @param mutate - Mutation that adds, removes or restyles measurement groups.
 */
export function runMeasurementEdit(mutate: () => void): void {
  mutate()
  notifyMeasurementsChanged()
}

/**
 * Reset measurement state when a document opens or closes.
 */
export function resetMeasurementSession(): void {
  resetMeasurementStyleState()
  resetMeasurementUnitOverride()
  resetMeasurementVisibility()
}

/**
 * Publishes a measurement {@link ThreeRendererHtmlGroup} and wires measurement-specific
 * selection state.
 *
 * The group itself (children, canvases, click selection, Delete, layout
 * visibility) is handled by {@link ThreeRendererHtmlTransientManager}.
 */
export function commitMeasurementGroup(
  view: ThreeRendererView2d,
  group: ThreeRendererHtmlGroup,
  extras?: ApplicationMeasurementGroupExtras
): void {
  const entityIds = extras?.entityIds ?? []
  const payload = extras ?? {}
  extrasById.set(group.id, payload)
  if (extras?.style) {
    rememberStyle(group.id, extras.style)
  }

  const prevSelectedChanged = group.onSelectedChanged
  group.onSelectedChanged = (selected, g) => {
    prevSelectedChanged?.(selected, g)
    if (selected) {
      selectedMeasurementId = g.id
      notifyMeasurementSelection()
      if (entityIds.length > 0) view.highlight(entityIds)
    } else {
      if (selectedMeasurementId === g.id) {
        selectedMeasurementId = undefined
        notifyMeasurementSelection()
      }
      if (entityIds.length > 0) view.unhighlight(entityIds)
    }
  }

  const prevVisibleChanged = group.onVisibleChanged
  group.onVisibleChanged = (visible, g) => {
    prevVisibleChanged?.(visible, g)
    for (const objectId of entityIds) {
      view.setTransientEntityVisible(objectId, visible)
    }
  }

  const prevDispose = group.onDispose
  group.onDispose = () => {
    prevDispose?.()
    extrasById.delete(group.id)
    stylesById.delete(group.id)
    if (selectedMeasurementId === group.id) {
      selectedMeasurementId = undefined
      notifyMeasurementSelection()
    }
    if (entityIds.length > 0) {
      view.unhighlight(entityIds)
    }
    try {
      extras?.dispose?.()
    } catch {
      // Ignore dispose errors from domain cleanups.
    }
    notifyMeasurementsChanged()
  }

  runMeasurementEdit(() => {
    view.htmlTransientManager.add(group)
  })
  if (
    !measurementVisible &&
    (group.layoutId == null || group.layoutId === view.activeLayoutBtrId)
  ) {
    group.setVisible(false)
  }
  view.isHtmlDirty = true
  notifyMeasurementsChanged()
}

/** Snapshot geometry for a committed measurement group, if available. */
export function getMeasurementGeometry(
  id: string
): ApplicationMeasurementRecord['geometry'] | undefined {
  return extrasById.get(id)?.snapshot?.geometry
}

/** Full record snapshot for a committed measurement, if available. */
export function getMeasurementSnapshot(
  id: string
): ApplicationMeasurementRecord | undefined {
  const snap = extrasById.get(id)?.snapshot
  return snap ? { ...snap, geometry: snap.geometry } : undefined
}

/**
 * Pick a visible measurement group by clicking its drawn stroke / fill.
 *
 * @returns Group id when the canvas-space point is within `threshold` pixels.
 */
export function pickMeasurementAt(
  view: ThreeRendererView2d,
  canvasX: number,
  canvasY: number,
  threshold: number
): string | undefined {
  if (!measurementVisible) return undefined
  const canvas = { x: canvasX, y: canvasY }
  const worldToScreen = (point: { x: number; y: number }) =>
    view.worldToScreen(point)
  const groups = view.htmlTransientManager.groupsOnLayer(MEASUREMENT_LAYER)
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i]
    if (!group.visible) continue
    const geom = getMeasurementGeometry(group.id)
    if (!geom) continue
    if (hitTestMeasurementGeometry(geom, canvas, worldToScreen, threshold)) {
      return group.id
    }
  }
  return undefined
}
