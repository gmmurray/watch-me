import Dexie, { type EntityTable } from 'dexie'

export type MediaType = 'movie' | 'show'

/** How a to-watch list is ordered. Chosen per mediaType, kept in localStorage. */
export type OrderMode = 'added' | 'custom'

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
  /** Sort key for custom order mode. Seeded from addedAt. */
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

// v2 adds the custom order key. Seeding it from addedAt means a list switched
// to custom order for the first time looks exactly like the oldest-first list
// it was already showing.
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

export function listToWatch(
  mediaType: MediaType,
  orderMode: OrderMode = 'added',
): Promise<WatchItem[]> {
  const index = orderMode === 'custom' ? '[mediaType+order]' : '[mediaType+addedAt]'
  return byMediaType(index, mediaType)
    .filter((item) => item.watchedAt === null)
    .toArray()
}

export function listWatched(mediaType: MediaType): Promise<WatchItem[]> {
  return byMediaType('[mediaType+watchedAt]', mediaType).reverse().toArray()
}

export function addItem(
  item: Omit<WatchItem, 'id' | 'addedAt' | 'watchedAt' | 'order'>,
): Promise<number> {
  // New items land at the bottom of the custom order.
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

/**
 * Commit a rearranged custom order: ids in their new top-to-bottom order,
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
