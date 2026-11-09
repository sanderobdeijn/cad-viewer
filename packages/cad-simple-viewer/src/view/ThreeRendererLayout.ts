import { GeometryBox2d } from '@mlightcad/geometry-engine'
import {
  ThreeRendererBatchedGroup,
  ThreeRendererDirectEntityMeta,
  ThreeRendererEntity,
  ThreeRendererEntityPreview,
  ThreeRendererGroup
} from '@mlightcad/three-renderer'
import * as THREE from 'three'

import { EditorSpatialQueryResultItem } from '../editor'
import { unionSpatialQueryItems } from '../editor/view/EditorSpatialQueryResult'
import { ThreeRendererHierarchicalSpatialIndex } from '../spatialIndex'
import type { ThreeRendererSpatialSearchOptions } from '../spatialIndex/ThreeRendererSpatialIndex'
import { isFiniteSpatialBBox } from './ThreeRendererGroupWcsBboxAssert'

/** Options for {@link ThreeRendererLayout.createEntityPreviewRoot}. */
export interface ThreeRendererEntityPreviewRootOptions {
  /**
   * Behavior when one entity id cannot be extracted from the batch group.
   *
   * - `fail` (default): dispose the partial preview and return `null`
   * - `skip`: ignore that id and continue with the remaining ids
   */
  missingEntity?: 'fail' | 'skip'
  /** When true, every requested id must exist in this layout. */
  requireAllEntities?: boolean
}

/**
 * This class represents objects contained in one AutoCAD layout (model space or paper space).
 *
 * A layout manages the organization and rendering of CAD entities within a specific coordinate space.
 * It provides functionality for:
 * - Managing entities in one batched group
 * - Spatial indexing for efficient entity queries
 * - Bounding box management for view operations
 * - Entity selection and highlighting
 * - Memory usage tracking and statistics
 *
 * Layouts use a spatial index (R-tree) for fast entity lookup operations and
 * batch their entities into one {@link ThreeRendererBatchedGroup} for efficient rendering.
 *
 * @example
 * ```typescript
 * const layout = new ThreeRendererLayout();
 * layout.addEntity(entity);
 * const entities = layout.search(boundingBox);
 * layout.select(['entity1', 'entity2']);
 * ```
 */
export class ThreeRendererLayout {
  /** The group that contains all entities in this layout */
  private _group: THREE.Group
  /** Spatial index tree for efficient entity queries */
  private _spatialIndex: ThreeRendererHierarchicalSpatialIndex
  /** Cached layout bounds derived from packed batch vertex buffers */
  private _cachedBox: THREE.Box3
  /** Cached smart-extents box; cleared whenever layout geometry extents change */
  private _cachedSmartExtents: GeometryBox2d | undefined
  /**
   * Bumped whenever {@link _cachedSmartExtents} is cleared so in-flight async
   * smart-extents work can detect stale results and skip writing the cache.
   */
  private _smartExtentsGeneration = 0
  /** When true, {@link box} is recomputed from batch geometry on next read */
  private _boxDirty: boolean
  /** Entity ids excluded from layout bounds (e.g. RAY/XLINE) */
  private _extentExcludedObjectIds: Set<string>
  /** The batched group that holds all entities of this layout */
  private _batch: ThreeRendererBatchedGroup
  /** The flag indicating whether the layout is loaded/activated */
  private _isLoaded: boolean
  /**
   * When true, {@link addEntity} / {@link addDirectEntity} skip spatial-index
   * registration. Used by headless HTML/JPEG export where pick queries are unused.
   */
  skipSpatialIndex = false
  /**
   * True when this layout renders a read-only reference/overlay drawing.
   * Reference layouts are not registered in {@link ThreeRendererScene}'s layout map
   * and must not participate in selection, grips, or host edits.
   */
  isReference = false
  /**
   * Creates a new layout instance.
   * Initializes the layout with empty collections and a spatial index.
   */
  constructor() {
    this._group = new THREE.Group()
    this._spatialIndex = new ThreeRendererHierarchicalSpatialIndex()
    this._cachedBox = new THREE.Box3()
    this._cachedSmartExtents = undefined
    this._boxDirty = true
    this._extentExcludedObjectIds = new Set()
    this._batch = new ThreeRendererBatchedGroup()
    this._group.add(this._batch)
    this._isLoaded = false
  }

  /**
   * The internal THREE.js object to use by scene. This is internally used only. Try to avoid using it.
   * @internal
   */
  get internalObject() {
    return this._group
  }

  /**
   * Gets the bounding box that contains all entities in this layout.
   *
   * Derived from packed batch vertex buffers (same source as GPU draw data),
   * not from accumulated {@link ThreeRendererEntity.wcsBbox} metadata.
   *
   * @returns The layout's bounding box
   */
  get box() {
    if (this._boxDirty) {
      this.recomputeBox()
    }
    return this._cachedBox
  }

  /**
   * Recomputes {@link box} from batch geometry.
   */
  computeBatchBoundingBox(target = new THREE.Box3()) {
    if (this._boxDirty) {
      this.recomputeBox()
    }
    return target.copy(this._cachedBox)
  }

  private recomputeBox() {
    this._batch.computeBoundingBox(this._cachedBox, {
      excludeObjectIds: this._extentExcludedObjectIds
    })
    this._boxDirty = false
  }

  private invalidateBox() {
    this._boxDirty = true
    this.clearSmartExtentsCache()
  }

  private clearSmartExtentsCache() {
    this._cachedSmartExtents = undefined
    this._smartExtentsGeneration++
  }

  /**
   * The flag indicating whether the layout is loaded/activated.
   *
   * @returns The flag indicating whether the layout is loaded/activated.
   */
  get isLoaded() {
    return this._isLoaded
  }

  /**
   * Sets the flag indicating whether the layout is loaded/activated.
   *
   * @param value - The flag indicating whether the layout is loaded/activated.
   */
  set isLoaded(value: boolean) {
    this._isLoaded = value
  }

  /**
   * The visibility of this layout.
   * When set to false, the entire layout and all its contents are hidden.
   */
  get visible() {
    return this._group.visible
  }
  set visible(value: boolean) {
    this._group.visible = value
  }

  /**
   * The number of entities stored in this layout.
   */
  get entityCount() {
    return this._batch.entityCount
  }

  /**
   * Clears all entities from the layout.
   * Clears the batch group, resets the bounding box, and clears the spatial index.
   *
   * @returns This layout instance for method chaining
   */
  clear() {
    this._batch.clear()
    this._cachedBox.makeEmpty()
    this.clearSmartExtentsCache()
    this._boxDirty = true
    this._extentExcludedObjectIds.clear()
    this._spatialIndex.clear()
    return this
  }

  /**
   * Applies ACI-7 / foreground colour to owned batch material clones in this layout.
   */
  repaintForegroundMaterials(color: number) {
    this._batch.repaintForegroundMaterials(color)
  }

  /**
   * Return true if the object with the specified object id is intersected with the ray by using raycast.
   *
   * @param objectId - Input object id of object to check for intersection with the ray.
   * @param raycaster - Input raycaster to check intersection
   * @returns True if the object intersects with the ray, false otherwise
   */
  isIntersectWith(objectId: string, raycaster: THREE.Raycaster) {
    return (
      this._batch.hasEntity(objectId) &&
      this._batch.isIntersectWith(objectId, raycaster)
    )
  }

  hasVisibleEntity(objectId: string) {
    return this._batch.hasEntity(objectId)
  }

  /**
   * Add one entity into this layout.
   *
   * @param entity - Input AutoCAD entity to be added into this layout.
   * @param extendBbox - Input the flag whether to extend the bounding box of the scene by union the bounding box
   * of the specified entity. Defaults to true.
   * @returns This layout instance for method chaining
   *
   * @throws {Error} When entity is missing the required objectId
   */
  addEntity(entity: ThreeRendererEntity, extendBbox: boolean = true) {
    if (!entity.objectId) {
      throw new Error('Object id is required to add one entity!')
    }

    this._batch.addEntity(entity)

    if (!extendBbox) {
      this._extentExcludedObjectIds.add(entity.objectId)
    } else {
      this._extentExcludedObjectIds.delete(entity.objectId)
    }
    this.invalidateBox()

    this.registerEntitySpatialIndex(entity)

    return this
  }

  /**
   * Adds an entity via direct batch append (no temporary drawable tree).
   *
   * @returns `true` when geometry and spatial index were registered.
   */
  addDirectEntity(
    meta: ThreeRendererDirectEntityMeta,
    extendBbox: boolean = true
  ): boolean {
    if (!meta.objectId) {
      throw new Error('Object id is required to add one entity!')
    }

    const appended = this.appendDirectGeometry(meta)
    if (!appended) {
      return false
    }

    if (!extendBbox) {
      this._extentExcludedObjectIds.add(meta.objectId)
    } else {
      this._extentExcludedObjectIds.delete(meta.objectId)
    }
    this.invalidateBox()
    this.registerSpatialIndexBox(meta.objectId, meta.wcsBbox)
    return true
  }

  /**
   * Remove the specified entity from this layout.
   *
   * @param objectId - Input the object id of the entity to remove
   * @returns Return true if remove the specified entity successfully. Otherwise, return false.
   */
  removeEntity(objectId: string) {
    const result = this._batch.removeEntity(objectId)
    if (result) {
      this._spatialIndex.removeById(objectId)
      this._extentExcludedObjectIds.delete(objectId)
      this.invalidateBox()
    }
    return result
  }

  /**
   * Update the specified entity in this layout.
   *
   * @param entity - Input the entity to update
   * @returns Return true if update the specified entity successfully. Otherwise, return false.
   */
  updateEntity(entity: ThreeRendererEntity) {
    if (!entity.objectId) {
      return false
    }
    const isRemoved = this._batch.removeEntity(entity.objectId)
    if (!isRemoved && !entity.visible) {
      return false
    }
    this._batch.addEntity(entity)
    this._spatialIndex.removeById(entity.objectId)
    this.registerEntitySpatialIndex(entity)
    this.invalidateBox()
    return true
  }

  /**
   * Returns true when this layout contains the entity.
   */
  hasEntity(objectId: string) {
    return this._batch.hasEntity(objectId)
  }

  /**
   * Updates entity visibility without rebuilding batched geometry.
   */
  setEntityVisible(objectId: string, visible: boolean) {
    const updated = this._batch.setEntityVisible(objectId, visible)
    if (updated) {
      this.invalidateBox()
    }
    return updated
  }

  /**
   * Returns the current scene visibility for one entity.
   */
  getEntityVisible(objectId: string) {
    return this._batch.getEntityVisible(objectId)
  }

  /**
   * Returns true when requested entities can be previewed in this layout.
   *
   * Uses batch bounds only and does not clone preview geometry.
   *
   * @param entityIds - Database object ids required for preview creation
   * @param options - When {@link ThreeRendererEntityPreviewRootOptions.requireAllEntities} is
   *   true (default), every id must be present; otherwise at least one id is enough
   */
  canCreateEntityPreview(
    entityIds: string[],
    options?: Pick<ThreeRendererEntityPreviewRootOptions, 'requireAllEntities'>
  ): boolean {
    if (entityIds.length === 0) {
      return false
    }

    const requireAllEntities = options?.requireAllEntities ?? true
    if (requireAllEntities) {
      for (const id of entityIds) {
        if (!this.hasEntity(id)) {
          return false
        }
        const scratch = new THREE.Box3()
        this.computeEntityPreviewBoundsBox([id], scratch)
        if (scratch.isEmpty()) {
          return false
        }
      }
      return true
    }

    return !this.computeEntityPreviewBoundsBox(entityIds).isEmpty()
  }

  /**
   * Returns entity ids that have drawable batch bounds in this layout.
   *
   * @param entityIds - Database object ids to check
   */
  findPreviewableEntityIds(entityIds: string[]): string[] {
    const previewable: string[] = []
    for (const id of entityIds) {
      if (!this.hasEntity(id)) {
        continue
      }
      const scratch = new THREE.Box3()
      this.computeEntityPreviewBoundsBox([id], scratch)
      if (!scratch.isEmpty()) {
        previewable.push(id)
      }
    }
    return previewable
  }

  /**
   * Computes world-space bounds for the requested entities from packed batch data.
   *
   * This avoids building a preview subset or traversing cloned drawables.
   *
   * @param entityIds - Database object ids to measure
   * @param target - Optional output box
   * @returns Axis-aligned bounds box, empty when nothing matched
   */
  computeEntityPreviewBoundsBox(
    entityIds: string[],
    target = new THREE.Box3()
  ) {
    target.makeEmpty()
    if (entityIds.length === 0) {
      return target
    }

    return this._batch.computeBoundingBox(target, {
      includeObjectIds: new Set(entityIds)
    })
  }

  /**
   * Computes a 2D preview framing box for the requested entities in this layout.
   *
   * @param entityIds - Database object ids to measure
   * @param margin - Margin multiplier applied around the raw bounds
   */
  computeEntityPreviewBounds2d(
    entityIds: string[],
    margin = 1.1
  ): GeometryBox2d | null {
    const box = this.computeEntityPreviewBoundsBox(entityIds)
    return ThreeRendererEntityPreview.box3ToBounds2d(box, margin)
  }

  /**
   * Builds one preview root group by extracting GPU-resident geometry from the batch group.
   *
   * Entities that are missing from this layout or cannot be extracted are skipped.
   * Returns `null` only when no drawable geometry could be collected.
   *
   * @param entityIds - Database object ids to include in the preview overlay
   * @returns Preview root group, or `null` when no preview geometry was extracted
   */
  createEntityPreviewRoot(
    entityIds: string[],
    options?: ThreeRendererEntityPreviewRootOptions
  ): THREE.Group | null {
    const missingEntity = options?.missingEntity ?? 'fail'
    const requireAllEntities = options?.requireAllEntities ?? false

    if (requireAllEntities) {
      for (const id of entityIds) {
        if (!this.hasEntity(id)) {
          return null
        }
      }
    }

    const ids = new Set<string>()
    for (const id of entityIds) {
      if (!this._batch.hasEntity(id)) {
        if (requireAllEntities || missingEntity === 'fail') {
          return null
        }
        continue
      }
      ids.add(id)
    }

    if (ids.size === 0) {
      return null
    }

    const idList = [...ids]
    const subset = this._batch.createPreviewSubset(idList, {
      // Complex hatches may need several drawable slots per entity.
      maxSlots: Math.max(10000, idList.length * 8),
      missingEntity
    })
    if (!subset || subset.children.length === 0) {
      return null
    }

    const previewRoot = new THREE.Group()
    previewRoot.name = 'EntityPreviewRoot'
    previewRoot.add(subset)
    return previewRoot
  }

  /**
   * Hover the specified entities.
   * Applies hover highlighting to the entities with the given IDs.
   *
   * @param ids - Array of entity object IDs to hover
   */
  hover(ids: string[]) {
    const entityIds = this.idsInBatch(ids)
    if (entityIds.length === 1) {
      this._batch.hover(entityIds[0]!)
    } else if (entityIds.length > 1) {
      this._batch.hoverMany(entityIds)
    }
  }

  /**
   * Unhover the specified entities.
   * Removes hover highlighting from the entities with the given IDs.
   *
   * @param ids - Array of entity object IDs to unhover
   */
  unhover(ids: string[]) {
    const entityIds = this.idsInBatch(ids)
    if (entityIds.length === 1) {
      this._batch.unhover(entityIds[0]!)
    } else if (entityIds.length > 1) {
      this._batch.unhoverMany(entityIds)
    }
  }

  /**
   * Select the specified entities.
   * Applies selection highlighting to the entities with the given IDs.
   *
   * @param ids - Array of entity object IDs to select
   */
  select(ids: string[]) {
    const entityIds = this.idsInBatch(ids)
    if (entityIds.length === 1) {
      this._batch.select(entityIds[0]!)
    } else if (entityIds.length > 1) {
      this._batch.selectMany(entityIds)
    }
  }

  /**
   * Unselect the specified entities.
   * Removes selection highlighting from the entities with the given IDs.
   *
   * @param ids - Array of entity object IDs to unselect
   */
  unselect(ids: string[]) {
    const entityIds = this.idsInBatch(ids)
    if (entityIds.length === 1) {
      this._batch.unselect(entityIds[0]!)
    } else if (entityIds.length > 1) {
      this._batch.unselectMany(entityIds)
    }
  }

  /** Returns the ids that the batch group holds, so highlights skip unknown ids. */
  private idsInBatch(ids: string[]) {
    return ids.filter(id => this._batch.hasEntity(id))
  }

  /**
   * Appends pre-built geometry directly into the batch (line / point / mesh).
   *
   * @returns `true` when the geometry was registered in the batched group.
   */
  private appendDirectGeometry(meta: ThreeRendererDirectEntityMeta): boolean {
    const options = {
      objectId: meta.objectId,
      visible: meta.visible,
      position: meta.position
    }
    switch (meta.kind) {
      case 'lineBasic':
        return this._batch.appendLineGeometry(
          meta.geometry as THREE.BufferGeometry,
          meta.material,
          meta.worldOffset,
          options
        )
      case 'point':
        return this._batch.appendPointGeometry(
          meta.geometry as THREE.BufferGeometry,
          meta.material,
          meta.worldOffset,
          options
        )
      case 'mesh':
        return this._batch.appendMeshGeometry(
          meta.geometry as THREE.BufferGeometry,
          meta.material,
          meta.worldOffset,
          options
        )
      default:
        return false
    }
  }

  /**
   * Search entities intersected or contained in the specified bounding box.
   * Uses the spatial index for efficient querying of entities within the given bounds.
   *
   * @param box - Input the query bounding box (2D or 3D)
   * @returns Return query results containing entity IDs and their bounds
   */
  search(
    box: GeometryBox2d,
    options?: ThreeRendererSpatialSearchOptions
  ) {
    return this._spatialIndex.search(
      {
        minX: box.min.x,
        minY: box.min.y,
        maxX: box.max.x,
        maxY: box.max.y
      },
      options
    )
  }

  /**
   * Collects finite spatial-index AABBs for intelligent zoom-to-fit.
   *
   * Prefers child-level boxes when present so group/hatch islands contribute
   * separately rather than one oversized root union.
   *
   * @returns Flat list of finite world XY boxes.
   */
  collectSpatialExtentBoxes(): EditorSpatialQueryResultItem[] {
    return this._spatialIndex.all().filter(isFiniteSpatialBBox)
  }

  /**
   * Async variant of {@link collectSpatialExtentBoxes} that yields while
   * flattening large spatial indexes.
   *
   * @param work - Cooperative yield helper.
   */
  async collectSpatialExtentBoxesAsync(work: {
    maybeYield(): Promise<void>
  }): Promise<EditorSpatialQueryResultItem[]> {
    const all = await this._spatialIndex.allAsync(work)
    const result: EditorSpatialQueryResultItem[] = []
    for (let i = 0; i < all.length; i++) {
      const item = all[i]!
      if (isFiniteSpatialBBox(item)) {
        result.push(item)
      }
      if ((i & 0x7ff) === 0x7ff) {
        await work.maybeYield()
      }
    }
    return result
  }

  /**
   * Returns the cached smart-extents box when still valid for this layout.
   */
  get cachedSmartExtents(): GeometryBox2d | undefined {
    return this._cachedSmartExtents
  }

  /**
   * Generation counter for smart-extents cache invalidation. Capture before
   * async work and compare after; mismatch means geometry changed mid-flight.
   */
  get smartExtentsGeneration(): number {
    return this._smartExtentsGeneration
  }

  /**
   * Stores the last computed smart-extents box until geometry extents change.
   * Only write when {@link smartExtentsGeneration} still matches the value
   * captured before the async computation started.
   */
  set cachedSmartExtents(box: GeometryBox2d | undefined) {
    this._cachedSmartExtents = box
  }

  /**
   * Gets optional child bounding boxes used to build a child-level spatial index
   * for one render entity.
   *
   * Groups attach precomputed child query items to `entity.userData`; they are consumed
   * here so snapping and fine-grained spatial queries can still resolve
   * sub-entities correctly.
   *
   * @param entity - The render entity that may carry `spatialIndexChildBoxes` in
   *                 its `userData`.
   * @returns The child query boxes when available and non-empty; otherwise
   *          `undefined`.
   */
  private getSpatialIndexChildBoxes(entity: ThreeRendererEntity) {
    const boxes = (
      entity.userData as {
        spatialIndexChildBoxes?: EditorSpatialQueryResultItem[]
      }
    ).spatialIndexChildBoxes

    if (!boxes || boxes.length === 0) {
      return undefined
    }

    return boxes
  }

  /**
   * Registers one render entity in the layout spatial index.
   *
   * Inserts a root bounding box for coarse queries and, when child geometry is
   * available, builds a child-level index so snapping and fine-grained spatial
   * queries can resolve sub-entities (for example group children).
   *
   * Root bounds are chosen in this order:
   * 1. Union of {@link getSpatialIndexChildBoxes} when precomputed child boxes
   *    are attached to `entity.userData`.
   * 2. Union of `ThreeRendererGroup.wcsChildBoxes` when the entity is a group.
   * 3. The entity's own `wcsBbox` as a fallback.
   *
   * Child indexing uses `ensureChildIndex` for userData child boxes or `createChildIndex` for a single
   * `ThreeRendererGroup` hierarchy.
   *
   * @param entity - The render entity to index. Called from
   *                 {@link addEntity} and {@link updateEntity} after the
   *                 batch group is updated.
   */
  private registerEntitySpatialIndex(entity: ThreeRendererEntity) {
    if (this.skipSpatialIndex) {
      return
    }
    const spatialIndexChildBoxes = this.getSpatialIndexChildBoxes(entity)

    let rootBox: {
      minX: number
      minY: number
      maxX: number
      maxY: number
      id: string
    }

    if (spatialIndexChildBoxes && spatialIndexChildBoxes.length > 0) {
      const union = unionSpatialQueryItems(spatialIndexChildBoxes)
      rootBox = {
        minX: union.minX,
        minY: union.minY,
        maxX: union.maxX,
        maxY: union.maxY,
        id: entity.objectId
      }
    } else if (entity instanceof ThreeRendererGroup && entity.wcsChildBoxes.length > 0) {
      const union = unionSpatialQueryItems(
        entity.wcsChildBoxes.map(box => ({
          minX: box.minX,
          minY: box.minY,
          maxX: box.maxX,
          maxY: box.maxY,
          id: box.id
        }))
      )
      rootBox = {
        minX: union.minX,
        minY: union.minY,
        maxX: union.maxX,
        maxY: union.maxY,
        id: entity.objectId
      }
    } else {
      rootBox = {
        minX: entity.wcsBbox.min.x,
        minY: entity.wcsBbox.min.y,
        maxX: entity.wcsBbox.max.x,
        maxY: entity.wcsBbox.max.y,
        id: entity.objectId
      }
    }

    // Skip non-finite roots (empty THREE.Box3 → ±Infinity, or NaN after a bad
    // applyMatrix4). Inserting NaN into RBush poisons all spatial searches.
    if (isFiniteSpatialBBox(rootBox)) {
      this._spatialIndex.insert({
        minX: rootBox.minX,
        minY: rootBox.minY,
        maxX: rootBox.maxX,
        maxY: rootBox.maxY,
        id: entity.objectId
      })

      if (spatialIndexChildBoxes && spatialIndexChildBoxes.length > 0) {
        entity.wcsBbox.min.set(rootBox.minX, rootBox.minY, entity.wcsBbox.min.z)
        entity.wcsBbox.max.set(rootBox.maxX, rootBox.maxY, entity.wcsBbox.max.z)
      }
    }

    // Keep the child-box index via userData so object snap can still resolve gsMark to sub-entities.
    // ensureChildIndex may still register a finite root from child unions when
    // the coarse root above was skipped.
    if (spatialIndexChildBoxes) {
      this._spatialIndex.ensureChildIndex(
        entity.objectId,
        spatialIndexChildBoxes
      )
    } else if (entity instanceof ThreeRendererGroup) {
      // If it is one group, build spatial index for entities in this group.
      this._spatialIndex.createChildIndex(entity)
    }
  }

  /**
   * Registers a simple axis-aligned WCS box in the spatial index by object id.
   */
  private registerSpatialIndexBox(objectId: string, wcsBbox: THREE.Box3) {
    if (this.skipSpatialIndex) {
      return
    }
    const box = {
      minX: wcsBbox.min.x,
      minY: wcsBbox.min.y,
      maxX: wcsBbox.max.x,
      maxY: wcsBbox.max.y,
      id: objectId
    }
    if (!isFiniteSpatialBBox(box)) {
      return
    }
    this._spatialIndex.insert(box)
  }
}
