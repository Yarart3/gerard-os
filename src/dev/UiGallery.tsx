import { useState } from 'react'
import {
  Card,
  ChipScroller,
  EmptyState,
  ListRow,
  PageHeader,
  Pill,
  ProgressBar,
  SegmentedControl,
  Sheet,
  Sidebar,
  TabBar,
  useToast,
} from '../components/ui'
import { Calendar, Dumbbell } from '../components/ui/icons'
import { NAV, SECTIONS } from '../layout/sections'
import { formatEuros, formatKcal, formatKg } from '../lib/format'
import s from './UiGallery.module.css'

const SEG = [
  { value: 'a', label: 'Entreno' },
  { value: 'b', label: 'Historial' },
  { value: 'c', label: 'Catálogo' },
] as const
const CHIPS = SECTIONS.find((x) => x.id === 'english')?.subnav?.options ?? []

function Gallery({ theme }: { theme: 'light' | 'dark' }) {
  const toast = useToast()
  const [seg, setSeg] = useState<string>('a')
  const [chip, setChip] = useState<string>('hoy')
  const [sheet, setSheet] = useState(false)
  return (
    <div className={s.column} data-theme={theme}>
      <PageHeader title={theme === 'light' ? 'Claro' : 'Oscuro'} settingsTo="/ajustes" />

      <Card title="Card · Pill · ProgressBar" action={<Pill tone="accent">Hoy</Pill>}>
        <div className={s.row}>
          <Pill>Neutra</Pill>
          <Pill tone="accent">Acento</Pill>
          <Pill tone="orange">Naranja</Pill>
          <Pill tone="green">Verde</Pill>
        </div>
        <p className={s.big}>{formatKcal(1840)}</p>
        <p className={s.muted}>
          {formatKg(102.5)} · {formatEuros(24.3)}
        </p>
        <div className={s.stack}>
          <ProgressBar value={0.62} label="Kcal" />
          <ProgressBar value={0.35} tone="orange" label="Quemadas" />
          <ProgressBar value={0.9} tone="green" label="Proteína" />
        </div>
      </Card>

      <Card title="ListRow" flush>
        <ListRow
          icon={<Dumbbell size={20} />}
          title="Sentadilla"
          subtitle="5 × 5 · 100 kg"
          onClick={() => {}}
        />
        <ListRow icon={<Calendar size={20} />} title="Entrega TFG" value="3 días" onClick={() => {}} />
        <ListRow title="Sin chevron" value="Valor" />
      </Card>

      <Card title="SegmentedControl · ChipScroller">
        <div className={s.stack}>
          <SegmentedControl label="Demo" options={SEG} value={seg} onChange={setSeg} />
          <ChipScroller label="Demo chips" options={CHIPS} value={chip} onChange={setChip} />
        </div>
      </Card>

      <Card title="Botones e inputs">
        <div className={s.stack}>
          <input className="input" placeholder="Input" aria-label="Input de ejemplo" />
          <button className="btn btn-primary" onClick={() => toast(`Toast (${theme})`)}>
            Mostrar Toast
          </button>
          <button className="btn" onClick={() => toast('Algo ha fallado', 'error')}>
            Toast de error
          </button>
          <button className="btn btn-plain" onClick={() => setSheet(true)}>
            Abrir Sheet
          </button>
        </div>
      </Card>

      <Card>
        <EmptyState title="Nada por aquí" text="Así se ve un estado vacío." />
      </Card>

      <Card title="TabBar">
        <TabBar items={NAV} preview />
      </Card>
      <Card title="Sidebar">
        <Sidebar items={NAV} preview />
      </Card>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Sheet de ejemplo" theme={theme}>
        <Card flush>
          <ListRow title="Opción" onClick={() => setSheet(false)} />
          <ListRow title="Ajustes generales" onClick={() => setSheet(false)} />
        </Card>
      </Sheet>
    </div>
  )
}

/** Galería de componentes en los dos temas (ruta /dev/ui). */
export function UiGallery() {
  return (
    <div className={s.page}>
      <Gallery theme="light" />
      <Gallery theme="dark" />
    </div>
  )
}
