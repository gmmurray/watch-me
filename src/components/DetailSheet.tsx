import { useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  markWatched,
  removeItem,
  unmarkWatched,
  type WatchItem,
} from '../db'
import { formatDate } from '../format'
import { posterUrl } from '../tmdb'
import type { ToastFn } from '../toast'
import { Sheet } from './Sheet'

interface DetailSheetProps {
  open: boolean
  itemId: number | null
  onClose: () => void
  toast: ToastFn
}

function TagEditor({ item }: { item: WatchItem }) {
  const [draft, setDraft] = useState('')

  const suggestions = useLiveQuery(async () => {
    const items = await db.items.toArray()
    const all = new Set(
      items.filter((i) => i.mediaType === item.mediaType).flatMap((i) => i.tags),
    )
    return [...all].sort()
  }, [item.mediaType])

  async function saveTags(tags: string[]) {
    await db.items.update(item.id, { tags })
  }

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase()
    if (!tag || item.tags.includes(tag)) return
    void saveTags([...item.tags, tag])
    setDraft('')
  }

  const matching = (suggestions ?? []).filter(
    (tag) =>
      !item.tags.includes(tag) &&
      (draft.trim() === '' || tag.startsWith(draft.trim().toLowerCase())),
  )

  return (
    <div className="tag-editor">
      <div className="tag-chips">
        {item.tags.map((tag) => (
          <span key={tag} className="tag tag-removable">
            {tag}
            <button
              className="tag-remove"
              aria-label={`Remove tag ${tag}`}
              onClick={() => void saveTags(item.tags.filter((t) => t !== tag))}
            >
              <FiX size={11} />
            </button>
          </span>
        ))}
      </div>
      <input
        className="tag-input"
        type="text"
        placeholder="Add a tag…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') addTag(draft)
        }}
        enterKeyHint="done"
      />
      {matching.length > 0 && (
        <div className="tag-suggestions">
          {matching.slice(0, 6).map((tag) => (
            <button key={tag} className="tag" onClick={() => addTag(tag)}>
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function DetailSheet({ open, itemId, onClose, toast }: DetailSheetProps) {
  const live = useLiveQuery(
    () => (itemId === null ? undefined : db.items.get(itemId)),
    [itemId],
  )
  // Keep the last seen item so the sheet can animate out after a removal.
  const lastItem = useRef<WatchItem | undefined>(undefined)
  if (live) lastItem.current = live
  const item = live ?? lastItem.current
  if (!item) return null

  const watched = item.watchedAt !== null
  const poster = posterUrl(item.posterPath, 'w342')

  async function handleCrossOff() {
    await markWatched(item!.id)
    onClose()
    toast(`Crossed off “${item!.title}”`, {
      label: 'Undo',
      run: () => void unmarkWatched(item!.id),
    })
  }

  async function handleRestore() {
    await unmarkWatched(item!.id)
    onClose()
    toast(`“${item!.title}” is back on the list`)
  }

  async function handleRemove() {
    const snapshot = { ...item! }
    onClose()
    await removeItem(snapshot.id)
    toast(`Removed “${snapshot.title}”`, {
      label: 'Undo',
      run: () => void db.items.put(snapshot),
    })
  }

  return (
    <Sheet open={open} title={item.title} onClose={onClose}>
      <div className="detail">
        <div className="detail-top">
          {poster && <img className="detail-poster" src={poster} alt="" />}
          <div className="detail-facts">
            {item.year && <p className="detail-year">{item.year}</p>}
            <p className="detail-date">added {formatDate(item.addedAt)}</p>
            {watched && (
              <p className="detail-date">watched {formatDate(item.watchedAt!)}</p>
            )}
          </div>
        </div>
        {item.overview && <p className="detail-overview">{item.overview}</p>}
        <TagEditor item={item} />
        <div className="detail-actions">
          {watched ? (
            <button className="btn-primary" onClick={() => void handleRestore()}>
              Back on the list
            </button>
          ) : (
            <button className="btn-primary" onClick={() => void handleCrossOff()}>
              Cross it off
            </button>
          )}
          <button className="btn-quiet" onClick={() => void handleRemove()}>
            Remove
          </button>
        </div>
      </div>
    </Sheet>
  )
}
