import type { ReactNode } from 'react'
import { FiX } from 'react-icons/fi'

interface SheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function Sheet({ open, title, onClose, children }: SheetProps) {
  return (
    <div
      className={open ? 'sheet-backdrop open' : 'sheet-backdrop'}
      inert={!open}
      onClick={onClose}
    >
      <div
        className="sheet"
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet-header">
          <h2 className="sheet-title">{title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <FiX size={18} />
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}
