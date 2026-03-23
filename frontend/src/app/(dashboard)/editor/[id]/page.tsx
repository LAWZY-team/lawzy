"use client"

import { useState, useEffect, useRef, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { JSONContent } from '@tiptap/core'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import { MergeFieldExtension } from '@/lib/tiptap/extensions/merge-field'
import { ChatColumn, type ChatMessage } from '@/components/editor/chat-column'
import { CanvasEditor } from '@/components/editor/canvas-editor'
import { RightPanel } from '@/components/editor/right-panel'
import { useSidebar } from '@/components/ui/sidebar'
import { useEditorStore } from '@/stores/editor-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useUserFieldsStore } from '@/stores/user-fields-store'
import type { Template } from '@/types/template'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceFields } from '@/hooks/workspaces/use-workspace-fields'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { useGuestEditorSessionStore } from '@/stores/guest-editor-session-store'
import { AuthModal } from '@/components/editor/auth-modal'
import { api } from '@/lib/api/client'
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
import { useNavigationGuard } from '@/hooks/use-navigation-guard'
import { SaveDraftModal } from '@/components/editor/save-draft-modal'
import { flushMergeFieldDrafts } from '@/lib/editor/flush-merge-field-drafts'
import { useT } from '@/components/i18n-provider'

// Template type alias for editor usage
type EditorTemplate = Template

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
  searchParams?: Promise<{ template?: string; draft?: string }>
}) {
  const router = useRouter()
  const resolvedParams = use(params)
  const resolvedSearchParams = use(searchParams ?? Promise.resolve({}) as Promise<{ template?: string; draft?: string }>)
  const templateId = typeof resolvedSearchParams.template === 'string' ? resolvedSearchParams.template : undefined
  const draftId = typeof resolvedSearchParams.draft === 'string' ? resolvedSearchParams.draft : undefined

  const { setCurrentDocument, setContent, setSaving, setLastSaved, updateMetadata, setTemplateMergeFields, setMergeFieldValues, mergeFieldValues, metadata } = useEditorStore()
  const { customFields } = useUserFieldsStore()
  const { isAuthenticated } = useAuthStore()
  const { saveSession, getSession, clearSession } = useGuestEditorSessionStore()

  /** Humanize merge field key for label (e.g. CONTRACT_NUMBER -> SỐ HỢP ĐỒNG / CONTRACT NUMBER) */
  const mergeKeyToLabel = (key: string) => key.replace(/_/g, ' ').toUpperCase()
  const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore()
  const { setOpen: setSidebarOpen } = useSidebar()
  const workspaceId = currentWorkspace?.id
  const { locale, t } = useT()
  const { data: workspaceFields = [] } = useWorkspaceFields(workspaceId ?? null)

  // Ensure we always have a default workspace selected (first workspace)
  useEffect(() => {
    if (!currentWorkspace) {
      fetchWorkspaces().catch((err) => {
        console.error('Failed to load workspaces for editor', err)
      })
    }
  }, [currentWorkspace, fetchWorkspaces])

  // Mặc định: chỉ mở canvas khi đã có document id (editor/{id}); /editor/new bắt đầu ở chế độ chat
  const [isCanvasMode, setIsCanvasMode] = useState(resolvedParams.id !== 'new')
  const prevCanvasModeRef = useRef(isCanvasMode)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [toolsPanelOpen, setToolsPanelOpen] = useState(true)

  // Chỉ thu gọn sidebar khi vừa chuyển sang canvas (false → true); nếu user tự mở lại sidebar thì không ép đóng
  useEffect(() => {
    const justEnteredCanvas = !prevCanvasModeRef.current && isCanvasMode
    prevCanvasModeRef.current = isCanvasMode
    if (justEnteredCanvas) setSidebarOpen(false)
  }, [isCanvasMode, setSidebarOpen])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [editorContent, setEditorContent] = useState<JSONContent>(DEFAULT_CONTENT)
  const documentTitle = metadata.title || 'Hợp đồng mới'
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const thinkingProgress = useThinkingProgress(isGenerating)[0]
  const setThinkingProgress = useThinkingProgress(isGenerating)[1]
  const draftInitRef = useRef(false)
  const guestRestoredRef = useRef(false)
  const initialLoadRef = useRef(true)
  const [isDirty, setIsDirty] = useState(false)
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false)
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)

  // Allow RightPanel to request chat restoration when restoring a version
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ messages?: Array<{ id: string; role: string; content: string; createdAt: string }> }>
      const msgs = ce.detail?.messages
      if (!Array.isArray(msgs)) return
      setChatMessages(
        msgs.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.createdAt),
        }))
      )
    }
    window.addEventListener('lawzy:restore-chat', handler as EventListener)
    return () => window.removeEventListener('lawzy:restore-chat', handler as EventListener)
  }, [])

  // Ensure guest editor session store is hydrated (persist.skipHydration)
  useEffect(() => {
    useGuestEditorSessionStore.persist.rehydrate()
  }, [])

  // Restore draft when coming back to /editor/new (guest) OR migrate guest draft into account on login
  useEffect(() => {
    if (resolvedParams.id !== 'new') return

    let cancelled = false

    async function run() {
      // Wait for hydration to complete so getSession returns correct values.
      await useGuestEditorSessionStore.persist.rehydrate()
      if (cancelled) return

      const session = getSession()

      // Everyone returning to /editor/new: restore from sessionStorage
      if (!guestRestoredRef.current && session.editorContent) {
        guestRestoredRef.current = true
        setEditorContent(session.editorContent)
        updateMetadata({ title: session.documentTitle })
        setMergeFieldValues(session.mergeFieldValues)
        if (session.templateMergeFields) setTemplateMergeFields(session.templateMergeFields)
        if (session.chatMessages.length > 0) setChatMessages(session.chatMessages)
        if (session.metadata) updateMetadata(session.metadata)
        setIsCanvasMode(true)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [
    resolvedParams.id, // Ensure we re-run when id changes
    getSession,
    setMergeFieldValues,
    setTemplateMergeFields,
    updateMetadata,
  ])

  const wasAuthRef = useRef(isAuthenticated)
  useEffect(() => {
    wasAuthRef.current = isAuthenticated
  }, [isAuthenticated])

  // Save local session periodically on /editor/new
  useEffect(() => {
    if (resolvedParams.id === 'new' && isCanvasMode) {
      const interval = setInterval(() => {
        const isLoggingOut = (wasAuthRef.current && !useAuthStore.getState().isAuthenticated) || typeof window !== 'undefined' && (window as any).__isLoggingOut;
        if (isLoggingOut) return

        saveSession({
          editorContent,
          documentTitle,
          mergeFieldValues,
          templateMergeFields: useEditorStore.getState().templateMergeFields,
          chatMessages,
          metadata: useEditorStore.getState().metadata,
        })
      }, 5000) // Save every 5 seconds

      return () => {
        try {
          const isLoggingOut = (wasAuthRef.current && !useAuthStore.getState().isAuthenticated) || typeof window !== 'undefined' && (window as any).__isLoggingOut;
          if (isLoggingOut) return

          // Save once on unmount/navigation to avoid losing recent changes
          saveSession({
            editorContent,
            documentTitle,
            mergeFieldValues,
            templateMergeFields: useEditorStore.getState().templateMergeFields,
            chatMessages,
            metadata: useEditorStore.getState().metadata,
          })
        } finally {
          clearInterval(interval)
        }
      }
    }
  }, [resolvedParams.id, isCanvasMode, editorContent, documentTitle, mergeFieldValues, chatMessages, saveSession])

  // Handle auth requirement for guest actions
  const handleAuthRequired = useCallback(() => {
    if (!isAuthenticated) {
      setShowAuthModal(true)
      return true // Return true to indicate auth is required
    }
    return false
  }, [isAuthenticated])

  useEffect(() => {
    if (resolvedParams.id !== 'new') {
      initialLoadRef.current = true
      api.get<Record<string, unknown>>(`/documents/${resolvedParams.id}`).then((doc) => {
        if (doc) {
          setCurrentDocument(doc.id as string)
          setTemplateMergeFields(null)
          const rawMfv = doc.mergeFieldValues
          const parsedMfv: Record<string, unknown> =
            typeof rawMfv === 'string'
              ? (() => { try { return JSON.parse(rawMfv) } catch { return {} } })()
              : ((rawMfv as Record<string, unknown>) ?? {})
          setMergeFieldValues(
            Object.fromEntries(Object.entries(parsedMfv).map(([k, v]) => [k, typeof v === 'string' ? v : String(v ?? '')]))
          )
          const rawContent = doc.contentJSON
          const raw =
            typeof rawContent === 'string'
              ? (() => { try { return JSON.parse(rawContent) } catch { return rawContent } })()
              : rawContent
          const content = isTemplateFormat(raw) ? templateContentToEditorContent(raw as DocContent) : (raw as JSONContent)
          if (content) setEditorContent(content)
          // Use updateMetadata below to set both title and other metadata
          const meta = (doc.metadata as Record<string, unknown>) ?? {}
          updateMetadata({
            title: (doc.title as string) || '',
            type: (doc.type as string) || 'contract',
            tags: (meta.tags as string[]) ?? [],
            riskLevel: (meta.riskLevel as 'low' | 'medium' | 'high') ?? 'low',
            visibility: (meta.visibility as 'workspace' | 'private' | 'public') ?? 'workspace',
            status: (doc.status as string) || 'draft',
            creator: (doc.creator as { name: string; email?: string; avatar?: string }) || undefined,
          })
          setIsCanvasMode(true)

          const chatMsgs = (doc.chatMessages as Array<{ id: string; role: string; content: string; createdAt: string }>) ?? []
          setChatMessages(chatMsgs.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.createdAt),
          })))
        }
      }).catch(() => {
        setChatMessages([])
        initialLoadRef.current = false
      })
    } else {
      setCurrentDocument(null)
      if (templateId) {
        api.get<EditorTemplate>(`/templates/${templateId}`).then((template) => {
          if (template?.contentJSON) {
            const tipTapContent = templateContentToEditorContent(template.contentJSON as DocContent)
            setEditorContent(tipTapContent)
            updateMetadata({
              title: template.title,
              type: template.category ?? 'contract',
              tags: [],
            })
            const fields = (template.mergeFields ?? []) as Array<{ fieldKey: string; label: string; sampleValue?: string }>
            setTemplateMergeFields(
              fields.map((f) => ({
                fieldKey: f.fieldKey,
                label: f.label,
                sampleValue: f.sampleValue,
              }))
            )
            setMergeFieldValues(
              Object.fromEntries(fields.map((f) => [f.fieldKey, f.sampleValue ?? '']))
            )
            setIsCanvasMode(true)
          }
        }).catch(() => {})
        return
      }
      setTemplateMergeFields(null)
      setMergeFieldValues({})
      setEditorContent(DEFAULT_CONTENT)
      updateMetadata({ title: 'Hợp đồng dịch vụ' })
      // Với /editor/new, bắt đầu ở chế độ chat, chưa mở canvas
      setIsCanvasMode(false)
      setChatMessages([])
      initialLoadRef.current = false
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

  // Merge workspace custom fields defaults (ưu tiên cho AI khi soạn hợp đồng)
  useEffect(() => {
    if (!workspaceFields || workspaceFields.length === 0) return
    const additions: Record<string, string> = {}
    for (const f of workspaceFields) {
      if (f.isHidden) continue
      if (!Object.prototype.hasOwnProperty.call(mergeFieldValues, f.key)) {
        additions[f.key] = f.defaultValue ?? ''
      }
    }
    if (Object.keys(additions).length === 0) return
    setMergeFieldValues({ ...mergeFieldValues, ...additions })
  }, [workspaceFields, mergeFieldValues, setMergeFieldValues])

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
      Underline,
      MergeFieldExtension,
    ],
    content: editorContent,
      editorProps: {
      attributes: {
         class: 'prose prose-invert prose-lg max-w-none focus:outline-none min-h-[calc(100vh-200px)] p-4 text-foreground selection:bg-blue-300 selection:text-black',
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
      },
    },
    onUpdate: ({ editor }) => {
      // Debounce updates by 300ms to avoid locking the UI during fast typing
      const win = window as Window & { _lawzyEditorUpdateTimeout?: number }
      if (win._lawzyEditorUpdateTimeout) {
        clearTimeout(win._lawzyEditorUpdateTimeout)
      }
      win._lawzyEditorUpdateTimeout = window.setTimeout(() => {
        const json = editor.getJSON()
        setContent(json)
        setEditorContent(json)
        if (!initialLoadRef.current) {
          setIsDirty(true)
        }
      }, 300)
    },
  })

  const handleSaveDraftToDb = useCallback(async (status: 'draft' | 'completed' = 'draft') => {
    if (!isAuthenticated) {
      handleAuthRequired()
      toast.error(t('toast_login_required'))
      return
    }

    try {
      flushMergeFieldDrafts()
      const persistedMergeValues = useEditorStore.getState().mergeFieldValues
      if (resolvedParams.id === 'new') {
        const sourceMetadata = useEditorStore.getState().metadata
        const created = await api.post<Record<string, unknown>>('/documents', {
          title: documentTitle || (sourceMetadata?.title as string | undefined) || 'Hợp đồng',
          type: (sourceMetadata?.type as string | undefined) ?? 'contract',
          ...(workspaceId && { workspaceId }),
          contentJSON: editorContent,
          metadata: sourceMetadata,
          mergeFieldValues: persistedMergeValues,
          status,
        })
        const newId = String((created as { id?: unknown }).id ?? '')
        if (!newId) throw new Error('Failed to create document')

        if (chatMessages && chatMessages.length > 0) {
          for (const m of chatMessages) {
            await api.post(`/documents/${newId}/chat-messages`, {
              role: m.role,
              content: m.content,
              metadata: { migratedFromGuest: true },
            }).catch(e => console.error(e))
          }
        }
        clearSession()

        setIsDirty(false)
        toast.success(t('toast_saved'))

        if (pendingUrl) {
          router.push(pendingUrl)
        } else {
          router.replace(`/editor/${newId}`)
        }
        return
      }

      await api.patch(`/documents/${resolvedParams.id}`, {
        title: documentTitle,
        status,
        contentJSON: editorContent,
        mergeFieldValues: persistedMergeValues,
        metadata: useEditorStore.getState().metadata,
      })

      setIsDirty(false)
      toast.success(t('toast_saved'))
      if (pendingUrl) {
        router.push(pendingUrl)
      }
    } catch (e) {
      console.error(e)
      toast.error(t('toast_save_failed'))
    }
  }, [isAuthenticated, handleAuthRequired, resolvedParams.id, workspaceId, documentTitle, editorContent, pendingUrl, router])
  // Note: workspaceId kept in deps as it's still used (passed when available)

  const { isActive: isTourActive } = useOnboardingStore()

  useNavigationGuard(isDirty && !isTourActive, () => {
    setShowSaveDraftModal(true)
  })

  const autoSaveTriggeredRef = useRef(false)

  // Migrates the guest draft silently to a real database document once authenticated and tour finishes
  useEffect(() => {
    if (
      isAuthenticated &&
      resolvedParams.id === 'new' &&
      guestRestoredRef.current &&
      !isTourActive &&
      !autoSaveTriggeredRef.current
    ) {
      if (editorContent && editorContent.content && editorContent.content.length > 0) {
        autoSaveTriggeredRef.current = true
        handleSaveDraftToDb('draft')
      }
    }
  }, [isAuthenticated, resolvedParams.id, isTourActive, editorContent, handleSaveDraftToDb])

  // Sync editor content (defer to macrotask to avoid flushSync during React render)
  useEffect(() => {
    if (!editor || !editorContent || JSON.stringify(editorContent) === JSON.stringify(editor.getJSON())) return
    const pending = editorContent
    const wasInitial = initialLoadRef.current
    const id = setTimeout(() => {
      if (!editor) return
      if (JSON.stringify(pending) !== JSON.stringify(editor.getJSON())) {
        editor.commands.setContent(pending)
      }
      // Clear initial-load flag AFTER the onUpdate debounce (300ms) has had time to fire,
      // so the first content sync never marks the document as dirty.
      if (wasInitial) {
        setTimeout(() => {
          initialLoadRef.current = false
        }, 350)
      }
    }, 0)
    return () => clearTimeout(id)
  }, [editorContent, editor])

  // Add click handler for guest users when they click on editor content
  useEffect(() => {
    if (!editor || isAuthenticated) return

    const handleEditorClick = () => {
      // Check if guest has generated content
      if (isCanvasMode && editorContent && editorContent.content && editorContent.content.length > 1) {
        // Check if content is more than just default empty content
        const hasRealContent = editorContent.content.some((node: JSONContent) => {
          if (node.type === 'heading' && node.content && Array.isArray(node.content) && node.content.length > 0) {
            const text = node.content.find((c: JSONContent) => c.type === 'text' && 'text' in c && typeof c.text === 'string' && c.text.trim())
            return text && typeof text.text === 'string' && text.text.trim() !== 'HỢP ĐỒNG MỚI'
          }
          return false
        })
        if (hasRealContent) {
          handleAuthRequired()
        }
      }
    }

    const editorElement = editor.view.dom
    editorElement.addEventListener('click', handleEditorClick)

    return () => {
      editorElement.removeEventListener('click', handleEditorClick)
    }
  }, [editor, isAuthenticated, isCanvasMode, editorContent, handleAuthRequired])

  // Autosave authenticated documents (update live document, versions are manual)
  useEffect(() => {
    if (!isAuthenticated) return
    if (resolvedParams.id === 'new') return
    if (initialLoadRef.current) return

    const t = setTimeout(() => {
      flushMergeFieldDrafts()
      const persistedMergeValues = useEditorStore.getState().mergeFieldValues
      api
        .patch(`/documents/${resolvedParams.id}`, {
          title: documentTitle,
          contentJSON: editorContent,
          mergeFieldValues: persistedMergeValues,
          metadata: useEditorStore.getState().metadata,
        })
        .then(() => {
          setIsDirty(false)
        })
        .catch((e) => {
          console.error(e)
        })
    }, 800)

    return () => clearTimeout(t)
  }, [isAuthenticated, resolvedParams.id, editorContent, mergeFieldValues, documentTitle])

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.error(t('toast_login_required'))
      return
    }

    setSaving(true)
    try {
      flushMergeFieldDrafts()
      const persistedMergeValues = useEditorStore.getState().mergeFieldValues
      if (resolvedParams.id === 'new') {
        const sourceMetadata = useEditorStore.getState().metadata
        const created = await api.post<Record<string, unknown>>('/documents', {
          title: documentTitle || sourceMetadata?.title || 'Hợp đồng',
          type: sourceMetadata?.type ?? 'contract',
          ...(workspaceId && { workspaceId }),
          contentJSON: editorContent,
          metadata: sourceMetadata,
          mergeFieldValues: persistedMergeValues,
        })
        const newId = String((created as { id?: unknown }).id ?? '')
        if (!newId) throw new Error('Failed to create draft')

        // Migrate chat messages to the new document
        if (chatMessages && chatMessages.length > 0) {
          for (const m of chatMessages) {
            await api.post(`/documents/${newId}/chat-messages`, {
              role: m.role,
              content: m.content,
              metadata: { migratedFromGuest: true },
            }).catch(e => console.error(e))
          }
        }

        clearSession()
        toast.success(t('toast_draft_saved'))
        router.replace(`/editor/${newId}`)
        return
      }

      const now = new Date()
      await api.post(`/documents/${resolvedParams.id}/versions`, {
        contentJSON: editorContent,
        mergeFieldValues: persistedMergeValues,
        chatCursorAt: now.toISOString(),
        label: `Lưu bản nháp (${now.toLocaleString('vi-VN')})`,
      })
      window.dispatchEvent(new Event('lawzy:refresh-versions'))
      setLastSaved(now.toISOString())
      setIsDirty(false)
      toast.success(t('toast_version_saved'))
    } catch (e) {
      console.error(e)
      toast.error(t('toast_version_save_failed'))
    } finally {
      setSaving(false)
    }
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

    // Persist user message (best-effort)
    if (isAuthenticated && resolvedParams.id !== 'new') {
      api.post(`/documents/${resolvedParams.id}/chat-messages`, {
        role: 'user',
        content: message,
        metadata: attachedFile ? { attachedFileName: attachedFile.name } : undefined,
      }).catch((e) => console.error(e))
    }

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
        toast.error(t('toast_extract_failed'))
      }
      setAttachedFile(null)
    }


    await new Promise((r) => setTimeout(r, 300))
    await new Promise((r) => setTimeout(r, 200))

    try {
      const existingContentText = editorContentToPlainText(editorContent)
      // Send previous chat turns (exclude the current message just added) for conversational context
      const previousMessages = chatMessages
        .filter((m) => m.id !== userMessage.id && (m.role === 'user' || m.role === 'assistant'))
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: message,
          locale,
          metadata: {
            contractType: 'general',
          },
          workspaceId,
          existingContent: existingContentText || undefined,
          mergeFieldValues: Object.keys(mergeFieldValues).length > 0 ? mergeFieldValues : undefined,
          attachedSources,
          chatHistory: previousMessages.length > 0 ? previousMessages : undefined,
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
        aiContent = buildContractSummaryMessage(genResult, locale)

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
        updateMetadata({ title: genResult.content.title || documentTitle })
        setIsCanvasMode(true)
      } else if (result.type === 'error') {
        aiContent = result.message || 'Hệ thống chỉ hỗ trợ các nghiệp vụ liên quan đến soạn thảo và phân tích hợp đồng, pháp lý.'
      } else {
        // Handle other types or generic response
        aiContent = JSON.stringify(result, null, 2)
      }

      const aiMessage: ChatMessage & { isError?: boolean } = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date(),
        isStreaming: false,
        isError: result.type === 'error',
        hasContract: result.type === 'contract_generation',
        ...(result.type === 'contract_generation' && {
          thinking: getSimulatedThinking(result as ContractGenerationResult, locale),
        }),
      }
      
      setChatMessages((prev) => [...prev, aiMessage])

      // Persist assistant message (best-effort)
      if (isAuthenticated && resolvedParams.id !== 'new') {
        api.post(`/documents/${resolvedParams.id}/chat-messages`, {
          role: 'assistant',
          content: aiContent,
          metadata: aiMessage.thinking ? { thinking: aiMessage.thinking, hasContract: aiMessage.hasContract } : { hasContract: aiMessage.hasContract },
        }).catch((e) => console.error(e))
      }

    } catch (error) {
      console.error('Error generating contract:', error)
      toast.error(t('toast_generate_error'))
      setThinkingProgress([])
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('toast_ai_error'),
        timestamp: new Date(),
        isError: true,
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
          <div id="tour-editor-chat" className={cn(
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
              userDisplayName={useAuthStore.getState().user?.name}
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
                  onChangeTitle={(val) => {
                    updateMetadata({ title: val })
                    setIsDirty(true)
                  }}
                  // onClose={() => setIsCanvasMode(false)}
                  onRun={() => toast.info("Đang kiểm tra...")}
                  isCode={false}
                  toolsPanelOpen={toolsPanelOpen}
                  onToggleTools={() => setToolsPanelOpen((v) => !v)}
                  onSave={handleSave}
                />
              </div>

              {toolsPanelOpen && (
                <div className="w-[30%] h-full min-h-0 min-w-[250px] max-w-[400px] shrink-0 flex flex-col overflow-hidden">
                  <RightPanel
                    editor={editor}
                    onAuthRequired={handleAuthRequired}
                    workspaceId={workspaceId ?? undefined}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Auth Modal for guest users */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={() => {
          // Auth state update will be handled by auth store effects; just close modal.
          setShowAuthModal(false)
          setToolsPanelOpen(true)
        }}
      />

      <SaveDraftModal
        open={showSaveDraftModal}
        onOpenChange={setShowSaveDraftModal}
        onSave={(status) => {
          void handleSaveDraftToDb(status)
          setShowSaveDraftModal(false)
        }}
        onDiscard={() => {
          setIsDirty(false)
          setShowSaveDraftModal(false)
          // Navigation is handled by the browser if it was a link click,
          // but our hook prevented it. We should probably trigger it manually if needed.
          // For simplicity, we just let them click again or use a pending URL if we captured it.
          const anchor = document.activeElement as HTMLAnchorElement
          if (anchor && anchor.href) {
             window.location.href = anchor.href
          }
        }}
      />
    </div>
  )
}
