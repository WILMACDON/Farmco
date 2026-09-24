import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'dark' || theme === 'light') return theme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Apply theme class on <html>. Safe to call before React mounts. */
export function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return
  const root = window.document.documentElement
  const resolved = resolveTheme(theme)
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  return resolved
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem('theme') as Theme | null
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

// Keep theme in sync even on pages that never mount ThemeToggle (e.g. auth shell).
if (typeof window !== 'undefined') {
  applyTheme(readStoredTheme())
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme())

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    return resolveTheme(readStoredTheme())
  })

  useEffect(() => {
    const resolved = applyTheme(theme)
    if (resolved) setResolvedTheme(resolved)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      const root = window.document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(e.matches ? 'dark' : 'light')
      setResolvedTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return {
    theme,
    setTheme,
    resolvedTheme,
  }
}
