import { useState, useCallback } from 'react'

interface AsyncActionState<T> {
  execute: (...args: unknown[]) => Promise<T | undefined>
  loading: boolean
  error: string | null
  clearError: () => void
}

export function useAsyncAction<T>(
  action: (...args: unknown[]) => Promise<T>,
  onError?: (error: Error) => void
): AsyncActionState<T> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (...args: unknown[]) => {
    setLoading(true)
    setError(null)
    try {
      const result = await action(...args)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(msg)
      if (onError) onError(err instanceof Error ? err : new Error(msg))
      return undefined
    } finally {
      setLoading(false)
    }
  }, [action, onError])

  const clearError = useCallback(() => setError(null), [])

  return { execute, loading, error, clearError }
}
