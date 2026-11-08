import { EditorSpatialQueryResultItem } from '../editor/view'
import {
  estimateSpatialItemsBytes,
  isSpatialBoxFullyInside,
  ThreeRendererSpatialIndex,
  ThreeRendererSpatialIndexBBox,
  ThreeRendererSpatialIndexStats,
  ThreeRendererSpatialSearchOptions} from './ThreeRendererSpatialIndex'

/** Approx. Map entry overhead (key pointer + value pointer + slot). */
const MAP_ENTRY_BYTES = 40

/**
 * A simple spatial index implementation that performs linear scanning
 * over all stored bounding boxes.
 *
 * This index does not build any spatial acceleration structure. All
 * spatial queries are executed by iterating through the full item list
 * and testing bounding-box intersection one by one.
 *
 * Typical use cases:
 * - Small datasets where index construction overhead is unnecessary
 * - Highly dynamic data with frequent insert/remove operations
 * - Debugging or validation of spatial query correctness
 * - Fallback implementation when spatial indexing is not available
 *
 * Time complexity:
 * - Insert / Remove: O(1)
 * - Search / Collides: O(n)
 *
 * This implementation is memory-efficient and predictable, but does
 * not scale well for large numbers of items.
 */
export class ThreeRendererLinearSpatialIndex implements ThreeRendererSpatialIndex {
  /**
   * Items keyed by object id, or by an internal anon key when `item.id` is
   * empty so multiple hatch fill islands can coexist.
   */
  private items = new Map<string, EditorSpatialQueryResultItem>()
  private anonKeySeq = 0

  private storageKey(item: EditorSpatialQueryResultItem): string {
    if (typeof item.id === 'string' && item.id.length > 0) {
      return item.id
    }
    return `__anon_${this.anonKeySeq++}`
  }

  insert(item: EditorSpatialQueryResultItem): void {
    if (typeof item.id === 'string' && item.id.length > 0) {
      this.items.set(item.id, item)
      return
    }
    this.items.set(this.storageKey(item), item)
  }

  load(items: readonly EditorSpatialQueryResultItem[]): void {
    for (const item of items) {
      this.insert(item)
    }
  }

  remove(item: EditorSpatialQueryResultItem): void {
    if (typeof item.id === 'string' && item.id.length > 0) {
      this.items.delete(item.id)
      return
    }
    for (const [key, value] of this.items) {
      if (
        value === item ||
        (value.id === item.id &&
          value.minX === item.minX &&
          value.minY === item.minY &&
          value.maxX === item.maxX &&
          value.maxY === item.maxY)
      ) {
        this.items.delete(key)
        return
      }
    }
  }

  removeById(id: string): void {
    if (typeof id === 'string' && id.length > 0) {
      this.items.delete(id)
    }
  }

  /**
   * Returns the item currently indexed for {@link id}, when present.
   */
  getById(id: string): EditorSpatialQueryResultItem | undefined {
    if (!(typeof id === 'string' && id.length > 0)) {
      return undefined
    }
    return this.items.get(id)
  }

  clear(): void {
    this.items.clear()
  }

  search(
    bbox: ThreeRendererSpatialIndexBBox,
    options?: ThreeRendererSpatialSearchOptions
  ): EditorSpatialQueryResultItem[] {
    const result: EditorSpatialQueryResultItem[] = []

    for (const item of this.items.values()) {
      if (!intersects(item, bbox)) {
        continue
      }
      if (
        options?.selectionMode === 'window' &&
        !isSpatialBoxFullyInside(item, bbox)
      ) {
        continue
      }
      result.push(item)
    }

    return result
  }

  collides(bbox: ThreeRendererSpatialIndexBBox): boolean {
    for (const item of this.items.values()) {
      if (intersects(item, bbox)) {
        return true
      }
    }
    return false
  }

  all(): EditorSpatialQueryResultItem[] {
    return Array.from(this.items.values())
  }

  getStats(): ThreeRendererSpatialIndexStats {
    const items = this.all()
    const itemCount = items.length
    return {
      kind: 'linear',
      itemCount,
      estimatedBytes:
        estimateSpatialItemsBytes(items) + itemCount * MAP_ENTRY_BYTES
    }
  }
}

function intersects(a: ThreeRendererSpatialIndexBBox, b: ThreeRendererSpatialIndexBBox): boolean {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  )
}
