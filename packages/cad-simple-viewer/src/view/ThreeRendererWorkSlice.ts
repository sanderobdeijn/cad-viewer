import { commonYieldForPaint } from '@mlightcad/common'
/**
 * Cooperative main-thread work budget for long smart-extents / spatial walks.
 *
 * Yields to the browser after {@link budgetMs} of continuous work so the busy
 * spinner can animate and Chromium does not treat the tab as hung.
 */
export class ThreeRendererWorkSlice {
  private lastYield = performance.now()

  /**
   * @param budgetMs - Soft cap on continuous work between yields (default 8 ms).
   */
  constructor(private readonly budgetMs = 8) {}

  /**
   * Yields when the budget since the last yield has been spent.
   */
  async maybeYield(): Promise<void> {
    if (performance.now() - this.lastYield < this.budgetMs) {
      return
    }
    await commonYieldForPaint()
    this.lastYield = performance.now()
  }

  /**
   * Always yields once (e.g. between algorithm phases).
   */
  async yieldNow(): Promise<void> {
    await commonYieldForPaint()
    this.lastYield = performance.now()
  }
}
