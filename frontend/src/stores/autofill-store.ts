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

const SAMPLE_BUNDLE: AutofillTemplateBundle = {
  id: 'demo-bundle-1',
  name: 'Bộ hồ sơ thành lập Doanh nghiệp TNHH (Mẫu chuẩn)',
  description: 'Trọn bộ biểu mẫu thủ tục ĐKKD, Điều lệ, Quyết định bổ nhiệm và Giấy ủy quyền.',
  category: 'Doanh nghiệp & ĐKKD',
  scope: 'workspace',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  documents: [
    {
      id: 'doc-sample-1',
      fileName: '01. Giấy đề nghị đăng ký doanh nghiệp TNHH.docx',
      fileType: 'docx',
      status: 'done',
      plainText: 'GIẤY ĐỀ NGHỊ ĐĂNG KÝ DOANH NGHIỆP CÔNG TY TNHH\nTên doanh nghiệp: [TÊN DOANH NGHIỆP]\nMã số thuế: [MÃ SỐ THUẾ]\nĐịa chỉ trụ sở: [ĐỊA CHỈ TRỤ SỞ]\nNgười đại diện theo pháp luật: [NGƯỜI ĐẠI DIỆN]\nCCCD/CMND: [SỐ CCCD]',
      fields: [
        { id: 'f1', label: 'Tên doanh nghiệp', placeholder: '[TÊN DOANH NGHIỆP]', mappedKey: 'f_to_ten', source: 'auto', count: 3 },
        { id: 'f2', label: 'Mã số thuế', placeholder: '[MÃ SỐ THUẾ]', mappedKey: 'f_to_mst', source: 'auto', count: 2 },
        { id: 'f3', label: 'Địa chỉ trụ sở', placeholder: '[ĐỊA CHỈ TRỤ SỞ]', mappedKey: 'f_to_diachi', source: 'auto', count: 1 },
        { id: 'f4', label: 'Người đại diện', placeholder: '[NGƯỜI ĐẠI DIỆN]', mappedKey: 'f_dd_hoten', source: 'auto', count: 2 },
        { id: 'f5', label: 'Số CCCD đại diện', placeholder: '[SỐ CCCD]', mappedKey: 'f_dd_madinhdanh', source: 'auto', count: 2 },
      ]
    },
    {
      id: 'doc-sample-2',
      fileName: '02. Điều lệ Công ty TNHH (Dự thảo).docx',
      fileType: 'docx',
      status: 'done',
      plainText: 'ĐIỀU LỆ CÔNG TY TNHH [TÊN DOANH NGHIỆP]\nVốn điều lệ: [VỐN ĐIỀU LỆ]\nTrụ sở chính: {{dia_chi}}',
      fields: [
        { id: 'f6', label: 'Tên doanh nghiệp', placeholder: '[TÊN DOANH NGHIỆP]', mappedKey: 'f_to_ten', source: 'auto', count: 5 },
        { id: 'f7', label: 'Vốn điều lệ', placeholder: '[VỐN ĐIỀU LỆ]', mappedKey: 'f_to_vondl', source: 'auto', count: 2 },
        { id: 'f8', label: 'Địa chỉ trụ sở', placeholder: '{{dia_chi}}', mappedKey: 'f_to_diachi', source: 'auto', count: 3 },
      ]
    }
  ]
}

export const useAutofillStore = create<AutofillState>()(
  persist(
    (set, get) => ({
      bundles: [SAMPLE_BUNDLE],
      currentBundleId: SAMPLE_BUNDLE.id,

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
        if (get().bundles.length === 0) {
          set({ bundles: [SAMPLE_BUNDLE], currentBundleId: SAMPLE_BUNDLE.id })
        }
      },
    }),
    {
      name: 'lawzy-autofill-bundles-v1',
    }
  )
)
