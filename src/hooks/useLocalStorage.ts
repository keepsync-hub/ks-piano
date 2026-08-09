import { useState, useEffect } from 'react'

/**
 * Generic localStorage hook with JSON serialization.
 * Falls back to the initial value if parsing fails.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = (value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const valueToStore = value instanceof Function ? value(prev) : value
      try {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      } catch {
        // Ignore write errors (e.g. quota exceeded, private browsing)
      }
      return valueToStore
    })
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch {
      // Ignore write errors
    }
  }, [key, storedValue])

  return [storedValue, setValue]
}
