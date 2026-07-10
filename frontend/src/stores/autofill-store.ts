import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AutofillTemplateBundle, AutofillTemplateDoc } from '@/app/lpms/autofill/types'

interface AutofillState {
  bundles: AutofillTemplateBundle[]
  currentBundleId: string | null

  createBundle: (name: string, scope: 'user' | 'workspace', description?: string) => string
  updateBundle: (id: string, updates: Partial<AutofillTemplateBundle>) => void
  deleteBundle: (id: string) => void
  setCurrentBundleId: (id: string | null) => void

  addDocToBundle: (bundleId: string, doc: Omit<AutofillTemplateDoc, 'id'>) => string
  updateDocInBundle: (bundleId: string, docId: string, updates: Partial<AutofillTemplateDoc>) => void
  removeDocFromBundle: (bundleId: string, docId: string) => void

  addSampleBundleIfEmpty: () => void
}

export const useAutofillStore = create<AutofillState>()(
  persist(
    (set, get) => ({
      bundles: [],
      currentBundleId: null,

      createBundle: (name, scope, description) => {
        const id = `bundle_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const newBundle: AutofillTemplateBundle = {
          id,
          name,
          description: description || '',
          scope,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          documents: [],
        }
        set({
          bundles: [newBundle, ...get().bundles],
          currentBundleId: id,
        })
        return id
      },

      updateBundle: (id, updates) => {
        set({
          bundles: get().bundles.map((b) =>
            b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
          ),
        })
      },

      deleteBundle: (id) => {
        const next = get().bundles.filter((b) => b.id !== id)
        set({
          bundles: next,
          currentBundleId: get().currentBundleId === id ? (next[0]?.id || null) : get().currentBundleId,
        })
      },

      setCurrentBundleId: (id) => set({ currentBundleId: id }),

      addDocToBundle: (bundleId, doc) => {
        const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const newDoc: AutofillTemplateDoc = { ...doc, id: docId }
        set({
          bundles: get().bundles.map((b) =>
            b.id === bundleId
              ? {
                  ...b,
                  documents: [...b.documents, newDoc],
                  updatedAt: new Date().toISOString(),
                }
              : b
          ),
        })
        return docId
      },

      updateDocInBundle: (bundleId, docId, updates) => {
        set({
          bundles: get().bundles.map((b) =>
            b.id === bundleId
              ? {
                  ...b,
                  documents: b.documents.map((d) => (d.id === docId ? { ...d, ...updates } : d)),
                  updatedAt: new Date().toISOString(),
                }
              : b
          ),
        })
      },

      removeDocFromBundle: (bundleId, docId) => {
        set({
          bundles: get().bundles.map((b) =>
            b.id === bundleId
              ? {
                  ...b,
                  documents: b.documents.filter((d) => d.id !== docId),
                  updatedAt: new Date().toISOString(),
                }
              : b
          ),
        })
      },

      addSampleBundleIfEmpty: () => {
        // Không tạo bộ mẫu giả lập demo-bundle-1 nữa, để người dùng hoàn toàn bắt đầu từ đầu
      },
    }),
    {
      name: 'lawzy-autofill-bundles-v1',
    }
  )
)
