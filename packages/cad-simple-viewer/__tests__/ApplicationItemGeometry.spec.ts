import {
  GeometryCircularArc2d,
  type GeometryDimension,
  GeometryEllipseArc2d,
  GeometryLine2d,
  GeometryMatrix2d,
  GeometryPoint2d,
  type GeometryPoint2dLike,
  GeometryPolyline2d,
  Model
} from '@mlightcad/geometry-engine'

import {
  type ApplicationItemContents,
  intersectItems,
  itemExtents,
  itemGripPoints,
  itemOffsetSide,
  itemOsnapPoints,
  moveItemGrips,
  offsetItem,
  transformItem
} from '../src/model/ApplicationItemGeometry'
import { ApplicationOsnapMode } from '../src/model/ApplicationOsnapMode'
import fixture from './fixtures/itemGeometry.json'

// The item operations must give what the data-model entity classes they
// replaced gave for the same geometry. The entity results are recorded in
// fixtures/itemGeometry.json.

type Xy = { x: number; y: number }

interface SampleRecord {
  contents: Record<string, unknown> & { kind: string }
  text: string
  grips: Xy[]
  moved: string[]
  osnap: Record<string, Xy[]>
  transformed: string
  extents: [Xy, Xy]
  offsetSides?: number[]
  offsets?: Record<string, string[]>
}

const samples = fixture.samples as unknown as Record<string, SampleRecord>
const intersections = fixture.intersections as unknown as [
  string,
  string,
  Xy[]
][]

const p = (point: Xy) => new GeometryPoint2d(point.x, point.y)

/** Builds the item contents that a fixture sample describes. */
function contentsOf(sample: SampleRecord): ApplicationItemContents {
  const c = sample.contents as unknown as Record<string, never>
  switch (sample.contents.kind) {
    case 'point':
      return { kind: 'point', geometry: p(c as unknown as Xy) }
    case 'dimension': {
      const points: Record<string, GeometryPoint2d> = {}
      for (const [key, value] of Object.entries(
        c.points as Record<string, Xy>
      )) {
        points[key] = p(value)
      }
      return {
        kind: 'dimension',
        geometry: {
          type: c.type,
          points,
          text: c.text
        } as unknown as GeometryDimension
      }
    }
    case 'line':
      return {
        kind: 'shape',
        geometry: new GeometryLine2d(p(c.start), p(c.end))
      }
    case 'arc':
      return {
        kind: 'shape',
        geometry: new GeometryCircularArc2d(
          p(c.center),
          c.radius,
          c.startAngle,
          c.endAngle,
          c.clockwise
        )
      }
    case 'ellipse':
      return {
        kind: 'shape',
        geometry: new GeometryEllipseArc2d(
          p(c.center),
          c.majorAxisRadius,
          c.minorAxisRadius,
          c.startAngle,
          c.endAngle,
          c.clockwise,
          c.rotation
        )
      }
    case 'polyline':
      return {
        kind: 'shape',
        geometry: new GeometryPolyline2d(
          (c.vertices as (Xy & { bulge: number })[]).map(v => ({ ...v })),
          c.closed
        )
      }
  }
  throw new Error(`unknown sample kind ${sample.contents.kind}`)
}

const line = (contents: ApplicationItemContents) =>
  Model.formatItem(contents as never).replace(/ measurement=\S+/, '')
const points = (list: readonly GeometryPoint2dLike[]) =>
  list.map(point => `(${point.x.toFixed(6)}, ${point.y.toFixed(6)})`)

const PICK = { x: 6, y: 9 }

describe('item geometry', () => {
  for (const [name, sample] of Object.entries(samples)) {
    describe(name, () => {
      it('is built as the entity described it', () => {
        expect(line(contentsOf(sample))).toBe(sample.text)
      })

      it('has the grip points of the entity', () => {
        const grips = itemGripPoints(contentsOf(sample))
        // Dimensions also had a grip at their text position, which a model
        // item does not have.
        expect(points(grips)).toEqual(
          points(sample.grips).slice(0, grips.length)
        )
      })

      it('moves each grip as the entity did', () => {
        const count = itemGripPoints(contentsOf(sample)).length
        for (let index = 0; index < count; index++) {
          expect(
            line(moveItemGrips(contentsOf(sample), [index], { x: 1.5, y: -2 }))
          ).toBe(sample.moved[index])
        }
      })

      it('has the snap points of the entity in every mode', () => {
        for (const [mode, expected] of Object.entries(sample.osnap)) {
          const actual = itemOsnapPoints(
            contentsOf(sample),
            Number(mode) as ApplicationOsnapMode,
            PICK
          )
          expect([mode, points(actual)]).toEqual([mode, points(expected)])
        }
      })

      it('transforms as the entity did', () => {
        const matrix = new GeometryMatrix2d()
          .makeTranslation(3, -4)
          .multiply(new GeometryMatrix2d().makeRotation(0.7))
        expect(line(transformItem(contentsOf(sample), matrix))).toBe(
          sample.transformed
        )
      })

      it('has the extents of the entity', () => {
        const actual = itemExtents(contentsOf(sample))
        expect(points([actual.min, actual.max])).toEqual(points(sample.extents))
      })

      if (sample.offsets) {
        it('offsets as the entity did', () => {
          const contents = contentsOf(sample)
          ;[
            { x: 20, y: 20 },
            { x: 2, y: 3 }
          ].forEach((side, index) => {
            expect(itemOffsetSide(contents, side)).toBe(
              sample.offsetSides![index]
            )
          })
          for (const distance of [1, -1]) {
            expect(offsetItem(contents, distance).map(line)).toEqual(
              sample.offsets![distance]
            )
          }
        })
      }
    })
  }

  it('finds the intersections the entities found', () => {
    for (const [a, b, expected] of intersections) {
      expect([
        a,
        b,
        points(intersectItems(contentsOf(samples[a]), contentsOf(samples[b])))
      ]).toEqual([a, b, points(expected)])
    }
  })
})
