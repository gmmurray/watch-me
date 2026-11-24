import Dexie, { type EntityTable } from 'dexie'

export type MediaType = 'movie' | 'show'

export interface WatchItem {
  id: number
  mediaType: MediaType
  tmdbId: number
  title: string
  year: string | null
  posterPath: string | null
  overview: string
  tags: string[]
  addedAt: number
  watchedAt: number | null
  /** To-watch position, ascending. Seeded from addedAt. */
  order: number
}

export const db = new Dexie('watch-me') as Dexie & {
  items: EntityTable<WatchItem, 'id'>
}

// null watchedAt values are excluded from the [mediaType+watchedAt] index,
// so that index naturally contains only crossed-off items.
db.version(1).stores({
  items: '++id, [mediaType+addedAt], [mediaType+watchedAt], &[mediaType+tmdbId]',
})

// v2 adds the order key. Seeding it from addedAt keeps existing lists in the
// oldest-first order they already had. [mediaType+addedAt] is no longer
// queried but stays rather than spending a schema version to drop it.
db.version(2)
  .stores({
    items:
      '++id, [mediaType+addedAt], [mediaType+order], [mediaType+watchedAt], &[mediaType+tmdbId]',
  })
  .upgrade((tx) =>
    tx
      .table<WatchItem>('items')
      .toCollection()
      .modify((item) => {
        item.order = item.addedAt
      }),
  )

function byMediaType(index: string, mediaType: MediaType) {
  return db.items
    .where(index)
    .between([mediaType, Dexie.minKey], [mediaType, Dexie.maxKey])
}

export function listToWatch(mediaType: MediaType): Promise<WatchItem[]> {
  return byMediaType('[mediaType+order]', mediaType)
    .filter((item) => item.watchedAt === null)
    .toArray()
}

export function listWatched(mediaType: MediaType): Promise<WatchItem[]> {
  return byMediaType('[mediaType+watchedAt]', mediaType).reverse().toArray()
}

export function addItem(
  item: Omit<WatchItem, 'id' | 'addedAt' | 'watchedAt' | 'order'>,
): Promise<number> {
  // New items land at the bottom of the list.
  return db.transaction('rw', db.items, async () => {
    const last = await byMediaType('[mediaType+order]', item.mediaType).last()
    return db.items.add({
      ...item,
      addedAt: Date.now(),
      watchedAt: null,
      order: last ? last.order + 1 : 0,
    })
  })
}

/** Put an item above everything else in its list. */
export function moveToTop(item: WatchItem): Promise<number> {
  return db.transaction('rw', db.items, async () => {
    const first = await byMediaType('[mediaType+order]', item.mediaType).first()
    return db.items.update(item.id, { order: (first?.order ?? 0) - 1 })
  })
}

/**
 * Commit a rearranged list: ids in their new top-to-bottom order,
 * rewritten as dense 0..n-1. Ids that no longer exist are skipped.
 */
export function saveOrder(ids: number[]): Promise<unknown> {
  return db.items.bulkUpdate(
    ids.map((id, index) => ({ key: id, changes: { order: index } })),
  )
}

export function markWatched(id: number): Promise<number> {
  return db.items.update(id, { watchedAt: Date.now() })
}

export function unmarkWatched(id: number): Promise<number> {
  return db.items.update(id, { watchedAt: null })
}

export function removeItem(id: number): Promise<void> {
  return db.items.delete(id)
}
