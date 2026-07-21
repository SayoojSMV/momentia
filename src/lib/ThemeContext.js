'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({
  darkMode: false,
  toggleDarkMode: () => {},
  sidebarDefault: 'collapsed',
  setSidebarDefault: () => {},
})

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarDefault, setSidebarDefaultState] = useState('collapsed')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Read saved preferences from localStorage on first load
    const savedDark = localStorage.getItem('momentia-dark-mode')
    const savedSidebar = localStorage.getItem('momentia-sidebar-default')

    if (savedDark === 'true') {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }

    if (savedSidebar) setSidebarDefaultState(savedSidebar)

    setMounted(true)
  }, [])

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev
      localStorage.setItem('momentia-dark-mode', String(next))
      if (next) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return next
    })
  }

  const setSidebarDefault = (value) => {
    setSidebarDefaultState(value)
    localStorage.setItem('momentia-sidebar-default', value)
  }

  if (!mounted) return null

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, sidebarDefault, setSidebarDefault }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}