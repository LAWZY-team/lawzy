'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Mic, X, Paperclip, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ACCEPT_ATTACH, acceptFile } from './utils'

interface ChatInputAreaProps {
  input: string
  setInput: React.Dispatch<React.SetStateAction<string>>
  onSubmit: () => void
  isLoading: boolean
  isCanvasMode?: boolean
  attachedFile: { name: string } | null
  onAttachFile?: (file: File) => void
  onRemoveAttachedFile?: () => void
}

export function ChatInputArea({
  input,
  setInput,
  onSubmit,
  isLoading,
  isCanvasMode = false,
  attachedFile,
  onAttachFile,
  onRemoveAttachedFile,
}: ChatInputAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<{
    stop(): void
    abort(): void
  } | null>(null)

  const hasAttachedFile = !!attachedFile

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  useEffect(
    () => () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          try {
            recognitionRef.current.stop()
          } catch {
            // noop
          }
        }
        recognitionRef.current = null
      }
      setIsListening(false)
    },
    []
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (!onAttachFile || isLoading || hasAttachedFile) return
    const file = e.dataTransfer.files?.[0]
    if (file && acceptFile(file)) onAttachFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onAttachFile && !isLoading && !hasAttachedFile) setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSubmit()
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = '56px'
    }
  }

  const toggleVoice = () => {
    if (isLoading) return
    const Win = typeof window !== 'undefined' ? window : null
    const SpeechRecognitionAPI =
      (Win as Window & { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        ?.SpeechRecognition ||
      (Win as Window & { webkitSpeechRecognition?: new () => unknown })?.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return

    if (isListening) {
      recognitionRef.current?.stop()
      recognitionRef.current = null
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognitionAPI() as {
      start(): void
      stop(): void
      abort(): void
      continuous: boolean
      interimResults: boolean
      lang: string
      onresult: ((e: {
        resultIndex: number
        results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } }
      }) => void) | null
      onend: (() => void) | null
      onerror: (() => void) | null
    }
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'vi-VN'
    recognition.onresult = (event: {
      resultIndex: number
      results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } }
    }) => {
      const results = event.results
      for (let i = event.resultIndex; i < results.length; i++) {
        const result = results[i]
        if (result?.isFinal) {
          const transcript = result[0]?.transcript
          if (transcript) setInput((prev) => (prev + transcript).trim())
        }
      }
    }
    recognition.onend = () => {
      if (recognitionRef.current) setIsListening(false)
      recognitionRef.current = null
    }
    recognition.onerror = () => {
      recognitionRef.current = null
      setIsListening(false)
    }
    try {
      recognition.start()
      recognitionRef.current = recognition
      setIsListening(true)
    } catch {
      setIsListening(false)
    }
  }

  return (
    <div className="shrink-0 p-4 md:p-3 bg-background z-20 border-t border-border">
      <div className={cn('relative w-full', isCanvasMode ? 'max-w-none' : 'max-w-3xl mx-auto')}>
        <div
          className={cn(
            'relative bg-background rounded-[24px] border transition-all flex flex-col min-h-[56px]',
            isDragOver ? 'border-blue-500/60 bg-blue-500/5' : 'border-border focus-within:border-border'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {hasAttachedFile && (
            <div className="px-4 pt-3 pb-1 flex items-center gap-2 flex-wrap border-b border-border/50">
              <span className="inline-flex items-center gap-2 rounded-full bg-muted pl-3 pr-1.5 py-1.5 text-sm text-foreground">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="max-w-[200px] truncate">{attachedFile.name}</span>
                {onRemoveAttachedFile && (
                  <button
                    type="button"
                    onClick={onRemoveAttachedFile}
                    className="hover:bg-accent rounded-full p-1 text-muted-foreground hover:text-red-500 transition-colors"
                    aria-label="Gỡ file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </span>
            </div>
          )}

          {isDragOver && !hasAttachedFile && (
            <div className="absolute inset-0 flex items-center justify-center rounded-[24px] bg-blue-500/10 border-2 border-dashed border-blue-500/50 z-10 pointer-events-none">
              <span className="text-sm font-medium text-blue-400">Thả file PDF/DOC vào đây</span>
            </div>
          )}

          <div className="relative flex-1 flex">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                hasAttachedFile
                  ? 'Hỏi hoặc yêu cầu dựa trên file đính kèm...'
                  : 'Hỏi Lawzy về hợp đồng...'
              }
              className={cn(
                'min-h-[56px] max-h-[200px] flex-1 w-full bg-transparent border-none focus-visible:ring-0 resize-none text-[16px] text-foreground placeholder:text-muted-foreground leading-relaxed rounded-[24px]',
                hasAttachedFile ? 'pl-12 pr-12 py-3 pt-3' : 'pl-12 pr-12 py-4'
              )}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              rows={1}
            />

            {onAttachFile && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_ATTACH}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && acceptFile(file)) {
                      onAttachFile(file)
                      e.target.value = ''
                    }
                  }}
                />
                <div className="absolute left-2 bottom-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={!!attachedFile || isLoading}
                    title="Đính kèm file PDF, DOC hoặc DOCX (tối đa 25MB)"
                    className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-full h-10 w-10 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                </div>
              </>
            )}

            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              {input.trim() ? (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  size="icon"
                  className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isLoading}
                  title={isListening ? 'Dừng ghi âm' : 'Nhập bằng giọng nói'}
                  className={cn(
                    'rounded-full h-10 w-10 transition-colors',
                    isListening
                      ? 'text-red-400 bg-red-500/20 hover:bg-red-500/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                  onClick={toggleVoice}
                >
                  <Mic className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground text-center">
          Lawzy AI có thể mắc lỗi. Hãy kiểm tra lại thông tin quan trọng.
        </p>
      </div>
    </div>
  )
}
