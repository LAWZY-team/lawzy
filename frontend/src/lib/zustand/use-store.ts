import { useEffect, useState } from "react"

/**
 * Hydration-safe selector hook for Zustand in Next.js.
 * Based on Zustand docs (Context7): delay returning selected state until after mount.
 */
export default function useStore<TState, TSelected>(
  store: (selector: (state: TState) => unknown) => unknown,
  selector: (state: TState) => TSelected
) {
  const selected = store(selector) as TSelected
  const [data, setData] = useState<TSelected>()

  useEffect(() => {
    setData(selected)
  }, [selected])

  return data
}

