export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  timestamp: Date
  isStreaming?: boolean
  hasContract?: boolean
  attachedFileName?: string
}
