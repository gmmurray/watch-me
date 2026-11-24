import type { WatchItem } from '../db'
import { formatDate } from '../format'
import { posterUrl } from '../tmdb'

interface ItemListProps {
  items: WatchItem[]
  onSelect: (item: WatchItem) => void
  activeTag: string | null
  onTag: (tag: string) => void
}

function Poster({ item }: { item: WatchItem }) {
  const url = posterUrl(item.posterPath, 'w185')
  if (!url) {
    return <div className="row-poster row-poster-empty">{item.title[0] ?? '?'}</div>
  }
  return <img className="row-poster" src={url} alt="" loading="lazy" />
}

// The title button's tap area is stretched over the whole row (see .row-open),
// so the tag buttons can sit on top of it instead of nesting inside a button.
export function ItemList({ items, onSelect, activeTag, onTag }: ItemListProps) {
  return (
    <ul className="list">
      {items.map((item) => {
        const watched = item.watchedAt !== null
        return (
          <li key={item.id}>
            <div className={watched ? 'row row-item row-watched' : 'row row-item'}>
              <Poster item={item} />
              <div className="row-main">
                <button className="row-title row-open" onClick={() => onSelect(item)}>
                  {item.title}
                  {item.year && <span className="row-year">{item.year}</span>}
                </button>
                <div className="row-meta">
                  <span>
                    {watched
                      ? `watched ${formatDate(item.watchedAt!)}`
                      : `added ${formatDate(item.addedAt)}`}
                  </span>
                  {item.tags.map((tag) => (
                    <button
                      key={tag}
                      className={tag === activeTag ? 'tag tag-active' : 'tag'}
                      aria-pressed={tag === activeTag}
                      onClick={() => onTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
