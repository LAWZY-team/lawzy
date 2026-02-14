"use client"

import { useState, useEffect, useRef, use } from 'react'
import type { JSONContent } from '@tiptap/core'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { MergeFieldExtension } from '@/lib/tiptap/extensions/merge-field'
import { ChatColumn, type ChatMessage } from '@/components/editor/chat-column'
import { CanvasEditor } from '@/components/editor/canvas-editor'
import { RightPanel } from '@/components/editor/right-panel'
import { useSidebar } from '@/components/ui/sidebar'
import { useEditorStore } from '@/stores/editor-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useUserFieldsStore } from '@/stores/user-fields-store'
import contractsData from '@/mock/contracts.json'
import chatHistoryData from '@/mock/chat-history.json'
import templatesData from '@/mock/templates.json'
import usersData from '@/mock/users.json'
import type { Template } from '@/types/template'
import { templateContentToEditorContent } from '@/lib/template-content-to-editor'
import { editorContentToPlainText } from '@/lib/editor-content-to-text'
import type { DocContent } from '@/types/template'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  type ContractGenerationResult,
  buildContractSummaryMessage,
  getSimulatedThinking,
  THINKING_STEP_AFTER_EXTRACT,
} from '@/lib/editor/contract-result'
import { contractResultToTipTapContent } from '@/lib/editor/result-to-tiptap-content'
import { useThinkingProgress } from '@/hooks/use-thinking-progress'

const templates = templatesData.templates as Template[]

/** Hợp đồng lưu dạng template (clause/field) cần chuyển sang TipTap khi load */
function isTemplateFormat(doc: unknown): doc is DocContent {
  if (!doc || typeof doc !== 'object') return false
  const d = doc as { type?: string; content?: { type?: string; content?: { type?: string }[] }[] }
  if (d.type !== 'doc' || !Array.isArray(d.content)) return false
  for (const node of d.content) {
    if ((node as { type?: string }).type === 'clause') return true
    const inner = (node as { content?: { type?: string }[] }).content
    if (Array.isArray(inner) && inner.some((c) => (c as { type?: string }).type === 'field')) return true
  }
  return false
}

const DEFAULT_CONTENT: JSONContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'HỢP ĐỒNG MỚI' }] },
    { type: 'paragraph' },
  ],
}

export default function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ template?: string }>
}) {
  const resolvedParams = use(params)
  const resolvedSearchParams = use(searchParams ?? Promise.resolve({}) as Promise<{ template?: string }>)
  const templateId = typeof resolvedSearchParams.template === 'string' ? resolvedSearchParams.template : undefined

  const { setCurrentDocument, setContent, setSaving, setLastSaved, updateMetadata, setTemplateMergeFields, setMergeFieldValues, mergeFieldValues } = useEditorStore()
  const { customFields } = useUserFieldsStore()

  /** Humanize merge field key for label (e.g. CONTRACT_NUMBER -> Số hợp đồng / Contract number) */
  const mergeKeyToLabel = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const { currentWorkspace } = useWorkspaceStore()
  const { setOpen: setSidebarOpen } = useSidebar()
  const workspaceId = currentWorkspace?.workspaceId ?? 'org001'

  const [isCanvasMode, setIsCanvasMode] = useState(resolvedParams.id !== 'new')
  const prevCanvasModeRef = useRef(isCanvasMode)

  // Chỉ thu gọn sidebar khi vừa chuyển sang canvas (false → true); nếu user tự mở lại sidebar thì không ép đóng
  useEffect(() => {
    const justEnteredCanvas = !prevCanvasModeRef.current && isCanvasMode
    prevCanvasModeRef.current = isCanvasMode
    if (justEnteredCanvas) setSidebarOpen(false)
  }, [isCanvasMode, setSidebarOpen])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [editorContent, setEditorContent] = useState<JSONContent>(DEFAULT_CONTENT)
  const [documentTitle, setDocumentTitle] = useState('Hợp đồng dịch vụ')
  const [toolsPanelOpen, setToolsPanelOpen] = useState(true)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [thinkingProgress, setThinkingProgress] = useThinkingProgress(isGenerating)

  // Initialize: load contract by id hoặc template khi /editor/new?template=tmpl001
  useEffect(() => {
    if (resolvedParams.id !== 'new') {
      const contract = contractsData.contracts.find((c) => c.contractId === resolvedParams.id)
      if (contract) {
        setCurrentDocument(contract.contractId)
        setTemplateMergeFields(null)
        setMergeFieldValues(
          Object.fromEntries(
            Object.entries((contract as { mergeFieldValues?: Record<string, unknown> }).mergeFieldValues ?? {}).map(
              ([k, v]) => [k, typeof v === 'string' ? v : String(v ?? '')]
            )
          )
        )
        const raw = contract.contentJSON
        const content = isTemplateFormat(raw) ? templateContentToEditorContent(raw) : (raw as JSONContent)
        setEditorContent(content)
        setDocumentTitle(contract.title)
        updateMetadata({
          title: contract.title,
          type: contract.type,
          tags: contract.metadata.tags,
          riskLevel: contract.metadata.riskLevel as 'low' | 'medium' | 'high',
          visibility: contract.metadata.visibility as 'workspace' | 'private' | 'public',
        })
        setIsCanvasMode(true)
      }
      const history = chatHistoryData.chatHistory.find((c) => c.contractId === resolvedParams.id)
      if (history) {
        type HistoryMsg = { id: string; role: string; content: string; timestamp: string; thinking?: string; hasContract?: boolean }
        const mappedMessages: ChatMessage[] = (history.messages as HistoryMsg[]).map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          ...(msg.thinking != null && { thinking: msg.thinking }),
          ...(msg.hasContract != null && { hasContract: msg.hasContract }),
        }))
        setChatMessages(mappedMessages)
      } else {
        setChatMessages([])
      }
    } else {
      setCurrentDocument(null)
      if (templateId) {
        const template = templates.find((t) => t.templateId === templateId)
        if (template?.contentJSON) {
          const tipTapContent = templateContentToEditorContent(template.contentJSON)
          setEditorContent(tipTapContent)
          setDocumentTitle(template.title)
          updateMetadata({
            title: template.title,
            type: template.type,
            tags: [],
          })
          setTemplateMergeFields(
            (template.mergeFields ?? []).map((f) => ({
              fieldKey: f.fieldKey,
              label: f.label,
              sampleValue: f.sampleValue,
            }))
          )
          setMergeFieldValues(
            Object.fromEntries((template.mergeFields ?? []).map((f) => [f.fieldKey, f.sampleValue ?? '']))
          )
          setIsCanvasMode(true)
          return
        }
      }
      setTemplateMergeFields(null)
      setMergeFieldValues({})
      setEditorContent(DEFAULT_CONTENT)
      setDocumentTitle('Hợp đồng dịch vụ')
      setIsCanvasMode(false)
      setChatMessages([])
    }
  }, [resolvedParams.id, templateId, setCurrentDocument, updateMetadata, setTemplateMergeFields, setMergeFieldValues])

  // Merge per-user custom fields defaults into current editor mergeFieldValues (do not overwrite existing doc values)
  useEffect(() => {
    if (!customFields || customFields.length === 0) return
    const additions: Record<string, string> = {}
    for (const f of customFields) {
      if (!Object.prototype.hasOwnProperty.call(mergeFieldValues, f.key)) {
        additions[f.key] = f.defaultValue ?? ''
      }
    }
    if (Object.keys(additions).length === 0) return
    setMergeFieldValues({ ...mergeFieldValues, ...additions })
  }, [customFields, mergeFieldValues, setMergeFieldValues])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextStyleKit.configure({
        backgroundColor: false,
        color: false,
        lineHeight: false,
        fontFamily: { types: ['textStyle'] },
        fontSize: { types: ['textStyle'] },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      Placeholder.configure({
        placeholder: 'Bắt đầu soạn thảo hoặc gõ / để xem lệnh...',
      }),
      MergeFieldExtension,
    ],
    content: editorContent,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-lg max-w-none focus:outline-none min-h-[calc(100vh-200px)] p-4 text-foreground selection:bg-blue-500/30 selection:text-blue-200',
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.types.includes('application/lawzy-merge-field')) {
          const data = event.dataTransfer.getData('application/lawzy-merge-field')
          try {
            const field = JSON.parse(data)
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
            
            if (coordinates) {
              view.dispatch(view.state.tr.insert(coordinates.pos, view.state.schema.nodes.mergeField.create({
                fieldKey: field.id,
                label: field.label,
                value: field.value
              })))
              return true // Handled
            }
          } catch (e) {
            console.error('Failed to parse drop data', e)
          }
        }
        return false
      }
    },
    onUpdate: ({ editor }) => {
      setContent(editor.getJSON())
      setEditorContent(editor.getJSON())
    },
  })

  // Sync editor content (defer to microtask to avoid flushSync inside React lifecycle)
  useEffect(() => {
    if (!editor || !editorContent || JSON.stringify(editorContent) === JSON.stringify(editor.getJSON())) return
    const pending = editorContent
    queueMicrotask(() => {
      if (JSON.stringify(pending) !== JSON.stringify(editor.getJSON())) {
        editor.commands.setContent(pending)
      }
    })
  }, [editorContent, editor])

  const handleSave = async () => {
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSaving(false)
    setLastSaved(new Date().toISOString())
    toast.success('Đã lưu')
  }

  // Handle chat messages
  const handleSendMessage = async (message: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      ...(attachedFile && { attachedFileName: attachedFile.name }),
    }
    setChatMessages((prev) => [...prev, userMessage])
    setIsGenerating(true)
    setThinkingProgress([])

    let attachedSources: Array<{ fileName: string; text: string }> | undefined
    if (attachedFile) {
      try {
        const form = new FormData()
        form.append('file', attachedFile)
        const extractRes = await fetch('/api/extract-text', { method: 'POST', body: form })
        if (!extractRes.ok) throw new Error('Extract failed')
        const { text } = await extractRes.json()
        if (text && typeof text === 'string') {
          attachedSources = [{ fileName: attachedFile.name, text }]
          setThinkingProgress((prev) => [...prev, THINKING_STEP_AFTER_EXTRACT])
        }
      } catch (e) {
        console.error('Extract text failed', e)
        toast.error('Không đọc được nội dung file đính kèm.')
      }
      setAttachedFile(null)
    }


    await new Promise((r) => setTimeout(r, 300))
    await new Promise((r) => setTimeout(r, 200))

    try {
      const existingContentText = editorContentToPlainText(editorContent)
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: message,
          metadata: {
            contractType: 'general',
          },
          workspaceId,
          existingContent: existingContentText || undefined,
          mergeFieldValues: Object.keys(mergeFieldValues).length > 0 ? mergeFieldValues : undefined,
          attachedSources,
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("API Error:", errorData)
        throw new Error(errorData.error || `Error ${response.status}: Failed to generate contract`)
      }

      const result = await response.json()
      
      let aiContent = ''

      if (result.type === 'contract_generation') {
        const genResult = result as ContractGenerationResult
        aiContent = buildContractSummaryMessage(genResult)

        const { content: newContent, allMergeKeys } = contractResultToTipTapContent(genResult, {
          mergeKeyToLabel,
          mergeFieldValues,
        })

        if (allMergeKeys.size > 0) {
          setTemplateMergeFields(
            Array.from(allMergeKeys).map((key) => ({
              fieldKey: key,
              label: mergeKeyToLabel(key),
              sampleValue: mergeFieldValues[key] ?? '',
            }))
          )
          setMergeFieldValues({
            ...mergeFieldValues,
            ...Object.fromEntries(Array.from(allMergeKeys).map((k) => [k, mergeFieldValues[k] ?? ''])),
          })
        }

        setEditorContent(newContent)
        setDocumentTitle(genResult.content.title || documentTitle)
        setIsCanvasMode(true)
      } else {
        // Handle other types or generic response
        aiContent = JSON.stringify(result, null, 2)
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date(),
        isStreaming: false,
        hasContract: result.type === 'contract_generation',
        ...(result.type === 'contract_generation' && {
          thinking: getSimulatedThinking(result as ContractGenerationResult),
        }),
      }
      
      setChatMessages((prev) => [...prev, aiMessage])

    } catch (error) {
      console.error('Error generating contract:', error)
      toast.error('Có lỗi xảy ra khi tạo hợp đồng')
      setThinkingProgress([])
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Xin lỗi, tôi gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại.',
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
      setThinkingProgress([])
    }
  }

  return (
    <div className="flex flex-1 min-h-0 bg-background text-foreground overflow-hidden relative">

      {/* Main Content Area - 3 Column Layout */}
      <div className="relative z-10 flex w-full h-full min-h-0 gap-2">
        
        {/* Left: Chat Area (30%) */}
        <motion.div 
          layout
          initial={false}
          animate={{ 
            width: isCanvasMode ? '30%' : '100%', // Chat shrinks when canvas is open
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className={cn(
            "flex flex-col h-full relative z-10",
            !isCanvasMode && "items-center"
          )}
        >
          <div className={cn(
            "w-full h-full transition-all duration-500",
            !isCanvasMode ? "max-w-3xl mx-auto" : "w-full"
          )}>
            <ChatColumn
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              isLoading={isGenerating}
              thinkingSteps={thinkingProgress}
              isCanvasMode={isCanvasMode}
              onOpenCanvas={() => setIsCanvasMode(true)}
              userDisplayName={(usersData as { users: Array<{ name?: string }> }).users[0]?.name}
              attachedFile={attachedFile ? { name: attachedFile.name } : null}
              onAttachFile={(file) => {
                const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
                if (ext !== '.pdf' && ext !== '.doc' && ext !== '.docx') {
                  toast.error('Chỉ chấp nhận file PDF, DOC hoặc DOCX.')
                  return
                }
                setAttachedFile(file)
              }}
              onRemoveAttachedFile={() => setAttachedFile(null)}
            />
          </div>
        </motion.div>

        {/* Right Section: Editor + Metadata (70%) */}
        <AnimatePresence>
          {isCanvasMode && (
            <motion.div
              layout
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '70%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="h-full relative z-0 flex gap-2"
            >
              <div className="flex-1 h-full min-w-0">
                <CanvasEditor 
                  editor={editor}
                  title={documentTitle}
                  onClose={() => setIsCanvasMode(false)}
                  onRun={() => toast.info("Đang kiểm tra...")}
                  isCode={false}
                  toolsPanelOpen={toolsPanelOpen}
                  onToggleTools={() => setToolsPanelOpen((v) => !v)}
                  onSave={handleSave}
                />
              </div>

              {toolsPanelOpen && (
                <div className="w-[30%] h-full min-h-0 min-w-[250px] max-w-[400px] shrink-0 flex flex-col overflow-hidden">
                  <RightPanel editor={editor} onClose={() => setToolsPanelOpen(false)} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
