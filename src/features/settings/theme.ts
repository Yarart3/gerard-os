export type ThemePref = 'light' | 'dark' | 'system'

const KEY = 'hub.theme'
const BG = { light: '#F2F2F7', dark: '#000000' }

export function readStoredTheme(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

/** Aplica el tema en <html> y lo recuerda localmente para evitar parpadeo al arrancar. */
export function applyTheme(pref: ThemePref) {
  const root = document.documentElement
  if (pref === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', pref)
  try {
    localStorage.setItem(KEY, pref)
  } catch {
    /* almacenamiento no disponible */
  }
  const dark =
    pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? BG.dark : BG.light)
}
