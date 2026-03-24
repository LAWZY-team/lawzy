export interface ToolCallItem {
  name: string
  args: Record<string, unknown>
  result: unknown
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  timestamp: Date
  isStreaming?: boolean
  isError?: boolean
  hasContract?: boolean
  attachedFileName?: string
  toolCalls?: ToolCallItem[]
}
