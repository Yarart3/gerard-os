export const WATCH_KINDS = ['series', 'movie', 'book'] as const
export type WatchKind = (typeof WATCH_KINDS)[number]
export const WATCH_STATUSES = ['watching', 'pending', 'done'] as const
export type WatchStatus = (typeof WATCH_STATUSES)[number]

export const KIND_LABEL: Record<WatchKind, string> = { series: 'Serie', movie: 'Película', book: 'Libro' }
export const STATUS_LABEL: Record<WatchStatus, string> = { pending: 'Pendiente', watching: 'En curso', done: 'Visto' }
export const STATUS_LABEL_BOOK: Record<WatchStatus, string> = { pending: 'Pendiente', watching: 'Leyendo', done: 'Leído' }

export const statusLabel = (status: WatchStatus, kind: string) =>
  (kind === 'book' ? STATUS_LABEL_BOOK : STATUS_LABEL)[status]

export function nextStatus(status: WatchStatus): WatchStatus {
  return status === 'pending' ? 'watching' : status === 'watching' ? 'done' : 'pending'
}

export function filterWatch<T extends { status: string; kind: string; title: string }>(
  items: T[],
  status: WatchStatus,
  kind: WatchKind | 'all',
): T[] {
  return items
    .filter((i) => i.status === status && (kind === 'all' || i.kind === kind))
    .sort((a, b) => a.title.localeCompare(b.title, 'es'))
}

export const countPending = (items: { status: string }[]) => items.filter((i) => i.status === 'pending').length
