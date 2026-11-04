import { AcDbOpenMode } from '../src/base/AcDbOpenMode'
import { AcDbDatabase } from '../src/database/AcDbDatabase'

function createDatabase(options?: {
  isRecording?: boolean
  transactionEntity?: unknown
  fallbackEntity?: unknown
}) {
  const transaction = {
    getObject: jest.fn((_id: string, mode: AcDbOpenMode) => {
      if (options?.transactionEntity && mode === AcDbOpenMode.kForWrite) {
        return options.transactionEntity
      }
      if (options?.transactionEntity && mode === AcDbOpenMode.kForRead) {
        return options.transactionEntity
      }
      return undefined
    })
  }

  const db = new AcDbDatabase()
  db.getObjectById = jest.fn(() => options?.fallbackEntity) as never
  db.transactionManager.isRecording = jest.fn(
    () => options?.isRecording ?? false
  ) as never
  db.transactionManager.currentTransaction = jest.fn(() =>
    options?.transactionEntity || options?.isRecording ? transaction : null
  ) as never
  db.transactionManager.runInTransaction = jest.fn((fn: () => void) => {
    fn()
  }) as never

  return { db, transaction }
}

describe('AcDbDatabase edit shortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('openEntityForWrite prefers the active transaction', () => {
    const entity = { objectId: 'line-1' }
    const { db } = createDatabase({ transactionEntity: entity })

    expect(db.openEntityForWrite('line-1')).toBe(entity)
    expect(db.getObjectById).not.toHaveBeenCalled()
  })

  test('openEntityForRead opens with kForRead through the active transaction', () => {
    const entity = { objectId: 'line-1' }
    const { db, transaction } = createDatabase({ transactionEntity: entity })

    expect(db.openEntityForRead('line-1')).toBe(entity)
    expect(transaction.getObject).toHaveBeenCalledWith(
      'line-1',
      AcDbOpenMode.kForRead
    )
  })

  test('openEntityForWrite falls back to database lookup', () => {
    const entity = { objectId: 'line-1' }
    const { db } = createDatabase({ fallbackEntity: entity })

    expect(db.openEntityForWrite('line-1')).toBe(entity)
    expect(db.getObjectById).toHaveBeenCalled()
  })

  test('runDatabaseEdit joins the active transaction while recording', () => {
    const { db } = createDatabase({ isRecording: true })
    const fn = jest.fn()

    db.runDatabaseEdit(fn)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(db.transactionManager.runInTransaction).not.toHaveBeenCalled()
  })

  test('runDatabaseEdit starts a transaction', () => {
    const { db } = createDatabase({ isRecording: false })
    const fn = jest.fn()

    db.runDatabaseEdit(fn)

    expect(db.transactionManager.runInTransaction).toHaveBeenCalledWith(
      expect.any(Function)
    )
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
