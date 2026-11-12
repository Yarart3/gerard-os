import { describe, expect, it, vi } from 'vitest'
import { fetchOffProduct, mapOffProduct, normalizeBarcode } from './barcode'

describe('normalizeBarcode', () => {
  it('acepta EAN-13 y EAN-8 válidos', () => {
    expect(normalizeBarcode('3017620422003')).toBe('3017620422003')
    expect(normalizeBarcode('96385074')).toBe('96385074')
  })
  it('UPC-A pasa a EAN-13 con un cero delante', () => {
    expect(normalizeBarcode('036000291452')).toBe('0036000291452')
  })
  it('ignora espacios y guiones; GTIN-14 con cero inicial se recorta', () => {
    expect(normalizeBarcode(' 3017 6204-22003 ')).toBe('3017620422003')
    expect(normalizeBarcode('03017620422003')).toBe('3017620422003')
  })
  it('rechaza dígito de control erróneo, longitudes raras y no numéricos', () => {
    expect(normalizeBarcode('3017620422004')).toBeNull()
    expect(normalizeBarcode('12345')).toBeNull()
    expect(normalizeBarcode('abc')).toBeNull()
    expect(normalizeBarcode('')).toBeNull()
  })
})

describe('mapOffProduct', () => {
  it('usa energy-kcal_100g y los macros por 100 g', () => {
    const f = mapOffProduct({
      product_name: 'Nutella',
      brands: 'Ferrero, Otra',
      nutriments: {
        'energy-kcal_100g': 539,
        proteins_100g: 6.3,
        carbohydrates_100g: 57.5,
        fat_100g: 30.9,
        fiber_100g: 0,
      },
    })
    expect(f).toEqual({
      name: 'Nutella',
      brand: 'Ferrero',
      kcal: 539,
      protein: 6.3,
      carbs: 57.5,
      fat: 30.9,
      fiber: 0,
    })
  })
  it('sin kcal usa energy_100g (kJ) / 4,184', () => {
    expect(mapOffProduct({ nutriments: { energy_100g: 2252 } }).kcal).toBe(538)
  })
  it('acepta valores en texto (también con coma) y prefiere el nombre en castellano', () => {
    const f = mapOffProduct({
      product_name: 'Yoghurt',
      product_name_es: ' Yogur  natural ',
      nutriments: { 'energy-kcal_100g': '61', proteins_100g: '3,5', fat_100g: '' },
    })
    expect(f.name).toBe('Yogur natural')
    expect(f.kcal).toBe(61)
    expect(f.protein).toBe(3.5)
    expect(f.fat).toBeNull()
  })
  it('producto sin datos: todo vacío', () => {
    expect(mapOffProduct({})).toEqual({
      name: '',
      brand: null,
      kcal: null,
      protein: null,
      carbs: null,
      fat: null,
      fiber: null,
    })
    expect(mapOffProduct(null).kcal).toBeNull()
  })
})

describe('fetchOffProduct', () => {
  const res = (status: number, body: unknown) =>
    ({ ok: status < 400, status, json: async () => body }) as Response
  it('producto encontrado, inexistente (status 0 o 404) y error de servidor', async () => {
    const ok = vi.fn().mockResolvedValue(res(200, { status: 1, product: { product_name: 'X' } }))
    expect(await fetchOffProduct('1', ok)).toMatchObject({ found: true, food: { name: 'X' } })
    expect(ok.mock.calls[0]![0]).toContain('/api/v2/product/1.json?fields=')
    expect(await fetchOffProduct('1', vi.fn().mockResolvedValue(res(200, { status: 0 })))).toEqual({
      found: false,
    })
    expect(await fetchOffProduct('1', vi.fn().mockResolvedValue(res(404, {})))).toEqual({ found: false })
    await expect(fetchOffProduct('1', vi.fn().mockResolvedValue(res(500, {})))).rejects.toThrow()
  })
})
