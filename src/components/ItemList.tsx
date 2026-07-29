import type { WatchItem } from '../db'
import { formatDate } from '../format'
import { posterUrl } from '../tmdb'

interface ItemListProps {
  items: WatchItem[]
  onSelect: (item: WatchItem) => void
}

function Poster({ item }: { item: WatchItem }) {
  const url = posterUrl(item.posterPath, 'w185')
  if (!url) {
    return <div className="row-poster row-poster-empty">{item.title[0] ?? '?'}</div>
  }
  return <img className="row-poster" src={url} alt="" loading="lazy" />
}

export function ItemList({ items, onSelect }: ItemListProps) {
  return (
    <ul className="list">
      {items.map((item) => {
        const watched = item.watchedAt !== null
        return (
          <li key={item.id}>
            <button
              className={watched ? 'row row-watched' : 'row'}
              onClick={() => onSelect(item)}
            >
              <Poster item={item} />
              <div className="row-main">
                <div className="row-title">
                  {item.title}
                  {item.year && <span className="row-year">{item.year}</span>}
                </div>
                <div className="row-meta">
                  <span>
                    {watched
                      ? `watched ${formatDate(item.watchedAt!)}`
                      : `added ${formatDate(item.addedAt)}`}
                  </span>
                  {item.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
