import { CommonTransparencyMethod } from './CommonTransparencyMethod'

/**
 * Class representing transparency similar to AutoCAD’s `CommonTransparency`.
 *
 * Stores both method and alpha information.
 */
export class CommonTransparency {
  /** The transparency interpretation method. */
  private _method: CommonTransparencyMethod

  /**
   * Alpha value in range 0–255 where:
   * - 0 is fully transparent
   * - 255 is fully opaque
   *
   * Only valid when the method is `ByAlpha`.
   */
  private _alpha: number

  /**
   * Creates a new transparency object.
   *
   * @param alpha
   *   When provided, constructs with `ByAlpha` method and sets alpha.
   *   Must be between 0 and 255.
   */
  constructor(alpha?: number) {
    if (alpha !== undefined) {
      this._method = CommonTransparencyMethod.ByAlpha
      this._alpha = CommonTransparency.clampAlpha(alpha)
    } else {
      this._method = CommonTransparencyMethod.ByLayer
      this._alpha = 255
    }
  }

  /** Gets the current transparency method */
  get method(): CommonTransparencyMethod {
    return this._method
  }

  /**
   * Sets the transparency method.
   * If setting to ByAlpha with no prior alpha, alpha stays 255 (opaque).
   *
   * @param method The new transparency method
   */
  set method(method: CommonTransparencyMethod) {
    this._method = method
  }

  /**
   * Gets the alpha value.
   * Only meaningful if `method === ByAlpha`.
   */
  get alpha(): number {
    return this._alpha
  }

  /**
   * Sets the alpha value and force the method to `ByAlpha`.
   *
   * @param alpha 0–255 alpha, clamped internally if out of range
   */
  set alpha(alpha: number) {
    this._alpha = CommonTransparency.clampAlpha(alpha)
    this._method = CommonTransparencyMethod.ByAlpha
  }

  /**
   * Gets the AutoCAD-style transparency percentage.
   *
   * Mapping rules:
   * - 0%   = fully opaque  (alpha = 255)
   * - 100% = fully transparent (alpha = 0)
   *
   * This matches how AutoCAD displays and stores transparency
   * values in UI and DXF files.
   *
   * If the transparency method is not `ByAlpha`,
   * this method returns `undefined`, because AutoCAD
   * does not define a percentage for ByLayer or ByBlock.
   *
   * @returns Transparency percentage (0–100), or undefined
   */
  get percentage(): number | undefined {
    if (this._method !== CommonTransparencyMethod.ByAlpha) {
      return undefined
    }

    return Math.round((1 - this._alpha / 255) * 100)
  }

  /**
   * Sets the transparency using an AutoCAD-style percentage.
   *
   * Mapping rules (AutoCAD compatible):
   * - 0%   → fully opaque      (alpha = 255)
   * - 100% → fully transparent (alpha = 0)
   *
   * Internally, the alpha value is calculated as:
   *   alpha = round(255 × (1 − percentage / 100))
   *
   * This method:
   * - Forces the transparency method to `ByAlpha`
   * - Clamps the percentage to the range 0–100
   * - Preserves ObjectARX value semantics
   *
   * @param percentage Transparency percentage (0–100)
   * @returns This instance (for fluent chaining)
   *
   * @example
   * const t = new CommonTransparency();
   * t.setPercentage(50); // ≈ alpha 128
   *
   * t.setPercentage(0);   // alpha = 255 (opaque)
   * t.setPercentage(100); // alpha = 0   (clear)
   */
  set percentage(percentage: number) {
    const p = Math.max(0, Math.min(100, percentage))
    const alpha = Math.round(255 * (1 - p / 100))
    this.alpha = alpha
  }

  /**
   * Ensures alpha always stays within 0–255.
   */
  private static clampAlpha(alpha: number): number {
    return Math.max(0, Math.min(255, Math.floor(alpha)))
  }

  /**
   * True if the method is `ByAlpha`.
   */
  get isByAlpha(): boolean {
    return this._method === CommonTransparencyMethod.ByAlpha
  }

  /**
   * True if the method is `ByBlock`.
   */
  get isByBlock(): boolean {
    return this._method === CommonTransparencyMethod.ByBlock
  }

  /**
   * True if the method is `ByLayer`.
   */
  get isByLayer(): boolean {
    return this._method === CommonTransparencyMethod.ByLayer
  }

  /**
   * True if transparency is exactly clear (alpha==0 and ByAlpha).
   */
  get isClear(): boolean {
    return this.isByAlpha && this._alpha === 0
  }

  /**
   * True if transparency is solid (alpha==255 and ByAlpha).
   */
  get isSolid(): boolean {
    return this.isByAlpha && this._alpha === 255
  }

  /**
   * True if current state is invalid (ErrorValue).
   */
  get isInvalid(): boolean {
    return this._method === CommonTransparencyMethod.ErrorValue
  }

  /**
   * Convert this transparency to an integer suitable for storage.
   * Uses a simple bit-encoding: high­bits for method and low­bits for alpha.
   *
   * 31          24 23          8 7          0
   * +-------------+--------------+------------+
   * |  flags      |   reserved   |  alpha     |
   * +-------------+--------------+------------+
   */
  serialize(): number {
    const methodVal = this._method
    return (methodVal << 24) | this._alpha
  }

  /**
   * Creates a deep copy of this transparency object.
   *
   * This mirrors the value-semantics of ObjectARX `CommonTransparency`,
   * where copying results in an independent object with the same
   * transparency method and alpha value.
   *
   * @returns A new `CommonTransparency` instance with identical state.
   */
  clone(): CommonTransparency {
    const copy = new CommonTransparency()
    copy._method = this._method
    copy._alpha = this._alpha
    return copy
  }

  /**
   * Compares this transparency with another one for equality.
   *
   * Two `CommonTransparency` objects are considered equal if:
   * - Their transparency methods are identical
   * - Their alpha values are identical
   *
   * This mirrors the value semantics of ObjectARX
   * `CommonTransparency`.
   *
   * @param other The transparency to compare with
   * @returns True if both represent the same transparency
   *
   * @example
   * const a = new CommonTransparency(128);
   * const b = new CommonTransparency(128);
   * a.equals(b); // true
   */
  equals(other: CommonTransparency): boolean {
    return this._method === other._method && this._alpha === other._alpha
  }

  /**
   * Returns a human-readable string representation of the transparency.
   *
   * Behavior:
   * - `"ByLayer"` if transparency is inherited from layer
   * - `"ByBlock"` if transparency is inherited from block
   * - Numeric alpha value (`"0"`–`"255"`) if method is `ByAlpha`
   *
   * This format is intentionally simple and mirrors common
   * AutoCAD UI and DXF text usage.
   *
   * @returns String representation of the transparency
   *
   * @example
   * new CommonTransparency().toString();        // "ByLayer"
   * new CommonTransparency(128).toString();     // "128"
   */
  toString(): string {
    if (this.isByLayer) return 'ByLayer'
    if (this.isByBlock) return 'ByBlock'
    return this._alpha.toString()
  }

  /**
   * Creates an `CommonTransparency` instance from a string representation.
   *
   * Accepted formats:
   * - `""`, `"."`, `"use current"` or `"ByLayer"` (case-insensitive)
   * - `"ByBlock"` (case-insensitive)
   * - Transparency percentage `"0"`–`"90"`
   * - Numeric alpha value `"91"`–`"255"` for compatibility
   *
   * Invalid or out-of-range values will produce an
   * `ErrorValue` transparency.
   *
   * @param value String to parse
   * @returns Parsed `CommonTransparency` instance
   *
   * @example
   * CommonTransparency.fromString("ByLayer");
   * CommonTransparency.fromString("25");
   * CommonTransparency.fromString("ByBlock");
   */
  static fromString(value: string): CommonTransparency {
    const v = value.trim()
    const normalized = v.toLowerCase()

    if (
      normalized === '' ||
      normalized === '.' ||
      normalized === 'use current' ||
      normalized === 'bylayer'
    ) {
      const t = new CommonTransparency()
      t._method = CommonTransparencyMethod.ByLayer
      return t
    }

    if (normalized === 'byblock') {
      const t = new CommonTransparency()
      t._method = CommonTransparencyMethod.ByBlock
      return t
    }

    const numericValue = Number(v)
    if (
      Number.isInteger(numericValue) &&
      numericValue >= 0 &&
      numericValue <= 255
    ) {
      const t = new CommonTransparency()
      if (numericValue <= 90) {
        t.percentage = numericValue
      } else {
        t.alpha = numericValue
      }
      return t
    }

    // Invalid input → ErrorValue
    const t = new CommonTransparency()
    t._method = CommonTransparencyMethod.ErrorValue
    return t
  }

  /**
   * Deserialize an integer back into a transparency object.
   *
   * @param value 32-bit stored transparency representation
   */
  static deserialize(value: number): CommonTransparency {
    const methodIndex = (value >>> 24) & 0xff
    const alpha = value & 0xff
    const method =
      methodIndex >= CommonTransparencyMethod.ByLayer &&
      methodIndex <= CommonTransparencyMethod.ErrorValue
        ? methodIndex
        : CommonTransparencyMethod.ErrorValue
    const t = new CommonTransparency()
    t._method = method as CommonTransparencyMethod
    t._alpha = CommonTransparency.clampAlpha(alpha)
    return t
  }
}
