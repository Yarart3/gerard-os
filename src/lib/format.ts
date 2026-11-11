// Formatos españoles (CLAUDE.md §5): 1.840 kcal · 102,5 kg · 24,30 € · zona Europe/Madrid.
export const TIME_ZONE = 'Europe/Madrid'
const LOCALE = 'es-ES'

// es-ES no agrupa números de 4 cifras por defecto ("1840"); se fuerza "1.840".
export function formatNumber(value: number, maxDecimals = 1, minDecimals = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    useGrouping: 'always',
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(value)
}

export const formatKcal = (v: number) => `${formatNumber(Math.round(v), 0)} kcal`
export const formatKg = (v: number) => `${formatNumber(v, 1)} kg`
export const formatEuros = (v: number) =>
  new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'EUR', useGrouping: 'always' }).format(v)

/** Etiqueta de fecha de cabecera, p. ej. "MIÉRCOLES, 11 DE NOVIEMBRE". */
export function formatDateLabel(date: Date = new Date()): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TIME_ZONE,
  })
    .format(date)
    .toLocaleUpperCase(LOCALE)
}

/** Convierte "102,5" o "102.5" en número; null si está vacío o no es válido. */
export function parseDecimal(input: string): number | null {
  const clean = input.trim().replace(/\s/g, '').replace(',', '.')
  if (clean === '') return null
  const n = Number(clean)
  return Number.isFinite(n) ? n : null
}
