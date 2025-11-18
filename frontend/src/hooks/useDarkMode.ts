import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

/**
 * Custom hook for managing dark mode
 *
 * @returns {Object} Object containing current theme, isDark boolean, and toggle function
 *
 * @example
 * ```tsx
 * const { theme, isDark, setTheme, toggleTheme } = useDarkMode()
 *
 * // Toggle dark mode
 * <button onClick={toggleTheme}>
 *   {isDark ? 'Light Mode' : 'Dark Mode'}
 * </button>
 *
 * // Set specific theme
 * <button onClick={() => setTheme('dark')}>Dark</button>
 * <button onClick={() => setTheme('light')}>Light</button>
 * <button onClick={() => setTheme('system')}>System</button>
 * ```
 */
export function useDarkMode() {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Get theme from localStorage or default to 'system'
    const saved = localStorage.getItem('theme') as Theme | null
    return saved || 'system'
  })

  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = window.document.documentElement

    // Remove both classes first
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      // Use system preference
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
      setIsDark(systemTheme === 'dark')
    } else {
      // Use explicit theme
      root.classList.add(theme)
      setIsDark(theme === 'dark')
    }
  }, [theme])

  // Listen for system theme changes when using 'system' mode
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      const root = window.document.documentElement
      root.classList.remove('light', 'dark')
      const newTheme = e.matches ? 'dark' : 'light'
      root.classList.add(newTheme)
      setIsDark(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark'
    setTheme(newTheme)
  }

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
  }
}
