import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

// Reads/writes the theme preference and keeps the <html> `dark` class in sync.
// 'system' follows the OS and updates live. The initial class is set pre-paint by
// the inline script in index.html; this hook keeps it correct after mount.
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    try { return (localStorage.getItem('theme') as Theme) || 'system' } catch { return 'system' }
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    if (theme === 'system') {
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [theme])

  const setTheme = (t: Theme) => {
    try { localStorage.setItem('theme', t) } catch { /* ignore */ }
    setThemeState(t)
  }

  return { theme, setTheme }
}
