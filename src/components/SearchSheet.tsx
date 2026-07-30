import { useEffect, useRef, useState } from 'react'
import { FiCheck, FiPlus } from 'react-icons/fi'
import { useLiveQuery } from 'dexie-react-hooks'
import { addItem, db, unmarkWatched, type MediaType } from '../db'
import { formatDate } from '../format'
import {
  hasToken,
  posterUrl,
  searchTmdb,
  type SearchResult,
} from '../tmdb'
import type { ToastFn } from '../toast'
import { Sheet } from './Sheet'

interface SearchSheetProps {
  open: boolean
  mode: MediaType
  onClose: () => void
  toast: ToastFn
}

export function SearchSheet({ open, mode, onClose, toast }: SearchSheetProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const existingIds = useLiveQuery(async () => {
    const items = await db.items.toArray()
    return new Set(
      items.filter((i) => i.mediaType === mode).map((i) => i.tmdbId),
    )
  }, [mode])

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setStatus('idle')
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    const q = query.trim()
    abortRef.current?.abort()
    if (q.length < 2) {
      setResults([])
      setStatus('idle')
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('loading')
    const timer = setTimeout(async () => {
      try {
        const found = await searchTmdb(mode, q, controller.signal)
        setResults(found)
        setStatus('idle')
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(err)
          setStatus('error')
        }
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, mode])

  async function handleAdd(result: SearchResult) {
    const existing = await db.items
      .where('[mediaType+tmdbId]')
      .equals([mode, result.tmdbId])
      .first()

    if (!existing) {
      await addItem({
        mediaType: mode,
        tmdbId: result.tmdbId,
        title: result.title,
        year: result.year,
        posterPath: result.posterPath,
        overview: result.overview,
        tags: [],
      })
      toast(`Added “${result.title}”`)
    } else if (existing.watchedAt === null) {
      toast('Already on your list')
    } else {
      toast(`You watched this on ${formatDate(existing.watchedAt)}`, {
        label: 'Watch again',
        run: () => void unmarkWatched(existing.id),
      })
    }
  }

  const noun = mode === 'movie' ? 'movies' : 'shows'

  return (
    <Sheet open={open} title={`Add ${noun}`} onClose={onClose} fullHeight>
      {!hasToken ? (
        <p className="sheet-note">
          No TMDB token configured. Copy <code>.env.example</code> to{' '}
          <code>.env</code> and set <code>VITE_TMDB_TOKEN</code>.
        </p>
      ) : (
        <>
          <input
            ref={inputRef}
            className="search-input"
            type="search"
            placeholder={`Search ${noun}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {status === 'error' && (
            <p className="sheet-note">Search failed — check your connection.</p>
          )}
          <ul className="list">
            {results.map((result) => (
              <li key={result.tmdbId}>
                <button className="row" onClick={() => void handleAdd(result)}>
                  {result.posterPath ? (
                    <img
                      className="row-poster"
                      src={posterUrl(result.posterPath, 'w185')!}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <div className="row-poster row-poster-empty">
                      {result.title[0] ?? '?'}
                    </div>
                  )}
                  <div className="row-main">
                    <div className="row-title">
                      {result.title}
                      {result.year && (
                        <span className="row-year">{result.year}</span>
                      )}
                    </div>
                    <div className="row-meta row-overview">{result.overview}</div>
                  </div>
                  {existingIds?.has(result.tmdbId) ? (
                    <span className="row-add row-added" aria-hidden>
                      <FiCheck size={20} />
                    </span>
                  ) : (
                    <span className="row-add" aria-hidden>
                      <FiPlus size={20} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  )
}
