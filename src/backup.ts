import { db, type WatchItem } from './db'

export interface BackupFile {
  app: 'watch-me'
  version: 1
  exportedAt: number
  items: Omit<WatchItem, 'id'>[]
}

export async function exportData(): Promise<BackupFile> {
  const items = await db.items.toArray()
  return {
    app: 'watch-me',
    version: 1,
    exportedAt: Date.now(),
    items: items.map(({ id: _id, ...rest }) => rest),
  }
}

function isBackupItem(value: unknown): value is Omit<WatchItem, 'id'> {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    (v.mediaType === 'movie' || v.mediaType === 'show') &&
    typeof v.tmdbId === 'number' &&
    typeof v.title === 'string' &&
    typeof v.addedAt === 'number' &&
    (v.watchedAt === null || typeof v.watchedAt === 'number') &&
    Array.isArray(v.tags)
  )
}

export function parseBackup(data: unknown): BackupFile {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Not a watch-me backup file')
  }
  const v = data as Record<string, unknown>
  if (v.app !== 'watch-me' || !Array.isArray(v.items)) {
    throw new Error('Not a watch-me backup file')
  }
  if (!v.items.every(isBackupItem)) {
    throw new Error('Backup file contains malformed items')
  }
  return data as BackupFile
}

/**
 * Merge a backup into the database. Matching is by mediaType+tmdbId:
 * keep the older addedAt, keep a non-null watchedAt over null (existing
 * wins when both are set), union tags. Snapshot metadata of existing
 * items is left untouched.
 */
export async function importData(
  data: unknown,
): Promise<{ added: number; merged: number }> {
  const backup = parseBackup(data)
  let added = 0
  let merged = 0

  await db.transaction('rw', db.items, async () => {
    for (const incoming of backup.items) {
      const existing = await db.items
        .where('[mediaType+tmdbId]')
        .equals([incoming.mediaType, incoming.tmdbId])
        .first()

      if (!existing) {
        await db.items.add({ ...incoming, tags: [...incoming.tags] })
        added++
      } else {
        await db.items.update(existing.id, {
          addedAt: Math.min(existing.addedAt, incoming.addedAt),
          watchedAt: existing.watchedAt ?? incoming.watchedAt,
          tags: [...new Set([...existing.tags, ...incoming.tags])],
        })
        merged++
      }
    }
  })

  return { added, merged }
}
