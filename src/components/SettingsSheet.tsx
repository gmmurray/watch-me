import { useEffect, useRef, useState } from 'react'
import { exportData, importData } from '../backup'
import type { MediaType, OrderMode } from '../db'
import { formatDate } from '../format'
import { isStandalone } from '../platform'
import type { ToastFn } from '../toast'
import { Sheet } from './Sheet'

const LAST_EXPORT_KEY = 'watch-me:last-export'

interface SettingsSheetProps {
  open: boolean
  orderModes: Record<MediaType, OrderMode>
  onOrderModeChange: (mediaType: MediaType, next: OrderMode) => void
  onClose: () => void
  toast: ToastFn
}

const LISTS: { mediaType: MediaType; label: string }[] = [
  { mediaType: 'movie', label: 'Movies' },
  { mediaType: 'show', label: 'Shows' },
]

export function SettingsSheet({
  open,
  orderModes,
  onOrderModeChange,
  onClose,
  toast,
}: SettingsSheetProps) {
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [lastExport, setLastExport] = useState<number | null>(() => {
    const raw = localStorage.getItem(LAST_EXPORT_KEY)
    return raw ? Number(raw) : null
  })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    navigator.storage
      ?.persisted?.()
      .then(setPersisted)
      .catch(() => setPersisted(null))
  }, [])

  async function handleExport() {
    const backup = await exportData()
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `watch-me-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    const now = Date.now()
    localStorage.setItem(LAST_EXPORT_KEY, String(now))
    setLastExport(now)
  }

  async function handleImport(file: File) {
    try {
      const data: unknown = JSON.parse(await file.text())
      const { added, merged } = await importData(data)
      toast(`Imported: ${added} added, ${merged} merged`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Import failed')
    }
  }

  const exportAge =
    lastExport === null
      ? null
      : Math.floor((Date.now() - lastExport) / (1000 * 60 * 60 * 24))

  return (
    <Sheet open={open} title="Settings" onClose={onClose}>
      <div className="settings">
        {!isStandalone() && (
          <section>
            <h3>Install</h3>
            <p>
              Data added in a browser tab does not carry over to the installed
              app, and uninstalled browser storage can be evicted. In Chrome,
              tap the <strong>Share</strong> icon, then{' '}
              <strong>Add to Home Screen</strong> — and use watch-me from
              there.
            </p>
          </section>
        )}
        <section>
          <h3>List order</h3>
          <p className="settings-hint">
            A custom order is rearranged with the Sort button above the list.
            New items are added to the bottom.
          </p>
          {LISTS.map(({ mediaType, label }) => (
            <div className="settings-row" key={mediaType}>
              <span>{label}</span>
              <div className="seg" role="group" aria-label={`${label} order`}>
                <button
                  className={
                    orderModes[mediaType] === 'added'
                      ? 'seg-btn active'
                      : 'seg-btn'
                  }
                  onClick={() => onOrderModeChange(mediaType, 'added')}
                >
                  Date added
                </button>
                <button
                  className={
                    orderModes[mediaType] === 'custom'
                      ? 'seg-btn active'
                      : 'seg-btn'
                  }
                  onClick={() => onOrderModeChange(mediaType, 'custom')}
                >
                  Custom
                </button>
              </div>
            </div>
          ))}
        </section>
        <section>
          <h3>Backup</h3>
          <p className="settings-hint">
            {lastExport === null
              ? 'Never exported — your lists exist only on this device.'
              : `Last export: ${formatDate(lastExport)}${
                  exportAge !== null && exportAge > 30
                    ? ` (${exportAge} days ago — time for a fresh one)`
                    : ''
                }`}
          </p>
          <div className="settings-actions">
            <button className="btn-primary" onClick={() => void handleExport()}>
              Export JSON
            </button>
            <button
              className="btn-quiet"
              onClick={() => fileRef.current?.click()}
            >
              Import…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleImport(file)
                e.target.value = ''
              }}
            />
          </div>
        </section>
        <section>
          <h3>Storage</h3>
          <p className="settings-hint">
            Persistent storage:{' '}
            {persisted === null
              ? 'unknown'
              : persisted
                ? 'granted'
                : 'not granted'}
          </p>
        </section>
        <section>
          <h3>About</h3>
          <p className="settings-hint">
            This product uses the TMDB API but is not endorsed or certified by{' '}
            <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
              TMDB
            </a>
            .
          </p>
        </section>
      </div>
    </Sheet>
  )
}
