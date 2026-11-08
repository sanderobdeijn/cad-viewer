import * as THREE from 'three'

import {
  asyncDrawSharedGlyphGroup,
  syncDrawSharedGlyphGroup
} from '../linetype/ThreeRendererComplexLineBuilder'
import { ThreeRendererRenderContext } from '../renderer/ThreeRendererRenderContext'
import { ThreeRendererEntity } from './ThreeRendererEntity'
import { ThreeRendererGlyphEntity } from './ThreeRendererGlyphEntity'

export interface ThreeRendererEntityBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  id: string
}

/**
 * One collection of graphic interface entities. It is used to render entities
 * made of several drawables, such as dimensions, wide polylines and viewports.
 */
export class ThreeRendererGroup extends ThreeRendererEntity {
  private _wcsChildBoxes: ThreeRendererEntityBox[] = []
  /**
   * Leaf {@link ThreeRendererEntity} instances that contributed geometry to this group
   * before {@link flatten} hoisted render meshes and removed intermediate
   * containers from the scene graph.
   *
   * {@link ThreeRendererGroup} construction follows this order:
   *
   * 1. Add each entity and call {@link registerSourceEntities}
   * 2. Snapshot initial bounds via {@link storeBoxes}
   * 3. Call {@link flatten}, which reparents drawable leaves directly under
   *    this group and detaches the original {@link ThreeRendererEntity} wrappers
   *
   * After step 3, `group.children` no longer contains the source entities,
   * yet their `wcsBbox` values remain the authoritative local extents once
   * deferred drawing (MText/Shape `syncDraw`) completes.
   *
   * Consumers such as {@link getSourceEntities},
   * {@link refreshWcsChildBoxesFromChildren}, and {@link syncDraw} rely on this
   * list because a post-flatten {@link THREE.Object3D.traverse} walk cannot recover the
   * detached entity containers. Entries are deep-cloned in {@link copy}.
   */
  private _sourceEntities: ThreeRendererEntity[] = []

  constructor(entities: ThreeRendererEntity[], context: ThreeRendererRenderContext) {
    super(context)
    entities.forEach(entity => {
      // FIXME: It looks like that code within 'Array.isArray(entity)' condition is useless.
      if (Array.isArray(entity)) {
        const subGroup = new ThreeRendererEntity(context)
        this.add(subGroup)
      } else {
        this.add(entity)
        this.registerSourceEntities(entity)
        this.storeBoxes(entity, true)
        return
      }
      this.storeBoxes(entity)
    })
    this.flatten()

    // wcsChildBoxes is the source of truth for spatial indexing. The aggregate
    // wcsBbox union taken during construction can be slightly larger than the
    // union of per-child boxes.
    this.syncWcsBboxFromChildBoxes()
  }

  /**
   * Per-child WCS bounding boxes used by the spatial index.
   */
  get wcsChildBoxes() {
    return this._wcsChildBoxes
  }

  /**
   * Returns the entities captured in {@link _sourceEntities}.
   *
   * The returned array is the live backing store (not a defensive copy).
   * Treat it as read-only unless you are extending {@link ThreeRendererGroup} itself.
   *
   * @returns Entities that remain addressable after {@link flatten}, in
   *   registration order.
   */
  getSourceEntities(): readonly ThreeRendererEntity[] {
    return this._sourceEntities
  }

  /**
   * Rebuilds {@link wcsChildBoxes} and the aggregate {@link wcsBbox} from
   * current entity geometry.
   *
   * MText/Shape bounds can still be empty when a group is built. An empty
   * {@link THREE.Box3} contains `±Infinity` corners, which must not reach
   * spatial indexing.
   *
   * This method is intended to run **after** deferred geometry is finished
   * (see {@link syncDraw}). It:
   *
   * 1. Clears {@link _wcsChildBoxes}
   * 2. Recomputes one WCS axis-aligned box per tracked source entity via
   *    {@link appendSourceEntityWcsChildBox}
   * 3. Adds boxes for any {@link ThreeRendererEntity} children still present in the
   *    flattened tree via {@link appendTreeEntityWcsChildBox}
   * 4. Re-synchronizes the aggregate {@link wcsBbox} through
   *    {@link syncWcsBboxFromChildBoxes}
   *
   * Coordinate rules:
   *
   * - **Entities** tracked in {@link _sourceEntities}: `wcsBbbox` stays in local
   *   space and is transformed by this group's `matrixWorld` (or the source
   *   entity's local `matrix` when the group is at identity).
   * - **Tree-resident entities** not listed in {@link _sourceEntities}: the
   *   full entity `matrixWorld` is applied to `wcsBbbox`.
   */
  refreshWcsChildBoxesFromChildren() {
    if (this._wcsChildBoxes.length > 0) {
      this.reconcileDeferredChildBoxes()
      return
    }

    const previous = this._wcsChildBoxes.map(box => ({ ...box }))
    this._wcsChildBoxes.length = 0
    this.updateMatrixWorld(true)
    const scratch = new THREE.Box3()
    for (const entity of this._sourceEntities) {
      this.appendSourceEntityWcsChildBox(entity, scratch)
    }
    const sourceEntities = new Set(this._sourceEntities)
    this.children.forEach(child => {
      if (child instanceof ThreeRendererEntity && !sourceEntities.has(child)) {
        this.appendTreeEntityWcsChildBox(child, scratch)
      }
    })
    if (this._wcsChildBoxes.length === 0 && previous.length > 0) {
      previous.forEach(box => this._wcsChildBoxes.push({ ...box }))
    }
    this.syncWcsBboxFromChildBoxes()
  }

  /**
   * Fills in child boxes for deferred geometry without recomputing boxes that
   * were already populated by {@link storeBoxes}.
   */
  private reconcileDeferredChildBoxes() {
    this.updateMatrixWorld(true)
    const scratch = new THREE.Box3()
    const boxById = new Map(this._wcsChildBoxes.map(box => [box.id, box]))

    for (const entity of this._sourceEntities) {
      const existing = boxById.get(entity.objectId)
      if (existing && ThreeRendererGroup.isFiniteEntityBox(existing)) {
        continue
      }
      const computed = this.computeSourceEntityWcsChildBox(entity, scratch)
      if (!computed) {
        continue
      }
      if (existing) {
        Object.assign(existing, computed)
      } else {
        this._wcsChildBoxes.push(computed)
        boxById.set(entity.objectId, computed)
      }
    }

    const sourceEntities = new Set(this._sourceEntities)
    this.children.forEach(child => {
      if (!(child instanceof ThreeRendererEntity)) {
        return
      }
      if (sourceEntities.has(child)) {
        return
      }
      const existing = boxById.get(child.objectId)
      if (existing && ThreeRendererGroup.isFiniteEntityBox(existing)) {
        return
      }
      const computed = this.computeTreeEntityWcsChildBox(child, scratch)
      if (!computed) {
        return
      }
      if (existing) {
        Object.assign(existing, computed)
      } else {
        this._wcsChildBoxes.push(computed)
      }
    })

    this.syncWcsBboxFromChildBoxes()
  }

  /**
   * Groups handle-less complex-linetype glyphs that can share one mesh.
   *
   * Real TEXT/MTEXT/SHAPE entities keep their database handle and are drawn
   * individually. Generated linetype symbols have no handle.
   *
   * @returns True when `child` was added to a shared group.
   */
  private bucketSharedLinetypeGlyph(
    child: ThreeRendererEntity,
    shared: Map<string, ThreeRendererGlyphEntity[]>
  ): boolean {
    if (child.objectId || !(child instanceof ThreeRendererGlyphEntity)) {
      return false
    }
    const key = child.glyphStyleShareKey
    const bucket = shared.get(key)
    if (bucket) {
      bucket.push(child)
    } else {
      shared.set(key, [child])
    }
    return true
  }

  /**
   * Finishes deferred geometry for tracked entities, then refreshes
   * spatial-index bounds.
   *
   * Entities may contain MTEXT/SHAPE children whose geometry is skipped during
   * construction. This method walks tracked source entities plus any
   * {@link ThreeRendererEntity} children still present after {@link flatten}, and invokes
   * {@link syncDraw} on each entity that has not yet produced drawable children.
   */
  override syncDraw(): void {
    const sourceEntities = new Set(this.getSourceEntities())
    const shared = new Map<string, ThreeRendererGlyphEntity[]>()
    const finalizeDeferredEntity = (child: ThreeRendererEntity) => {
      if (child.hasDrawableGeometry()) {
        return
      }
      if (this.bucketSharedLinetypeGlyph(child, shared)) {
        return
      }
      child.syncDraw()
    }

    sourceEntities.forEach(finalizeDeferredEntity)
    this.traverse(child => {
      if (child === this) {
        return
      }
      if (!(child instanceof ThreeRendererEntity)) {
        return
      }
      if (sourceEntities.has(child)) {
        return
      }
      finalizeDeferredEntity(child)
    })
    for (const group of shared.values()) {
      syncDrawSharedGlyphGroup(group)
    }
    this.refreshWcsChildBoxesFromChildren()
  }

  /**
   * Like {@link syncDraw}, but uses {@link ThreeRendererEntity.asyncDraw} so glyph
   * children can wait for fonts without using the sync fallback path.
   */
  override async asyncDraw(): Promise<void> {
    await this.asyncDrawPendingGlyphs()
    this.refreshWcsChildBoxesFromChildren()
  }

  /**
   * Draws empty glyph shells on this group.
   *
   * @param options.chunkSize - Glyphs started per micro-batch (default 24).
   * @param options.yieldBudgetMs - Wall time between cooperative yields.
   *   Defaults to 32 when {@link ThreeRendererRenderContext.yieldDuringAsyncDraw} is
   *   set, and to no yield for headless export.
   */
  private async asyncDrawPendingGlyphs(
    options: { chunkSize?: number; yieldBudgetMs?: number } = {}
  ): Promise<void> {
    const chunkSize = options.chunkSize ?? 24
    const yieldBudgetMs =
      options.yieldBudgetMs ??
      (this.renderContext.yieldDuringAsyncDraw ? 32 : Number.POSITIVE_INFINITY)
    const sourceEntities = this.getSourceEntities()
    const tasks: Array<() => Promise<void>> = []
    const shared = new Map<string, ThreeRendererGlyphEntity[]>()
    const seen = new Set<ThreeRendererEntity>()
    const enqueue = (child: ThreeRendererEntity) => {
      if (seen.has(child)) {
        return
      }
      seen.add(child)
      if (child.hasDrawableGeometry()) {
        return
      }
      if (this.bucketSharedLinetypeGlyph(child, shared)) {
        return
      }
      tasks.push(() => child.asyncDraw())
    }

    for (const entity of sourceEntities) {
      enqueue(entity)
    }
    // Only walk ThreeRendererEntity containers — never dive into flattened mesh/line
    // leaves.
    this.enqueuePendingGlyphEntitiesFromTree(this, enqueue)

    for (const group of shared.values()) {
      tasks.push(() => asyncDrawSharedGlyphGroup(group))
    }
    if (tasks.length === 0) {
      return
    }
    // Start glyph draws in small batches and return to the event loop.
    let budgetStart = performance.now()
    for (let i = 0; i < tasks.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, tasks.length)
      const pending: Promise<void>[] = []
      for (let j = i; j < end; j++) {
        pending.push(tasks[j]())
      }
      await Promise.all(pending)
      if (
        end < tasks.length &&
        performance.now() - budgetStart >= yieldBudgetMs
      ) {
        await new Promise<void>(resolve => setTimeout(resolve, 0))
        budgetStart = performance.now()
      }
    }
  }

  /**
   * Collects nested {@link ThreeRendererEntity} glyph hosts under `root` without
   * walking drawable mesh/line leaves.
   */
  private enqueuePendingGlyphEntitiesFromTree(
    root: THREE.Object3D,
    enqueue: (entity: ThreeRendererEntity) => void
  ): void {
    const children = root.children
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child instanceof ThreeRendererGlyphEntity) {
        enqueue(child)
        continue
      }
      if (child instanceof ThreeRendererGroup) {
        for (const entity of child.getSourceEntities()) {
          enqueue(entity)
        }
        this.enqueuePendingGlyphEntitiesFromTree(child, enqueue)
        continue
      }
      if (child instanceof ThreeRendererEntity) {
        enqueue(child)
        this.enqueuePendingGlyphEntitiesFromTree(child, enqueue)
      }
    }
  }

  /**
   * Releases render resources owned by this group and its tracked source entities.
   *
   * {@link flatten} reparents drawable leaves onto {@link children} and detaches
   * the original {@link ThreeRendererEntity} wrappers listed in {@link _sourceEntities}.
   * The base {@link ThreeRendererEntity.dispose} walk only reaches `children`, so this
   * override first disposes detached source shells (without removing live
   * children) and then delegates to `super.dispose()` for the flattened mesh
   * tree.
   *
   * Entities still present in `children` are intentionally skipped here so they
   * are not released twice.
   */
  dispose() {
    const liveChildren = new Set(this.children)
    for (const entity of this._sourceEntities) {
      if (!liveChildren.has(entity)) {
        ThreeRendererEntity.disposeObject(entity, false)
      }
    }
    this._sourceEntities.length = 0
    super.dispose()
  }

  /**
   * Recomputes the aggregate {@link wcsBbox} as the union of {@link _wcsChildBoxes}.
   *
   * {@link _wcsChildBoxes} is the source of truth for per-child spatial-index
   * bounds; this method keeps the aggregate box aligned with the child-box list.
   *
   * No-op when {@link _wcsChildBoxes} is empty so an absent child list does
   * not overwrite an existing {@link wcsBbox}.
   */
  private syncWcsBboxFromChildBoxes() {
    if (this._wcsChildBoxes.length === 0) {
      return
    }

    const union = new THREE.Box3()
    for (const box of this._wcsChildBoxes) {
      if (!ThreeRendererGroup.isFiniteEntityBox(box)) {
        continue
      }
      union.union(
        new THREE.Box3(
          new THREE.Vector3(box.minX, box.minY, 0),
          new THREE.Vector3(box.maxX, box.maxY, 0)
        )
      )
    }
    this.wcsBbox = union
  }

  /**
   * Snapshots one child's axis-aligned bounds into {@link _wcsChildBoxes}.
   *
   * Ingestion rules:
   *
   * - **Nested {@link ThreeRendererGroup}**: copies the inner group's existing
   *   {@link _wcsChildBoxes} entries instead of re-walking geometry, because
   *   the inner list is already normalized to leaf entities.
   * - **Leaf {@link ThreeRendererEntity}**: converted to WCS through
   *   {@link appendSourceEntityWcsChildBox} or
   *   {@link appendTreeEntityWcsChildBox}.
   * - **Empty or non-finite boxes**: skipped via {@link isFiniteEntityBox} so
   *   deferred MText/Shape geometry cannot seed `±Infinity` values.
   *
   * @param object - Entity or nested group whose bounds should be recorded.
   */
  private storeBoxes(object: THREE.Object3D, knownSource = false) {
    if (object instanceof ThreeRendererGroup) {
      object.wcsChildBoxes.forEach(box => {
        if (ThreeRendererGroup.isFiniteEntityBox(box)) {
          this._wcsChildBoxes.push({ ...box })
        }
      })
      return
    }

    if (!(object instanceof ThreeRendererEntity)) {
      return
    }

    const scratch = new THREE.Box3()
    // Callers that just registered `object` pass knownSource to avoid paying
    // Array.includes (O(n²)) once per entity.
    if (knownSource || this._sourceEntities.includes(object)) {
      this.appendSourceEntityWcsChildBox(object, scratch)
      return
    }
    this.appendTreeEntityWcsChildBox(object, scratch)
  }

  /**
   * Records leaf entities from a newly added child into {@link _sourceEntities}.
   *
   * Nested {@link ThreeRendererGroup} instances are flattened into their own
   * {@link _sourceEntities} at construction time; this method copies that
   * inner list rather than storing the nested group wrapper, so outer groups
   * always track drawable leaves only.
   *
   * @param object - Entity or nested group being registered.
   */
  private registerSourceEntities(object: THREE.Object3D) {
    if (object instanceof ThreeRendererGroup) {
      object.getSourceEntities().forEach(entity => {
        this._sourceEntities.push(entity)
      })
      return
    }
    if (object instanceof ThreeRendererEntity) {
      this._sourceEntities.push(object)
    }
  }

  /**
   * Appends one WCS child box derived from a {@link _sourceEntities} entry.
   *
   * Used for entities detached from the scene graph by {@link flatten}.
   * Tracked source entities keep local `wcsBbbox` values; the active transform
   * lives on this group's
   * `matrixWorld`. When the group is at identity, each source entity's local
   * `matrix` is applied instead.
   *
   * Entries with an empty or non-finite resulting box are skipped so
   * {@link _wcsChildBoxes} never receives `NaN` extents.
   *
   * @param entity - Tracked source entity whose `wcsBbox` should be converted
   *   to WCS.
   * @param scratch - Reusable {@link THREE.Box3} used to avoid per-entity
   *   allocations during refresh.
   */
  private appendSourceEntityWcsChildBox(
    entity: ThreeRendererEntity,
    scratch: THREE.Box3
  ) {
    const computed = this.computeSourceEntityWcsChildBox(entity, scratch)
    if (computed) {
      this._wcsChildBoxes.push(computed)
    }
  }

  private computeSourceEntityWcsChildBox(
    entity: ThreeRendererEntity,
    scratch: THREE.Box3
  ): ThreeRendererEntityBox | undefined {
    if (entity.wcsBbox.isEmpty()) {
      return undefined
    }

    scratch.copy(entity.wcsBbox)
    entity.updateMatrixWorld(true)

    if (
      ThreeRendererGroup.isWorldMatrixIdentity(this.matrixWorld) &&
      !ThreeRendererGroup.isWorldMatrixIdentity(entity.matrix)
    ) {
      scratch.applyMatrix4(entity.matrix)
    }

    if (!ThreeRendererGroup.isWorldMatrixIdentity(this.matrixWorld)) {
      scratch.applyMatrix4(this.matrixWorld)
    }
    if (!Number.isFinite(scratch.min.x) || !Number.isFinite(scratch.max.x)) {
      return undefined
    }

    return {
      minX: scratch.min.x,
      minY: scratch.min.y,
      maxX: scratch.max.x,
      maxY: scratch.max.y,
      id: entity.objectId
    }
  }

  /**
   * Appends one WCS child box for an {@link ThreeRendererEntity} still present in this
   * group's flattened `children` list.
   *
   * This path is only used when the child is **not** already listed in
   * {@link _sourceEntities}, preventing duplicate spatial-index entries.
   *
   * @param entity - Entity still attached under this group.
   * @param scratch - Reusable {@link THREE.Box3} used to avoid per-entity
   *   allocations during refresh.
   */
  private appendTreeEntityWcsChildBox(entity: ThreeRendererEntity, scratch: THREE.Box3) {
    const computed = this.computeTreeEntityWcsChildBox(entity, scratch)
    if (computed) {
      this._wcsChildBoxes.push(computed)
    }
  }

  private computeTreeEntityWcsChildBox(
    entity: ThreeRendererEntity,
    scratch: THREE.Box3
  ): ThreeRendererEntityBox | undefined {
    if (entity.wcsBbox.isEmpty()) {
      return undefined
    }

    entity.updateMatrixWorld(true)
    scratch.copy(entity.wcsBbox)
    scratch.applyMatrix4(entity.matrixWorld)
    if (!Number.isFinite(scratch.min.x) || !Number.isFinite(scratch.max.x)) {
      return undefined
    }

    return {
      minX: scratch.min.x,
      minY: scratch.min.y,
      maxX: scratch.max.x,
      maxY: scratch.max.y,
      id: entity.objectId
    }
  }

  /**
   * Tests whether a world matrix is effectively identity.
   *
   * {@link appendSourceEntityWcsChildBox} uses this helper to decide whether
   * to apply this group's `matrixWorld` or each
   * source entity's local `matrix` when converting local bounds to WCS.
   *
   * Comparison uses a fixed epsilon (`1e-6`) on all 16 matrix elements.
   *
   * @param matrix - World matrix to test, typically `this.matrixWorld`.
   * @returns `true` when the matrix matches identity within tolerance.
   */
  private static isWorldMatrixIdentity(matrix: THREE.Matrix4) {
    const identity = new THREE.Matrix4()
    for (let i = 0; i < 16; ++i) {
      if (Math.abs(matrix.elements[i] - identity.elements[i]) > 1e-6) {
        return false
      }
    }
    return true
  }

  /**
   * Tests whether a spatial-index child box contains only finite coordinates.
   *
   * Empty or deferred geometry snapshots produce `±Infinity` corners in
   * {@link THREE.Box3}. Those entries must not reach the aggregate
   * {@link wcsBbox}.
   *
   * Also used by {@link storeBoxes} to filter invalid boxes at ingestion time.
   *
   * @param box - Axis-aligned 2D bounds candidate in WCS or local space.
   * @returns `true` when all four corners are finite numbers.
   */
  private static isFiniteEntityBox(box: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }) {
    return (
      Number.isFinite(box.minX) &&
      Number.isFinite(box.minY) &&
      Number.isFinite(box.maxX) &&
      Number.isFinite(box.maxY)
    )
  }
}
