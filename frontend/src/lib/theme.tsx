import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'
const STORAGE_KEY = 'gym.theme'

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null)

function apply(theme: Theme) {
  // Diterapkan sinkron agar komponen yang membaca CSS variable langsung mendapat nilai baru
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    apply(next)
    setTheme(next)
  }

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}

/** Baca nilai CSS variable (mis. untuk warna chart SVG); ikut berubah saat tema diganti. */
export function useCssVars<K extends string>(names: K[]): Record<K, string> {
  const { theme } = useTheme()
  const key = names.join(',')
  return useMemo(() => {
    const style = getComputedStyle(document.documentElement)
    return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(`--${n}`).trim()])) as Record<K, string>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, key])
}
