import { Search } from './icons'
import s from './SearchInput.module.css'

type Props = { value: string; onChange: (v: string) => void; label: string; placeholder?: string }

export function SearchInput({ value, onChange, label, placeholder = 'Buscar' }: Props) {
  return (
    <div className={s.search}>
      <Search size={18} className={s.icon} />
      <input
        className="input"
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
