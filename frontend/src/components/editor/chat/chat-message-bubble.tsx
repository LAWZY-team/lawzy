'use client'

import { PanelRightOpen, Paperclip } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ExpandableMessage } from './expandable-message'
import { ChatThinkingBlock } from './chat-thinking-block'
import type { ChatMessage } from './types'
import Image from 'next/image'

interface ChatMessageBubbleProps {
  message: ChatMessage
  isCanvasMode: boolean
  onOpenCanvas?: () => void
  expandedThinkingId: string | null
  onToggleThinking: (id: string) => void
}

export function ChatMessageBubble({
  message,
  isCanvasMode,
  onOpenCanvas,
  expandedThinkingId,
  onToggleThinking,
}: ChatMessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex gap-4 w-full',
        message.role === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      {message.role === 'assistant' && (
        <div className="shrink-0 mt-1">
          <Image
            src="/logo/lawzy-triangle.png"
            width={24}
            height={24}
            alt="Lawzy"
            className="object-contain"
          />
        </div>
      )}

      <div
        className={cn(
          'flex flex-col max-w-[85%] md:max-w-[75%]',
          message.role === 'user' ? 'items-end' : 'items-start pl-2'
        )}
      >
        {message.role !== 'user' && (
          <span className="text-xs font-medium text-muted-foreground mb-1 px-1">Lawzy</span>
        )}

        <div
          className={cn(
            'px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm',
            message.role === 'user'
              ? 'bg-muted text-foreground rounded-tr-sm'
              : 'bg-transparent text-foreground'
          )}
        >
          {message.thinking && (
            <ChatThinkingBlock
              messageId={message.id}
              thinking={message.thinking}
              expandedMessageId={expandedThinkingId}
              onToggle={onToggleThinking}
            />
          )}

          <ExpandableMessage
            content={message.content}
            isStreaming={message.isStreaming}
            role={message.role}
          />

          {message.role === 'user' && message.attachedFileName && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Paperclip className="w-3.5 h-3.5 shrink-0" />
              <span>Đính kèm: {message.attachedFileName}</span>
            </div>
          )}

          {message.hasContract && !isCanvasMode && onOpenCanvas && (
            <div className="mt-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenCanvas}
                className="bg-background border-border text-foreground hover:bg-accent gap-2 h-8 text-xs w-full sm:w-auto"
              >
                <PanelRightOpen className="w-3.5 h-3.5" />
                Mở Editor xem hợp đồng
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
