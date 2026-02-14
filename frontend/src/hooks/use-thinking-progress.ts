import { useState, useEffect } from 'react'
import { LOADING_THINKING_STEPS, LOADING_THINKING_DELAYS_MS } from '@/lib/editor/contract-result'

/**
 * Hook: khi isGenerating true, hiển thị từng bước thinking tích lũy với delay khác nhau.
 * Trả về [progress, setProgress] để caller có thể append (vd. THINKING_STEP_AFTER_EXTRACT).
 */
export function useThinkingProgress(isGenerating: boolean): [string[], React.Dispatch<React.SetStateAction<string[]>>] {
  const [thinkingProgress, setThinkingProgress] = useState<string[]>([])

  useEffect(() => {
    if (!isGenerating) return
    queueMicrotask(() => setThinkingProgress([LOADING_THINKING_STEPS[0]]))
    const timeouts: ReturnType<typeof setTimeout>[] = []
    let cumulativeMs = 0
    for (let i = 0; i < LOADING_THINKING_DELAYS_MS.length && i + 1 < LOADING_THINKING_STEPS.length; i++) {
      cumulativeMs += LOADING_THINKING_DELAYS_MS[i]
      const stepIndex = i + 1
      timeouts.push(
        setTimeout(() => {
          setThinkingProgress((prev) => [...prev, LOADING_THINKING_STEPS[stepIndex]])
        }, cumulativeMs)
      )
    }
    return () => timeouts.forEach((t) => clearTimeout(t))
  }, [isGenerating])

  return [thinkingProgress, setThinkingProgress]
}
