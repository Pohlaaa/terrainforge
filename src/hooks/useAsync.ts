import { useEffect, useState } from 'react'

interface UseAsyncState<T> {
  status: 'idle' | 'pending' | 'success' | 'error'
  data?: T
  error?: Error
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true,
) {
  const [state, setState] = useState<UseAsyncState<T>>({
    status: 'idle',
  })

  useEffect(() => {
    if (!immediate) return

    const executeAsync = async () => {
      setState({ status: 'pending' })
      try {
        const response = await asyncFunction()
        setState({ status: 'success', data: response })
      } catch (error) {
        setState({ status: 'error', error: error as Error })
      }
    }

    executeAsync()
  }, [asyncFunction, immediate])

  return state
}
