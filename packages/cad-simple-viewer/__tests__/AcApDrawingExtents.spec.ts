import {
  GeometryBox2d,
  GeometryBox3d,
  GeometryPoint2d
} from '@mlightcad/geometry-engine'

import {
  box3dToBox2d,
  resolveDrawingExtents
} from '../src/util/AcApDrawingExtents'

describe('resolveDrawingExtents', () => {
  it('prefers drawable scene extents over stale header EXTMIN/EXTMAX', () => {
    const scene = new GeometryBox2d(
      new GeometryPoint2d(-765, -680),
      new GeometryPoint2d(667, 506)
    )
    const header = new GeometryBox3d(
      new GeometryPoint2d(-2669, -7979),
      new GeometryPoint2d(24573, 3859)
    )

    const resolved = resolveDrawingExtents(
      { getDrawingExtents: () => scene },
      { extents: header }
    )

    expect(resolved).toBe(scene)
  })

  it('falls back to header extents when the scene has no geometry', () => {
    const header = new GeometryBox3d(
      new GeometryPoint2d(10, 20),
      new GeometryPoint2d(30, 40)
    )

    const resolved = resolveDrawingExtents(
      { getDrawingExtents: () => undefined },
      { extents: header }
    )

    expect(resolved).toEqual(box3dToBox2d(header))
  })

  it('returns undefined when both scene and header are empty', () => {
    const resolved = resolveDrawingExtents(
      { getDrawingExtents: () => new GeometryBox2d() },
      { extents: new GeometryBox3d() }
    )

    expect(resolved).toBeUndefined()
  })
})
