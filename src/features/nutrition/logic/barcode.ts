// Códigos de barras y Open Food Facts (API v2). Lógica pura: sin React ni red salvo `fetchOffProduct`.

/** Dígito de control GTIN (EAN-8/13, UPC-A) sobre un código completo. */
function gtinValid(code: string): boolean {
  const digits = [...code].map(Number)
  const check = digits.pop()!
  let sum = 0
  // Desde la derecha, el primer dígito de datos pesa 3, el siguiente 1...
  digits.reverse().forEach((d, i) => (sum += d * (i % 2 === 0 ? 3 : 1)))
  return (10 - (sum % 10)) % 10 === check
}

/**
 * Normaliza un código leído o escrito: EAN-13 (13 dígitos), EAN-8 (8 dígitos); UPC-A (12) pasa a EAN-13
 * con un cero delante y GTIN-14 con cero inicial se recorta a 13. Devuelve null si no es válido
 * (longitud rara o dígito de control incorrecto).
 */
export function normalizeBarcode(input: string): string | null {
  const digits = input.replace(/[\s-]/g, '')
  if (!/^\d+$/.test(digits)) return null
  let code = digits
  if (code.length === 12) code = `0${code}`
  else if (code.length === 14 && code.startsWith('0')) code = code.slice(1)
  if (code.length !== 8 && code.length !== 13) return null
  return gtinValid(code) ? code : null
}

export type ScannedFood = {
  name: string
  brand: string | null
  kcal: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  fiber: number | null
}

/** Número de Open Food Facts: a veces llega como texto ("12.5" o "12,5"). */
function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.trim().replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** Campos de `product` que pide la consulta (ver OFF_FIELDS). */
export type OffProduct = {
  product_name?: unknown
  product_name_es?: unknown
  brands?: unknown
  nutriments?: Record<string, unknown> | null
}

/** Mapea un producto de Open Food Facts a macros por 100 g. Lo que falta queda en null. */
export function mapOffProduct(product: OffProduct | null | undefined): ScannedFood {
  const n = product?.nutriments ?? {}
  const str = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')
  let kcal = num(n['energy-kcal_100g'])
  if (kcal === null) {
    const kj = num(n['energy_100g']) // energy_100g viene en kJ
    if (kj !== null) kcal = kj / 4.184
  }
  const out = (v: number | null) => (v === null ? null : round1(v))
  return {
    name: str(product?.product_name_es) || str(product?.product_name),
    brand: str(product?.brands).split(',')[0]?.trim() || null,
    kcal: kcal === null ? null : Math.round(kcal),
    protein: out(num(n['proteins_100g'])),
    carbs: out(num(n['carbohydrates_100g'])),
    fat: out(num(n['fat_100g'])),
    fiber: out(num(n['fiber_100g'])),
  }
}

/** ¿Hay macros suficientes para guardarlo sin revisar? (kcal presente) */
export const hasMacros = (f: ScannedFood) => f.kcal !== null

export const OFF_FIELDS = 'product_name,product_name_es,brands,nutriments,serving_size'

export type OffResult = { found: true; food: ScannedFood } | { found: false }

/** Consulta Open Food Facts. Lanza si falla la red o el servidor (404 = producto inexistente). */
export async function fetchOffProduct(code: string, fetchFn: typeof fetch = fetch): Promise<OffResult> {
  const res = await fetchFn(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`,
  )
  if (res.status === 404) return { found: false }
  if (!res.ok) throw new Error(`Open Food Facts: ${res.status}`)
  const body = (await res.json()) as { status?: number; product?: OffProduct }
  if (body.status !== 1 || !body.product) return { found: false }
  return { found: true, food: mapOffProduct(body.product) }
}
