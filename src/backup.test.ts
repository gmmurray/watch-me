import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { exportData, importData, parseBackup } from './backup'
import { db, type WatchItem } from './db'

function item(overrides: Partial<Omit<WatchItem, 'id'>> = {}): Omit<WatchItem, 'id'> {
  return {
    mediaType: 'movie',
    tmdbId: 1,
    title: 'Stalker',
    year: '1979',
    posterPath: null,
    overview: '',
    tags: [],
    addedAt: 100,
    watchedAt: null,
    ...overrides,
  }
}

beforeEach(() => db.items.clear())

describe('parseBackup', () => {
  it('rejects non-backup data', () => {
    expect(() => parseBackup(null)).toThrow()
    expect(() => parseBackup({ app: 'other', items: [] })).toThrow()
    expect(() => parseBackup({ app: 'watch-me', items: [{ nope: true }] })).toThrow()
  })
})

describe('export/import round trip', () => {
  it('restores an exported backup into an empty database', async () => {
    await db.items.bulkAdd([
      item({ tmdbId: 1, tags: ['anime'] }),
      item({ tmdbId: 2, mediaType: 'show', watchedAt: 500 }),
    ])
    const backup = await exportData()
    await db.items.clear()

    const result = await importData(backup)
    expect(result).toEqual({ added: 2, merged: 0 })

    const restored = await db.items.toArray()
    expect(restored).toHaveLength(2)
    expect(restored.find((r) => r.tmdbId === 1)?.tags).toEqual(['anime'])
    expect(restored.find((r) => r.tmdbId === 2)?.watchedAt).toBe(500)
  })
})

describe('import merging', () => {
  it('keeps the older addedAt, non-null watchedAt, and unions tags', async () => {
    await db.items.add(item({ addedAt: 200, watchedAt: null, tags: ['a24'] }))

    const result = await importData({
      app: 'watch-me',
      version: 1,
      exportedAt: 0,
      items: [item({ addedAt: 100, watchedAt: 900, tags: ['a24', 'horror'] })],
    })
    expect(result).toEqual({ added: 0, merged: 1 })

    const [merged] = await db.items.toArray()
    expect(merged.addedAt).toBe(100)
    expect(merged.watchedAt).toBe(900)
    expect(merged.tags.sort()).toEqual(['a24', 'horror'])
  })

  it('keeps the existing watchedAt when both are set', async () => {
    await db.items.add(item({ watchedAt: 400 }))
    await importData({
      app: 'watch-me',
      version: 1,
      exportedAt: 0,
      items: [item({ watchedAt: 900 })],
    })
    const [merged] = await db.items.toArray()
    expect(merged.watchedAt).toBe(400)
  })

  it('treats the same tmdbId in different modes as different items', async () => {
    await db.items.add(item({ mediaType: 'movie', tmdbId: 7 }))
    const result = await importData({
      app: 'watch-me',
      version: 1,
      exportedAt: 0,
      items: [item({ mediaType: 'show', tmdbId: 7 })],
    })
    expect(result).toEqual({ added: 1, merged: 0 })
    expect(await db.items.count()).toBe(2)
  })
})
