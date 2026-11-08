/** @jest-environment jsdom */

import {
  applicationClampMeasureBadgeFontSize,
  applicationEstimateMeasureBadgeWidthPx,
  applicationMeasureBadgeChromePx,
  applicationScaleMeasureOverlayPx,
  applicationScreenAngleBadgeRefLengthPx,
  applicationScreenArcLengthPx,
  applicationScreenAreaBadgeRefLengthPx
} from '../src/util/ApplicationMeasureBadgeFont'

const originalGetContext = HTMLCanvasElement.prototype.getContext

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => null)
})

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext
})

describe('applicationClampMeasureBadgeFontSize', () => {
  it('keeps the preferred size when the capsule fits in half the segment', () => {
    const text = '12.34'
    const fontSize = 13
    const width = applicationEstimateMeasureBadgeWidthPx(text, fontSize)
    const linePx = width * 2 + 20
    expect(applicationClampMeasureBadgeFontSize(text, fontSize, linePx)).toBe(fontSize)
  })

  it('shrinks the font so the capsule is at most half the segment', () => {
    const text = '1234.567 m'
    const fontSize = 24
    const preferredWidth = applicationEstimateMeasureBadgeWidthPx(text, fontSize)
    const linePx = preferredWidth * 0.6
    const clamped = applicationClampMeasureBadgeFontSize(text, fontSize, linePx)
    expect(clamped).toBeLessThan(fontSize)
    const clampedWidth = applicationEstimateMeasureBadgeWidthPx(text, clamped)
    expect(clampedWidth).toBeLessThanOrEqual(linePx * 0.5 + 0.5)
  })

  it('scales capsule chrome with font size', () => {
    const at13 = applicationMeasureBadgeChromePx(13)
    const at6_5 = applicationMeasureBadgeChromePx(6.5)
    expect(at6_5).toBeLessThan(at13)
    expect(at6_5).toBeCloseTo(at13 / 2, 5)
  })

  it('returns a minimal size when the segment is empty', () => {
    expect(applicationClampMeasureBadgeFontSize('1', 13, 0.5)).toBe(1)
  })
})

describe('applicationScaleMeasureOverlayPx', () => {
  it('scales arrows with the font clamp ratio', () => {
    expect(applicationScaleMeasureOverlayPx(12, 13, 13)).toBe(12)
    expect(applicationScaleMeasureOverlayPx(12, 13, 6.5)).toBeCloseTo(6, 5)
  })
})

const identity = (p: { x: number; y: number }) => p

describe('acap screen badge reference lengths', () => {
  it('uses half the shorter angle arm (arc radius)', () => {
    expect(
      applicationScreenAngleBadgeRefLengthPx(
        identity,
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 0, y: 40 }
      )
    ).toBe(20)
  })

  it('scales arc length by screen radius ratio', () => {
    const worldToScreen = (p: { x: number; y: number }) => ({
      x: p.x * 2,
      y: p.y * 2
    })
    expect(
      applicationScreenArcLengthPx(worldToScreen, { x: 0, y: 0 }, 10, Math.PI * 10)
    ).toBeCloseTo(Math.PI * 20, 5)
  })

  it('uses the shorter of min edge and twice centroid-to-edge for area', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ]
    // Centroid is (50,50); nearest edge distance is 50; 2× = 100; min edge = 100.
    expect(applicationScreenAreaBadgeRefLengthPx(identity, square)).toBe(100)
  })
})
