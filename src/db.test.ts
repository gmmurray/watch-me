import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  addItem,
  db,
  listToWatch,
  listWatched,
  markWatched,
  saveOrder,
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
      {
        ...fixture({ tmdbId: 1, title: 'second' }),
        addedAt: 200,
        watchedAt: null,
        order: 200,
      },
      {
        ...fixture({ tmdbId: 2, title: 'first' }),
        addedAt: 100,
        watchedAt: null,
        order: 100,
      },
      {
        ...fixture({ mediaType: 'show', tmdbId: 1, title: 'a show' }),
        addedAt: 50,
        watchedAt: null,
        order: 50,
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

describe('custom order', () => {
  async function seed() {
    await db.items.bulkAdd([
      { ...fixture({ tmdbId: 1, title: 'a' }), addedAt: 100, watchedAt: null, order: 2 },
      { ...fixture({ tmdbId: 2, title: 'b' }), addedAt: 200, watchedAt: null, order: 0 },
      { ...fixture({ tmdbId: 3, title: 'c' }), addedAt: 300, watchedAt: null, order: 1 },
    ])
  }

  it('orders by the order key, independently of addedAt', async () => {
    await seed()
    expect((await listToWatch('movie', 'custom')).map((i) => i.title)).toEqual([
      'b',
      'c',
      'a',
    ])
    expect((await listToWatch('movie', 'added')).map((i) => i.title)).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('appends new items to the bottom, per mediaType', async () => {
    await seed()
    const id = await addItem(fixture({ tmdbId: 4, title: 'd' }))
    expect((await db.items.get(id))?.order).toBe(3)
    expect((await listToWatch('movie', 'custom')).map((i) => i.title)).toEqual([
      'b',
      'c',
      'a',
      'd',
    ])

    const showId = await addItem(fixture({ mediaType: 'show', tmdbId: 9 }))
    expect((await db.items.get(showId))?.order).toBe(0)
  })

  it('rewrites the order densely on save and ignores stale ids', async () => {
    await seed()
    const current = await listToWatch('movie', 'custom')
    const reversed = [...current].reverse()
    await saveOrder([...reversed.map((i) => i.id), 9999])

    const saved = await listToWatch('movie', 'custom')
    expect(saved.map((i) => i.title)).toEqual(['a', 'c', 'b'])
    expect(saved.map((i) => i.order)).toEqual([0, 1, 2])
  })

  it('returns an un-crossed-off item to its old slot', async () => {
    await seed()
    const [, middle] = await listToWatch('movie', 'custom')
    await markWatched(middle.id)
    await unmarkWatched(middle.id)
    expect((await listToWatch('movie', 'custom')).map((i) => i.title)).toEqual([
      'b',
      'c',
      'a',
    ])
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
