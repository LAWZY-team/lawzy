'use client'

import { Scale, Sparkles, FileText, ShieldAlert, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatMessageBubble } from './chat-message-bubble'
import { ChatLoadingThinking } from './chat-loading-thinking'
import type { ChatMessage } from './types'

const QUICK_ACTIONS = [
  { text: 'Soạn hợp đồng dịch vụ', icon: FileText },
  { text: 'Kiểm tra rủi ro pháp lý', icon: ShieldAlert },
  { text: 'Tra cứu Luật Dân sự 2015', icon: Search },
  { text: 'Giải thích điều khoản', icon: Scale },
] as const

interface ChatMessageListProps {
  scrollAreaRef: React.RefObject<HTMLDivElement | null>
  messages: ChatMessage[]
  isLoading: boolean
  thinkingSteps: string[]
  thinkingCollapsed: boolean
  onToggleThinkingCollapsed: () => void
  userDisplayName?: string
  isCanvasMode: boolean
  onOpenCanvas?: () => void
  expandedThinkingId: string | null
  onToggleThinking: (id: string) => void
  onQuickAction: (text: string) => void
}

export function ChatMessageList({
  scrollAreaRef,
  messages,
  isLoading,
  thinkingSteps,
  thinkingCollapsed,
  onToggleThinkingCollapsed,
  userDisplayName,
  isCanvasMode,
  onOpenCanvas,
  expandedThinkingId,
  onToggleThinking,
  onQuickAction,
}: ChatMessageListProps) {
  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1 w-full min-h-0">
      <div className="px-4 py-6 md:px-6 space-y-8 max-w-3xl mx-auto w-full pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-6 animate-in fade-in duration-700">
            <div className="bg-[#131314] p-4 rounded-full border border-[#2D2D2D]">
              <Scale className="w-8 h-8 text-[#9CA3AF]" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-2xl font-medium text-[#E3E3E3]">
                Xin chào, {userDisplayName?.trim() || 'Luật sư'}
              </h2>
              <p className="text-[#9CA3AF]">Hôm nay tôi có thể giúp gì cho bạn?</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mt-8">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.text}
                  type="button"
                  className="p-4 text-sm text-left bg-[#131314] hover:bg-[#2D2D2D] border border-[#2D2D2D] rounded-xl transition-all flex items-center gap-3 text-[#E3E3E3] group"
                  onClick={() => onQuickAction(action.text)}
                >
                  <div className="p-2 rounded-lg bg-[#2D2D2D] group-hover:bg-[#3D3D3D] transition-colors">
                    <action.icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <span>{action.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                isCanvasMode={isCanvasMode}
                onOpenCanvas={onOpenCanvas}
                expandedThinkingId={expandedThinkingId}
                onToggleThinking={onToggleThinking}
              />
            ))}
          </AnimatePresence>
        )}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-4 w-full"
          >
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-blue-400 animate-spin-slow" />
              </div>
            </div>
            <ChatLoadingThinking
              thinkingSteps={thinkingSteps}
              thinkingCollapsed={thinkingCollapsed}
              onToggleCollapsed={onToggleThinkingCollapsed}
            />
          </motion.div>
        )}
      </div>
    </ScrollArea>
  )
}
