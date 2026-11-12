import { Card, useToast } from '../../components/ui'
import { ArrowDown, ArrowUp } from '../../components/ui/icons'
import { CARD_LABEL, moveCard, setCardVisible, type CardId } from './logic/cards'
import { useTodaySettings } from './todaySettings'
import s from './Today.module.css'

/** Ajustes de Hoy (CLAUDE.md §8): tarjetas visibles y su orden, y hora de corte del día. */
export default function TodaySettingsPanel() {
  const toast = useToast()
  const cfg = useTodaySettings()
  const { cards, cutoff } = cfg.value

  const save = (patch: Partial<typeof cfg.value>) =>
    cfg.save({ ...cfg.value, ...patch }).catch(() => toast('No se han podido guardar los ajustes', 'error'))

  return (
    <>
      <Card title="Tarjetas" flush>
        <ul className={s.order}>
          {cards.map((c, i) => (
            <li key={c.id} className={s.orderRow}>
              <label className={s.orderName}>
                <input
                  type="checkbox"
                  className={s.check}
                  checked={c.visible}
                  onChange={(e) => void save({ cards: setCardVisible(cards, c.id, e.target.checked) })}
                />
                {CARD_LABEL[c.id]}
              </label>
              <button
                type="button"
                className={s.iconBtn}
                aria-label={`Subir ${CARD_LABEL[c.id]}`}
                disabled={i === 0}
                onClick={() => void save({ cards: moveCard(cards, c.id as CardId, -1) })}
              >
                <ArrowUp size={20} />
              </button>
              <button
                type="button"
                className={s.iconBtn}
                aria-label={`Bajar ${CARD_LABEL[c.id]}`}
                disabled={i === cards.length - 1}
                onClick={() => void save({ cards: moveCard(cards, c.id as CardId, 1) })}
              >
                <ArrowDown size={20} />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Hora de corte del día">
        <label className="field">
          <span className="field-label">El día nuevo empieza a las</span>
          <input
            type="time"
            className="input"
            value={cutoff}
            onChange={(e) => e.target.value && void save({ cutoff: e.target.value })}
          />
        </label>
        <p className={s.small} style={{ marginTop: 8 }}>
          Antes de esa hora todavía cuenta como el día anterior (entreno, comidas e Inglés). Por defecto, las 04:00.
        </p>
      </Card>
    </>
  )
}
