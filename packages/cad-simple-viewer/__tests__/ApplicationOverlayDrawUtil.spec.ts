/** @jest-environment jsdom */

import {
  APPLICATION_OVERLAY_ARROW_WCS,
  APPLICATION_OVERLAY_STROKE_WCS,
  applicationOverlayArrowSize,
  applicationOverlayDash,
  applicationScaledOverlayArrowSize,
  applicationScaledOverlayLineWidth,
  applicationScaleWcsWithFont,
  applicationSeedOverlaySizesFromWcs
} from '../src/command/overlay/ApplicationOverlayDrawUtil'
import type { EditorBaseView } from '../src/editor'

function mockView(ppu: number): EditorBaseView {
  return {
    worldToScreen: (p: { x: number; y: number }) => ({
      x: p.x * ppu,
      y: p.y * ppu
    }),
    internalCamera: { zoom: 2 }
  } as unknown as EditorBaseView
}

describe('ApplicationOverlayDrawUtil WCS stroke', () => {
  it('uses re-seeded dataset when explicit strokeWidthWcs is omitted', () => {
    const view = mockView(10)
    const canvas = document.createElement('canvas')

    applicationSeedOverlaySizesFromWcs(view, {
      strokeWidthWcs: 0.2,
      canvases: [canvas]
    })
    expect(canvas.dataset[APPLICATION_OVERLAY_STROKE_WCS]).toBe('0.2')

    // Simulate style edit: seed new WCS, then redraw without stale constructor WCS.
    applicationSeedOverlaySizesFromWcs(view, {
      strokeWidthWcs: 0.4,
      canvases: [canvas]
    })
    expect(applicationScaledOverlayLineWidth(2.5, canvas, view)).toBe(4)

    // Explicit stale WCS would overwrite the seeded dataset (the bug we fixed).
    expect(applicationScaledOverlayLineWidth(2.5, canvas, view, 0.2)).toBe(2)
    expect(canvas.dataset[APPLICATION_OVERLAY_STROKE_WCS]).toBe('0.2')
  })

  it('uses a 1px hairline and clears stored WCS when base width is 0', () => {
    const view = mockView(10)
    const canvas = document.createElement('canvas')
    canvas.dataset[APPLICATION_OVERLAY_STROKE_WCS] = '0.4'

    expect(applicationScaledOverlayLineWidth(0, canvas, view, 0.4)).toBe(1)
    expect(canvas.dataset[APPLICATION_OVERLAY_STROKE_WCS]).toBeUndefined()
  })

  it('clears stored stroke WCS when seeding a hairline overlay', () => {
    const view = mockView(10)
    const canvas = document.createElement('canvas')
    canvas.dataset[APPLICATION_OVERLAY_STROKE_WCS] = '0.4'

    applicationSeedOverlaySizesFromWcs(view, {
      strokeScreenPx: 0,
      canvases: [canvas]
    })
    expect(canvas.dataset[APPLICATION_OVERLAY_STROKE_WCS]).toBeUndefined()
  })

  it('seeds element baseZoom only from matched text screen/WCS pair', () => {
    const view = mockView(10)
    const el = {
      scaleWithView: true,
      baseZoom: undefined as number | undefined
    }
    const canvas = document.createElement('canvas')

    applicationSeedOverlaySizesFromWcs(view, {
      fontSizePx: 13,
      strokeWidthWcs: 0.4,
      strokeScreenPx: 2.5,
      elements: [el as never],
      canvases: [canvas]
    })
    expect(el.baseZoom).toBeUndefined()
    expect(canvas.dataset[APPLICATION_OVERLAY_STROKE_WCS]).toBe('0.4')

    applicationSeedOverlaySizesFromWcs(view, {
      fontSizePx: 13,
      textHeightWcs: 1.3,
      arrowSizeWcs: 1.2,
      elements: [el as never],
      canvases: [canvas]
    })
    // base = (13 * 2) / (1.3 * 10) = 2
    expect(el.baseZoom).toBe(2)
    expect(canvas.dataset[APPLICATION_OVERLAY_ARROW_WCS]).toBe('1.2')
  })

  it('seeds arrow WCS independently of the text screen/WCS pair', () => {
    const canvas = document.createElement('canvas')
    applicationSeedOverlaySizesFromWcs(mockView(10), {
      arrowSizeWcs: 1.2,
      canvases: [canvas]
    })
    expect(canvas.dataset[APPLICATION_OVERLAY_ARROW_WCS]).toBe('1.2')
  })
})

describe('ApplicationOverlayDrawUtil arrow and dash scale', () => {
  it('scales arrow head with the view-synced stroke', () => {
    expect(applicationOverlayArrowSize(2, 2)).toBe(12)
    expect(applicationOverlayArrowSize(4, 2)).toBe(24)
    expect(applicationOverlayArrowSize(2.5, 2.5)).toBe(12)
  })

  it('scales dash pattern with the view-synced stroke', () => {
    expect(applicationOverlayDash(2, 2)).toEqual([8, 5])
    expect(applicationOverlayDash(4, 2)).toEqual([16, 10])
  })

  it('keeps a 12px arrow for hairline strokes', () => {
    expect(applicationOverlayArrowSize(1, 0)).toBe(12)
  })

  it('freezes committed distance arrows as WCS on first paint', () => {
    const canvas = document.createElement('canvas')
    expect(applicationScaledOverlayArrowSize(canvas, mockView(10))).toBe(12)
    expect(Number(canvas.dataset[APPLICATION_OVERLAY_ARROW_WCS])).toBeCloseTo(1.2)
    expect(applicationScaledOverlayArrowSize(canvas, mockView(5))).toBeCloseTo(6)
  })

  it('uses imported arrowSizeWcs instead of seeding from screen pixels', () => {
    const canvas = document.createElement('canvas')
    expect(applicationScaledOverlayArrowSize(canvas, mockView(10), 2.4)).toBeCloseTo(
      24
    )
    expect(Number(canvas.dataset[APPLICATION_OVERLAY_ARROW_WCS])).toBe(2.4)
  })

  it('scales WCS overlay sizes with font changes', () => {
    expect(applicationScaleWcsWithFont(1.2, 12, 24)).toBeCloseTo(2.4)
    expect(applicationScaleWcsWithFont(1.2, 12, 12)).toBe(1.2)
    expect(applicationScaleWcsWithFont(undefined, 12, 24)).toBeUndefined()
  })

  it('seeds cloud lobe WCS from the stroke screen/WCS pair', () => {
    const view = mockView(10)
    const canvas = document.createElement('canvas')
    applicationSeedOverlaySizesFromWcs(view, {
      strokeWidthWcs: 0.4,
      strokeScreenPx: 2.5,
      canvases: [canvas]
    })
    expect(canvas.dataset.overlayCloudWcs).toBe('1.28')

    applicationSeedOverlaySizesFromWcs(view, {
      strokeWidthWcs: 0.8,
      strokeScreenPx: 2.5,
      canvases: [canvas]
    })
    expect(canvas.dataset.overlayCloudWcs).toBe('2.56')
  })
})
