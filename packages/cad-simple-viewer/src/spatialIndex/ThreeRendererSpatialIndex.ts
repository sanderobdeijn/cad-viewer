import { EditorSpatialQueryResultItem } from '../editor/view'

export type ThreeRendererSpatialIndexBBox = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** AutoCAD-style box selection semantics applied during spatial search. */
export type ThreeRendererSpatialSelectionMode = 'window' | 'crossing'

export interface ThreeRendererSpatialSearchOptions {
  /** Defaults to crossing (intersection). Window requires full containment. */
  selectionMode?: ThreeRendererSpatialSelectionMode
}

/** Returns whether one axis-aligned box lies fully inside another. */
export function isSpatialBoxFullyInside(
  item: ThreeRendererSpatialIndexBBox,
  box: ThreeRendererSpatialIndexBBox
): boolean {
  return (
    item.minX >= box.minX &&
    item.maxX <= box.maxX &&
    item.minY >= box.minY &&
    item.maxY <= box.maxY
  )
}

/** Implementation kind reported by {@link ThreeRendererSpatialIndex.getStats}. */
export type ThreeRendererSpatialIndexKind = 'rbush' | 'linear' | 'hierarchical'

/**
 * Estimated memory footprint of one spatial index instance.
 *
 * Byte totals are approximate (object overhead + sampled item payloads) and
 * are intended for diagnostics, not exact heap accounting.
 */
export interface ThreeRendererSpatialIndexStats {
  kind: ThreeRendererSpatialIndexKind
  /** Number of items stored at this index level (root only for hierarchical). */
  itemCount: number
  /** Approximate memory usage in bytes. */
  estimatedBytes: number
  /** Hierarchical: number of items in the root index. */
  rootItemCount?: number
  /** Hierarchical: number of registered child indexes. */
  childIndexCount?: number
  /** Hierarchical: sum of items across all child indexes. */
  childItemCount?: number
  /** Hierarchical: child indexes backed by RBush. */
  rbushChildCount?: number
  /** Hierarchical: child indexes backed by linear scan. */
  linearChildCount?: number
}

export interface ThreeRendererSpatialIndex<
  T extends EditorSpatialQueryResultItem = EditorSpatialQueryResultItem
> {
  /**
   * Inserts an item. To insert many items at once, use `load()`.
   *
   * @param item The item to insert.
   */
  insert(item: T): void

  /**
   * Bulk-inserts the given items into the tree.
   *
   * Bulk insertion is usually ~2-3 times faster than inserting items one by
   * one. After bulk loading (bulk insertion into an empty tree), subsequent
   * query performance is also ~20-30% better.
   *
   * Note that when you do bulk insertion into an existing tree, it bulk-loads
   * the given data into a separate tree and inserts the smaller tree into the
   * larger tree. This means that bulk insertion works very well for clustered
   * data (where items in one update are close to each other), but makes query
   * performance worse if the data is scattered.
   *
   * @param items The items to load.
   */
  load(items: readonly T[]): void

  /**
   * Removes a previously inserted item, comparing by reference.
   *
   * To remove all items, use `clear()`.
   *
   * @param item The item to remove.
   * @param equals A custom function that allows comparing by value instead.
   *               Useful when you have only a copy of the object you need
   *               removed (e.g. loaded from server).
   */
  remove(item: T, equals?: (a: T, b: T) => boolean): void

  /**
   * Removes a previously inserted item by its id.
   *
   * To remove all items, use `clear()`.
   *
   * @param id The id of a previously inserted item
   */
  removeById(id: string): void

  /**
   * Removes all items.
   */
  clear(): void

  /**
   * Returns an array of data items (points or rectangles) that the given
   * bounding box intersects.
   *
   * Note that the search method accepts a bounding box in `{minX, minY, maxX,
   * maxY}` format regardless of the data format.
   *
   * @param box The bounding box in which to search.
   * @param options Optional query semantics (for example window selection).
   */
  search(box: ThreeRendererSpatialIndexBBox, options?: ThreeRendererSpatialSearchOptions): T[]

  /**
   * Returns all items contained in the tree.
   */
  all(): T[]

  /**
   * Returns `true` if there are any items intersecting the given bounding
   * box, otherwise `false`.
   *
   * @param box The bounding box in which to search.
   */
  collides(box: ThreeRendererSpatialIndexBBox): boolean

  /**
   * Returns an approximate memory / cardinality snapshot for diagnostics.
   */
  getStats(): ThreeRendererSpatialIndexStats
}

/**
 * Estimates the JS heap bytes of one spatial-query item (bbox + id string).
 *
 * Uses a fixed object overhead plus UTF-16 string cost for `id`.
 */
export function estimateSpatialQueryItemBytes(
  item: EditorSpatialQueryResultItem
): number {
  // 4× float64 fields + shallow object overhead + id string.
  return 4 * 8 + 48 + (item.id?.length ?? 0) * 2
}

/**
 * Estimates total item payload bytes from a sample of spatial-query items.
 */
export function estimateSpatialItemsBytes(
  items: readonly EditorSpatialQueryResultItem[],
  sampleSize = 32
): number {
  const count = items.length
  if (count === 0) return 0
  const sampleCount = Math.min(count, sampleSize)
  let sampleBytes = 0
  for (let i = 0; i < sampleCount; i++) {
    sampleBytes += estimateSpatialQueryItemBytes(items[i])
  }
  return Math.round((sampleBytes / sampleCount) * count)
}
