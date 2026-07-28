import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  addItem,
  db,
  listToWatch,
  listWatched,
  markWatched,
  unmarkWatched,
  type WatchItem,
} from './db'

function fixture(overrides: Partial<WatchItem> = {}) {
  return {
    mediaType: 'movie' as const,
    tmdbId: 1,
    title: 'Stalker',
    year: '1979',
    posterPath: null,
    overview: '',
    tags: [],
    ...overrides,
  }
}

beforeEach(() => db.items.clear())

describe('to-watch list', () => {
  it('orders by addedAt, oldest first, scoped to mediaType', async () => {
    await db.items.bulkAdd([
      { ...fixture({ tmdbId: 1, title: 'second' }), addedAt: 200, watchedAt: null },
      { ...fixture({ tmdbId: 2, title: 'first' }), addedAt: 100, watchedAt: null },
      {
        ...fixture({ mediaType: 'show', tmdbId: 1, title: 'a show' }),
        addedAt: 50,
        watchedAt: null,
      },
    ])

    const movies = await listToWatch('movie')
    expect(movies.map((m) => m.title)).toEqual(['first', 'second'])

    const shows = await listToWatch('show')
    expect(shows.map((s) => s.title)).toEqual(['a show'])
  })

  it('rejects the same tmdbId twice in one mediaType, allows it across types', async () => {
    await addItem(fixture({ tmdbId: 42 }))
    await expect(addItem(fixture({ tmdbId: 42 }))).rejects.toThrow()
    await expect(
      addItem(fixture({ mediaType: 'show', tmdbId: 42 })),
    ).resolves.toBeTruthy()
  })
})

describe('crossing off', () => {
  it('moves items between the to-watch and watched lists', async () => {
    const id = await addItem(fixture())
    expect(await listToWatch('movie')).toHaveLength(1)
    expect(await listWatched('movie')).toHaveLength(0)

    await markWatched(id)
    expect(await listToWatch('movie')).toHaveLength(0)
    const watched = await listWatched('movie')
    expect(watched).toHaveLength(1)
    expect(watched[0].watchedAt).not.toBeNull()

    await unmarkWatched(id)
    expect(await listToWatch('movie')).toHaveLength(1)
    expect(await listWatched('movie')).toHaveLength(0)
  })

  it('orders watched items newest-watched first', async () => {
    const a = await addItem(fixture({ tmdbId: 1, title: 'watched first' }))
    const b = await addItem(fixture({ tmdbId: 2, title: 'watched second' }))
    await db.items.update(a, { watchedAt: 100 })
    await db.items.update(b, { watchedAt: 200 })

    const watched = await listWatched('movie')
    expect(watched.map((w) => w.title)).toEqual(['watched second', 'watched first'])
  })
})
