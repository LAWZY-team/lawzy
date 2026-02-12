'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { renderSimpleMarkdown } from './utils'

interface ChatLoadingThinkingProps {
  thinkingSteps: string[]
  thinkingCollapsed: boolean
  onToggleCollapsed: () => void
}

export function ChatLoadingThinking({
  thinkingSteps,
  thinkingCollapsed,
  onToggleCollapsed,
}: ChatLoadingThinkingProps) {
  return (
    <div className="flex flex-col gap-2 min-w-0 flex-1 max-w-[85%] md:max-w-[75%]">
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="flex items-center gap-2 h-8 text-left"
      >
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" />
        </div>
        <span className="text-xs text-[#9CA3AF] font-medium">
          Đang suy nghĩ{thinkingSteps.length > 0 ? ` (${thinkingSteps.length} bước)` : '...'}
        </span>
        {thinkingSteps.length > 0 && (
          <span className="text-[#6B7280] ml-1">
            {thinkingCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </span>
        )}
      </button>
      {thinkingSteps.length > 0 && !thinkingCollapsed && (
        <div className="mt-3 pl-4 border-l border-[#3D3D3D] space-y-3 text-sm text-[#9CA3AF] italic max-h-[320px] overflow-y-auto overflow-x-hidden scrollbar-none">
          {thinkingSteps.map((step, i) => (
            <div
              key={i}
              className="whitespace-pre-wrap first:pt-0 pt-2 border-t border-[#2D2D2D]/50 first:border-t-0 first:pt-0"
            >
              {renderSimpleMarkdown(step)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
