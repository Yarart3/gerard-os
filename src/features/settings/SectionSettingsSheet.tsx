import { useNavigate } from 'react-router-dom'
import { Card, ListRow, Sheet } from '../../components/ui'
import s from './Settings.module.css'

type Props = { open: boolean; onClose: () => void; sectionLabel: string }

/** Sheet de la rueda ⚙️: ajustes de la sección (llegan en su fase) + enlace a Ajustes generales. */
export function SectionSettingsSheet({ open, onClose, sectionLabel }: Props) {
  const navigate = useNavigate()
  return (
    <Sheet open={open} onClose={onClose} title={`Ajustes de ${sectionLabel}`}>
      <Card>
        <p className={s.muted}>Los ajustes de {sectionLabel} llegarán cuando se construya esta sección.</p>
      </Card>
      <Card flush>
        <ListRow
          title="Ajustes generales"
          onClick={() => {
            onClose()
            navigate('/ajustes')
          }}
        />
      </Card>
    </Sheet>
  )
}
