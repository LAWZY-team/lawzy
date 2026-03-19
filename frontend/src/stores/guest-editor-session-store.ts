import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type { JSONContent } from "@tiptap/core"

/**
 * Store để lưu session flow của guest khi đang tạo hợp đồng
 * Lưu editor state để có thể restore sau khi đăng nhập
 */
interface GuestEditorSessionState {
  /** Editor content khi guest đang làm việc */
  editorContent: JSONContent | null
  /** Document title */
  documentTitle: string
  /** Merge field values */
  mergeFieldValues: Record<string, string>
  /** Template merge fields */
  templateMergeFields: Array<{ fieldKey: string; label: string; sampleValue?: string }> | null
  /** Chat messages */
  chatMessages: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: Date }>
  /** Metadata */
  metadata: {
    title: string
    type: string
    tags: string[]
    riskLevel: 'low' | 'medium' | 'high'
    visibility: 'workspace' | 'private' | 'public'
  } | null

  /** Lưu session state */
  saveSession: (data: {
    editorContent: JSONContent
    documentTitle: string
    mergeFieldValues: Record<string, string>
    templateMergeFields?: Array<{ fieldKey: string; label: string; sampleValue?: string }> | null
    chatMessages?: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: Date }>
    metadata?: {
      title: string
      type: string
      tags: string[]
      riskLevel: 'low' | 'medium' | 'high'
      visibility: 'workspace' | 'private' | 'public'
    }
  }) => void

  /** Lấy session state */
  getSession: () => {
    editorContent: JSONContent | null
    documentTitle: string
    mergeFieldValues: Record<string, string>
    templateMergeFields: Array<{ fieldKey: string; label: string; sampleValue?: string }> | null
    chatMessages: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: Date }>
    metadata: {
      title: string
      type: string
      tags: string[]
      riskLevel: 'low' | 'medium' | 'high'
      visibility: 'workspace' | 'private' | 'public'
    } | null
  }

  /** Xóa session sau khi đăng nhập thành công */
  clearSession: () => void
}

export const useGuestEditorSessionStore = create<GuestEditorSessionState>()(
  persist(
    (set, get) => ({
      editorContent: null,
      documentTitle: 'Hợp đồng dịch vụ',
      mergeFieldValues: {},
      templateMergeFields: null,
      chatMessages: [],
      metadata: null,

      saveSession: (data) => {
        set({
          editorContent: data.editorContent,
          documentTitle: data.documentTitle,
          mergeFieldValues: data.mergeFieldValues,
          templateMergeFields: data.templateMergeFields ?? null,
          chatMessages: data.chatMessages ?? [],
          metadata: data.metadata ?? null,
        })
      },

      getSession: () => {
        const state = get()
        return {
          editorContent: state.editorContent,
          documentTitle: state.documentTitle,
          mergeFieldValues: state.mergeFieldValues,
          templateMergeFields: state.templateMergeFields,
          chatMessages: state.chatMessages,
          metadata: state.metadata,
        }
      },

      clearSession: () => {
        set({
          editorContent: null,
          documentTitle: 'Hợp đồng dịch vụ',
          mergeFieldValues: {},
          templateMergeFields: null,
          chatMessages: [],
          metadata: null,
        })
      },
    }),
    {
      name: "lawzy-guest-editor-session",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
      version: 1,
    }
  )
)
