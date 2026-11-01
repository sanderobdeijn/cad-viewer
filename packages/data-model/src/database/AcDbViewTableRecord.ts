import { defaults } from '@mlightcad/common'

import {
  AcDbAbstractViewTableRecord,
  AcDbAbstractViewTableRecordAttrs
} from './AcDbAbstractViewTableRecord'

/**
 * Interface defining the attributes for view table records.
 */
export interface AcDbViewTableRecordAttrs
  extends AcDbAbstractViewTableRecordAttrs {
  /** Standard flags for the view record */
  standardFlags: number
  /** View width in DCS */
  viewWidth: number
  /** Whether a UCS is associated with this view */
  ucsAssociated: boolean
  /** Whether the camera is plottable */
  cameraPlottable: boolean
  /** UCS elevation when a UCS is associated */
  ucsElevation: number
  /** Named UCS object ID (optional) */
  ucsObjectId?: string
  /** Base UCS object ID (optional) */
  ucsBaseObjectId?: string
  /** Background object ID for the view */
  backgroundObjectId?: string
  /** Live section object ID for the view */
  liveSectionObjectId?: string
  /** Hard-pointer ID to the sun object bound to this view (DXF group 361) */
  sunObjectId?: string
}

/**
 * Represents a view table record in AutoCAD.
 *
 * This class represents named views in AutoCAD, which store a camera-like
 * configuration including view direction, target, and display settings.
 *
 * @example
 * ```typescript
 * const viewRecord = new AcDbViewTableRecord();
 * viewRecord.name = 'Front';
 * viewRecord.viewWidth = 2000;
 * viewRecord.gsView.viewHeight = 1000;
 * ```
 */
export class AcDbViewTableRecord extends AcDbAbstractViewTableRecord<AcDbViewTableRecordAttrs> {
  /**
   * Creates a new AcDbViewTableRecord instance.
   *
   * @param attrs - Input attribute values for this view table record
   * @param defaultAttrs - Default values for attributes of this view table record
   */
  constructor(
    attrs?: Partial<AcDbViewTableRecordAttrs>,
    defaultAttrs?: Partial<AcDbViewTableRecordAttrs>
  ) {
    attrs = attrs || {}
    const viewWidthProvided = attrs.viewWidth !== undefined
    defaults(attrs, {
      standardFlags: 0,
      ucsAssociated: false,
      cameraPlottable: false,
      ucsElevation: 0
    })
    super(attrs, defaultAttrs)
    if (!viewWidthProvided) {
      this.viewWidth = this.viewHeight
    }
  }

  /**
   * Gets or sets the standard flags for this view record.
   */
  get standardFlags() {
    return this.getAttr('standardFlags')
  }
  set standardFlags(value: number) {
    this.setAttr('standardFlags', value)
  }

  /**
   * Gets or sets the view width in DCS.
   */
  get viewWidth() {
    return this.getAttr('viewWidth')
  }
  set viewWidth(value: number) {
    this.setAttr('viewWidth', value)
  }

  /**
   * Gets or sets whether a UCS is associated to this view.
   */
  get ucsAssociated() {
    return this.getAttr('ucsAssociated')
  }
  set ucsAssociated(value: boolean) {
    this.setAttr('ucsAssociated', value)
  }

  /**
   * Gets or sets whether the camera is plottable.
   */
  get cameraPlottable() {
    return this.getAttr('cameraPlottable')
  }
  set cameraPlottable(value: boolean) {
    this.setAttr('cameraPlottable', value)
  }

  /**
   * Gets or sets the UCS elevation when UCS is associated.
   */
  get ucsElevation() {
    return this.getAttr('ucsElevation')
  }
  set ucsElevation(value: number) {
    this.setAttr('ucsElevation', value)
  }

  /**
   * Gets or sets the named UCS object ID (optional).
   */
  get ucsObjectId() {
    return this.getAttrWithoutException('ucsObjectId')
  }
  set ucsObjectId(value: string | undefined) {
    this.setAttr('ucsObjectId', value)
  }

  /**
   * Gets or sets the base UCS object ID (optional).
   */
  get ucsBaseObjectId() {
    return this.getAttrWithoutException('ucsBaseObjectId')
  }
  set ucsBaseObjectId(value: string | undefined) {
    this.setAttr('ucsBaseObjectId', value)
  }

  /**
   * Gets or sets the background object ID (optional).
   */
  get backgroundObjectId() {
    return this.getAttrWithoutException('backgroundObjectId')
  }
  set backgroundObjectId(value: string | undefined) {
    this.setAttr('backgroundObjectId', value)
  }

  /**
   * Gets or sets the live section object ID (optional).
   */
  get liveSectionObjectId() {
    return this.getAttrWithoutException('liveSectionObjectId')
  }
  set liveSectionObjectId(value: string | undefined) {
    this.setAttr('liveSectionObjectId', value)
  }

  /**
   * Gets or sets the hard-pointer object ID to the sun bound to this view
   * (DXF group 361).
   */
  get sunObjectId() {
    return this.getAttrWithoutException('sunObjectId')
  }
  set sunObjectId(value: string | undefined) {
    this.setAttr('sunObjectId', value)
  }
}

