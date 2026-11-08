import {
  constrainToTracking,
  isPolarTrackingEnabled,
  POLARMODE_POLAR_TRACKING,
  togglePolarTracking
} from '../src/editor/input/EditorPolarTracking'
import { useTestSettings } from './helpers/settings'

describe('polar tracking', () => {
  const reference = { x: 0, y: 0 }

  beforeEach(() => {
    useTestSettings({
      polarMode: 0,
      polarAngle: 90,
      polarAdditionalAngles: '',
      angleBase: 0,
      angleDirection: 0
    })
  })

  it('reports disabled when POLARMODE bit 2 is clear', () => {
    expect(isPolarTrackingEnabled()).toBe(false)
  })

  it('reports enabled when POLARMODE bit 2 is set', () => {
    useTestSettings({ polarMode: POLARMODE_POLAR_TRACKING })
    expect(isPolarTrackingEnabled()).toBe(true)
  })

  it('toggles polar tracking in the settings', () => {
    expect(togglePolarTracking()).toBe(POLARMODE_POLAR_TRACKING)
    expect(isPolarTrackingEnabled()).toBe(true)
    expect(togglePolarTracking()).toBe(0)
  })

  it('locks to 90° increments when polar tracking is on', () => {
    useTestSettings({ polarMode: POLARMODE_POLAR_TRACKING })

    const cursor = { x: 10, y: 8 }
    const constrained = constrainToTracking(cursor, reference)
    const distance = Math.hypot(cursor.x, cursor.y)
    expect(constrained.x).toBeCloseTo(distance, 5)
    expect(constrained.y).toBeCloseTo(0, 5)
  })

  it('uses POLARANG increment when set to 45°', () => {
    useTestSettings({ polarMode: POLARMODE_POLAR_TRACKING, polarAngle: 45 })

    const constrained = constrainToTracking({ x: 10, y: 8 }, reference)
    const angle = Math.atan2(constrained.y, constrained.x)
    expect(angle).toBeCloseTo(Math.PI / 4, 5)
  })
})
