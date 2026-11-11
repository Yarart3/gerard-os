import { applyTheme, readStoredTheme } from './theme'

describe('theme', () => {
  beforeEach(() => localStorage.clear())

  it('aplica claro/oscuro con data-theme y automático lo quita', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(readStoredTheme()).toBe('dark')
    applyTheme('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(readStoredTheme()).toBe('system')
  })

  it('ignora valores guardados desconocidos', () => {
    localStorage.setItem('hub.theme', 'sepia')
    expect(readStoredTheme()).toBe('system')
  })
})
