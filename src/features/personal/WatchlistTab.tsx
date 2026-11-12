import { useMemo, useState } from 'react'
import { Card, EmptyState, Pill, SegmentedControl } from '../../components/ui'
import { Plus } from '../../components/ui/icons'
import { formatNumber } from '../../lib/format'
import { useSaveWatch, useWatchlist, type WatchItem } from './api'
import {
  KIND_LABEL,
  WATCH_STATUSES,
  filterWatch,
  nextStatus,
  statusLabel,
  type WatchKind,
  type WatchStatus,
} from './logic/watchlist'
import { WatchSheet } from './WatchSheet'
import { useToast } from '../../components/ui'
import s from './Personal.module.css'

const FILTERS = [
  { value: 'all', label: 'Todo' },
  { value: 'series', label: 'Series' },
  { value: 'movie', label: 'Películas' },
  { value: 'book', label: 'Libros' },
] as const

const GROUP_TITLE: Record<WatchStatus, string> = { watching: 'En curso', pending: 'Pendiente', done: 'Terminado' }
const ADVANCE: Record<WatchStatus, string> = { pending: 'Empezar', watching: 'Terminar', done: 'Reabrir' }

export function WatchlistTab() {
  const [kind, setKind] = useState<WatchKind | 'all'>('all')
  const [editing, setEditing] = useState<WatchItem | 'new' | null>(null)
  const watch = useWatchlist()
  const save = useSaveWatch()
  const toast = useToast()
  const items = useMemo(() => watch.data ?? [], [watch.data])

  const advance = (w: WatchItem) =>
    save
      .mutateAsync({ id: w.id, title: w.title, kind: w.kind, status: nextStatus(w.status as WatchStatus) })
      .catch(() => toast('No se ha podido cambiar el estado', 'error'))

  const groups = WATCH_STATUSES.map((st) => ({ st, rows: filterWatch(items, st, kind) }))
  const empty = groups.every((g) => g.rows.length === 0)

  return (
    <div className={s.stack}>
      <div className={s.inline}>
        <div className={s.grow}>
          <SegmentedControl label="Filtrar por tipo" options={FILTERS} value={kind} onChange={(v) => setKind(v as WatchKind | 'all')} />
        </div>
        <button type="button" className="btn btn-plain" onClick={() => setEditing('new')}>
          <Plus size={18} /> Añadir
        </button>
      </div>

      {empty ? (
        <Card>
          <EmptyState
            title={watch.isLoading ? 'Cargando…' : 'Nada en la lista'}
            text={watch.isLoading ? undefined : 'Añade series, películas o libros que quieras ver o leer.'}
          />
        </Card>
      ) : (
        <div className={s.grid2}>
          {groups
            .filter((g) => g.rows.length > 0)
            .map(({ st, rows }) => (
              <Card key={st} title={`${GROUP_TITLE[st]} · ${rows.length}`} flush>
                {rows.map((w) => (
                  <div key={w.id} className={s.row}>
                    <button
                      type="button"
                      className={s.rowText}
                      style={{ border: 0, background: 'transparent', textAlign: 'left', color: 'inherit', padding: 0, minHeight: 44 }}
                      onClick={() => setEditing(w)}
                      aria-label={`Editar ${w.title}`}
                    >
                      <span className={s.rowTitle}>{w.title}</span>
                      <span className={s.rowMeta}>
                        {[KIND_LABEL[w.kind as WatchKind], w.platform, w.progress].filter(Boolean).join(' · ')}
                        {w.rating !== null ? ` · ${formatNumber(w.rating, 1)}/10` : ''}
                      </span>
                    </button>
                    {st === 'done' && <Pill tone="green">{statusLabel('done', w.kind)}</Pill>}
                    <button
                      type="button"
                      className={s.rowAction}
                      onClick={() => advance(w)}
                      aria-label={`${ADVANCE[st]}: ${w.title}`}
                    >
                      {st === 'pending' && w.kind === 'book' ? 'Leer' : ADVANCE[st]}
                    </button>
                  </div>
                ))}
              </Card>
            ))}
        </div>
      )}
      <WatchSheet item={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
