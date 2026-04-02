import { useState, useEffect } from 'react'

/**
 * Hook: khi isGenerating true, trả về progress rỗng để caller (stream handler) điền
 * các bước thật từ agent: "Đang kết nối AI", tool_in_progress, v.v.
 * Không giả lập bước - chỉ dùng logic thinking và agent tool call thật.
 */
export function useThinkingProgress(isGenerating: boolean): [string[], React.Dispatch<React.SetStateAction<string[]>>] {
  const [thinkingProgress, setThinkingProgress] = useState<string[]>([])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setThinkingProgress([])
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [isGenerating])

  return [thinkingProgress, setThinkingProgress]
}
