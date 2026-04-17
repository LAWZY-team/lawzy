'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { renderSimpleMarkdown } from './utils'

interface ExpandableMessageProps {
  content: string
  isStreaming?: boolean
  role: 'user' | 'assistant'
  isError?: boolean
}

export function ExpandableMessage({ content, isStreaming, role, isError }: ExpandableMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const maxLength = role === 'user' ? 300 : 2000
  const useMarkdown = role === 'assistant'

  if (content.length <= maxLength || isStreaming) {
    return (
      <div className={cn('whitespace-pre-wrap break-words markdown-content', isError && 'text-destructive')}>
        {useMarkdown ? renderSimpleMarkdown(content) : content}
        {isStreaming && (
          <span className="inline-block w-2 h-4 ml-2 align-middle bg-blue-400 animate-pulse" />
        )}
      </div>
    )
  }

  const displayContent = isExpanded ? content : `${content.slice(0, maxLength)}...`
  return (
    <div className="flex flex-col items-start min-w-0 w-full">
      <div className={cn('whitespace-pre-wrap break-words markdown-content w-full', isError && 'text-destructive')}>
        {useMarkdown ? renderSimpleMarkdown(displayContent) : displayContent}
      </div>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-blue-500 hover:text-blue-700 mt-1 font-medium hover:underline focus:outline-none"
      >
        {isExpanded ? 'Thu gọn' : 'Xem thêm'}
      </button>
    </div>
  )
}
