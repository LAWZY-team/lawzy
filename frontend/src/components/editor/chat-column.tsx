'use client'

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessageList } from './chat/chat-message-list'
import { ChatInputArea } from './chat/chat-input-area'
import { useDashboardQuota } from '@/hooks/dashboard/use-dashboard'
import type { ChatMessage } from './chat/types'
import type { QuestionnaireSchema } from '@/types/questionnaire'
import type { UserCustomField } from '@/stores/user-fields-store'
import type { WorkspaceFieldItem } from '@/hooks/workspaces/use-workspace-fields'
import type { ContractTypeId } from '@/lib/editor/contract-questionnaires'
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
  activeQuestionnaire?: QuestionnaireSchema | null
  onQuestionnaireSubmit?: (values: Record<string, string>) => void
  onQuestionnaireSkip?: () => void
  onContractTypeSelect?: (contractTypeId: ContractTypeId) => void
  mergeFieldValues?: Record<string, string>
  userFields?: UserCustomField[]
  workspaceFields?: WorkspaceFieldItem[]
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
  activeQuestionnaire = null,
  onQuestionnaireSubmit,
  onQuestionnaireSkip,
  onContractTypeSelect,
  mergeFieldValues = {},
  userFields = [],
  workspaceFields = [],
}: ChatColumnProps) {
  const [input, setInput] = useState('')
  const lastWithThinking = [...(messages || [])].reverse().find((m) => m.role === 'assistant' && m.thinking)
  const [expandedThinking, setExpandedThinking] = useState<string | null>(() => lastWithThinking?.id ?? null)
  const [thinkingCollapsed, setThinkingCollapsed] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { data: quota } = useDashboardQuota()

  useEffect(() => {
    if (isLoading && thinkingSteps.length > 0) {
      const timeoutId = setTimeout(() => {
        setThinkingCollapsed(false)
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [isLoading, thinkingSteps.length])

  const lastAutoExpandedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && m.thinking)
    if (!lastAssistant || lastAutoExpandedRef.current.has(lastAssistant.id)) return
    lastAutoExpandedRef.current.add(lastAssistant.id)
    
    const timeoutId = setTimeout(() => {
      setExpandedThinking(lastAssistant.id)
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [messages])

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
    <div className="flex flex-col h-full bg-background text-foreground relative overflow-hidden">
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background z-10 sticky top-0">
        <div className="flex items-center gap-2">
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-accent"
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
        onContractTypeSelect={onContractTypeSelect}
        activeQuestionnaire={activeQuestionnaire}
        onQuestionnaireSubmit={onQuestionnaireSubmit}
        onQuestionnaireSkip={onQuestionnaireSkip}
        mergeFieldValues={mergeFieldValues}
        userFields={userFields}
        workspaceFields={workspaceFields}
      />

      <ChatInputArea
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        isCanvasMode={isCanvasMode}
        attachedFile={attachedFile}
        onAttachFile={onAttachFile}
        onRemoveAttachedFile={onRemoveAttachedFile}
        aiCreditsUsed={quota?.aiCreditsUsed}
        aiCreditsLimit={quota?.aiCreditsLimit}
        aiCreditsRemaining={quota?.aiCreditsRemaining}
      />
    </div>
  )
}
