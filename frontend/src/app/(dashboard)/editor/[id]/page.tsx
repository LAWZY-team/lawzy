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
import { Indent } from '@/lib/tiptap/extensions/indent'
import { ResizableImageExtension } from '@/lib/tiptap/extensions/resizable-image'
import { ChatColumn, type ChatMessage } from '@/components/editor/chat-column'
import { CanvasEditor } from '@/components/editor/canvas-editor'
import { RightPanel } from '@/components/editor/right-panel'
import { EditorLeftWorkspace } from '@/components/editor/editor-left-workspace'
import { useSidebar } from '@/components/ui/sidebar'
import { useEditorStore, type TemplateMergeField } from '@/stores/editor-store'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useUserFieldsStore } from '@/stores/user-fields-store'
import type { Template } from '@/types/template'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceFields } from '@/hooks/workspaces/use-workspace-fields'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { useGuestEditorSessionStore } from '@/stores/guest-editor-session-store'
import { AuthModal } from '@/components/editor/auth-modal'
import { api } from '@/lib/api/client'
import { getStructuredContractTemplate } from '@/lib/api/contract-templates'
import { templateContentToEditorContent } from '@/lib/template-content-to-editor'
import { normalizeTipTapDocContent } from '@/lib/editor/normalize-tiptap-content'
import { editorContentToPlainText } from '@/lib/editor-content-to-text'
import type { DocContent } from '@/types/template'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  type ContractGenerationResult,
  buildContractSummaryMessage,
  buildThinkingFromToolCalls,
  TOOL_NAME_LABELS_IN_PROGRESS,
} from '@/lib/editor/contract-result'
import type { QuestionnaireSchema, IntakeQuestionnaireResult } from '@/types/questionnaire'
import { findContractType, type ContractTypeId } from '@/lib/editor/contract-questionnaires'
import { type WizardFormStep } from '@/lib/editor/contract-wizard-config'
import { ContractWizard } from '@/components/editor/chat/contract-wizard'
import type { WizardOutputLanguage } from '@/components/editor/chat/contract-wizard'
import { contractResultToTipTapContent } from '@/lib/editor/result-to-tiptap-content'
import { resolveMergeFieldValue } from '@/lib/editor/merge-field-aliases'
import { useThinkingProgress } from '@/hooks/use-thinking-progress'
import { useNavigationGuard } from '@/hooks/use-navigation-guard'
import { useQueryClient } from '@tanstack/react-query'
import { SaveDraftModal } from '@/components/editor/save-draft-modal'
import { flushMergeFieldDrafts } from '@/lib/editor/flush-merge-field-drafts'
import { useT } from '@/components/i18n-provider'

// Template type alias for editor usage
type EditorTemplate = Template
type EditorMetadata = ReturnType<typeof useEditorStore.getState>['metadata']

interface PendingEditorBootstrap {
  documentId: string
  editorContent: JSONContent
  metadata: EditorMetadata
  mergeFieldValues: Record<string, string>
  templateMergeFields: TemplateMergeField[] | null
  chatMessages: ChatMessage[]
}

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

const getDefaultContent = (defaultTitle: string): JSONContent => ({
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: defaultTitle }] },
    { type: 'paragraph' },
  ],
})

export default function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{
    template?: string
    draft?: string
    contractTemplate?: string
    contractTemplateScope?: string
  }>
}) {
  const router = useRouter()
  const resolvedParams = use(params)
  const resolvedSearchParams = use(
    searchParams ??
      (Promise.resolve({}) as Promise<{
        template?: string
        draft?: string
        contractTemplate?: string
        contractTemplateScope?: string
      }>),
  )
  const templateId = typeof resolvedSearchParams.template === 'string' ? resolvedSearchParams.template : undefined
  const contractTemplateId =
    typeof resolvedSearchParams.contractTemplate === 'string'
      ? resolvedSearchParams.contractTemplate
      : undefined
  const contractTemplateScope =
    resolvedSearchParams.contractTemplateScope === 'internal' ? 'internal' : 'community'
  const isTemplateEntry = !!templateId || !!contractTemplateId
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
  const queryClient = useQueryClient()
  const { data: workspaceFields = [] } = useWorkspaceFields(workspaceId ?? null)

  // Ensure we always have a default workspace selected (first workspace)
  useEffect(() => {
    if (!currentWorkspace) {
      fetchWorkspaces().catch((err) => {
        console.error('Failed to load workspaces for editor', err)
      })
    }
  }, [currentWorkspace, fetchWorkspaces])

  // Handle document ID locally to avoid Next.js unmounting when navigating from /editor/new
  const [managedId, setManagedId] = useState(resolvedParams.id)
  const [showLeftWorkspace, setShowLeftWorkspace] = useState(resolvedParams.id === 'new')

  // Mặc định: chỉ mở canvas khi đã có document id (editor/{id}); /editor/new bắt đầu ở chế độ chat
  const [isCanvasMode, setIsCanvasMode] = useState(managedId !== 'new')
  const prevCanvasModeRef = useRef(isCanvasMode)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [toolsPanelOpen, setToolsPanelOpen] = useState(true)
  const [leftWorkspaceMode, setLeftWorkspaceMode] = useState<'chat' | 'templates'>('chat')

  // Chỉ thu gọn sidebar khi vừa chuyển sang canvas (false → true); nếu user tự mở lại sidebar thì không ép đóng
  useEffect(() => {
    const justEnteredCanvas = !prevCanvasModeRef.current && isCanvasMode
    prevCanvasModeRef.current = isCanvasMode
    if (justEnteredCanvas) setSidebarOpen(false)
  }, [isCanvasMode, setSidebarOpen])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [editorContent, setEditorContent] = useState<JSONContent>(() =>
    getDefaultContent(t("editor_default_title")),
  )
  const documentTitle = metadata.title || t("editor_untitled")
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const thinkingProgress = useThinkingProgress(isGenerating)[0]
  const setThinkingProgress = useThinkingProgress(isGenerating)[1]
  const guestRestoredRef = useRef(false)
  const initialLoadRef = useRef(true)
  const pendingEditorBootstrapRef = useRef<PendingEditorBootstrap | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false)
  const [pendingUrl] = useState<string | null>(null)
  const [activeQuestionnaire, setActiveQuestionnaire] = useState<QuestionnaireSchema | null>(null)
  const [wizardContractTypeId, setWizardContractTypeId] = useState<ContractTypeId | null>(null)
  const [isWizardSubmitting, setIsWizardSubmitting] = useState(false)
  const contentErrorRecoveryRef = useRef(false)

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
    if (managedId !== 'new' || isTemplateEntry) return

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
    managedId,
    isTemplateEntry,
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
    if (managedId === 'new' && isCanvasMode && !isTemplateEntry) {
      const interval = setInterval(() => {
        const isLoggingOut = (wasAuthRef.current && !useAuthStore.getState().isAuthenticated) || typeof window !== 'undefined' && (window as Window & { __isLoggingOut?: boolean }).__isLoggingOut;
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
          const isLoggingOut = (wasAuthRef.current && !useAuthStore.getState().isAuthenticated) || (typeof window !== 'undefined' && (window as Window & { __isLoggingOut?: boolean }).__isLoggingOut);
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
  }, [managedId, isCanvasMode, isTemplateEntry, editorContent, documentTitle, mergeFieldValues, chatMessages, saveSession])

  // Handle auth requirement for guest actions
  const handleAuthRequired = useCallback(() => {
    if (!isAuthenticated) {
      setShowAuthModal(true)
      return true // Return true to indicate auth is required
    }
    return false
  }, [isAuthenticated])

  const applyTemplateState = useCallback((params: {
    title: string
    type: string
    contentJSON: DocContent
    mergeFields: Array<{ fieldKey: string; label: string; sampleValue?: string }>
  }) => {
    initialLoadRef.current = true
    setCurrentDocument(null)
    setChatMessages([])
    const tipTapContent = normalizeTipTapDocContent(
      templateContentToEditorContent(params.contentJSON),
    )
    setEditorContent(tipTapContent)
    updateMetadata({
      title: params.title,
      type: params.type,
      tags: [],
      riskLevel: 'low',
      visibility: 'workspace',
      status: undefined,
      creator: undefined,
    })
    const normalizedFields: TemplateMergeField[] = params.mergeFields.map((field) => ({
      fieldKey: field.fieldKey,
      label: field.label,
      sampleValue: field.sampleValue,
    }))
    setTemplateMergeFields(normalizedFields)
    setMergeFieldValues(
      Object.fromEntries(
        normalizedFields.map((field) => [field.fieldKey, field.sampleValue ?? '']),
      ),
    )
    setIsCanvasMode(true)
  }, [setCurrentDocument, setMergeFieldValues, setTemplateMergeFields, updateMetadata])

  const applyDocumentBootstrap = useCallback((bootstrap: PendingEditorBootstrap) => {
    initialLoadRef.current = true
    setCurrentDocument(bootstrap.documentId)
    setTemplateMergeFields(bootstrap.templateMergeFields)
    setMergeFieldValues(bootstrap.mergeFieldValues)
    setEditorContent(bootstrap.editorContent)
    updateMetadata(bootstrap.metadata)
    setChatMessages(bootstrap.chatMessages)
    setIsCanvasMode(true)
  }, [setCurrentDocument, setMergeFieldValues, setTemplateMergeFields, updateMetadata])

  const resetTemplateEntryState = useCallback(() => {
    initialLoadRef.current = true
    setTemplateMergeFields(null)
    setMergeFieldValues({})
    setChatMessages([])
    setEditorContent(getDefaultContent(t("editor_default_title")))
  }, [setMergeFieldValues, setTemplateMergeFields, t])

  const applyContractTemplateById = useCallback(async (
    templateIdToLoad: string,
    scope: 'community' | 'internal',
  ) => {
    resetTemplateEntryState()
    const template = await getStructuredContractTemplate({
      id: templateIdToLoad,
      scope,
    })
    if (!template?.contentJSON) return
    applyTemplateState({
      title: template.title,
      type: 'contract',
      contentJSON: template.contentJSON as DocContent,
      mergeFields: template.mergeFields ?? [],
    })
  }, [applyTemplateState, resetTemplateEntryState])

  const applySystemTemplateById = useCallback(async (templateIdToLoad: string) => {
    resetTemplateEntryState()
    const template = await api.get<EditorTemplate>(`/templates/${templateIdToLoad}`)
    if (!template?.contentJSON) return
    applyTemplateState({
      title: template.title,
      type: template.category ?? 'contract',
      contentJSON: template.contentJSON as DocContent,
      mergeFields: (template.mergeFields ?? []) as Array<{ fieldKey: string; label: string; sampleValue?: string }>,
    })
  }, [applyTemplateState, resetTemplateEntryState])

  useEffect(() => {
    let cancelled = false
    if (managedId !== 'new') {
      // If we just saved and transitioned smoothly, we already have the state.
      if (useEditorStore.getState().currentDocumentId === managedId && !initialLoadRef.current) {
        return
      }

      const pendingBootstrap = pendingEditorBootstrapRef.current
      if (pendingBootstrap?.documentId === managedId) {
        pendingEditorBootstrapRef.current = null
        applyDocumentBootstrap(pendingBootstrap)
        return () => {
          cancelled = true
        }
      }
      initialLoadRef.current = true
      api.get<Record<string, unknown>>(`/documents/${managedId}`).then((doc) => {
        if (cancelled) return
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
          const content = normalizeTipTapDocContent(
            isTemplateFormat(raw)
              ? templateContentToEditorContent(raw as DocContent)
              : raw,
          )
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

          const chatMsgs = (doc.chatMessages as Array<{ id: string; role: string; content: string; createdAt: string; metadata?: { toolCalls?: Array<{ name: string; args: Record<string, unknown>; result: unknown }>; thinking?: string } }>) ?? []
          setChatMessages(chatMsgs.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.createdAt),
            ...(m.metadata?.toolCalls?.length ? { toolCalls: m.metadata.toolCalls } : {}),
            ...(m.metadata?.thinking ? { thinking: m.metadata.thinking } : {}),
          })))
        }
      }).catch(() => {
        if (cancelled) return
        setChatMessages([])
        initialLoadRef.current = false
      })
    } else {
      setCurrentDocument(null)
      if (contractTemplateId) {
        applyContractTemplateById(contractTemplateId, contractTemplateScope).catch(() => {
          if (cancelled) return
        })
      } else if (templateId) {
        applySystemTemplateById(templateId).catch(() => {
          if (cancelled) return
        })
      } else {
        setTemplateMergeFields(null)
        setMergeFieldValues({})
        setEditorContent(getDefaultContent(t("editor_default_title")))
        updateMetadata({ title: t("editor_untitled") })
        // Với /editor/new, bắt đầu ở chế độ chat, chưa mở canvas
        setIsCanvasMode(false)
        setChatMessages([])
        initialLoadRef.current = false
      }
    }
    return () => {
      cancelled = true
    }
  }, [applyContractTemplateById, applyDocumentBootstrap, applySystemTemplateById, contractTemplateId, contractTemplateScope, managedId, setCurrentDocument, setMergeFieldValues, setTemplateMergeFields, templateId, t, updateMetadata])

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
    enableContentCheck: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextStyleKit.configure({
        backgroundColor: false,
        color: {
          types: ['textStyle'],
        },
        lineHeight: false,
        fontFamily: { types: ['textStyle'] },
        fontSize: { types: ['textStyle'] },
      }),
      ResizableImageExtension.configure({
        allowBase64: true,
        inline: false,
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({
        resizable: true,
        lastColumnResizable: false,
        cellMinWidth: 80,
      }),
      TableRow, TableCell, TableHeader,
      Placeholder.configure({
        placeholder: t("editor_placeholder"),
      }),
      Underline,
      MergeFieldExtension,
      Indent,
    ],
    // Always initialize with a known-safe doc; actual data is synchronized in a guarded effect.
    content: getDefaultContent(t("editor_default_title")),
    onContentError: ({ error, editor }) => {
      console.error("Tiptap content schema error", error)
      if (contentErrorRecoveryRef.current) return
      contentErrorRecoveryRef.current = true
      const recovered = normalizeTipTapDocContent(editorContent)
      try {
        editor.commands.setContent(recovered)
        setEditorContent(recovered)
        toast.error(t("toast_generate_error"))
      } catch (recoveryError) {
        console.error("Tiptap content recovery failed", recoveryError)
        const fallback = getDefaultContent(t("editor_default_title"))
        editor.commands.setContent(fallback)
        setEditorContent(fallback)
      } finally {
        setTimeout(() => {
          contentErrorRecoveryRef.current = false
        }, 0)
      }
    },
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

  const handleSaveDraftToDb = useCallback(async (opts: { status: 'draft' | 'completed'; visibility?: 'private' | 'workspace' } | 'draft' | 'completed') => {
    const status = typeof opts === 'string' ? opts : opts.status
    const visibility = typeof opts === 'object' && opts.visibility ? opts.visibility : 'workspace'
    if (!isAuthenticated) {
      handleAuthRequired()
      toast.error(t('toast_login_required'))
      return
    }

    try {
      flushMergeFieldDrafts()
      const persistedMergeValues = useEditorStore.getState().mergeFieldValues
      const sanitizeFileNameLocal = (input: string) =>
        input.replace(/[\/\\?%*:|"<>]/g, '_').trim() || 'document'

      const uploadSnapshot = async (params: {
        documentId: string
        fileName: string
        payload: unknown
      }) => {
        if (!workspaceId) {
          toast.error(t('toast_select_workspace_to_save_file'))
          return
        }

        const blob = new Blob([JSON.stringify(params.payload)], {
          type: 'application/json',
        })

        const form = new FormData()
        form.append(
          'file',
          new File([blob], params.fileName, { type: 'application/json' }),
        )
        form.append('workspaceId', workspaceId)
        form.append('documentId', params.documentId)

        await api.upload('/files/upload-export', form)

        // Refresh storage + document size derived from File(category=export_output).
        queryClient.invalidateQueries({ queryKey: ['files'] })
        queryClient.invalidateQueries({
          queryKey: ['files', 'storage', workspaceId],
        })
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'quota', workspaceId],
        })
        queryClient.invalidateQueries({
          predicate: (q) =>
            Array.isArray(q.queryKey) &&
            q.queryKey.length > 0 &&
            q.queryKey[0] === 'documents',
        })
      }

      if (managedId === 'new') {
        const sourceMetadata = useEditorStore.getState().metadata
        const created = await api.post<Record<string, unknown>>('/documents', {
          title: documentTitle || (sourceMetadata?.title as string | undefined) || t("docs_default_title"),
          type: (sourceMetadata?.type as string | undefined) ?? 'contract',
          ...(workspaceId && { workspaceId }),
          contentJSON: editorContent,
          metadata: sourceMetadata,
          mergeFieldValues: persistedMergeValues,
          status,
          visibility,
        })
        const newId = String((created as { id?: unknown }).id ?? '')
        if (!newId) throw new Error('Failed to create document')

        if (chatMessages && chatMessages.length > 0) {
          for (const m of chatMessages) {
            await api.post(`/documents/${newId}/chat-messages`, {
              role: m.role,
              content: m.content,
              metadata: {
                migratedFromGuest: true,
                ...(m.toolCalls?.length ? { toolCalls: m.toolCalls } : {}),
              },
            }).catch((e) => console.error(e))
          }
        }

        // Persist draft snapshot to S3/R2 immediately so storage usage counts now.
        try {
          await uploadSnapshot({
            documentId: newId,
            fileName: `${sanitizeFileNameLocal(
              documentTitle || (sourceMetadata?.title as string | undefined) || 'draft',
            )}-draft-${newId}.json`,
            payload: {
              kind: 'document-draft-snapshot',
              documentId: newId,
              savedAt: new Date().toISOString(),
              title: documentTitle || sourceMetadata?.title,
              type: sourceMetadata?.type ?? 'contract',
              status,
              visibility,
              contentJSON: editorContent,
              metadata: sourceMetadata,
              mergeFieldValues: persistedMergeValues,
            },
          })
        } catch (e) {
          console.error('Draft snapshot upload failed', e)
          toast.error(t('toast_file_upload_failed'))
        }

        clearSession()

        setIsDirty(false)
        setManagedId(newId)
        setShowLeftWorkspace(true)
        setCurrentDocument(newId)

        toast.success(t('toast_saved'))

        if (pendingUrl) {
          router.push(pendingUrl)
        } else {
          // Use replaceState to update URL without triggering Next.js page remount
          window.history.replaceState(null, '', `/editor/${newId}`)
        }
        return
      }

      await api.patch(`/documents/${managedId}`, {
        title: documentTitle,
        status,
        visibility,
        contentJSON: editorContent,
        mergeFieldValues: persistedMergeValues,
        metadata: useEditorStore.getState().metadata,
      })

      // Persist version snapshot to S3/R2 immediately so storage usage counts now.
      try {
        await uploadSnapshot({
          documentId: managedId,
          fileName: `${sanitizeFileNameLocal(documentTitle || 'document')}-draft-${managedId}.json`,
          payload: {
            kind: 'document-draft-snapshot',
            documentId: managedId,
            savedAt: new Date().toISOString(),
            title: documentTitle,
            status,
            visibility,
            contentJSON: editorContent,
            metadata: useEditorStore.getState().metadata,
            mergeFieldValues: persistedMergeValues,
          },
        })
      } catch (e) {
        console.error('Draft snapshot upload failed', e)
        toast.error(t('toast_file_upload_failed'))
      }

      setIsDirty(false)
      toast.success(t('toast_saved'))
      if (pendingUrl) {
        router.push(pendingUrl)
      }
    } catch (e) {
      console.error(e)
      toast.error(t('toast_save_failed'))
    }
  }, [isAuthenticated, handleAuthRequired, managedId, workspaceId, documentTitle, editorContent, chatMessages, clearSession, pendingUrl, router, t, queryClient, setCurrentDocument])

  const { isActive: isTourActive } = useOnboardingStore()

  useNavigationGuard(isDirty && !isTourActive, () => {
    setShowSaveDraftModal(true)
  })

  const autoSaveTriggeredRef = useRef(false)

  // Migrates the guest draft silently to a real database document once authenticated and tour finishes
  useEffect(() => {
    if (
      isAuthenticated &&
      managedId === 'new' &&
      !isTemplateEntry &&
      guestRestoredRef.current &&
      !isTourActive &&
      !autoSaveTriggeredRef.current
    ) {
      if (editorContent && editorContent.content && editorContent.content.length > 0) {
        autoSaveTriggeredRef.current = true
        handleSaveDraftToDb('draft')
      }
    }
  }, [isAuthenticated, managedId, isTemplateEntry, isTourActive, editorContent, handleSaveDraftToDb])

  // Sync editor content (defer to macrotask to avoid flushSync during React render)
  useEffect(() => {
    if (!editor || !editorContent || JSON.stringify(editorContent) === JSON.stringify(editor.getJSON())) return
    const pending = editorContent
    const wasInitial = initialLoadRef.current
    const id = setTimeout(() => {
      if (!editor) return
      if (JSON.stringify(pending) !== JSON.stringify(editor.getJSON())) {
        const normalized = normalizeTipTapDocContent(pending)
        try {
          editor.commands.setContent(normalized)
        } catch (error) {
          console.error('Failed to set editor content safely', error)
          // Keep current editor state instead of clearing canvas to avoid blank screen.
        }
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
            return text && typeof text.text === 'string' && text.text.trim() !== t("editor_default_title")
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
  }, [editor, isAuthenticated, isCanvasMode, editorContent, handleAuthRequired, t])

  // Autosave authenticated documents (update live document, versions are manual)
  useEffect(() => {
    if (!isAuthenticated) return
    if (managedId === 'new') return
    if (initialLoadRef.current) return

    const timeoutId = setTimeout(() => {
      flushMergeFieldDrafts()
      const persistedMergeValues = useEditorStore.getState().mergeFieldValues
      api
        .patch(`/documents/${managedId}`, {
          title: documentTitle,
          contentJSON: editorContent,
          mergeFieldValues: persistedMergeValues,
          metadata: useEditorStore.getState().metadata,
        })
        .then(() => {
          setIsDirty(false)
        })
      .catch((err) => {
        console.error(err)
      })
    }, 800)

    return () => clearTimeout(timeoutId)
  }, [isAuthenticated, managedId, editorContent, mergeFieldValues, documentTitle])

  const sanitizeFileName = (input: string) =>
    input.replace(/[\/\\?%*:|"<>]/g, '_').trim() || 'document'

  const persistDraftSnapshotToS3 = async (opts: {
    documentId: string
    workspaceId?: string | null
    fileName: string
    payload: unknown
  }) => {
    const resolvedWorkspaceId =
      opts.workspaceId ??
      workspaceId ??
      (
        await api.get<{ workspaceId?: string }>(
          `/documents/${opts.documentId}`,
        )
      )?.workspaceId

    if (!resolvedWorkspaceId) {
      throw new Error('Missing workspaceId for storage upload')
    }

    const blob = new Blob([JSON.stringify(opts.payload)], {
      type: 'application/json',
    })

    const form = new FormData()
    form.append(
      'file',
      new File([blob], opts.fileName, { type: 'application/json' }),
    )
    form.append('workspaceId', resolvedWorkspaceId)
    form.append('documentId', opts.documentId)

    await api.upload('/files/upload-export', form)

    // Ensure storage UI + quota charts update immediately.
    queryClient.invalidateQueries({ queryKey: ['files'] })
    queryClient.invalidateQueries({
      queryKey: ['files', 'storage', resolvedWorkspaceId],
    })
    queryClient.invalidateQueries({
      queryKey: ['dashboard', 'quota', resolvedWorkspaceId],
    })
    // Documents list uses a separate query key: ['documents', ...]
    // so we need to invalidate it to reflect the increased documentSizeBytes.
    queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey.length > 0 &&
        q.queryKey[0] === 'documents',
    })
  }

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.error(t('toast_login_required'))
      return
    }

    setSaving(true)
    try {
      flushMergeFieldDrafts()
      const persistedMergeValues = useEditorStore.getState().mergeFieldValues
      if (managedId === 'new') {
        const sourceMetadata = useEditorStore.getState().metadata
        const created = await api.post<Record<string, unknown>>('/documents', {
          title: documentTitle || sourceMetadata?.title || t("docs_default_title"),
          type: sourceMetadata?.type ?? 'contract',
          ...(workspaceId && { workspaceId }),
          contentJSON: editorContent,
          metadata: sourceMetadata,
          mergeFieldValues: persistedMergeValues,
        })
        const newId = String((created as { id?: unknown }).id ?? '')
        if (!newId) throw new Error('Failed to create draft')

        if (chatMessages && chatMessages.length > 0) {
          for (const m of chatMessages) {
            await api.post(`/documents/${newId}/chat-messages`, {
              role: m.role,
              content: m.content,
              metadata: {
                migratedFromGuest: true,
                ...(m.toolCalls?.length ? { toolCalls: m.toolCalls } : {}),
              },
            }).catch((e) => console.error(e))
          }
        }

        // Persist draft snapshot to S3/R2 immediately so storage usage counts now.
        try {
          const createdWorkspaceId = String(
            (created as { workspaceId?: unknown }).workspaceId ??
              workspaceId ??
              '',
          )
          await persistDraftSnapshotToS3({
            documentId: newId,
            workspaceId: createdWorkspaceId || workspaceId,
            fileName: `${sanitizeFileName(documentTitle || (sourceMetadata?.title as string | undefined) || 'draft')}-draft-${newId}.json`,
            payload: {
              kind: 'document-draft-snapshot',
              documentId: newId,
              savedAt: new Date().toISOString(),
              title: documentTitle || sourceMetadata?.title,
              type: sourceMetadata?.type ?? 'contract',
              contentJSON: editorContent,
              metadata: sourceMetadata,
              mergeFieldValues: persistedMergeValues,
            },
          })
        } catch (e) {
          console.error('Draft snapshot upload failed', e)
          toast.error(t('toast_file_upload_failed'))
        }

        clearSession()
        setManagedId(newId)
        setShowLeftWorkspace(true)
        setCurrentDocument(newId)
        setIsDirty(false)
        toast.success(t('toast_draft_saved'))
        window.history.replaceState(null, '', `/editor/${newId}`)
        return
      }

      const now = new Date()
      const versionLabel = t("version_save_label", {
        date: now.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US'),
      })
      const createdVersion = await api.post(`/documents/${managedId}/versions`, {
        contentJSON: editorContent,
        mergeFieldValues: persistedMergeValues,
        chatCursorAt: now.toISOString(),
        label: versionLabel,
      })
      const versionId = String(
        (createdVersion as { id?: unknown }).id ?? '',
      ).trim()

      // Persist version snapshot to S3/R2 immediately so storage usage counts now.
      try {
        await persistDraftSnapshotToS3({
          documentId: managedId,
          workspaceId: workspaceId ?? null,
          fileName: `${sanitizeFileName(documentTitle || 'document')}${versionId ? `-v-${versionId}` : `-v-${now.getTime()}`}-${managedId}.json`,
          payload: {
            kind: 'document-version-snapshot',
            documentId: managedId,
            versionId: versionId || undefined,
            savedAt: now.toISOString(),
            label: versionLabel,
            contentJSON: editorContent,
            metadata: useEditorStore.getState().metadata,
            mergeFieldValues: persistedMergeValues,
            chatCursorAt: now.toISOString(),
          },
        })
      } catch (e) {
        console.error('Version snapshot upload failed', e)
        toast.error(t('toast_file_upload_failed'))
      }
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
  const handleSendMessage = useCallback(async (
    message: string,
    options?: { preferredOutputLanguage?: WizardOutputLanguage }
  ) => {
    const hasFile = !!attachedFile
    const effectiveMessage = message.trim() || (hasFile ? (t('chat_file_only_prompt') || 'Xử lý file đính kèm') : '')
    if (!effectiveMessage) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: effectiveMessage,
      timestamp: new Date(),
      ...(attachedFile && { attachedFileName: attachedFile.name }),
    }
    setChatMessages((prev) => [...prev, userMessage])
    setIsGenerating(true)
    setThinkingProgress([])

    // Persist user message (best-effort)
    if (isAuthenticated && managedId !== 'new') {
      api.post(`/documents/${managedId}/chat-messages`, {
        role: 'user',
        content: effectiveMessage,
        metadata: attachedFile ? { attachedFileName: attachedFile.name } : undefined,
      }).catch((e) => console.error(e))
    }

    let attachedSources: Array<{ fileName: string; text: string }> | undefined
    if (attachedFile) {
      // 1. Upload to storage (tính vào dung lượng) khi đã đăng nhập và có workspace
      if (isAuthenticated && workspaceId) {
        try {
          const uploadForm = new FormData()
          uploadForm.append('file', attachedFile)
          uploadForm.append('workspaceId', workspaceId)
          await api.upload('/files/upload', uploadForm)
          queryClient.invalidateQueries({ queryKey: ['files'] })
          queryClient.invalidateQueries({ queryKey: ['files', 'storage', workspaceId] })
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] })
        } catch (e) {
          console.error('File upload failed', e)
          toast.error(t('toast_file_upload_failed'))
        }
      } else if (isAuthenticated && !workspaceId) {
        toast.error(t('toast_select_workspace_to_save_file'))
      }

      // 2. Extract text để gửi cho AI (PDF, DOC, DOCX, TXT)
      try {
        const form = new FormData()
        form.append('file', attachedFile)
        const extractRes = await fetch('/api/extract-text', { method: 'POST', body: form })
        if (extractRes.ok) {
          const { text } = await extractRes.json()
          attachedSources = [{
            fileName: attachedFile.name,
            text: typeof text === 'string' ? text : '',
          }]
        } else {
          attachedSources = [{
            fileName: attachedFile.name,
            text: `[File đính kèm: ${attachedFile.name} - Không trích xuất được văn bản từ định dạng này.]`,
          }]
        }
      } catch (e) {
        console.error('Extract text failed', e)
        toast.error(t('toast_extract_failed'))
        attachedSources = [{
          fileName: attachedFile.name,
          text: `[File đính kèm: ${attachedFile.name} - Lỗi khi trích xuất nội dung.]`,
        }]
      }
      setAttachedFile(null)
    }


    await new Promise((r) => setTimeout(r, 300))
    await new Promise((r) => setTimeout(r, 200))

    if (isAuthenticated) {
      try {
        await api.post('/ai/deduct-credit', workspaceId ? { workspaceId } : {})
      } catch {
        toast.error(t('toast_ai_no_credit'))
        setIsGenerating(false)
        setThinkingProgress([])
        return
      }
    }

    try {
      const existingContentText = editorContentToPlainText(editorContent)
      const mergeFieldValuesForRequest = useEditorStore.getState().mergeFieldValues
      const previousMessages = chatMessages
        .filter((m) => m.id !== userMessage.id && (m.role === 'user' || m.role === 'assistant'))
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          ...(m.toolCalls?.length ? { toolCalls: m.toolCalls } : {}),
        }))

      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userMessage: effectiveMessage,
          locale,
          preferredOutputLanguage: options?.preferredOutputLanguage,
          workspaceId: workspaceId ?? undefined,
          documentId: managedId !== 'new' ? managedId : undefined,
          mergeFieldValues:
            Object.keys(mergeFieldValuesForRequest).length > 0 ? mergeFieldValuesForRequest : undefined,
          existingContent: existingContentText || undefined,
          attachedSources,
          chatHistory: previousMessages.length > 0 ? previousMessages : undefined,
          metadata: { contractType: 'general' },
          stream: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("API Error:", errorData)
        throw new Error(errorData.error || `Error ${response.status}: Failed to generate contract`)
      }

      let result: Record<string, unknown> | undefined

      const contentType = response.headers.get('Content-Type') ?? ''
      if (contentType.includes('ndjson') || contentType.includes('x-ndjson')) {
        setThinkingProgress(['**Đang kết nối AI...**\nChờ model phân tích và quyết định các bước.'])
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        if (!reader) throw new Error('No response body')
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const ev = JSON.parse(line) as { type?: string; name?: string; text?: string; result?: unknown; message?: string }
              if (ev.type === 'tool' && ev.name) {
                const label = TOOL_NAME_LABELS_IN_PROGRESS[ev.name] || `Đang xử lý ${ev.name}...`
                setThinkingProgress((prev) => [...prev, label])
              } else if (ev.type === 'gemini_thinking' && typeof ev.text === 'string') {
                setThinkingProgress((prev) => [...prev, ev.text as string])
              } else if (ev.type === 'done' && ev.result) {
                result = ev.result as Record<string, unknown>
              } else if (ev.type === 'error' && ev.message) {
                throw new Error(ev.message)
              }
            } catch (e) {
              if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e
            }
          }
        }
        if (buffer.trim()) {
          try {
            const ev = JSON.parse(buffer) as { type?: string; result?: unknown; message?: string }
            if (ev.type === 'done' && ev.result) result = ev.result as Record<string, unknown>
            else if (ev.type === 'error' && ev.message) throw new Error(ev.message)
          } catch (e) {
            if (e instanceof Error && !e.message.includes('JSON')) throw e
          }
        }
        if (!result) throw new Error('No result from stream')
      } else {
        result = (await response.json()) as Record<string, unknown>
      }

      const finalResult = result
      let aiContent = ''

      if (finalResult.type === 'contract_generation') {
        const genResult = finalResult as unknown as ContractGenerationResult
        const geminiMessage = typeof finalResult.message === 'string' ? finalResult.message.trim() : ''
        aiContent = geminiMessage || buildContractSummaryMessage(genResult, locale)

        const mfvSnapshot = useEditorStore.getState().mergeFieldValues

        const { content: newContent, allMergeKeys } = contractResultToTipTapContent(genResult, {
          mergeKeyToLabel,
          mergeFieldValues: mfvSnapshot,
        })

        let mergedForSave: Record<string, string> = mfvSnapshot
        if (allMergeKeys.size > 0) {
          setTemplateMergeFields(
            Array.from(allMergeKeys).map((key) => ({
              fieldKey: key,
              label: mergeKeyToLabel(key),
              sampleValue: resolveMergeFieldValue(key, mfvSnapshot) || mfvSnapshot[key] || '',
            }))
          )
          mergedForSave = {
            ...mfvSnapshot,
            ...Object.fromEntries(
              Array.from(allMergeKeys).map((k) => [
                k,
                resolveMergeFieldValue(k, mfvSnapshot) || mfvSnapshot[k] || '',
              ])
            ),
          }
          setMergeFieldValues(mergedForSave)
        }

        const nextTitle = genResult.content.title || documentTitle
        setEditorContent(newContent)
        updateMetadata({ title: nextTitle })
        setIsCanvasMode(true)
        setActiveQuestionnaire(null)

        if (isAuthenticated && managedId !== 'new') {
          flushMergeFieldDrafts()
          try {
            await api.patch(`/documents/${managedId}`, {
              title: nextTitle,
              contentJSON: newContent,
              mergeFieldValues: mergedForSave,
              metadata: useEditorStore.getState().metadata,
            })
            setIsDirty(false)
          } catch (e) {
            console.error('Persist document after contract generation failed', e)
          }
        }
      } else if (finalResult.type === 'intake_questionnaire') {
        const iqResult = finalResult as unknown as IntakeQuestionnaireResult
        const iqMessage = typeof iqResult.message === 'string' ? iqResult.message.trim() : ''
        aiContent = iqMessage || 'Vui lòng điền thông tin bên dưới để tôi soạn hợp đồng chính xác hơn.'
        if (iqResult.questionnaire?.sections?.length) {
          setActiveQuestionnaire(iqResult.questionnaire)
        }
      } else if (finalResult.type === 'contract_review') {
        const reviewMessage = typeof finalResult.message === 'string' ? finalResult.message.trim() : ''
        aiContent = reviewMessage || JSON.stringify(finalResult, null, 2)
      } else if (finalResult.type === 'error') {
        aiContent = (typeof finalResult.message === 'string' ? finalResult.message : null) || t("ai_error_unsupported")
        if (isAuthenticated) {
          api.post('/ai/refund-credit', {}).catch(() => {})
        }
      } else if (finalResult.type === 'text' && typeof finalResult.text === 'string') {
        aiContent = finalResult.text
      } else {
        aiContent = typeof finalResult.text === 'string' ? finalResult.text : JSON.stringify(finalResult, null, 2)
      }

      const toolCalls = finalResult.toolCalls as Array<{ name: string; args: Record<string, unknown>; result: unknown }> | undefined
      const geminiThinking = typeof finalResult.geminiThinking === 'string' ? finalResult.geminiThinking : ''
      const toolThinking = toolCalls?.length ? buildThinkingFromToolCalls(toolCalls, locale) : ''
      const combinedThinking = [toolThinking, geminiThinking].filter(Boolean).join('\n\n')

      const genMeta = finalResult.type === 'contract_generation'
        ? (finalResult as unknown as ContractGenerationResult).metadata
        : undefined

      const aiMessage: ChatMessage & { isError?: boolean } = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date(),
        isStreaming: false,
        isError: finalResult.type === 'error',
        hasContract: finalResult.type === 'contract_generation',
        hasQuestionnaire: finalResult.type === 'intake_questionnaire',
        ...(finalResult.type === 'intake_questionnaire'
          ? { questionnaireSchema: (finalResult as unknown as IntakeQuestionnaireResult).questionnaire }
          : {}),
        ...(toolCalls?.length ? { toolCalls } : {}),
        ...(combinedThinking ? { thinking: combinedThinking } : {}),
        ...(genMeta?.sourceCitations?.length ? { sourceCitations: genMeta.sourceCitations } : {}),
        ...(genMeta?.lawReferences?.length ? { lawReferences: genMeta.lawReferences } : {}),
      }

      setChatMessages((prev) => [...prev, aiMessage])

      if (isAuthenticated && managedId !== 'new') {
        api.post(`/documents/${managedId}/chat-messages`, {
          role: 'assistant',
          content: aiContent,
          metadata: {
            thinking: combinedThinking || undefined,
            hasContract: aiMessage.hasContract,
            ...(toolCalls?.length ? { toolCalls } : {}),
            ...(geminiThinking ? { geminiThinking } : {}),
          },
        }).catch((e) => console.error(e))
      }

      queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] })

    } catch (error) {
      console.error('Error generating contract:', error)
      if (isAuthenticated) {
        api.post('/ai/refund-credit', workspaceId ? { workspaceId } : {}).catch(() => {})
      }
      toast.error(t('toast_generate_error'))
      setThinkingProgress([])
      const errorContent = error instanceof Error ? error.message : t('toast_ai_error')
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
        isError: true,
      }
      setChatMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
      setThinkingProgress([])
    }
  }, [attachedFile, chatMessages, documentTitle, editorContent, isAuthenticated, locale, managedId, queryClient, setThinkingProgress, t, workspaceId, setTemplateMergeFields, setMergeFieldValues, updateMetadata])

  const handleQuestionnaireSubmit = useCallback((values: Record<string, string>) => {
    setActiveQuestionnaire(null)

    const prev = useEditorStore.getState().mergeFieldValues
    const next: Record<string, string> = { ...prev }
    for (const [key, val] of Object.entries(values)) {
      const trimmed = typeof val === 'string' ? val.trim() : ''
      if (trimmed) next[key] = trimmed
    }
    setMergeFieldValues(next)

    const dataLines = Object.entries(values)
      .filter(([, v]) => (typeof v === 'string' ? v.trim() : ''))
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n')

    const prompt = `[QUESTIONNAIRE_RESPONSE]\n${t('questionnaire_submitted_prompt')}\n${dataLines}`
    void handleSendMessage(prompt)
  }, [setMergeFieldValues, t, handleSendMessage])

  const handleQuestionnaireSkip = useCallback(() => {
    setActiveQuestionnaire(null)
    const prompt = `[QUESTIONNAIRE_SKIP]\n${t('questionnaire_skipped_prompt')}`
    handleSendMessage(prompt)
  }, [t, handleSendMessage])

  const handleContractTypeSelect = useCallback((contractTypeId: ContractTypeId) => {
    setWizardContractTypeId(contractTypeId)
  }, [])

  const handleWizardSubmit = useCallback(async (
    contractTypeId: ContractTypeId,
    roleId: string | null,
    values: Record<string, string>,
    steps: WizardFormStep[],
    outputLanguage: WizardOutputLanguage,
  ) => {
    setIsWizardSubmitting(true)
    const contractType = findContractType(contractTypeId)
    const CONTRACT_TYPE_LABELS: Record<ContractTypeId, string> = {
      labor: 'Hợp đồng lao động',
      service: 'Hợp đồng cung cấp dịch vụ',
      nda: 'Thỏa thuận bảo mật (NDA)',
      goods: 'Hợp đồng mua bán hàng hóa',
      rental: 'Hợp đồng thuê',
    }
    const typeLabel = CONTRACT_TYPE_LABELS[contractTypeId] ?? contractType?.title ?? contractTypeId
    const sections = steps.map((step) => {
      const lines = step.fields
        .filter((f) => values[f.key]?.trim())
        .map((f) => {
          const displayValue = f.type === 'toggle'
            ? (values[f.key] === 'true' ? 'Có' : 'Không')
            : values[f.key]
          return `  ${f.label}: ${displayValue}`
        })
        .join('\n')
      return lines ? `${step.title}:\n${lines}` : null
    }).filter(Boolean).join('\n\n')
    const WIZARD_LANG_PROMPT: Record<WizardOutputLanguage, string> = {
      vi: 'Ngôn ngữ hợp đồng đầu ra: Tiếng Việt.',
      en: 'Output contract language: English only.',
      zh: '输出合同语言：中文（简体）。',
      bilingual: 'Ngôn ngữ hợp đồng đầu ra: Song ngữ Việt - Anh.',
    }
    const prompt = [
      '[CONTRACT_WIZARD_SUBMISSION]',
      `[WIZARD_OUTPUT_LANGUAGE=${outputLanguage}]`,
      WIZARD_LANG_PROMPT[outputLanguage],
      `Loại hợp đồng: ${typeLabel}`,
      roleId ? `Vai trò người dùng: ${roleId}` : '',
      '',
      sections,
      '',
      'Vui lòng soạn thảo hợp đồng đầy đủ và chính xác theo đúng pháp luật Việt Nam dựa trên thông tin trên.',
    ].filter((l) => l !== '').join('\n')

    // Push wizard answers into mergeFieldValues so the right panel tools are
    // populated immediately — before the AI finishes drafting the contract.
    const prevMfv = useEditorStore.getState().mergeFieldValues
    const wizardMergeValues: Record<string, string> = { ...prevMfv }
    for (const [key, val] of Object.entries(values)) {
      const trimmed = typeof val === 'string' ? val.trim() : ''
      if (trimmed) wizardMergeValues[key] = trimmed
    }
    setMergeFieldValues(wizardMergeValues)

    // Build templateMergeFields from wizard fields so labels appear correctly
    // in the right panel (deduped across steps).
    const seenKeys = new Set<string>()
    const wizardMergeFields: TemplateMergeField[] = []
    for (const step of steps) {
      for (const field of step.fields) {
        if (seenKeys.has(field.key)) continue
        seenKeys.add(field.key)
        wizardMergeFields.push({
          fieldKey: field.key,
          label: field.label,
          sampleValue: wizardMergeValues[field.key] ?? '',
        })
      }
    }
    setTemplateMergeFields(wizardMergeFields)

    // Open canvas right away so the user sees the tools panel while the AI drafts.
    setIsCanvasMode(true)

    setWizardContractTypeId(null)
    setIsWizardSubmitting(false)
    await handleSendMessage(prompt, { preferredOutputLanguage: outputLanguage })
  }, [handleSendMessage, setMergeFieldValues, setTemplateMergeFields])

  const isNewEditorRoute = showLeftWorkspace

  const chatSurface = wizardContractTypeId ? (
    <ContractWizard
      contractTypeId={wizardContractTypeId}
      locale={locale}
      onBack={() => setWizardContractTypeId(null)}
      onSubmit={handleWizardSubmit}
      isSubmitting={isWizardSubmitting}
    />
  ) : (
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
          toast.error(t("chat_file_type_error"))
          return
        }
        setAttachedFile(file)
      }}
      onRemoveAttachedFile={() => setAttachedFile(null)}
      activeQuestionnaire={activeQuestionnaire}
      onQuestionnaireSubmit={handleQuestionnaireSubmit}
      onQuestionnaireSkip={handleQuestionnaireSkip}
      onContractTypeSelect={handleContractTypeSelect}
      mergeFieldValues={mergeFieldValues}
      userFields={customFields}
      workspaceFields={workspaceFields}
    />
  )

  return (
    <div className="flex flex-1 min-h-0 bg-background text-foreground overflow-hidden relative flex-col">
      {/* Main Content Area - 3 Column Layout */}
      <div className="relative z-10 flex flex-1 w-full min-h-0 gap-2 overflow-hidden">
        
        {/* Left: Chat Area — hẹp hơn một chút khi mở canvas để nhường chỗ cho editor */}
        <motion.div 
          layout
          initial={false}
          animate={{
            width: isCanvasMode ? '32%' : '100%',
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className={cn(
            "flex flex-col h-full relative z-10",
            !isCanvasMode && "items-center"
          )}
        >
          <div id="tour-editor-chat" className={cn(
            "w-full h-full transition-all duration-500",
            !isCanvasMode && !wizardContractTypeId
              ? "max-w-3xl min-[1100px]:max-w-4xl min-[1536px]:max-w-5xl mx-auto w-full"
              : "w-full"
          )}>
            {isNewEditorRoute ? (
              <EditorLeftWorkspace
                activeMode={leftWorkspaceMode}
                onActiveModeChange={setLeftWorkspaceMode}
                chatContent={chatSurface}
                onApplySystemTemplate={applySystemTemplateById}
                onApplyContractTemplate={applyContractTemplateById}
              />
            ) : (
              chatSurface
            )}
          </div>
        </motion.div>

        {/* Right Section: Editor + Metadata */}
        <AnimatePresence>
          {isCanvasMode && (
            <motion.div
              layout
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '68%', opacity: 1 }}
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
                  onRun={() => toast.info(t("editor_checking"))}
                  isCode={false}
                  toolsPanelOpen={toolsPanelOpen}
                  onToggleTools={() => setToolsPanelOpen((v) => !v)}
                  onSave={handleSave}
                  documentId={managedId === 'new' ? null : managedId}
                />
              </div>

              {toolsPanelOpen && (
                <div className="flex h-full min-h-0 w-[min(28%,21rem)] min-w-[236px] shrink-0 flex-col overflow-hidden">
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
        onSave={(opts) => {
          void handleSaveDraftToDb(opts)
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
