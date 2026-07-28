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
}

export const db = new Dexie('watch-me') as Dexie & {
  items: EntityTable<WatchItem, 'id'>
}

// null watchedAt values are excluded from the [mediaType+watchedAt] index,
// so that index naturally contains only crossed-off items.
db.version(1).stores({
  items: '++id, [mediaType+addedAt], [mediaType+watchedAt], &[mediaType+tmdbId]',
})

export function listToWatch(mediaType: MediaType): Promise<WatchItem[]> {
  return db.items
    .where('[mediaType+addedAt]')
    .between([mediaType, Dexie.minKey], [mediaType, Dexie.maxKey])
    .filter((item) => item.watchedAt === null)
    .toArray()
}

export function listWatched(mediaType: MediaType): Promise<WatchItem[]> {
  return db.items
    .where('[mediaType+watchedAt]')
    .between([mediaType, Dexie.minKey], [mediaType, Dexie.maxKey])
    .reverse()
    .toArray()
}

export function addItem(
  item: Omit<WatchItem, 'id' | 'addedAt' | 'watchedAt'>,
): Promise<number> {
  return db.items.add({ ...item, addedAt: Date.now(), watchedAt: null })
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
