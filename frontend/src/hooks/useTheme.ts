import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    const stored = localStorage.getItem('theme') as Theme | null

    // If we have a valid stored theme, use it
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }

    // Default to system mode
    return 'system'
  })

  useEffect(() => {
    const root = document.documentElement

    // Remove both theme classes
    root.classList.remove('light', 'dark')

    // Determine which theme to apply
    let appliedTheme: 'light' | 'dark'

    if (theme === 'system') {
      // Check system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      appliedTheme = systemPrefersDark ? 'dark' : 'light'
    } else {
      appliedTheme = theme
    }

    // Add the applied theme class
    root.classList.add(appliedTheme)

    // Save to localStorage
    localStorage.setItem('theme', theme)
  }, [theme])

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = () => {
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(mediaQuery.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'))
  }

  return { theme, setTheme, toggleTheme, isDark: theme === 'dark' }
}
