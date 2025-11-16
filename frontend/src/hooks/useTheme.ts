import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    const stored = localStorage.getItem('theme') as Theme | null

    // If we have a valid stored theme, use it
    if (stored === 'light' || stored === 'dark') {
      return stored
    }

    // Default to light mode
    return 'light'
  })

  useEffect(() => {
    const root = document.documentElement

    // Remove both theme classes
    root.classList.remove('light', 'dark')

    // Add the selected theme
    root.classList.add(theme)

    // Save to localStorage
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'))
  }

  return { theme, setTheme, toggleTheme, isDark: theme === 'dark' }
}
