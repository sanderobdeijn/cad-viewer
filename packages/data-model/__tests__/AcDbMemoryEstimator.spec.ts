import { GeometryPoint2d } from '@mlightcad/geometry-engine'

import { AcDbLine } from '../src/entity/AcDbLine'
import { AcDbProxyEntity } from '../src/entity/AcDbProxyEntity'
import {
  acdbEstimateDatabaseMemory,
  acdbFormatMemoryBytes,
  acdbFormatMemoryEstimate
} from '../src/misc/AcDbMemoryEstimator'
import {
  appendEntityToModelSpace,
  setupWorkingDatabase
} from '../test-utils/entityTestUtils'

describe('AcDbMemoryEstimator', () => {
  it('reports a stable lower bound for an empty default database', () => {
    const db = setupWorkingDatabase()
    const report = acdbEstimateDatabaseMemory(db)

    expect(report.totalBytes).toBeGreaterThan(10_000)
    expect(report.objectCount).toBeGreaterThan(10)
    expect(report.entityCount).toBe(0)
    expect(report.byCategory.tables?.bytes).toBeGreaterThan(0)
    expect(report.byCategory.sysvars?.bytes).toBeGreaterThan(0)
    expect(report.byCategory.handleRegistry?.bytes).toBeGreaterThan(0)
    expect(report.byCategory.events).toBeUndefined()
    expect(report.byCategory.transaction).toBeUndefined()
  })

  it('increases total and entity stats when lines are appended', () => {
    const db = setupWorkingDatabase()
    const before = acdbEstimateDatabaseMemory(db)

    for (let i = 0; i < 50; i++) {
      appendEntityToModelSpace(
        db,
        new AcDbLine(new GeometryPoint2d(i, 0), new GeometryPoint2d(i, 1))
      )
    }

    const after = acdbEstimateDatabaseMemory(db)

    expect(after.totalBytes).toBeGreaterThan(before.totalBytes)
    expect(after.entityCount).toBe(50)
    expect(after.byCategory.entities?.bytes).toBeGreaterThan(0)
    expect(after.byEntityType.Line?.count).toBe(50)
    expect(after.byEntityType.Line?.bytes).toBeGreaterThan(0)
    expect(after.objectCount).toBeGreaterThan(before.objectCount)
  })

  it('accounts for TypedArray proxy graphic payloads', () => {
    const db = setupWorkingDatabase()
    const before = acdbEstimateDatabaseMemory(db)

    const proxy = new AcDbProxyEntity()
    proxy.setProxyGraphic(new Uint8Array(20_000))
    appendEntityToModelSpace(db, proxy)

    const after = acdbEstimateDatabaseMemory(db)
    expect(after.totalBytes - before.totalBytes).toBeGreaterThan(15_000)
    expect(after.byEntityType.ProxyEntity?.count).toBe(1)
    expect(after.byEntityType.ProxyEntity?.bytes).toBeGreaterThan(15_000)
  })

  it('formats estimates for display', () => {
    const db = setupWorkingDatabase()
    const report = acdbEstimateDatabaseMemory(db)
    const text = acdbFormatMemoryEstimate(report)

    expect(acdbFormatMemoryBytes(512)).toBe('512 B')
    expect(acdbFormatMemoryBytes(2048)).toBe('2.00 KiB')
    expect(text).toContain('AcDbDatabase memory estimate:')
    expect(text).toContain('By category:')
    expect(text).toContain('tables:')
  })

  it('can optionally include transaction manager', () => {
    const db = setupWorkingDatabase()
    const without = acdbEstimateDatabaseMemory(db)
    const withTx = acdbEstimateDatabaseMemory(db, {
      includeTransactionManager: true
    })

    expect(withTx.totalBytes).toBeGreaterThanOrEqual(without.totalBytes)
    expect(withTx.byCategory.transaction?.bytes).toBeGreaterThan(0)
  })
})
