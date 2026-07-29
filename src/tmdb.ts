import type { MediaType } from './db'

export interface SearchResult {
  tmdbId: number
  title: string
  year: string | null
  posterPath: string | null
  overview: string
}

interface TmdbResult {
  id: number
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path: string | null
  overview?: string
}

const TOKEN: string | undefined = import.meta.env.VITE_TMDB_TOKEN

export const hasToken = Boolean(TOKEN)

export function posterUrl(
  path: string | null,
  size: 'w185' | 'w342',
): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null
}

export function mapResult(r: TmdbResult): SearchResult {
  return {
    tmdbId: r.id,
    title: r.title ?? r.name ?? 'Untitled',
    year: (r.release_date ?? r.first_air_date)?.slice(0, 4) || null,
    posterPath: r.poster_path,
    overview: r.overview ?? '',
  }
}

export async function searchTmdb(
  mediaType: MediaType,
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const endpoint = mediaType === 'movie' ? 'movie' : 'tv'
  const url = new URL(`https://api.themoviedb.org/3/search/${endpoint}`)
  url.searchParams.set('query', query)
  url.searchParams.set('include_adult', 'false')
  url.searchParams.set('language', 'en-US')

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    signal,
  })
  if (!res.ok) throw new Error(`TMDB request failed (${res.status})`)
  const data: { results?: TmdbResult[] } = await res.json()
  return (data.results ?? []).map(mapResult)
}
