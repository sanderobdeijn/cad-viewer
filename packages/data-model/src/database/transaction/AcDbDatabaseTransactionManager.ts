import { AcDbObject } from '../../base'
import { AcDbEntity } from '../../entity/AcDbEntity'
import { AcDbDatabase, AcDbLayerModifiedEventArgs } from '../AcDbDatabase'
import { AcDbSysVarManager, AcDbSysVarType } from '../AcDbSysVarManager'
import {
  AcDbChangeApplier,
  acdbCollectChangeEntities,
  acdbCollectDictionaryChanges,
  acdbCollectLayerModifications
} from './AcDbChangeApplier'
import { AcDbChangeContainer } from './AcDbDatabaseChange'
import { AcDbDatabaseTransaction } from './AcDbDatabaseTransaction'

/**
 * Manages database transactions for one {@link AcDbDatabase}.
 *
 * Aligns with ObjectARX {@code AcDbTransactionManager} semantics.
 */
export class AcDbDatabaseTransactionManager {
  private readonly transactionStack: AcDbDatabaseTransaction[] = []
  private readonly changeApplier: AcDbChangeApplier
  private _rollingBack = false
  private readonly _pendingEntityModified = new Set<AcDbEntity>()
  private readonly _pendingLayerModified = new Map<
    string,
    AcDbLayerModifiedEventArgs
  >()

  /**
   * When true, mutations outside an active transaction throw an error.
   *
   * Rollback is exempt so {@link AcDbChangeApplier} can restore state.
   */
  strictMode = false

  /**
   * Creates a transaction manager for one database.
   *
   * @param database - Database whose mutations are managed
   */
  constructor(private readonly database: AcDbDatabase) {
    this.changeApplier = new AcDbChangeApplier(database)
  }

  /**
   * Starts a new database transaction and pushes it onto the stack.
   *
   * Equivalent to ObjectARX `AcDbTransactionManager::startTransaction()`.
   *
   * @returns The newly created transaction
   */
  startTransaction(): AcDbDatabaseTransaction {
    const tr = new AcDbDatabaseTransaction(this.database)
    this.transactionStack.push(tr)
    return tr
  }

  /**
   * Returns the top-most active transaction, if any.
   */
  currentTransaction(): AcDbDatabaseTransaction | undefined {
    return this.transactionStack[this.transactionStack.length - 1]
  }

  /**
   * Returns true when at least one transaction is active.
   */
  hasTransaction(): boolean {
    return this.transactionStack.length > 0
  }

  /**
   * Returns true when mutations should be recorded into the current transaction.
   *
   * Recording is disabled while a transaction is being rolled back.
   */
  isRecording(): boolean {
    return this.hasTransaction() && !this._rollingBack
  }

  /**
   * Returns true while {@link AcDbChangeApplier} is rolling back a transaction.
   */
  isRollingBack(): boolean {
    return this._rollingBack
  }

  /**
   * Returns true when the object was opened for write in an active transaction.
   *
   * Used by {@link AcDbSymbolTableRecord.assertOpenForWrite} to enforce ObjectARX
   * write semantics. A modify entry in a transaction recorder indicates the object
   * was opened with {@link AcDbOpenMode.kForWrite}, including entries merged from
   * nested transactions.
   *
   * @param objectId - Object identifier to check
   */
  isOpenedForWriteInTransaction(objectId: string): boolean {
    for (const tr of this.transactionStack) {
      if (tr.recorder.hasModify(objectId)) {
        return true
      }
    }
    return false
  }

  /**
   * Commits the current transaction.
   *
   * Nested transactions merge their recorder into the parent. The outermost
   * commit finalizes changes and dispatches events.
   *
   * @throws Error if no transaction is active
   */
  commitTransaction(): void {
    const tr = this.transactionStack.pop()
    if (!tr) {
      throw new Error('No active transaction to commit.')
    }

    if (this.transactionStack.length > 0) {
      const parent = this.transactionStack[this.transactionStack.length - 1]
      parent.recorder.mergeFrom(tr.recorder)
      tr.commit()
      return
    }

    tr.recorder.finalize(this.database)
    const changes = tr.recorder.getChanges()
    tr.commit()

    if (changes.length > 0) {
      this.dispatchCommitEvents(changes)
    }
  }

  /**
   * Aborts the current transaction and rolls back all recorded changes.
   *
   * @throws Error if no transaction is active
   */
  abortTransaction(): void {
    const tr = this.transactionStack.pop()
    if (!tr) {
      throw new Error('No active transaction to abort.')
    }

    const changes = [...tr.recorder.getChanges()]

    this.database.beginEventBatch()
    this._rollingBack = true
    try {
      tr.abort()
      if (changes.length > 0) {
        this.changeApplier.applyInverse(changes)
      }
    } finally {
      this._rollingBack = false
      this.database.endEventBatch()
    }
  }

  /**
   * Records append of an object into a container during the active transaction.
   *
   * No-op when {@link isRecording} is false.
   *
   * @param container - Container that received the object
   * @param object - Object that was appended
   */
  recordAppend(container: AcDbChangeContainer, object: AcDbObject): void {
    if (!this.isRecording()) {
      return
    }
    this.currentTransaction()?.recorder.recordAppend(container, object)
  }

  /**
   * Records removal of an object from a container during the active transaction.
   *
   * No-op when {@link isRecording} is false.
   *
   * @param container - Container that owned the removed object
   * @param object - Object that was removed
   */
  recordRemove(container: AcDbChangeContainer, object: AcDbObject): void {
    if (!this.isRecording()) {
      return
    }
    this.currentTransaction()?.recorder.recordRemove(container, object)
  }

  /**
   * Records the pre-change value of a system variable.
   *
   * No-op when {@link isRecording} is false.
   *
   * @param name - System variable name
   * @param before - Value observed before mutation
   */
  recordSysvar(name: string, before: unknown): void {
    if (!this.isRecording()) {
      return
    }
    this.currentTransaction()?.recorder.recordSysvar(name, before)
  }

  /**
   * Maps a symbol table instance to the stable name stored in change records.
   *
   * @param table - Symbol table whose logical name is needed
   * @returns Known table name, or the table's object ID as a fallback
   */
  resolveSymbolTableName(table: { objectId: string }): string {
    const tables = this.database.tables
    if (table === tables.appIdTable) return 'appIdTable'
    if (table === tables.blockTable) return 'blockTable'
    if (table === tables.dimStyleTable) return 'dimStyleTable'
    if (table === tables.linetypeTable) return 'linetypeTable'
    if (table === tables.textStyleTable) return 'textStyleTable'
    if (table === tables.viewTable) return 'viewTable'
    if (table === tables.layerTable) return 'layerTable'
    if (table === tables.viewportTable) return 'viewportTable'
    return table.objectId
  }

  /**
   * Runs a callback inside one transaction.
   *
   * On success the transaction is committed. On failure it is rolled back and
   * the error is rethrown.
   *
   * @param fn - Callback that performs the edit using the active transaction
   * @returns The value returned by `fn`
   */
  runInTransaction<T>(fn: (tr: AcDbDatabaseTransaction) => T): T {
    this.startTransaction()
    try {
      const result = fn(this.currentTransaction()!)
      this.commitTransaction()
      return result
    } catch (error) {
      if (this.hasTransaction()) {
        this.abortTransaction()
      }
      throw error
    }
  }

  /**
   * Dispatches entity, dictionary, and sysvar events after a successful commit.
   *
   * @param changes - Finalized changes from the committed outermost transaction
   */
  private dispatchCommitEvents(
    changes: import('./AcDbDatabaseChange').AcDbDatabaseChange[]
  ): void {
    const { modified, appended, erased } = acdbCollectChangeEntities(
      this.database,
      changes
    )

    for (const entity of modified) {
      this.dispatchEntityModified(entity)
    }
    if (appended.length > 0) {
      this.database.notifyEntityAppended(appended)
    }
    if (erased.length > 0) {
      this.database.notifyEntityErased(erased)
    }

    const { set: dictSet, erased: dictErased } = acdbCollectDictionaryChanges(
      this.database,
      changes
    )
    for (const { object, key } of dictSet) {
      this.database.notifyDictObjectSet(object, key)
    }
    for (const { object, key } of dictErased) {
      this.database.notifyDictObjectErased(object, key)
    }

    for (const change of changes) {
      if (change.kind === 'sysvar' && change.after !== undefined) {
        AcDbSysVarManager.instance().events.sysVarChanged.dispatch({
          database: this.database,
          name: change.name,
          oldVal: change.before as AcDbSysVarType,
          newVal: change.after as AcDbSysVarType
        })
      }
    }

    for (const args of acdbCollectLayerModifications(this.database, changes)) {
      this.dispatchLayerModified(args)
    }
  }

  /**
   * Dispatches or queues a layer-modified notification after commit.
   */
  private dispatchLayerModified(args: AcDbLayerModifiedEventArgs): void {
    if (this.database.isEventBatched()) {
      const existing = this._pendingLayerModified.get(args.layer.objectId)
      if (existing) {
        existing.changes = { ...existing.changes, ...args.changes }
        return
      }
      this._pendingLayerModified.set(args.layer.objectId, {
        database: args.database,
        layer: args.layer,
        changes: { ...args.changes }
      })
      return
    }
    this.database.events.layerModified.dispatch(args)
  }

  /**
   * Dispatches or queues an entity-modified notification after commit.
   */
  private dispatchEntityModified(entity: AcDbEntity): void {
    if (this.database.isEventBatched()) {
      this._pendingEntityModified.add(entity)
      return
    }
    this.database.events.entityModified.dispatch({
      database: this.database,
      entity
    })
  }

  /**
   * Dispatches layer-modified notifications accumulated during event batching.
   *
   * Called from {@link AcDbDatabase.endEventBatch} when the outermost batch closes.
   */
  flushPendingLayerModifiedEvents(): void {
    if (this._pendingLayerModified.size === 0) {
      return
    }

    const pending = [...this._pendingLayerModified.values()]
    this._pendingLayerModified.clear()
    for (const args of pending) {
      this.database.events.layerModified.dispatch(args)
    }
  }

  /**
   * Dispatches entity-modified notifications accumulated during event batching.
   *
   * Called from {@link AcDbDatabase.endEventBatch} when the outermost batch closes.
   */
  flushPendingEntityModifiedEvents(): void {
    if (this._pendingEntityModified.size === 0) {
      return
    }

    const modified = [...this._pendingEntityModified]
    this._pendingEntityModified.clear()
    for (const entity of modified) {
      this.database.events.entityModified.dispatch({
        database: this.database,
        entity
      })
    }
  }
}
