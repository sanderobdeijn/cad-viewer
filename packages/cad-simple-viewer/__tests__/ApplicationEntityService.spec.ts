import { GeometryLine2d, GeometryMatrix3d } from '@mlightcad/geometry-engine'

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

    const count = service.translateItems(service.getItemsByIds(ids), {
      x: 1,
      y: 2
    })

    expect(count).toBe(2)
    expect(sync.model.toString().split('\n')).toEqual([
      `Line id=${ids[0]} start=(1, 2) end=(11, 2)`,
      `Line id=${ids[1]} start=(1, 2) end=(21, 2)`
    ])
  })

  test('cloneAndTransform adds transformed copies', () => {
    const { sync, ids, service } = createService()
    const matrix = new GeometryMatrix3d().makeTranslation(0, 5, 0)

    service.cloneAndTransform(service.getItemsByIds([ids[0]]), matrix)

    expect(sync.model.items).toHaveLength(3)
    expect(sync.model.toString()).toContain('start=(0, 5) end=(10, 5)')
    expect(sync.model.toString()).toContain(
      `Line id=${ids[0]} start=(0, 0) end=(10, 0)`
    )
  })
})
