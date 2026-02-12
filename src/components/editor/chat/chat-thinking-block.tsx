'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { renderSimpleMarkdown } from './utils'

interface ChatThinkingBlockProps {
  messageId: string
  thinking: string
  expandedMessageId: string | null
  onToggle: (id: string) => void
}

export function ChatThinkingBlock({
  messageId,
  thinking,
  expandedMessageId,
  onToggle,
}: ChatThinkingBlockProps) {
  const isExpanded = expandedMessageId === messageId
  const stepCount = (thinking.match(/\*\*\d+\./g) || []).length
  const label = stepCount ? `Xem suy luận (${stepCount} bước)` : 'Xem suy luận'

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => onToggle(messageId)}
        className="flex items-center gap-2 w-full text-left py-1 -mx-1 hover:opacity-90 transition-opacity"
      >
        <span className="flex-1 text-sm font-semibold text-[#E3E3E3]">
          {isExpanded ? 'Ẩn suy luận' : label}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 shrink-0 text-[#9CA3AF]" />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0 text-[#9CA3AF]" />
        )}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pl-4 border-l border-[#3D3D3D] text-sm text-[#9CA3AF] italic max-h-[320px] overflow-y-auto overflow-x-hidden whitespace-pre-wrap scrollbar-none">
              {renderSimpleMarkdown(thinking)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
