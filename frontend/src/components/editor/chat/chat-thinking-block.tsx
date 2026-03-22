'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { renderSimpleMarkdown } from './utils'
import { useT } from '@/components/i18n-provider'

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
  const { t } = useT()
  const isExpanded = expandedMessageId === messageId
  const stepCount = (thinking.match(/\*\*\d+\./g) || []).length
  const label = stepCount ? t('chat_view_thinking_steps', { count: stepCount }) : t('chat_view_thinking')

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => onToggle(messageId)}
        className="flex items-center gap-2 w-full text-left py-1 hover:opacity-90 transition-opacity"
      >
        <span className="flex-1 ml-2 text-sm font-semibold text-foreground">
          {isExpanded ? t('chat_hide_thinking') : label}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
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
            <div className="mt-3 pl-1 border-l border-border text-sm text-muted-foreground italic max-h-[320px] overflow-y-auto overflow-x-hidden whitespace-pre-wrap scrollbar-none">
              {renderSimpleMarkdown(thinking)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
