import RBush from 'rbush'

import { EditorSpatialQueryResultItem } from '../editor/view'
import { isFiniteSpatialBBox } from '../view/ThreeRendererGroupWcsBboxAssert'
import {
  estimateSpatialItemsBytes,
  isSpatialBoxFullyInside,
  ThreeRendererSpatialIndex,
  ThreeRendererSpatialIndexBBox,
  ThreeRendererSpatialIndexStats,
  ThreeRendererSpatialSearchOptions} from './ThreeRendererSpatialIndex'

/** Approx. Map entry overhead (key pointer + value pointer + slot). */
const ID_MAP_ENTRY_BYTES = 40
/** Rough R-tree node overhead relative to leaf item payload. */
const RBUSH_TREE_OVERHEAD_FACTOR = 1.4

export class ThreeRendererRBushSpatialIndex implements ThreeRendererSpatialIndex {
  private readonly tree: RBush<EditorSpatialQueryResultItem>
  private readonly idMap: Map<string, EditorSpatialQueryResultItem>

  constructor(maxEntries?: number) {
    this.tree = new RBush<EditorSpatialQueryResultItem>(maxEntries)
    this.idMap = new Map<string, EditorSpatialQueryResultItem>()
  }

  insert(item: EditorSpatialQueryResultItem) {
    // RBush parent-node bounds use Math.min/max; a single NaN bbox poisons the
    // tree so every later search returns empty (pick / osnap fail globally).
    if (!isFiniteSpatialBBox(item)) {
      return
    }
    const hasId = typeof item.id === 'string' && item.id.length > 0
    // Empty ids (hatch fill islands) must not share one Map slot — otherwise
    // later inserts overwrite earlier islands and only the last stays pickable.
    if (hasId) {
      const existing = this.idMap.get(item.id)
      if (existing) {
        if (
          existing.minX === item.minX &&
          existing.minY === item.minY &&
          existing.maxX === item.maxX &&
          existing.maxY === item.maxY
        ) {
          return
        }
        this.remove(existing, (a, b) => a.id === b.id)
        this.idMap.delete(item.id)
      }
    }
    this.tree.insert(item)
    if (hasId) {
      this.idMap.set(item.id, item)
    }
  }

  load(items: readonly EditorSpatialQueryResultItem[]) {
    const finiteItems = items.filter(isFiniteSpatialBBox)
    this.tree.load(finiteItems)
    for (const item of finiteItems) {
      if (typeof item.id === 'string' && item.id.length > 0) {
        this.idMap.set(item.id, item)
      }
    }
  }

  remove(
    item: EditorSpatialQueryResultItem,
    equals?: (
      a: EditorSpatialQueryResultItem,
      b: EditorSpatialQueryResultItem
    ) => boolean
  ): void {
    this.tree.remove(
      item,
      equals ??
        ((a, b) =>
          a === b ||
          (a.id === b.id &&
            a.minX === b.minX &&
            a.minY === b.minY &&
            a.maxX === b.maxX &&
            a.maxY === b.maxY))
    )
    if (typeof item.id === 'string' && item.id.length > 0) {
      this.idMap.delete(item.id)
    }
  }

  removeById(id: string): void {
    if (!(typeof id === 'string' && id.length > 0)) {
      return
    }
    // Set minX, minY, maxX, and maxY to 0 in order to pass build
    this.tree.remove(
      {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        id: id
      },
      (a, b) => a.id === b.id
    )
    this.idMap.delete(id)
  }

  /**
   * Returns the item currently indexed for {@link id}, when present.
   */
  getById(id: string): EditorSpatialQueryResultItem | undefined {
    if (!(typeof id === 'string' && id.length > 0)) {
      return undefined
    }
    return this.idMap.get(id)
  }

  clear() {
    this.tree.clear()
    this.idMap.clear()
  }

  search(
    bbox: ThreeRendererSpatialIndexBBox,
    options?: ThreeRendererSpatialSearchOptions
  ): EditorSpatialQueryResultItem[] {
    const hits = this.tree.search(bbox)
    if (options?.selectionMode !== 'window') {
      return hits
    }
    return hits.filter(item => isSpatialBoxFullyInside(item, bbox))
  }

  collides(bbox: ThreeRendererSpatialIndexBBox): boolean {
    return this.tree.collides(bbox)
  }

  all(): EditorSpatialQueryResultItem[] {
    return this.tree.all()
  }

  getStats(): ThreeRendererSpatialIndexStats {
    const items = this.tree.all()
    const itemCount = items.length
    const itemBytes = estimateSpatialItemsBytes(items)
    const idMapBytes = this.idMap.size * ID_MAP_ENTRY_BYTES
    return {
      kind: 'rbush',
      itemCount,
      estimatedBytes: Math.round(
        itemBytes * RBUSH_TREE_OVERHEAD_FACTOR + idMapBytes
      )
    }
  }
}
