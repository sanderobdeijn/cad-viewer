import {
  geometryGetOcsAngle,
  geometryGetOcsReferenceVector,
  geometryTransformOcsPointToWcs,
  geometryTransformWcsPointToOcs
} from '../src'

describe('GeometryOcsUtil', () => {
  it('converts OCS points to WCS and back for negative Z extrusion', () => {
    const normal = { x: 0, y: 0, z: -1 }

    const wcs = geometryTransformOcsPointToWcs({ x: 1, y: 2 }, normal)
    expect(wcs).toMatchObject({ x: -1, y: 2 })

    const ocs = geometryTransformWcsPointToOcs(wcs, normal)
    expect(ocs).toMatchObject({ x: 1, y: 2 })
  })

  it('returns the OCS reference vector and angles in WCS coordinates', () => {
    const normal = { x: 0, y: 0, z: -1 }
    const refVec = geometryGetOcsReferenceVector(normal)

    expect(refVec).toMatchObject({ x: -1, y: 0 })

    const center = geometryTransformOcsPointToWcs({ x: 1, y: 2 }, normal)
    const start = geometryTransformOcsPointToWcs({ x: 2, y: 2 }, normal)
    const end = geometryTransformOcsPointToWcs({ x: 1, y: 3 }, normal)

    expect(geometryGetOcsAngle(center, start, normal)).toBeCloseTo(0, 8)
    expect(geometryGetOcsAngle(center, end, normal)).toBeCloseTo(Math.PI / 2, 8)
  })

  it('keeps the XY part when an extrusion tilts points out of the plane', () => {
    // Arbitrary Axis: Ax = Wz × N = (-1,0,0), Ay = N × Ax = (0,0,1)
    const wcs = geometryTransformOcsPointToWcs(
      { x: 1, y: 2 },
      { x: 0, y: 1, z: 0 }
    )
    expect(wcs.x).toBeCloseTo(-1, 8)
    expect(wcs.y).toBeCloseTo(0, 8)
  })
})
