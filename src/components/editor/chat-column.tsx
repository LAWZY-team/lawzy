'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessageList } from './chat/chat-message-list'
import { ChatInputArea } from './chat/chat-input-area'
import type { ChatMessage } from './chat/types'
export type { ChatMessage } from './chat/types'

interface ChatColumnProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isLoading?: boolean
  onClose?: () => void
  onOpenCanvas?: () => void
  isCanvasMode?: boolean
  attachedFile?: { name: string } | null
  onAttachFile?: (file: File) => void
  onRemoveAttachedFile?: () => void
  userDisplayName?: string
  thinkingSteps?: string[]
}

export function ChatColumn({
  messages,
  onSendMessage,
  isLoading = false,
  onClose,
  onOpenCanvas,
  isCanvasMode = false,
  attachedFile = null,
  onAttachFile,
  onRemoveAttachedFile,
  userDisplayName,
  thinkingSteps = [],
}: ChatColumnProps) {
  const [input, setInput] = useState('')
  const [expandedThinking, setExpandedThinking] = useState<string | null>(null)
  const [thinkingCollapsed, setThinkingCollapsed] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoading) return
    queueMicrotask(() => setThinkingCollapsed(true))
  }, [isLoading])

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages, isLoading])

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const toggleThinking = (messageId: string) => {
    setExpandedThinking(expandedThinking === messageId ? null : messageId)
  }

  return (
    <div className="flex flex-col h-full bg-[#131314] text-[#E3E3E3] relative overflow-hidden">
      <div className="md:hidden flex items-center justify-between p-4 border-b border-[#2D2D2D] bg-[#131314] z-10 sticky top-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h3 className="font-medium text-sm">Lawzy AI</h3>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-white hover:bg-[#2D2D2D]"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <ChatMessageList
        scrollAreaRef={scrollAreaRef}
        messages={messages}
        isLoading={isLoading}
        thinkingSteps={thinkingSteps}
        thinkingCollapsed={thinkingCollapsed}
        onToggleThinkingCollapsed={() => setThinkingCollapsed((c) => !c)}
        userDisplayName={userDisplayName}
        isCanvasMode={isCanvasMode}
        onOpenCanvas={onOpenCanvas}
        expandedThinkingId={expandedThinking}
        onToggleThinking={toggleThinking}
        onQuickAction={setInput}
      />

      <ChatInputArea
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        attachedFile={attachedFile}
        onAttachFile={onAttachFile}
        onRemoveAttachedFile={onRemoveAttachedFile}
      />
    </div>
  )
}
