import { GeometryLine2d, GeometryMatrix2d } from '@mlightcad/geometry-engine'

import { ApplicationModelSync } from '../src/app/ApplicationModelSync'
import { EditorOpenMode } from '../src/editor/view/EditorOpenMode'
import { ApplicationEntityService } from '../src/service/ApplicationEntityService'

jest.mock('../src/command/measure/ApplicationMeasurementStore', () => ({
  listLayoutMeasurements: () => [],
  getMeasurementValueText: () => '',
  subscribeMeasurements: () => () => {}
}))

const createService = () => {
  const sync = new ApplicationModelSync({ openMode: EditorOpenMode.Write })
  const ids = sync.addItems(
    [10, 20].map(x => ({
      kind: 'shape' as const,
      geometry: new GeometryLine2d({ x: 0, y: 0 }, { x, y: 0 })
    }))
  )
  return { sync, ids, service: new ApplicationEntityService(sync) }
}

describe('ApplicationEntityService', () => {
  test('eraseItems returns the number of erased items', () => {
    const { sync, ids, service } = createService()

    expect(service.eraseItems([ids[0], 'missing'])).toBe(1)
    expect(sync.model.items.map(item => item.id)).toEqual([ids[1]])
  })

  test('translateItems moves items and keeps their ids', () => {
    const { sync, ids, service } = createService()
    const [a, b] = sync.model.items.map(item =>
      (item.geometry as GeometryLine2d).getPoints().map(point => point.id)
    )

    const count = service.translateItems(service.getItemsByIds(ids), {
      x: 1,
      y: 2
    })

    expect(count).toBe(2)
    expect(sync.model.toString().split('\n')).toEqual([
      `Line id=${ids[0]} start=point(${a[0]}, 1, 2) end=point(${a[1]}, 11, 2)`,
      `Line id=${ids[1]} start=point(${b[0]}, 1, 2) end=point(${b[1]}, 21, 2)`
    ])
  })

  test('cloneAndTransform adds transformed copies', () => {
    const { sync, ids, service } = createService()
    const matrix = new GeometryMatrix2d().makeTranslation(0, 5)

    service.cloneAndTransform(service.getItemsByIds([ids[0]]), matrix)

    const [original, , copy] = sync.model.items
    const pointIds = (item: typeof copy) =>
      (item.geometry as GeometryLine2d).getPoints().map(point => point.id)
    expect(sync.model.items).toHaveLength(3)
    expect(copy.id).not.toBe(ids[0])
    expect((copy.geometry as GeometryLine2d).getPoints()).toEqual([
      expect.objectContaining({ x: 0, y: 5 }),
      expect.objectContaining({ x: 10, y: 5 })
    ])
    // The copy gets ends of its own; the original keeps its ends.
    expect(pointIds(copy)).not.toContain(pointIds(original)[0])
    expect(pointIds(copy)).not.toContain(pointIds(original)[1])
    expect((original.geometry as GeometryLine2d).startPoint.y).toBe(0)
  })
})
