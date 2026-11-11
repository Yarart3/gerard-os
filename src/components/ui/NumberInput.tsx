import { useState, type InputHTMLAttributes } from 'react'
import { formatNumber, parseDecimal } from '../../lib/format'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'defaultValue'> & {
  value: number | null
  onCommit: (value: number | null) => void
  decimals?: number
}

const toText = (n: number | null, decimals: number) =>
  n === null ? '' : formatNumber(n, decimals).replace(/\./g, '')

/** Campo numérico con coma decimal. Guarda al salir del campo (o con Intro), no en cada tecla. */
export function NumberInput({ value, onCommit, decimals = 2, className = 'input', ...rest }: Props) {
  const [text, setText] = useState(toText(value, decimals))
  const [synced, setSynced] = useState(value)
  if (synced !== value) {
    // El valor cambió desde fuera (refetch, botón ±): se refleja en el campo.
    setSynced(value)
    setText(toText(value, decimals))
  }
  const commit = () => {
    const n = parseDecimal(text)
    if (n !== value) onCommit(n)
    else setText(toText(value, decimals))
  }
  return (
    <input
      {...rest}
      className={className}
      inputMode={decimals ? 'decimal' : 'numeric'}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}
