import { AcDbDatabase } from '@mlightcad/data-model'

/**
 * Runs a database mutation in a transaction unless one is already active.
 *
 * When a command has started a transaction via {@link AcEdCommand.trigger},
 * the callback runs directly inside it.
 *
 * @param db - Database to mutate.
 * @param fn - Mutation callback.
 * @returns The value returned by `fn`.
 */
export function acapRunServiceEdit<T>(db: AcDbDatabase, fn: () => T): T {
  if (db.transactionManager?.hasTransaction()) {
    return fn()
  }

  if (typeof db.runDatabaseEdit !== 'function') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[cad-simple-viewer] acapRunServiceEdit: database.runDatabaseEdit is unavailable; running without a transaction.'
      )
    }
    return fn()
  }

  let result!: T
  db.runDatabaseEdit(() => {
    result = fn()
  })
  return result
}
