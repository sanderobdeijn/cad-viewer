import {
  GeometryArea2d,
  GeometryBox2d,
  GeometryBox3d,
  GeometryCircularArc2d,
  GeometryEllipseArc2d,
  GeometryUtil,
  GeometryLine2d,
  GeometryLoop2d,
  GeometryMatrix2d,
  GeometryMatrix3d,
  GeometryPlane,
  GeometryPoint2d,
  GeometryPolyline2d,
  GeometryQuaternion,
  GeometryVector2d,
  GeometryVector3d
} from '../src'

describe('geometry-engine public API coverage boost', () => {
  it('covers utility and point array helpers', () => {
    expect(
      GeometryUtil.isPointInPolygon(
        { x: 1, y: 1 },
        [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 2, y: 2 },
          { x: 0, y: 2 }
        ],
        true
      )
    ).toBe(true)

    expect(
      GeometryUtil.isPolygonIntersect(
        [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 2, y: 2 },
          { x: 0, y: 2 }
        ],
        [
          { x: 1, y: 1 },
          { x: 3, y: 1 },
          { x: 3, y: 3 },
          { x: 1, y: 3 }
        ]
      )
    ).toBe(true)

    expect(
      GeometryPoint2d.pointArrayToNumberArray([
        new GeometryPoint2d(1, 2),
        new GeometryPoint2d(3, 4)
      ])
    ).toEqual([1, 2, 3, 4])

    const flat2d = GeometryPoint2d.pointArrayToNumberArray([
      new GeometryPoint2d(1, 2),
      new GeometryPoint2d(4, 5)
    ])
    expect(flat2d.slice(0, 4)).toEqual([1, 2, 4, 5])
  })

  it('covers vector and matrix methods in 2d and 3d', () => {
    const v2 = new GeometryVector2d(1, -2)
    expect(v2.width).toBe(1)
    v2.width = 2
    v2.height = 3
    v2.set(2, 3)
      .setScalar(4)
      .setX(5)
      .setY(6)
      .setComponent(0, 7)
      .setComponent(1, 8)
    expect(v2.getComponent(0)).toBe(7)
    expect(
      v2.clone().copy({ x: 1, y: 1 }).add({ x: 1, y: 2 }).toArray()
    ).toEqual([2, 3])

    const v2b = new GeometryVector2d(2, 3)
    v2b
      .addScalar(1)
      .addVectors(new GeometryVector2d(1, 1), new GeometryVector2d(2, 2))
      .addScaledVector(new GeometryVector2d(2, 0), 0.5)
      .sub({ x: 1, y: 1 })
      .subScalar(1)
      .subVectors({ x: 3, y: 2 }, { x: 1, y: 1 })
      .multiply({ x: 2, y: 3 })
      .multiplyScalar(0.5)
      .divide(new GeometryVector2d(2, 3))
      .divideScalar(2)
      .applyMatrix2d(new GeometryMatrix2d().makeTranslation(1, 2))
      .min({ x: 1, y: 1 })
      .max({ x: 0, y: 0 })
      .clamp({ x: -1, y: -1 }, { x: 1, y: 1 })
      .clampScalar(-0.5, 0.5)
      .clampLength(0.1, 1)
      .floor()
      .ceil()
      .round()
      .roundToZero()
      .negate()

    expect(v2b.dot(new GeometryVector2d(1, 1))).toBeDefined()
    expect(v2b.cross(new GeometryVector2d(1, 0))).toBeDefined()
    expect(v2b.lengthSq()).toBeGreaterThanOrEqual(0)
    expect(v2b.length()).toBeGreaterThanOrEqual(0)
    expect(v2b.manhattanLength()).toBeGreaterThanOrEqual(0)
    v2b.set(3, 4)
    expect(v2b.normalize().length()).toBeCloseTo(1, 6)
    expect(v2b.angle()).toBeDefined()
    expect(v2b.angleTo(new GeometryVector2d(1, 0))).toBeGreaterThanOrEqual(0)
    expect(v2b.distanceTo({ x: 1, y: 2 })).toBeGreaterThanOrEqual(0)
    expect(v2b.distanceToSquared({ x: 1, y: 2 })).toBeGreaterThanOrEqual(0)
    expect(
      v2b.manhattanDistanceTo(new GeometryVector2d(1, 2))
    ).toBeGreaterThanOrEqual(0)
    expect(v2b.setLength(2).length()).toBeCloseTo(2, 5)
    expect(v2b.lerp(new GeometryVector2d(2, 2), 0.5)).toBeInstanceOf(
      GeometryVector2d
    )
    expect(
      v2b.lerpVectors(
        new GeometryVector2d(0, 0),
        new GeometryVector2d(2, 2),
        0.5
      )
    ).toBeInstanceOf(GeometryVector2d)
    expect(v2b.equals(v2b.clone())).toBe(true)
    expect(v2b.fromArray([9, 8]).toArray()).toEqual([9, 8])
    expect(v2b.toArray([], 2).slice(2)).toEqual([9, 8])
    expect(v2b.rotateAround({ x: 0, y: 0 }, Math.PI / 2)).toBeInstanceOf(
      GeometryVector2d
    )
    expect(v2b.random().x).toBeGreaterThanOrEqual(0)
    expect(v2b.relativeEps()).toBeGreaterThan(0)

    const m2 = new GeometryMatrix2d()
    const basisX = new GeometryVector3d()
    const basisY = new GeometryVector3d()
    const basisZ = new GeometryVector3d()
    m2.set(1, 2, 3, 4, 5, 6, 7, 8, 9)
      .identity()
      .copy(new GeometryMatrix2d().makeScale(2, 3))
      .extractBasis(basisX, basisY, basisZ)
      .setFromMatrix4(new GeometryMatrix3d().makeScale(2, 3, 1))
      .multiply(new GeometryMatrix2d().makeRotation(Math.PI / 4))
      .premultiply(new GeometryMatrix2d().makeTranslation(1, 2))
      .multiplyMatrices(
        new GeometryMatrix2d().makeScale(2, 2),
        new GeometryMatrix2d().makeTranslation(1, 1)
      )
      .multiplyScalar(0.5)
    expect(m2.determinant()).toBeDefined()
    expect(m2.clone().invert()).toBeInstanceOf(GeometryMatrix2d)
    expect(m2.transpose()).toBeInstanceOf(GeometryMatrix2d)
    expect(
      m2.getNormalMatrix(new GeometryMatrix3d().makeRotationX(0.2))
    ).toBeInstanceOf(GeometryMatrix2d)
    expect(m2.transposeIntoArray(new GeometryMatrix3d())).toBeInstanceOf(
      GeometryMatrix2d
    )
    expect(m2.setUvTransform(0, 0, 1, 1, 0.1, 0, 0)).toBeInstanceOf(
      GeometryMatrix2d
    )
    expect(m2.scale(2, 2).rotate(0.1).translate(1, 1)).toBeInstanceOf(
      GeometryMatrix2d
    )
    expect(m2.makeTranslation(new GeometryVector2d(2, 3), 0)).toBeInstanceOf(
      GeometryMatrix2d
    )
    expect(m2.makeRotation(0.2).makeScale(2, 3)).toBeInstanceOf(
      GeometryMatrix2d
    )
    expect(m2.equals(m2.clone())).toBe(true)
    expect(m2.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9]).toArray()).toHaveLength(9)

    const v3 = new GeometryVector3d(1, 2, 3)
    v3.set(2, 3, 4)
      .setScalar(3)
      .setX(1)
      .setY(2)
      .setZ(3)
      .setComponent(0, 4)
      .setComponent(1, 5)
      .setComponent(2, 6)
    expect(v3.getComponent(0)).toBe(4)
    expect(v3.clone().copy({ x: 1, y: 1, z: 1 }).toArray()).toEqual([1, 1, 1])

    const q = new GeometryQuaternion().setFromAxisAngle(
      GeometryVector3d.Z_AXIS,
      Math.PI / 3
    )
    const m3 = new GeometryMatrix3d().compose(
      new GeometryVector3d(1, 2, 3),
      q,
      new GeometryVector3d(2, 2, 2)
    )

    v3.add({ x: 1, y: 1, z: 1 })
      .addScalar(1)
      .addVectors({ x: 1, y: 1, z: 1 }, { x: 2, y: 2, z: 2 })
      .addScaledVector({ x: 1, y: 0, z: 0 }, 2)
      .sub({ x: 1, y: 1, z: 1 })
      .subScalar(1)
      .subVectors({ x: 5, y: 5, z: 5 }, { x: 1, y: 2, z: 3 })
      .multiply({ x: 2, y: 3, z: 4 })
      .multiplyScalar(0.5)
      .multiplyVectors({ x: 2, y: 2, z: 2 }, { x: 3, y: 3, z: 3 })
      .applyAxisAngle(GeometryVector3d.Z_AXIS, Math.PI / 2)
      .applyMatrix3(new GeometryMatrix2d().identity())
      .applyNormalMatrix(new GeometryMatrix2d().identity())
      .applyMatrix4(m3)
      .applyQuaternion(q)
      .transformDirection(new GeometryMatrix3d().makeRotationY(0.1))
      .divide({ x: 2, y: 2, z: 2 })
      .divideScalar(2)
      .min({ x: 0, y: 0, z: 0 })
      .max({ x: 1, y: 1, z: 1 })
      .clamp({ x: -1, y: -1, z: -1 }, { x: 1, y: 1, z: 1 })
      .clampScalar(-1, 1)
      .clampLength(0.2, 1)
      .floor()
      .ceil()
      .round()
      .roundToZero()
      .negate()

    expect(v3.dot({ x: 1, y: 0, z: 0 })).toBeDefined()
    expect(v3.isParallelTo(new GeometryVector3d(2, 0, 0))).toBeDefined()
    expect(v3.lengthSq()).toBeGreaterThanOrEqual(0)
    expect(v3.length()).toBeGreaterThanOrEqual(0)
    expect(v3.manhattanLength()).toBeGreaterThanOrEqual(0)
    v3.set(3, 4, 5)
    expect(v3.normalize().length()).toBeCloseTo(1, 6)
    expect(v3.setLength(2).length()).toBeCloseTo(2, 5)
    expect(v3.lerp({ x: 0, y: 0, z: 0 }, 0.5)).toBeInstanceOf(GeometryVector3d)
    expect(
      v3.lerpVectors({ x: 0, y: 0, z: 0 }, { x: 2, y: 2, z: 2 }, 0.5)
    ).toBeInstanceOf(GeometryVector3d)
    expect(v3.cross({ x: 1, y: 0, z: 0 })).toBeInstanceOf(GeometryVector3d)
    expect(
      v3.crossVectors({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })
    ).toBeInstanceOf(GeometryVector3d)
    expect(v3.projectOnVector(new GeometryVector3d(1, 0, 0))).toBeInstanceOf(
      GeometryVector3d
    )
    expect(v3.projectOnPlane(new GeometryVector3d(0, 0, 1))).toBeInstanceOf(
      GeometryVector3d
    )
    expect(v3.reflect({ x: 0, y: 1, z: 0 })).toBeInstanceOf(GeometryVector3d)
    expect(v3.angleTo(new GeometryVector3d(1, 0, 0))).toBeGreaterThanOrEqual(0)
    expect(v3.distanceTo({ x: 1, y: 1, z: 1 })).toBeGreaterThanOrEqual(0)
    expect(v3.distanceToSquared({ x: 1, y: 1, z: 1 })).toBeGreaterThanOrEqual(0)
    expect(v3.manhattanDistanceTo({ x: 1, y: 1, z: 1 })).toBeGreaterThanOrEqual(
      0
    )
    expect(
      v3
        .setFromMatrixPosition(new GeometryMatrix3d().makeTranslation(4, 5, 6))
        .toArray()
    ).toEqual([4, 5, 6])
    expect(
      v3.setFromMatrixScale(new GeometryMatrix3d().makeScale(2, 3, 4)).toArray()
    ).toEqual([2, 3, 4])
    expect(
      v3.setFromMatrixColumn(new GeometryMatrix3d().identity(), 0)
    ).toBeInstanceOf(GeometryVector3d)
    expect(
      v3.setFromMatrix3Column(new GeometryMatrix2d().identity(), 1)
    ).toBeInstanceOf(GeometryVector3d)
    expect(v3.equals(v3.clone())).toBe(true)
    expect(v3.fromArray([1, 2, 3]).toArray()).toEqual([1, 2, 3])
    expect(v3.random().x).toBeGreaterThanOrEqual(0)
    expect(v3.randomDirection().length()).toBeCloseTo(1, 6)

    const m4 = new GeometryMatrix3d()
    const xAxis = new GeometryVector3d()
    const yAxis = new GeometryVector3d()
    const zAxis = new GeometryVector3d()
    m4.set(1, 0, 0, 1, 0, 1, 0, 2, 0, 0, 1, 3, 0, 0, 0, 1)
      .identity()
      .copy(new GeometryMatrix3d().makeTranslation(1, 2, 3))
      .copyPosition(new GeometryMatrix3d().makeTranslation(4, 5, 6))
      .setFromMatrix3(new GeometryMatrix2d().identity())
      .setFromExtrusionDirection(new GeometryVector3d(0, 0, 1))
      .extractBasis(xAxis, yAxis, zAxis)
      .makeBasis(
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 0, z: 1 }
      )
      .extractRotation(new GeometryMatrix3d().makeRotationZ(0.2))
      .makeRotationFromQuaternion(
        new GeometryQuaternion().setFromAxisAngle(GeometryVector3d.X_AXIS, 0.2)
      )
      .lookAt(
        new GeometryVector3d(0, 0, 10),
        new GeometryVector3d(),
        GeometryVector3d.Y_AXIS
      )
      .multiply(new GeometryMatrix3d().makeScale(2, 2, 2))
      .premultiply(new GeometryMatrix3d().makeTranslation(1, 1, 1))
      .multiplyMatrices(
        new GeometryMatrix3d().makeRotationX(0.1),
        new GeometryMatrix3d().makeTranslation(1, 2, 3)
      )
      .multiplyScalar(0.5)
    expect(m4.determinant()).toBeDefined()
    expect(m4.transpose()).toBeInstanceOf(GeometryMatrix3d)
    expect(m4.setPosition(1, 2, 3)).toBeInstanceOf(GeometryMatrix3d)
    expect(m4.invert()).toBeInstanceOf(GeometryMatrix3d)
    expect(m4.scale(new GeometryVector3d(2, 2, 2))).toBeInstanceOf(
      GeometryMatrix3d
    )
    expect(m4.getMaxScaleOnAxis()).toBeGreaterThan(0)
    expect(
      m4.makeTranslation(new GeometryVector3d(1, 2, 3), 0, 0)
    ).toBeInstanceOf(GeometryMatrix3d)
    expect(
      m4.makeRotationX(0.1).makeRotationY(0.2).makeRotationZ(0.3)
    ).toBeInstanceOf(GeometryMatrix3d)
    expect(m4.makeRotationAxis(GeometryVector3d.Z_AXIS, 0.5)).toBeInstanceOf(
      GeometryMatrix3d
    )
    expect(m4.makeScale(2, 3, 4).makeShear(1, 0, 0, 0, 0, 0)).toBeInstanceOf(
      GeometryMatrix3d
    )
    expect(
      m4.compose(
        new GeometryVector3d(1, 2, 3),
        new GeometryQuaternion(),
        new GeometryVector3d(1, 1, 1)
      )
    ).toBeInstanceOf(GeometryMatrix3d)
    expect(
      m4.decompose(
        new GeometryVector3d(),
        new GeometryQuaternion(),
        new GeometryVector3d()
      )
    ).toBeInstanceOf(GeometryMatrix3d)
    expect(m4.equals(m4.clone())).toBe(true)
    expect(
      m4.fromArray(new Array(16).fill(0).map((_, i) => i + 1)).toArray()
    ).toHaveLength(16)
  })

  it('covers quaternion and euler methods', () => {
    const q = new GeometryQuaternion(0, 0, 0, 1)
    const dst = [0, 0, 0, 0]
    GeometryQuaternion.slerpFlat(dst, 0, [0, 0, 0, 1], 0, [0, 0, 1, 0], 0, 0.5)
    expect(dst[3]).toBeDefined()
    expect(
      GeometryQuaternion.multiplyQuaternionsFlat(
        dst,
        0,
        [0, 0, 0, 1],
        0,
        [0, 0, 1, 0],
        0
      )
    ).toBe(dst)

    let changed = 0
    q._onChange(() => {
      changed++
    })
    q.x = 0.1
    q.y = 0.2
    q.z = 0.3
    q.w = 0.9
    expect(changed).toBeGreaterThan(0)

    const qa = new GeometryQuaternion().setFromAxisAngle(
      GeometryVector3d.X_AXIS,
      0.2
    )
    const qb = new GeometryQuaternion().setFromAxisAngle(
      GeometryVector3d.Y_AXIS,
      0.3
    )
    expect(q.set(0, 0, 0, 1).clone().copy(qa)).toBeInstanceOf(
      GeometryQuaternion
    )
    expect(
      q.setFromRotationMatrix(new GeometryMatrix3d().makeRotationZ(0.1))
    ).toBeInstanceOf(GeometryQuaternion)
    expect(
      q.setFromUnitVectors(
        new GeometryVector3d(1, 0, 0),
        new GeometryVector3d(0, 1, 0)
      )
    ).toBeInstanceOf(GeometryQuaternion)
    expect(q.angleTo(qa)).toBeGreaterThanOrEqual(0)
    expect(q.rotateTowards(qa, 0.1)).toBeInstanceOf(GeometryQuaternion)
    expect(q.identity().invert().conjugate()).toBeInstanceOf(GeometryQuaternion)
    expect(q.dot(qa)).toBeDefined()
    expect(q.lengthSq()).toBeDefined()
    expect(q.length()).toBeDefined()
    expect(q.normalize().length()).toBeCloseTo(1, 6)
    expect(
      q.multiply(qa).premultiply(qb).multiplyQuaternions(qa, qb)
    ).toBeInstanceOf(GeometryQuaternion)
    expect(q.slerp(qa, 0.3)).toBeInstanceOf(GeometryQuaternion)
    expect(q.slerpQuaternions(qa, qb, 0.5)).toBeInstanceOf(GeometryQuaternion)
    expect(q.random().length()).toBeCloseTo(1, 6)
    expect(q.equals(q.clone())).toBe(true)
    expect(q.fromArray([1, 2, 3, 4], 0).toArray()).toEqual([1, 2, 3, 4])
    expect(q.toJSON()).toHaveLength(4)
  })

  it('covers box and plane methods', () => {
    const b2 = new GeometryBox2d()
    b2.set({ x: 0, y: 0 }, { x: 1, y: 1 })
      .setFromPoints([
        { x: 0, y: 0 },
        { x: 2, y: 3 }
      ])
      .setFromCenterAndSize({ x: 1, y: 1 }, { x: 2, y: 4 })
    expect(b2.clone().copy(b2)).toBeInstanceOf(GeometryBox2d)
    expect(b2.makeEmpty().isEmpty()).toBe(true)
    b2.set({ x: 0, y: 0 }, { x: 2, y: 2 })
    expect(b2.getCenter(new GeometryVector2d()).toArray()).toEqual([1, 1])
    expect(b2.getSize(new GeometryVector2d()).toArray()).toEqual([2, 2])
    expect(b2.center).toBeInstanceOf(GeometryVector2d)
    expect(b2.size).toBeInstanceOf(GeometryVector2d)
    expect(b2.expandByPoint({ x: 3, y: -1 })).toBeInstanceOf(GeometryBox2d)
    expect(b2.expandByVector({ x: 1, y: 1 })).toBeInstanceOf(GeometryBox2d)
    expect(b2.expandByScalar(1)).toBeInstanceOf(GeometryBox2d)
    expect(b2.containsPoint({ x: 1, y: 1 })).toBe(true)
    expect(
      b2.containsBox(new GeometryBox2d({ x: 0, y: 0 }, { x: 1, y: 1 }))
    ).toBe(true)
    expect(
      b2.getParameter({ x: 1, y: 1 }, new GeometryVector2d())
    ).toBeInstanceOf(GeometryVector2d)
    expect(
      b2.intersectsBox(new GeometryBox2d({ x: 1, y: 1 }, { x: 4, y: 4 }))
    ).toBe(true)
    expect(
      b2.clampPoint({ x: 10, y: 10 }, new GeometryVector2d()).toArray()
    ).toEqual([5, 4])
    expect(b2.distanceToPoint({ x: 5, y: 5 })).toBeGreaterThan(0)
    expect(
      b2.clone().intersect(new GeometryBox2d({ x: 1, y: 1 }, { x: 2, y: 2 }))
    ).toBeInstanceOf(GeometryBox2d)
    expect(
      b2.clone().union(new GeometryBox2d({ x: -1, y: -1 }, { x: 0, y: 0 }))
    ).toBeInstanceOf(GeometryBox2d)
    expect(b2.translate({ x: 1, y: 1 })).toBeInstanceOf(GeometryBox2d)
    expect(b2.equals(b2.clone())).toBe(true)

    const b3 = new GeometryBox3d()
    b3.set({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
      .setFromArray([0, 0, 0, 2, 3, 4])
      .setFromPoints([
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 2, z: 2 }
      ])
      .setFromCenterAndSize({ x: 1, y: 1, z: 1 }, { x: 2, y: 2, z: 2 })
    expect(b3.clone().copy(b3)).toBeInstanceOf(GeometryBox3d)
    expect(b3.makeEmpty().isEmpty()).toBe(true)
    b3.set({ x: 0, y: 0, z: 0 }, { x: 2, y: 2, z: 2 })
    expect(b3.getCenter(new GeometryVector3d()).toArray()).toEqual([1, 1, 1])
    expect(b3.getSize(new GeometryVector3d()).toArray()).toEqual([2, 2, 2])
    expect(b3.center).toBeInstanceOf(GeometryVector3d)
    expect(b3.size).toBeInstanceOf(GeometryVector3d)
    expect(b3.expandByPoint({ x: 3, y: -1, z: 0 })).toBeInstanceOf(
      GeometryBox3d
    )
    expect(b3.expandByVector({ x: 1, y: 1, z: 1 })).toBeInstanceOf(
      GeometryBox3d
    )
    expect(b3.expandByScalar(1)).toBeInstanceOf(GeometryBox3d)
    expect(b3.containsPoint({ x: 1, y: 1, z: 1 })).toBe(true)
    expect(
      b3.containsBox(
        new GeometryBox3d({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })
      )
    ).toBe(true)
    expect(
      b3.getParameter({ x: 1, y: 1, z: 1 }, new GeometryVector3d())
    ).toBeInstanceOf(GeometryVector3d)
    expect(
      b3.intersectsBox(
        new GeometryBox3d({ x: 1, y: 1, z: 1 }, { x: 4, y: 4, z: 4 })
      )
    ).toBe(true)

    const plane = new GeometryPlane().setComponents(0, 0, 1, -1)
    expect(b3.intersectsPlane(plane)).toBe(true)
    expect(
      b3.clampPoint({ x: 10, y: 10, z: 10 }, new GeometryVector3d())
    ).toBeInstanceOf(GeometryVector3d)
    expect(b3.distanceToPoint({ x: 5, y: 5, z: 5 })).toBeGreaterThan(0)
    expect(
      b3
        .clone()
        .intersect(
          new GeometryBox3d({ x: 1, y: 1, z: 1 }, { x: 2, y: 2, z: 2 })
        )
    ).toBeInstanceOf(GeometryBox3d)
    expect(
      b3
        .clone()
        .union(new GeometryBox3d({ x: -1, y: -1, z: -1 }, { x: 0, y: 0, z: 0 }))
    ).toBeInstanceOf(GeometryBox3d)
    expect(
      b3.applyMatrix4(new GeometryMatrix3d().makeTranslation(1, 2, 3))
    ).toBeInstanceOf(GeometryBox3d)
    expect(b3.translate({ x: -1, y: -2, z: -3 })).toBeInstanceOf(GeometryBox3d)
    expect(b3.equals(b3.clone())).toBe(true)

    const p2 = new GeometryPlane()
      .set({ x: 0, y: 1, z: 0 }, -2)
      .setFromNormalAndCoplanarPoint(
        { x: 0, y: 1, z: 0 },
        new GeometryVector3d(0, 2, 0)
      )
      .setFromCoplanarPoints(
        new GeometryVector3d(0, 0, 0),
        new GeometryVector3d(1, 0, 0),
        new GeometryVector3d(0, 0, 1)
      )
    expect(p2.copy(plane)).toBeInstanceOf(GeometryPlane)
    expect(p2.normalize().negate()).toBeInstanceOf(GeometryPlane)
    expect(p2.distanceToPoint({ x: 0, y: 0, z: 0 })).toBeDefined()
    expect(
      p2.projectPoint({ x: 1, y: 3, z: 1 }, new GeometryVector3d())
    ).toBeInstanceOf(GeometryVector3d)
    expect(
      p2.intersectsBox(
        new GeometryBox3d({ x: -1, y: -1, z: -1 }, { x: 1, y: 1, z: 1 })
      )
    ).toBe(true)
    expect(p2.coplanarPoint(new GeometryVector3d())).toBeInstanceOf(
      GeometryVector3d
    )
    expect(
      p2.applyMatrix4(
        new GeometryMatrix3d().makeTranslation(0, 1, 0),
        new GeometryMatrix2d()
      )
    ).toBeInstanceOf(GeometryPlane)
    expect(p2.translate(new GeometryVector3d(0, 1, 0))).toBeInstanceOf(
      GeometryPlane
    )
    expect(p2.equals(p2.clone())).toBe(true)
  })

  it('covers representative geometry class public methods', () => {
    const line2 = new GeometryLine2d({ x: 0, y: 0 }, { x: 2, y: 0 })
    expect(line2.length).toBeCloseTo(2, 6)
    line2.startPoint = { x: 1, y: 1 }
    line2.endPoint = { x: 3, y: 1 }
    expect(line2.getPoints()).toHaveLength(2)
    expect(line2.calculateBoundingBox()).toBeInstanceOf(GeometryBox2d)
    expect(
      line2.transform(new GeometryMatrix2d().makeTranslation(1, 1))
    ).toBeInstanceOf(GeometryLine2d)
    expect(line2.closed).toBe(false)
    expect(
      line2.copy(new GeometryLine2d({ x: 0, y: 0 }, { x: 1, y: 1 }))
    ).toBeInstanceOf(GeometryLine2d)
    expect(line2.clone()).toBeInstanceOf(GeometryLine2d)

    const line3 = new GeometryLine2d({ x: 0, y: 0 }, { x: 2, y: 0 })
    expect(line3.direction.length()).toBeCloseTo(1, 6)
    expect(line3.isPointOnLine({ x: 1, y: 0 })).toBe(true)
    expect(line3.atLength(1).x).toBeCloseTo(3, 6)
    expect(line3.atLength(1, true).x).toBeCloseTo(1, 6)
    expect(line3.perpPoint({ x: 1, y: 1 })).toBeInstanceOf(GeometryPoint2d)
    expect(line3.extend(1).endPoint.x).toBeCloseTo(3, 6)
    expect(line3.extend(1, true).startPoint.x).toBeCloseTo(-1, 6)
    expect(
      line3.transform3d(new GeometryMatrix3d().makeTranslation(1, 1, 1))
        .startPoint
    ).toMatchObject({ x: 0, y: 1 })

    const poly = new GeometryPolyline2d([
      { x: 0, y: 0 },
      { x: 3, y: 0, bulge: 1 },
      { x: 3, y: 3 }
    ])
    expect(poly.vertices).toHaveLength(3)
    expect(poly.numberOfVertices).toBe(3)
    expect(poly.closed).toBe(false)
    poly.closed = true
    expect(poly.startPoint).toBeInstanceOf(GeometryPoint2d)
    expect(poly.endPoint).toBeInstanceOf(GeometryPoint2d)
    expect(poly.length).toBeGreaterThan(0)
    poly.addVertexAt(0, { x: -1, y: 0 })
    poly.removeVertexAt(0)
    poly.reset(true, 2)
    poly.addVertexAt(2, { x: 2, y: 2 })
    expect(poly.getPointAt(0)).toBeInstanceOf(GeometryPoint2d)
    expect(poly.calculateBoundingBox()).toBeInstanceOf(GeometryBox2d)
    expect(
      poly.transform(new GeometryMatrix2d().makeScale(-1, 1))
    ).toBeInstanceOf(GeometryPolyline2d)
    expect(poly.getPoints(6).length).toBeGreaterThan(0)
    poly.translate({ x: 1, y: 2 })

    const loop = new GeometryLoop2d([
      new GeometryLine2d({ x: 0, y: 0 }, { x: 2, y: 0 }),
      new GeometryLine2d({ x: 2, y: 0 }, { x: 2, y: 2 }),
      new GeometryLine2d({ x: 2, y: 2 }, { x: 0, y: 2 }),
      new GeometryLine2d({ x: 0, y: 2 }, { x: 0, y: 0 })
    ])
    expect(loop.curves).toHaveLength(4)
    loop.add(new GeometryLine2d({ x: 0, y: 0 }, { x: 0, y: 0 }))
    expect(loop.numberOfEdges).toBe(5)
    expect(loop.startPoint).toBeInstanceOf(GeometryPoint2d)
    expect(loop.endPoint).toBeInstanceOf(GeometryPoint2d)
    expect(loop.length).toBeGreaterThan(0)
    expect(loop.calculateBoundingBox()).toBeInstanceOf(GeometryBox2d)
    expect(
      loop.transform(new GeometryMatrix2d().makeTranslation(1, 1))
    ).toBeInstanceOf(GeometryLoop2d)
    expect(loop.closed).toBe(true)
    expect(loop.getPoints(5).length).toBeGreaterThan(0)

    const builtLoops = GeometryLoop2d.buildFromEdges([
      new GeometryLine2d({ x: 0, y: 0 }, { x: 1, y: 0 }),
      new GeometryLine2d({ x: 1, y: 0 }, { x: 1, y: 1 }),
      new GeometryLine2d({ x: 1, y: 1 }, { x: 0, y: 1 }),
      new GeometryLine2d({ x: 0, y: 1 }, { x: 0, y: 0 })
    ])
    expect(builtLoops.length).toBeGreaterThan(0)

    const area = new GeometryArea2d()
    area.add(loop)
    area.add(
      new GeometryPolyline2d(
        [
          { x: 0.2, y: 0.2 },
          { x: 0.8, y: 0.2 },
          { x: 0.8, y: 0.8 },
          { x: 0.2, y: 0.8 }
        ],
        true
      )
    )
    expect(area.loops).toHaveLength(2)
    expect(area.outter).toBeDefined()
    expect(area.calculateBoundingBox()).toBeInstanceOf(GeometryBox2d)
    expect(
      area.transform(new GeometryMatrix2d().makeTranslation(1, 0))
    ).toBeInstanceOf(GeometryArea2d)
    expect(area.getPoints(8)).toHaveLength(2)
    expect(area.buildHierarchy().index).toBe(-1)
    expect(area.area).toBeGreaterThan(0)

    const ellipse2 = new GeometryEllipseArc2d(
      { x: 0, y: 0 },
      4,
      2,
      0,
      Math.PI,
      false,
      0.2
    )
    expect(ellipse2.calculateBoundingBox()).toBeInstanceOf(GeometryBox2d)
    expect(ellipse2.getPoint(0.25)).toBeInstanceOf(GeometryPoint2d)
    expect(
      ellipse2.transform(new GeometryMatrix2d().makeTranslation(1, 1))
    ).toBeInstanceOf(GeometryEllipseArc2d)
    expect(ellipse2.copy(ellipse2.clone())).toBeInstanceOf(GeometryEllipseArc2d)

    const ellipse3 = new GeometryEllipseArc2d({ x: 0, y: 0 }, 4, 2, 0, Math.PI)
    expect(ellipse3.minorAxis).toBeInstanceOf(GeometryVector2d)
    expect(ellipse3.midPoint.y).toBeCloseTo(2, 6)
    expect(ellipse3.isCircular).toBe(false)
    expect(ellipse3.length).toBeGreaterThan(0)
    expect(ellipse3.area).toBe(0)
    expect(ellipse3.closed).toBe(false)
    expect(ellipse3.getPoints(8).length).toBe(9)
    expect(ellipse3.offset(1)?.majorAxisRadius).toBe(5)
    expect(ellipse3.offset(-3)).toBeNull()
    expect(
      ellipse3.transform3d(new GeometryMatrix3d().makeScale(1.5, 0.5, 1))
    ).toBeInstanceOf(GeometryEllipseArc2d)

    const circ2 = new GeometryCircularArc2d(
      { x: 0, y: 0 },
      2,
      0,
      Math.PI,
      false
    )
    expect(circ2.clone()).toBeInstanceOf(GeometryCircularArc2d)
    const rev = new GeometryLoop2d([
      new GeometryLine2d({ x: 0, y: 0 }, { x: 1, y: 0 }),
      new GeometryCircularArc2d({ x: 1, y: 1 }, 1, -Math.PI / 2, 0, false),
      new GeometryEllipseArc2d({ x: 0, y: 1 }, 1, 0.5, 0, Math.PI / 2, false, 0)
    ])
    expect(rev.getPoints(4).length).toBeGreaterThan(0)
  })
})
