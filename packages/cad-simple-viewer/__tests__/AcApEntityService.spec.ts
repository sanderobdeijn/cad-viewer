import { AcDbDatabase, AcDbLine } from '@mlightcad/data-model'
import { GeometryMatrix3d, GeometryPoint2d } from '@mlightcad/geometry-engine'

import { AcApModelSync } from '../src/app/AcApModelSync'
import { AcEdOpenMode } from '../src/editor/view/AcEdOpenMode'
import { AcApEntityService } from '../src/service/AcApEntityService'

jest.mock('../src/command/measure/AcApMeasurementStore', () => ({
  listLayoutMeasurements: () => [],
  getMeasurementValueText: () => '',
  subscribeMeasurements: () => () => {}
}))

const createService = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  const sync = new AcApModelSync({ database: db, openMode: AcEdOpenMode.Write })
  const ids = sync.add([
    new AcDbLine(new GeometryPoint2d(0, 0), new GeometryPoint2d(10, 0)),
    new AcDbLine(new GeometryPoint2d(0, 0), new GeometryPoint2d(20, 0))
  ])
  return { sync, ids, service: new AcApEntityService(sync) }
}

describe('AcApEntityService', () => {
  test('eraseEntities returns the number of erased items', () => {
    const { sync, ids, service } = createService()

    expect(service.eraseEntities([ids[0], 'missing'])).toBe(1)
    expect(sync.model.items.map(item => item.id)).toEqual([ids[1]])
  })

  test('translateEntities moves items and keeps their ids', () => {
    const { sync, ids, service } = createService()

    const count = service.translateEntities(service.getEntitiesByIds(ids), {
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

    service.cloneAndTransform(service.getEntitiesByIds([ids[0]]), matrix)

    expect(sync.model.items).toHaveLength(3)
    expect(sync.model.toString()).toContain('start=(0, 5) end=(10, 5)')
    expect(sync.model.toString()).toContain(
      `Line id=${ids[0]} start=(0, 0) end=(10, 0)`
    )
  })
})
