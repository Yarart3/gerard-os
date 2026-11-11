import { Suspense, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Card, ChipScroller, EmptyState, PageHeader, SegmentedControl } from '../components/ui'
import { SectionSettingsSheet } from '../features/settings/SectionSettingsSheet'
import { SECTION_CONTENT } from './sectionContent'
import type { SectionDef } from './sections'
import s from './Page.module.css'

/** Pantalla genérica de sección: cabecera, subnavegación y contenido (vacío si aún no está construido). */
export function SectionScreen({ section }: { section: SectionDef }) {
  const { sub } = useParams()
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const options = section.subnav?.options ?? []
  const first = options[0]?.value
  const current = options.find((o) => o.value === sub)

  if (sub && !current) return <Navigate to={section.path} replace />
  const active = current?.value ?? first
  const activeLabel = current?.label ?? options[0]?.label ?? section.label
  const content = SECTION_CONTENT[section.id]
  const loading = <p className={s.loading}>Cargando…</p>
  const go = (v: string) => navigate(v === first ? section.path : `${section.path}/${v}`, { replace: true })

  return (
    <div className={s.page}>
      <PageHeader
        title={section.label}
        onSettings={() => setSettingsOpen(true)}
        settingsLabel={`Ajustes de ${section.label}`}
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
      <SectionSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        sectionLabel={section.label}
      >
        {content?.Settings && (
          <Suspense fallback={loading}>
            <content.Settings />
          </Suspense>
        )}
      </SectionSettingsSheet>
    </div>
  )
}
