import type { EditorBaseView } from '../../editor'
import {
  applicationCssColor,
  applicationCssToMeasurementColor,
  type ApplicationMeasurementStyle,
  MEASUREMENT_FONT_SIZE,
  MEASUREMENT_LINE_WEIGHT
} from '../../util/ApplicationMeasurementUtil'
import { applicationScreenPxToWcs } from '../overlay/ApplicationOverlayDrawUtil'
import type {
  ApplicationMeasurementGeometry,
  ApplicationMeasurementPoint2d,
  ApplicationMeasurementRecord,
  ApplicationMeasurementSidecarFile,
  ApplicationMeasurementSidecarStyle,
  ApplicationMeasurementType
} from './ApplicationMeasurementTypes'

const MEASUREMENT_TYPES: readonly ApplicationMeasurementType[] = [
  'distance',
  'angle',
  'area',
  'arc',
  'point'
]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPoint(value: unknown): value is ApplicationMeasurementPoint2d {
  return (
    isPlainObject(value) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y)
  )
}

function isType(value: unknown): value is ApplicationMeasurementType {
  return (
    typeof value === 'string' &&
    (MEASUREMENT_TYPES as readonly string[]).includes(value)
  )
}

function parsePositiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && value > 0 && Number.isFinite(value)
    ? value
    : undefined
}

function parseStyle(raw: unknown): ApplicationMeasurementSidecarStyle | undefined {
  if (!isPlainObject(raw) || typeof raw.color !== 'string') return undefined
  // Accept legacy lineWeight / strokeWidthWcs without failing, but always hairline.
  const fontSize =
    typeof raw.fontSize === 'number' && raw.fontSize > 0
      ? raw.fontSize
      : MEASUREMENT_FONT_SIZE
  return {
    color: raw.color,
    lineWeight: MEASUREMENT_LINE_WEIGHT,
    fontSize,
    textHeightWcs: parsePositiveNumber(raw.textHeightWcs),
    arrowSizeWcs: parsePositiveNumber(raw.arrowSizeWcs)
  }
}

function parseGeometry(
  type: ApplicationMeasurementType,
  raw: unknown
): ApplicationMeasurementGeometry | undefined {
  if (!isPlainObject(raw) || raw.type !== type) return undefined
  switch (type) {
    case 'distance':
      if (!isPoint(raw.start) || !isPoint(raw.end)) return undefined
      return { type, start: raw.start, end: raw.end }
    case 'angle':
      if (!isPoint(raw.vertex) || !isPoint(raw.arm1) || !isPoint(raw.arm2)) {
        return undefined
      }
      return { type, vertex: raw.vertex, arm1: raw.arm1, arm2: raw.arm2 }
    case 'area':
      if (!Array.isArray(raw.points) || raw.points.length < 3) return undefined
      if (!raw.points.every(isPoint)) return undefined
      return { type, points: raw.points }
    case 'arc':
      if (
        !isPoint(raw.center) ||
        typeof raw.radius !== 'number' ||
        !(raw.radius > 0) ||
        !isPoint(raw.start) ||
        !isPoint(raw.end)
      ) {
        return undefined
      }
      return {
        type,
        center: raw.center,
        radius: raw.radius,
        start: raw.start,
        end: raw.end,
        ...(isPoint(raw.through) ? { through: raw.through } : {})
      }
    case 'point':
      if (!isPoint(raw.position)) return undefined
      return { type, position: raw.position }
  }
}

function parseRecord(raw: unknown): ApplicationMeasurementRecord | undefined {
  if (!isPlainObject(raw)) return undefined
  if (typeof raw.id !== 'string' || !isType(raw.type)) return undefined
  const style = parseStyle(raw.style)
  const geometry = parseGeometry(raw.type, raw.geometry)
  if (!style || !geometry) return undefined
  return {
    id: raw.id,
    type: raw.type,
    layoutId: typeof raw.layoutId === 'string' ? raw.layoutId : undefined,
    style,
    geometry
  }
}

/** Serialize a live measurement style for the sidecar. */
export function serializeMeasurementStyle(
  style: ApplicationMeasurementStyle,
  view?: EditorBaseView
): ApplicationMeasurementSidecarStyle {
  const result: ApplicationMeasurementSidecarStyle = {
    color: applicationCssColor(style.color),
    lineWeight: MEASUREMENT_LINE_WEIGHT,
    fontSize: style.fontSize
  }
  if (
    style.textHeightMode === 'custom' &&
    style.textHeightWcs != null &&
    style.textHeightWcs > 0
  ) {
    // Custom: keep the authored world height — never re-derive from fontSize.
    result.textHeightWcs = style.textHeightWcs
  } else if (style.textHeightMode === 'adaptive' && view) {
    // Fit-to-screen: bake the current screen font size into WCS at commit.
    result.textHeightWcs = applicationScreenPxToWcs(style.fontSize, view)
  } else if (style.textHeightWcs != null && style.textHeightWcs > 0) {
    // Legacy / import: prefer an existing world height over reconversion.
    result.textHeightWcs = style.textHeightWcs
  } else if (view) {
    result.textHeightWcs = applicationScreenPxToWcs(style.fontSize, view)
  }
  return result
}

/** Restore a live measurement style from sidecar CSS / numeric fields. */
export function deserializeMeasurementStyle(
  style: ApplicationMeasurementSidecarStyle
): ApplicationMeasurementStyle {
  return {
    color: applicationCssToMeasurementColor(style.color),
    lineWeight: MEASUREMENT_LINE_WEIGHT,
    fontSize: style.fontSize > 0 ? style.fontSize : MEASUREMENT_FONT_SIZE,
    textHeightWcs: style.textHeightWcs
  }
}

/**
 * Parse sidecar JSON text into a typed file object.
 * @throws Error when the payload is not valid measurement sidecar v1.
 */
export function parseMeasurementSidecar(
  text: string
): ApplicationMeasurementSidecarFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid measurement sidecar: not JSON')
  }
  if (!isPlainObject(parsed) || parsed.version !== 1) {
    throw new Error('Invalid measurement sidecar: expected version 1')
  }
  if (!Array.isArray(parsed.measurements)) {
    throw new Error('Invalid measurement sidecar: measurements must be an array')
  }
  const measurements: ApplicationMeasurementRecord[] = []
  for (const item of parsed.measurements) {
    const record = parseRecord(item)
    if (record) measurements.push(record)
  }
  return {
    version: 1,
    drawingName:
      typeof parsed.drawingName === 'string' ? parsed.drawingName : undefined,
    measurements
  }
}

function normalizeStyleForWrite(
  style: ApplicationMeasurementSidecarStyle
): ApplicationMeasurementSidecarStyle {
  const { strokeWidthWcs: _ignored, ...rest } = style
  return {
    ...rest,
    lineWeight: MEASUREMENT_LINE_WEIGHT
  }
}

/** Serialize a sidecar file to pretty-printed JSON. */
export function stringifyMeasurementSidecar(
  file: ApplicationMeasurementSidecarFile
): string {
  const normalized: ApplicationMeasurementSidecarFile = {
    ...file,
    measurements: file.measurements.map(m => ({
      ...m,
      style: normalizeStyleForWrite(m.style)
    }))
  }
  return `${JSON.stringify(normalized, null, 2)}\n`
}

/**
 * Suggested sidecar file name for a drawing.
 * @example measurementSidecarFileName('plan.dwg') → 'plan.measurement.json'
 */
export function measurementSidecarFileName(drawingName?: string): string {
  if (!drawingName) return 'drawing.measurement.json'
  const base = drawingName.replace(/\.(dwg|dxf)$/i, '')
  return `${base}.measurement.json`
}
