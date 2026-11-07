import type { AcDbObject } from '../base/AcDbObject'
import type { AcDbDatabase } from '../database/AcDbDatabase'
import { AcDbDictionary } from '../object/AcDbDictionary'
import { AcDbMTextObjectContextData } from '../object/AcDbMTextObjectContextData'
import { AcDbScale } from '../object/AcDbScale'
import { AcDbXrecord } from '../object/AcDbXrecord'

const normalizeHandle = (handle?: string) =>
  handle ? handle.trim().toUpperCase() : ''

/** Extension-dictionary key that stores a viewport's annotation scale. */
export const ACDB_VIEWPORT_ANNOTATION_SCALE_XREC =
  'ASDK_XREC_ANNOTATION_SCALE_INFO'

/** XDATA app name that marks an entity as annotative. */
export const ACDB_ANNOTATIVE_XDATA_APP = 'AcadAnnotative'

/**
 * Runtime annotation-scale metadata attached to drawn annotative entities so
 * paper-space viewports can rescale or hide them for the active scale.
 */
export interface AcDbAnnotationScaleDrawInfo {
  /** Scale factor baked into the drawable geometry. */
  drawnScaleFactor: number
  /** Scale name baked into the drawable (when known). */
  drawnScaleName?: string
  /** Supported annotation scale factors (drawing/paper). */
  supportedScaleFactors: number[]
  /** Supported annotation scale names. */
  supportedScaleNames: string[]
}

/**
 * One per-scale representation resolved from an entity's context-data chain.
 */
export interface AcDbAnnotationScaleContext {
  scale: AcDbScale
  contextData?: AcDbMTextObjectContextData
  isDefault: boolean
}

/**
 * Resolves a SCALE object by handle or by scale name from ACAD_SCALELIST.
 */
export function acdbFindScale(
  db: AcDbDatabase,
  handleOrName?: string
): AcDbScale | undefined {
  if (!handleOrName) return undefined
  const key = normalizeHandle(handleOrName)
  const byId = db.getObjectById(key)
  if (byId instanceof AcDbScale) return byId

  const scaleDict = db.objects.scale
  const byName = scaleDict.getAt(handleOrName)
  if (byName instanceof AcDbScale) return byName

  for (const [, scale] of scaleDict.entries()) {
    if (scale.scaleName === handleOrName) return scale
  }
  return undefined
}

/**
 * Reads the viewport annotation scale from
 * `ASDK_XREC_ANNOTATION_SCALE_INFO` in the viewport extension dictionary.
 */
export function acdbGetViewportAnnotationScale(
  viewport: AcDbObject
): AcDbScale | undefined {
  const db = viewport.database
  const extId = viewport.extensionDictionary
  if (!db || !extId) return undefined

  const extDict = db.getObjectById(normalizeHandle(extId))
  if (!(extDict instanceof AcDbDictionary)) return undefined

  const entry = extDict.getAt(ACDB_VIEWPORT_ANNOTATION_SCALE_XREC)
  if (!entry) return undefined

  let scaleHandle: string | undefined
  if (entry instanceof AcDbXrecord) {
    const data = entry.data?.toArray() ?? []
    for (const item of data) {
      if (Number(item.code) === 340) {
        scaleHandle = String(item.value)
        break
      }
    }
  } else if (entry instanceof AcDbScale) {
    return entry
  }

  return acdbFindScale(db, scaleHandle)
}
