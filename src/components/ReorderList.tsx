import { useEffect, useRef } from 'react'
import { FiArrowDown, FiArrowUp } from 'react-icons/fi'
import type { WatchItem } from '../db'

export type MoveDirection = 'up' | 'down'

interface ReorderListProps {
  items: WatchItem[]
  onMove: (index: number, direction: MoveDirection) => void
}

export function ReorderList({ items, onMove }: ReorderListProps) {
  const listRef = useRef<HTMLUListElement>(null)
  // The button you just pressed travels with its row, so put focus back on it
  // at its new position — otherwise a second tap lands on a different title.
  const refocus = useRef<{ id: number; direction: MoveDirection } | null>(null)

  useEffect(() => {
    const target = refocus.current
    if (!target) return
    refocus.current = null
    const find = (direction: MoveDirection) =>
      listRef.current?.querySelector<HTMLButtonElement>(
        `[data-move="${target.id}:${direction}"]`,
      )
    const button = find(target.direction)
    // At either end the pressed arrow is now disabled and cannot take focus.
    const fallback = target.direction === 'up' ? 'down' : 'up'
    ;(button?.disabled ? find(fallback) : button)?.focus()
  })

  function move(index: number, direction: MoveDirection) {
    refocus.current = { id: items[index].id, direction }
    onMove(index, direction)
  }

  return (
    <ul className="list" ref={listRef}>
      {items.map((item, index) => (
        <li key={item.id}>
          <div className="sort-row">
            <span className="sort-title">{item.title}</span>
            <div className="sort-moves">
              <button
                className="move-btn"
                data-move={`${item.id}:up`}
                aria-label={`Move ${item.title} up`}
                disabled={index === 0}
                onClick={() => move(index, 'up')}
              >
                <FiArrowUp size={16} />
              </button>
              <button
                className="move-btn"
                data-move={`${item.id}:down`}
                aria-label={`Move ${item.title} down`}
                disabled={index === items.length - 1}
                onClick={() => move(index, 'down')}
              >
                <FiArrowDown size={16} />
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
