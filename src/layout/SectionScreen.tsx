import { Suspense } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Card, ChipScroller, EmptyState, PageHeader, SegmentedControl } from '../components/ui'
import { fromISO } from '../lib/dates'
import { useToday } from '../lib/useToday'
import { SECTION_CONTENT } from './sectionContent'
import type { SectionDef } from './sections'
import s from './Page.module.css'

// Último apartado de cada sección: al volver desde la barra de pestañas se abre ese.
const LAST_KEY = (id: string) => `hub.lastSub.${id}`
const readLast = (id: string) => {
  try {
    return localStorage.getItem(LAST_KEY(id))
  } catch {
    return null
  }
}
const writeLast = (id: string, v: string) => {
  try {
    localStorage.setItem(LAST_KEY(id), v)
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

/** Pantalla genérica de sección: cabecera, subnavegación y contenido (vacío si aún no está construido). */
export function SectionScreen({ section }: { section: SectionDef }) {
  const { sub } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const today = useToday()
  const options = section.subnav?.options ?? []
  const first = options[0]?.value
  const current = options.find((o) => o.value === sub)

  if (sub && !current) return <Navigate to={section.path} replace />
  // Desde la barra de pestañas (y sin parámetros como ?editar=), vuelve al último apartado usado.
  const fromTab = (location.state as { fromTab?: boolean } | null)?.fromTab
  if (!sub && fromTab && !location.search) {
    const last = readLast(section.id)
    if (last && last !== first && options.some((o) => o.value === last))
      return <Navigate to={`${section.path}/${last}`} replace />
  }
  const active = current?.value ?? first
  const activeLabel = current?.label ?? options[0]?.label ?? section.label
  const content = SECTION_CONTENT[section.id]
  const loading = <p className={s.loading}>Cargando…</p>
  const go = (v: string) => {
    writeLast(section.id, v)
    navigate(v === first ? section.path : `${section.path}/${v}`, { replace: true })
  }
  if (active && options.length) writeLast(section.id, active)

  return (
    <div className={s.page}>
      <PageHeader
        title={section.label}
        settingsTo={section.settings ? `/ajustes?s=${section.settings}` : undefined}
        settingsLabel={`Ajustar ${section.label}`}
        date={noonOf(today)}
      />
      {section.subnav && active && (
        <div className={s.subnav}>
          {section.subnav.kind === 'segmented' ? (
            <SegmentedControl
              label={`Apartados de ${section.label}`}
              options={options}
              value={active}
              onChange={go}
            />
          ) : (
            <ChipScroller
              label={`Apartados de ${section.label}`}
              options={options}
              value={active}
              onChange={go}
            />
          )}
        </div>
      )}
      {content ? (
        <Suspense fallback={loading}>
          <content.Screen sub={active ?? ''} />
        </Suspense>
      ) : (
        <Card>
          <EmptyState
            title={`${activeLabel}: aún vacío`}
            text="Esta pantalla se construye en una fase posterior."
          />
        </Card>
      )}
    </div>
  )
}

/** Mediodía UTC del día `iso`: sirve para dar formato a la fecha del día (con hora de corte) sin saltos por zona horaria. */
const noonOf = (iso: string) => new Date(fromISO(iso).getTime() + 12 * 3_600_000)
