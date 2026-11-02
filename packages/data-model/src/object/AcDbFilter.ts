import { GeometryPoint2d } from '@mlightcad/geometry-engine'

import { AcDbObject } from '../base/AcDbObject'

/**
 * Abstract base class for filter objects used with the AutoCAD index/filter
 * scheme.
 *
 * An {@link AcDbFilter} defines a query used when iterating block data through
 * filtered block iterators. The corresponding index class is obtained through
 * {@link AcDbFilter.indexClass}.
 *
 * @remarks
 * Mirrors the ObjectARX `AcDbFilter` class. Applications that provide a custom
 * indexing scheme typically also implement matching
 * {@link AcDbIndex} and filtered-block-iterator types.
 *
 * @see https://help.autodesk.com/view/OARX/2024/ENU/?guid=OARX-RefGuide-AcDbFilter
 *
 * @example
 * ```typescript
 * class MyFilter extends AcDbFilter {
 *   indexClass(): string {
 *     return 'MyIndex';
 *   }
 * }
 * ```
 */
export abstract class AcDbFilter extends AcDbObject {
  /**
   * Clip boundary vertices in OCS (SPATIAL_FILTER DXF groups 10/20).
   *
   * @remarks
   * These fields represent the generic clip-boundary data used by
   * `AcDbSpatialFilter` (DXF type `SPATIAL_FILTER`). No concrete spatial
   * filter class exists in this port yet (no `SPATIAL_FILTER` DXF reader
   * wiring), so this data is captured here for forward compatibility;
   * subclasses like {@link AcDbLayerFilter} simply never populate it.
   */
  private _boundaryVertices: GeometryPoint2d[] = []
  /** Normal to the plane containing the clip boundary (DXF group 210). */
  private _clipBoundaryNormal?: GeometryPoint2d
  /** Origin of the clip boundary's local coordinate system (DXF group 11). */
  private _clipBoundaryOrigin?: GeometryPoint2d
  /** Whether the clip boundary is displayed (DXF group 71). */
  private _clipBoundaryDisplayEnabled = false
  /** Whether front clipping is enabled (DXF group 72). */
  private _frontClippingEnabled = false
  /** Front clipping plane distance, when enabled (DXF group 40). */
  private _frontClippingDistance?: number
  /** Whether back clipping is enabled (DXF group 73). */
  private _backClippingEnabled = false
  /** Back clipping plane distance, when enabled (DXF group 41). */
  private _backClippingDistance?: number

  /**
   * Creates a new {@link AcDbFilter} instance.
   */
  constructor() {
    super()
  }

  /**
   * Gets the clip boundary vertices in OCS (SPATIAL_FILTER DXF groups 10/20).
   */
  get boundaryVertices(): readonly GeometryPoint2d[] {
    return this._boundaryVertices
  }

  /**
   * Sets the clip boundary vertices in OCS (SPATIAL_FILTER DXF groups 10/20).
   */
  set boundaryVertices(value: readonly GeometryPoint2d[]) {
    this._boundaryVertices = value.map(vertex => vertex.clone())
  }

  /**
   * Gets the normal to the plane containing the clip boundary
   * (DXF group 210).
   */
  get clipBoundaryNormal() {
    return this._clipBoundaryNormal
  }

  /**
   * Sets the normal to the plane containing the clip boundary
   * (DXF group 210).
   */
  set clipBoundaryNormal(value: GeometryPoint2d | undefined) {
    this._clipBoundaryNormal = value?.clone()
  }

  /**
   * Gets the origin of the clip boundary's local coordinate system
   * (DXF group 11).
   */
  get clipBoundaryOrigin() {
    return this._clipBoundaryOrigin
  }

  /**
   * Sets the origin of the clip boundary's local coordinate system
   * (DXF group 11).
   */
  set clipBoundaryOrigin(value: GeometryPoint2d | undefined) {
    this._clipBoundaryOrigin = value?.clone()
  }

  /**
   * Gets whether the clip boundary is displayed (DXF group 71).
   */
  get clipBoundaryDisplayEnabled() {
    return this._clipBoundaryDisplayEnabled
  }

  /**
   * Sets whether the clip boundary is displayed (DXF group 71).
   */
  set clipBoundaryDisplayEnabled(value: boolean) {
    this._clipBoundaryDisplayEnabled = value
  }

  /**
   * Gets whether front clipping is enabled (DXF group 72).
   */
  get frontClippingEnabled() {
    return this._frontClippingEnabled
  }

  /**
   * Sets whether front clipping is enabled (DXF group 72).
   */
  set frontClippingEnabled(value: boolean) {
    this._frontClippingEnabled = value
  }

  /**
   * Gets the front clipping plane distance (DXF group 40).
   */
  get frontClippingDistance() {
    return this._frontClippingDistance
  }

  /**
   * Sets the front clipping plane distance (DXF group 40).
   */
  set frontClippingDistance(value: number | undefined) {
    this._frontClippingDistance = value
  }

  /**
   * Gets whether back clipping is enabled (DXF group 73).
   */
  get backClippingEnabled() {
    return this._backClippingEnabled
  }

  /**
   * Sets whether back clipping is enabled (DXF group 73).
   */
  set backClippingEnabled(value: boolean) {
    this._backClippingEnabled = value
  }

  /**
   * Gets the back clipping plane distance (DXF group 41).
   */
  get backClippingDistance() {
    return this._backClippingDistance
  }

  /**
   * Sets the back clipping plane distance (DXF group 41).
   */
  set backClippingDistance(value: number | undefined) {
    this._backClippingDistance = value
  }

  /**
   * Returns the class name of the {@link AcDbIndex}-derived type required to
   * process this filter.
   *
   * @remarks
   * In ObjectARX this method returns an `AcRxClass*`. This TypeScript port
   * returns the class name string instead.
   *
   * @returns The index class name associated with this filter.
   */
  abstract indexClass(): string
}
