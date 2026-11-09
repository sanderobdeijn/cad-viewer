import { log } from '@mlightcad/common'
import { GeometryBox2d, GeometryBox3d } from '@mlightcad/geometry-engine'
import {
  ThreeRendererDirectEntityMeta,
  ThreeRendererEntity,
  ThreeRendererEntityPreview,
  ThreeRendererHtmlTransientManager,
  ThreeRendererPreviewOverlayManager,
  ThreeRendererTransientManager
} from '@mlightcad/three-renderer'
import * as THREE from 'three'

import type { ThreeRendererSpatialSearchOptions } from '../spatialIndex/ThreeRendererSpatialIndex'
import {
  type ThreeRendererEntityPreviewRootOptions,
  ThreeRendererLayout,
  ThreeRendererLayoutStats
} from './ThreeRendererLayout'

/** Layout search order when building entity preview geometry. */
export type ThreeRendererEntityPreviewScope = 'active-first' | 'all'

export interface ThreeRendererSceneStats {
  layouts: ThreeRendererLayoutStats[]
  summary: {
    layoutCount: number
    entityCount: number
    totalSize: {
      line: number
      mesh: number
      point: number
      unbatched: number
      geometry: number
      mapping: number
      unbatchedCount: number
      unbatchedByType: {
        line: number
        mesh: number
        point: number
        other: number
      }
    }
  }
}

/**
 * Three.js scene manager for CAD drawings with hierarchical organization.
 *
 * The scene manages the complete visual representation of a CAD drawing using
 * a hierarchical structure that mirrors CAD data organization:
 *
 * ```
 * Scene
 * └── Layout (ThreeRendererLayout) - Paper space or model space
 *     └── Entity (ThreeRendererEntity) - Individual CAD entities (lines, arcs, etc.)
 * ```
 *
 * ## Key Responsibilities
 * - **Layout Management**: Handles multiple layouts (model space and paper spaces)
 * - **Entity Rendering**: Provides access to all renderable CAD entities
 * - **Spatial Queries**: Calculates bounding boxes and spatial relationships
 * - **Three.js Integration**: Maintains the underlying Three.js scene
 *
 * The scene automatically manages the active layout and provides efficient
 * access to entities for rendering, selection, and spatial operations.
 *
 * @example
 * ```typescript
 * const scene = new ThreeRendererScene();
 *
 * // Set up model space
 * scene.modelSpaceBtrId = modelSpaceId;
 *
 * // Add entities
 * const entity = new ThreeRendererLine(...);
 * scene.addEntity(entity);
 *
 * // Get all visible entities for rendering
 * const entities = scene.getAllEntities();
 *
 * // Get scene bounds for zoom operations
 * const bounds = scene.box;
 * ```
 */
export class ThreeRendererScene {
  /** The underlying Three.js scene object */
  private _scene: THREE.Scene
  /** Map of layout ID to layout object */
  /** Map of layout ID to layout object */
  private _layouts: Map<string, ThreeRendererLayout>
  /** ID of the currently active layout */
  private _activeLayoutBtrId: string
  /** ID of the model space layout */
  private _modelSpaceBtrId: string
  /** Transient objects manager */
  private _transientManager: ThreeRendererTransientManager
  /** HTML transient elements manager */
  private _htmlTransientManager: ThreeRendererHtmlTransientManager
  /** Batched preview overlay manager */
  private _previewOverlayManager: ThreeRendererPreviewOverlayManager
  /**
   * When true, layouts skip spatial-index registration during convert.
   * Headless HTML/JPEG export sets this so pick indexes are not built.
   */
  private _skipSpatialIndex = false

  /**
   * Creates a new CAD scene instance.
   *
   * Initializes the Three.js scene and layout management structures.
   */
  constructor() {
    this._scene = new THREE.Scene()
    this._transientManager = new ThreeRendererTransientManager(this._scene)
    this._htmlTransientManager = new ThreeRendererHtmlTransientManager(this._scene)
    this._previewOverlayManager = new ThreeRendererPreviewOverlayManager(this._scene)
    this._layouts = new Map()
    this._activeLayoutBtrId = ''
    this._modelSpaceBtrId = ''
  }

  get skipSpatialIndex() {
    return this._skipSpatialIndex
  }

  set skipSpatialIndex(value: boolean) {
    this._skipSpatialIndex = value
    for (const layout of this._layouts.values()) {
      layout.skipSpatialIndex = value
    }
  }

  /**
   * The HTML transient elements manager for this scene
   */
  get htmlTransientManager() {
    return this._htmlTransientManager
  }

  /**
   * The layouts in this scene
   */
  get layouts() {
    return this._layouts
  }

  /**
   * The bounding box of the visibile objects in this secene
   */
  get box() {
    const layout = this.activeLayout
    if (!layout) return undefined
    const box = layout.box
    return box.isEmpty() ? undefined : box
  }

  /**
   * The scene object of THREE.js. This is internally used only. Try to avoid using it.
   */
  get internalScene() {
    return this._scene
  }

  /**
   * The block table record id of the model space
   */
  get modelSpaceBtrId() {
    return this._modelSpaceBtrId
  }
  set modelSpaceBtrId(value: string) {
    this._modelSpaceBtrId = value
    if (!this._layouts.has(value)) {
      throw new Error(
        `[ThreeRendererScene] No layout assiciated with the specified block table record id '${value}'!`
      )
    }
  }

  /**
   * The block table record id associated with the current active layout
   */
  get activeLayoutBtrId() {
    return this._activeLayoutBtrId
  }
  set activeLayoutBtrId(value: string) {
    this._activeLayoutBtrId = value
    this._layouts.forEach((layout, key) => {
      layout.visible = value == key
    })
  }

  /**
   * Get active layout
   */
  get activeLayout() {
    if (this._activeLayoutBtrId && this._layouts.has(this._activeLayoutBtrId)) {
      return this._layouts.get(this._activeLayoutBtrId)!
    }
    return undefined
  }

  /**
   * Get the layout of the model space
   */
  get modelSpaceLayout() {
    if (this._modelSpaceBtrId && this._layouts.has(this._modelSpaceBtrId)) {
      return this._layouts.get(this._modelSpaceBtrId)!
    }
    return undefined
  }

  /**
   * The statistics of this scene
   */
  get stats(): ThreeRendererSceneStats {
    const layouts: ThreeRendererLayoutStats[] = []
    let entityCount = 0
    let lineSize = 0
    let meshSize = 0
    let pointSize = 0
    let unbatchedSize = 0
    let geometrySize = 0
    let mappingSize = 0
    let unbatchedCount = 0
    const unbatchedByType = {
      line: 0,
      mesh: 0,
      point: 0,
      other: 0
    }
    this._layouts.forEach(layout => layouts.push(layout.stats))
    layouts.forEach(layout => {
      entityCount += layout.summary.entityCount
      lineSize += layout.summary.totalSize.line
      meshSize += layout.summary.totalSize.mesh
      pointSize += layout.summary.totalSize.point
      unbatchedSize += layout.summary.totalSize.unbatched
      geometrySize += layout.summary.totalSize.geometry
      mappingSize += layout.summary.totalSize.mapping
      unbatchedCount += layout.summary.totalSize.unbatchedCount
      unbatchedByType.line += layout.summary.totalSize.unbatchedByType.line
      unbatchedByType.mesh += layout.summary.totalSize.unbatchedByType.mesh
      unbatchedByType.point += layout.summary.totalSize.unbatchedByType.point
      unbatchedByType.other += layout.summary.totalSize.unbatchedByType.other
    })
    return {
      layouts,
      summary: {
        layoutCount: layouts.length,
        entityCount,
        totalSize: {
          line: lineSize,
          mesh: meshSize,
          point: pointSize,
          unbatched: unbatchedSize,
          geometry: geometrySize,
          mapping: mappingSize,
          unbatchedCount,
          unbatchedByType
        }
      }
    }
  }

  /**
   * Add one empty layout with the specified block table record id as the its key.
   *
   * This method is idempotent: when a layout already exists for the given
   * `ownerId`, the existing instance is returned untouched and no new THREE
   * group is attached to the scene. Re-creating eagerly would leak the
   * previous `ThreeRendererLayout.internalObject` as an orphan child of `_scene`
   * (still rendered every frame and still indexed by ray/spatial queries),
   * which manifested as "ghost" entities from previously-visited layouts
   * accumulating on layout switches.
   *
   * @param ownerId Input the block table record id associated with this layout
   * @returns Return the layout associated with `ownerId` — newly created when
   * absent, or the pre-existing instance when already registered.
   */
  addEmptyLayout(ownerId: string) {
    const existing = this._layouts.get(ownerId)
    if (existing) return existing

    const layout = new ThreeRendererLayout()
    layout.skipSpatialIndex = this._skipSpatialIndex
    this._layouts.set(ownerId, layout)
    this._scene.add(layout.internalObject)
    layout.visible = ownerId == this._activeLayoutBtrId
    return layout
  }

  /**
   * Clear scene
   * @returns Return this scene
   */
  clear() {
    this._layouts.forEach(layout => {
      this._scene.remove(layout.internalObject)
      layout.clear()
    })
    this._layouts.clear()
    this._transientManager.clear()
    this._htmlTransientManager.clear()
    this._previewOverlayManager.clear()
    this._scene.clear()
    this._transientManager = new ThreeRendererTransientManager(this._scene)
    this._htmlTransientManager = new ThreeRendererHtmlTransientManager(this._scene)
    this._previewOverlayManager = new ThreeRendererPreviewOverlayManager(this._scene)
    return this
  }

  /**
   * Hover the specified entities. Propagates the request to **every**
   * layout in the scene, not just the active one — entities picked
   * through a paper-space viewport (drill-through) live in the model
   * layout while the active layout at pick time is paper, so the
   * hover/select state must reach both. Layouts that don't own the
   * given entity ids no-op gracefully (`getLayersByObjectId` returns
   * an empty array there).
   */
  hover(ids: string[]) {
    if (this._layouts.size === 0) return false
    this._layouts.forEach(layout => layout.hover(ids))
    return true
  }

  /**
   * Unhover the specified entities across all layouts. See {@link hover}
   * for rationale on propagation.
   */
  unhover(ids: string[]) {
    if (this._layouts.size === 0) return false
    this._layouts.forEach(layout => layout.unhover(ids))
    return true
  }

  /**
   * Select the specified entities across all layouts.
   *
   * This is what makes drill-through selection visually consistent: a
   * click inside a paper-space viewport resolves to a model entity, but
   * the active layout at that moment is paper. Without propagating to
   * the model layout, the selection would be silently lost — the entity
   * goes into `selectionSet` but no highlight ever renders. The bug
   * manifested as "I click on a line in the viewport and nothing
   * visibly selects" (debug logs confirmed `firstPicked` was the
   * correct entity, but the highlight never appeared).
   *
   * Cross-layout propagation also restores symmetry of
   * `select`/`unselect`: a model entity highlighted via paper drill
   * must un-highlight when the user replaces the selection from any
   * layout, not just the one where it was originally picked.
   */
  select(ids: string[]) {
    if (this._layouts.size === 0) return false
    this._layouts.forEach(layout => layout.select(ids))
    return true
  }

  /**
   * Unselect the specified entities across all layouts. See
   * {@link select} for rationale.
   */
  unselect(ids: string[]) {
    if (this._layouts.size === 0) return false
    this._layouts.forEach(layout => layout.unselect(ids))
    return true
  }

  /**
   * Search entities intersected or contained in the specified bounding box.
   * @param box Input the query bounding box
   * @returns Return query results
   */
  search(
    box: GeometryBox2d | GeometryBox3d,
    options?: ThreeRendererSpatialSearchOptions
  ) {
    const activeLayout = this.activeLayout
    return activeLayout ? activeLayout.search(box, options) : []
  }

  /**
   * Applies ACI-7 / foreground colour to owned batch material clones across layouts.
   */
  repaintForegroundMaterials(color: number) {
    this._layouts.forEach(layout => layout.repaintForegroundMaterials(color))
  }

  /**
   * Add the specified transient entity into this scene
   * @param entity Input one transient entity
   */
  addTransientEntity(entity: ThreeRendererEntity) {
    this._transientManager.update(entity)
  }

  /**
   * Remove the specified transient entity from this scene
   * @param objectId Input the object id of the transient entity to remove
   */
  removeTransientEntity(objectId: string) {
    this._transientManager.remove(objectId)
  }

  /**
   * Show or hide one transient entity already published in this scene.
   * @returns `true` when the entity exists and visibility was updated.
   */
  setTransientEntityVisible(objectId: string, visible: boolean): boolean {
    const entity = this._transientManager.get(objectId)
    if (!entity) return false
    if (entity.visible === visible) return false
    entity.visible = visible
    return true
  }

  /**
   * Applies world transforms to existing transient entities without reconverting
   * database entities on every cursor move.
   *
   * Also forwards matching ids to {@link ThreeRendererHtmlTransientManager} so HTML
   * overlays receive the same delta as WebGL transients.
   *
   * @returns Which renderer layers actually changed, so the view can dirty
   *   WebGL and CSS2D independently.
   */
  updateTransientPreviewTransforms(
    transforms: ReadonlyArray<{ objectId: string; matrix: THREE.Matrix4 }>
  ): { webgl: boolean; html: boolean } {
    const mapped = transforms.map(entry => ({
      id: entry.objectId,
      matrix: entry.matrix
    }))
    return {
      webgl: this._transientManager.applyTransforms(mapped),
      html: this._htmlTransientManager.applyTransforms(mapped)
    }
  }

  /**
   * Returns true when every requested entity can be previewed in the active layout.
   *
   * Uses batch bounds only and does not clone preview geometry.
   *
   * @param entityIds - Database object ids required for preview creation
   */
  canCreatePreview(entityIds: string[]): boolean {
    const layout = this.activeLayout
    if (!layout) {
      return false
    }
    return layout.canCreateEntityPreview(entityIds, {
      requireAllEntities: true
    })
  }

  /**
   * Computes a 2D framing box for preview export without cloning drawables.
   *
   * @param entityIds - Database object ids to measure
   * @param margin - Margin multiplier applied around the raw bounds
   * @param scope - Layout search order; defaults to {@link ThreeRendererEntityPreviewScope active-first}
   */
  computeEntityPreviewBounds2d(
    entityIds: string[],
    margin = 1.1,
    scope: ThreeRendererEntityPreviewScope = 'active-first'
  ): GeometryBox2d | null {
    const box = this.computeEntityPreviewBoundsBox(entityIds, scope)
    return ThreeRendererEntityPreview.box3ToBounds2d(box, margin)
  }

  /**
   * Returns entity ids that can be previewed using the same layout policy as
   * {@link createEntityPreviewRoot}.
   *
   * @param entityIds - Database object ids to check
   * @param scope - Layout search order; defaults to {@link ThreeRendererEntityPreviewScope active-first}
   */
  findPreviewableEntityIds(
    entityIds: string[],
    scope: ThreeRendererEntityPreviewScope = 'active-first'
  ): string[] {
    if (entityIds.length === 0) {
      return []
    }

    if (scope === 'all') {
      const previewable: string[] = []
      const pending = new Set(entityIds)
      for (const layout of this.getOrderedLayouts('all')) {
        if (pending.size === 0) {
          break
        }

        const claimable = layout.findPreviewableEntityIds([...pending])
        if (claimable.length === 0) {
          continue
        }

        previewable.push(...claimable)
        for (const id of claimable) {
          pending.delete(id)
        }
      }
      return previewable
    }

    for (const layout of this.getOrderedLayouts('active-first')) {
      const claimable = layout.findPreviewableEntityIds(entityIds)
      if (claimable.length > 0) {
        return claimable
      }
    }
    return []
  }

  /**
   * Builds one merged preview root, searching layouts in priority order.
   *
   * Entities that are missing from a layout or cannot be extracted are skipped.
   * With {@link ThreeRendererEntityPreviewScope.all}, each entity is taken from the first
   * layout that can preview it so geometry is not duplicated.
   *
   * @param entityIds - Database object ids to include in the preview overlay
   * @param options - Optional layout search order and per-layout extraction policy
   * @returns Preview root group, or `null` when no preview geometry was extracted
   */
  createEntityPreviewRoot(
    entityIds: string[],
    options?: {
      scope?: ThreeRendererEntityPreviewScope
      layoutOptions?: ThreeRendererEntityPreviewRootOptions
    }
  ): THREE.Group | null {
    if (entityIds.length === 0) {
      return null
    }

    const scope = options?.scope ?? 'active-first'
    const layoutOptions: ThreeRendererEntityPreviewRootOptions = {
      missingEntity: 'skip',
      ...options?.layoutOptions
    }

    if (scope === 'all') {
      return this.mergeEntityPreviewRoots(
        entityIds,
        this.getOrderedLayouts('all'),
        layoutOptions
      )
    }

    for (const layout of this.getOrderedLayouts('active-first')) {
      const root = layout.createEntityPreviewRoot(entityIds, layoutOptions)
      if (root) {
        return root
      }
    }
    return null
  }

  /**
   * Merges preview roots from the given layouts into one group.
   *
   * Each entity id is assigned to the first layout that can preview it.
   */
  private mergeEntityPreviewRoots(
    entityIds: string[],
    layouts: Iterable<ThreeRendererLayout>,
    layoutOptions: ThreeRendererEntityPreviewRootOptions
  ): THREE.Group | null {
    const pending = new Set(entityIds)
    const previewRoot = new THREE.Group()
    previewRoot.name = 'EntityPreviewRoot'

    for (const layout of layouts) {
      if (pending.size === 0) {
        break
      }

      const claimable = layout.findPreviewableEntityIds([...pending])
      if (claimable.length === 0) {
        continue
      }

      const layoutRoot = layout.createEntityPreviewRoot(
        claimable,
        layoutOptions
      )
      if (!layoutRoot) {
        continue
      }

      previewRoot.add(layoutRoot)
      for (const id of claimable) {
        pending.delete(id)
      }
    }

    return previewRoot.children.length > 0 ? previewRoot : null
  }

  /**
   * Returns layouts in priority order for preview lookup.
   */
  private getOrderedLayouts(scope: ThreeRendererEntityPreviewScope): ThreeRendererLayout[] {
    if (scope === 'all') {
      return [...this._layouts.values()]
    }

    const ordered: ThreeRendererLayout[] = []
    const active = this.activeLayout
    const model = this.modelSpaceLayout

    if (active) {
      ordered.push(active)
    }
    if (model && model !== active) {
      ordered.push(model)
    }
    for (const layout of this._layouts.values()) {
      if (layout !== active && layout !== model) {
        ordered.push(layout)
      }
    }
    return ordered
  }

  /**
   * Computes batch bounds for requested entities using the same layout policy as
   * {@link createEntityPreviewRoot}.
   */
  private computeEntityPreviewBoundsBox(
    entityIds: string[],
    scope: ThreeRendererEntityPreviewScope = 'active-first'
  ) {
    const target = new THREE.Box3()
    const scratch = new THREE.Box3()

    if (scope === 'all') {
      const pending = new Set(entityIds)
      for (const layout of this.getOrderedLayouts('all')) {
        if (pending.size === 0) {
          break
        }

        const claimable = layout.findPreviewableEntityIds([...pending])
        if (claimable.length === 0) {
          continue
        }

        layout.computeEntityPreviewBoundsBox(claimable, scratch)
        if (!scratch.isEmpty()) {
          target.union(scratch)
        }
        for (const id of claimable) {
          pending.delete(id)
        }
      }
      return target
    }

    for (const layout of this.getOrderedLayouts('active-first')) {
      layout.computeEntityPreviewBoundsBox(entityIds, scratch)
      if (!scratch.isEmpty()) {
        target.copy(scratch)
        return target
      }
    }

    target.makeEmpty()
    return target
  }

  /**
   * Creates one batched preview overlay for command jigs.
   *
   * Only the active layout is searched and every requested entity must be present.
   *
   * @param entityIds - Database object ids to include in the preview overlay
   * @returns Preview handle id, or `null` when preview creation failed
   */
  createPreview(entityIds: string[]): string | null {
    const layout = this.activeLayout
    if (!layout) {
      return null
    }

    const root = layout.createEntityPreviewRoot(entityIds, {
      missingEntity: 'fail',
      requireAllEntities: true
    })
    if (!root) {
      return null
    }
    return this._previewOverlayManager.add(root).id
  }

  /**
   * Updates the transform of one batched preview overlay.
   *
   * @param handleId - Preview handle returned by {@link createPreview}
   * @param matrix - World transform copied onto the preview root
   * @returns `true` when the handle exists and the transform was applied
   */
  updatePreview(handleId: string, matrix: THREE.Matrix4): boolean {
    return this._previewOverlayManager.update(handleId, matrix)
  }

  /**
   * Removes one batched preview overlay.
   *
   * @param handleId - Preview handle returned by {@link createPreview}
   * @returns `true` when the handle existed and was removed
   */
  removePreview(handleId: string): boolean {
    return this._previewOverlayManager.remove(handleId)
  }

  /**
   * Add one persistent entity (stored in the drawing database) into this scene. If the layout
   * associated with this entity doesn't exist, then create one layout, add this layout into
   * this scene, and add the entity into the layout.
   * @param entity Input AutoCAD entity to be added into scene.
   * @param extendBbox Input the flag whether to extend the bounding box of this scene by union the bounding box
   * of the specified entity.
   * @returns Return this scene
   */
  addEntity(entity: ThreeRendererEntity, extendBbox: boolean = true) {
    const ownerId = entity.ownerId
    if (ownerId) {
      let layout = this._layouts.get(ownerId)
      if (!layout) {
        layout = this.addEmptyLayout(ownerId)
      }
      layout.addEntity(entity, extendBbox)
    } else {
      log.warn('[ThreeRendererSecene] The owner id of one entity cannot be empty!')
    }

    return this
  }

  /**
   * Adds an entity via direct batch append (no temporary drawable tree).
   *
   * @returns `true` when geometry was registered in the target layout.
   */
  addDirectEntity(
    meta: ThreeRendererDirectEntityMeta,
    extendBbox: boolean = true
  ): boolean {
    const ownerId = meta.ownerId
    if (!ownerId) {
      log.warn('[ThreeRendererSecene] The owner id of one entity cannot be empty!')
      return false
    }
    let layout = this._layouts.get(ownerId)
    if (!layout) {
      layout = this.addEmptyLayout(ownerId)
    }
    return layout.addDirectEntity(meta, extendBbox)
  }

  /**
   * Remove the specified persistent entity (stored in the drawing database) from this scene.
   * @param objectId Input the object id of the entity to remove
   * @returns Return true if remove the specified entity successfully. Otherwise, return false.
   */
  removeEntity(objectId: string) {
    for (const [_, layout] of this._layouts) {
      if (layout.removeEntity(objectId)) return true
    }
    return false
  }

  /**
   * Update the specified persistent entity (stored in the drawing database) in this scene.
   * @param objectId Input the entity to update
   * @returns Return true if update the specified entity successfully. Otherwise, return false.
   */
  updateEntity(entity: ThreeRendererEntity) {
    for (const [_, layout] of this._layouts) {
      if (layout.updateEntity(entity)) return true
    }
    return false
  }

  /**
   * Returns true when the entity is present in any layout.
   */
  hasEntity(objectId: string) {
    for (const [_, layout] of this._layouts) {
      if (layout.hasEntity(objectId)) {
        return true
      }
    }
    return false
  }

  /**
   * Updates entity visibility without rebuilding batched geometry.
   */
  setEntityVisible(objectId: string, visible: boolean) {
    let updated = false
    for (const [_, layout] of this._layouts) {
      if (layout.setEntityVisible(objectId, visible)) {
        updated = true
      }
    }
    return updated
  }

  /**
   * Returns the current scene visibility for one entity.
   */
  getEntityVisible(objectId: string) {
    for (const [_, layout] of this._layouts) {
      const visible = layout.getEntityVisible(objectId)
      if (visible !== undefined) {
        return visible
      }
    }
    return undefined
  }
}
