import type { JSONContent } from '@tiptap/core'
import { create } from 'zustand'

/** Merge fields từ template (dùng khi mở editor từ mẫu, chưa có contract) */
export interface TemplateMergeField {
  fieldKey: string
  label: string
  sampleValue?: string
}

interface EditorState {
  currentDocumentId: string | null
  content: JSONContent | null
  /** Merge fields của template hiện tại (khi /editor/new?template=...) */
  templateMergeFields: TemplateMergeField[] | null
  /** Giá trị các trường trộn — dùng để chỉnh sửa trong panel và thay thế khi in/xuất PDF */
  mergeFieldValues: Record<string, string>
  /** Bản nháp ô panel phải (chưa debounce); tồn tại trong store để flush khi panel đóng/unmount */
  pendingMergeFieldDrafts: Record<string, string>
  metadata: {
    title: string
    type: string
    tags: string[]
    riskLevel: 'low' | 'medium' | 'high'
    visibility: 'workspace' | 'private' | 'public'
  }
  isSaving: boolean
  lastSaved: string | null
  setCurrentDocument: (documentId: string | null) => void
  setContent: (content: JSONContent) => void
  setTemplateMergeFields: (fields: TemplateMergeField[] | null) => void
  setMergeFieldValues: (values: Record<string, string>) => void
  updateMergeFieldValue: (fieldKey: string, value: string) => void
  setPendingMergeFieldDraft: (fieldKey: string, value: string) => void
  clearPendingMergeFieldKey: (fieldKey: string) => void
  clearPendingMergeFieldDrafts: () => void
  /** Gộp pending vào mergeFieldValues (gọi trước khi PATCH/lưu phiên bản) */
  flushPendingMergeFieldDrafts: () => void
  updateMetadata: (metadata: Partial<EditorState['metadata']>) => void
  setSaving: (isSaving: boolean) => void
  setLastSaved: (timestamp: string) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  currentDocumentId: null,
  content: null,
  templateMergeFields: null,
  mergeFieldValues: {},
  pendingMergeFieldDrafts: {},
  metadata: {
    title: 'Hợp đồng mới',
    type: 'SaaS',
    tags: [],
    riskLevel: 'low',
    visibility: 'workspace',
  },
  isSaving: false,
  lastSaved: null,
  setCurrentDocument: (documentId) =>
    set((state) => {
      if (documentId === state.currentDocumentId) {
        return { currentDocumentId: documentId }
      }
      return { currentDocumentId: documentId, pendingMergeFieldDrafts: {} }
    }),
  setContent: (content) => set({ content }),
  setTemplateMergeFields: (templateMergeFields) => set({ templateMergeFields }),
  setMergeFieldValues: (mergeFieldValues) => set({ mergeFieldValues }),
  updateMergeFieldValue: (fieldKey, value) =>
    set((state) => ({
      mergeFieldValues: { ...state.mergeFieldValues, [fieldKey]: value },
    })),
  setPendingMergeFieldDraft: (fieldKey, value) =>
    set((state) => ({
      pendingMergeFieldDrafts: { ...state.pendingMergeFieldDrafts, [fieldKey]: value },
    })),
  clearPendingMergeFieldKey: (fieldKey) =>
    set((state) => {
      if (!Object.prototype.hasOwnProperty.call(state.pendingMergeFieldDrafts, fieldKey)) {
        return state
      }
      const { [fieldKey]: _removed, ...rest } = state.pendingMergeFieldDrafts
      return { pendingMergeFieldDrafts: rest }
    }),
  clearPendingMergeFieldDrafts: () => set({ pendingMergeFieldDrafts: {} }),
  flushPendingMergeFieldDrafts: () =>
    set((state) => {
      const pending = state.pendingMergeFieldDrafts
      const keys = Object.keys(pending)
      if (keys.length === 0) return state
      return {
        mergeFieldValues: { ...state.mergeFieldValues, ...pending },
        pendingMergeFieldDrafts: {},
      }
    }),
  updateMetadata: (metadata) =>
    set((state) => ({
      metadata: { ...state.metadata, ...metadata },
    })),
  setSaving: (isSaving) => set({ isSaving }),
  setLastSaved: (timestamp) => set({ lastSaved: timestamp }),
}))
