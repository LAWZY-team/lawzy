import type { JSONContent } from "@tiptap/core"

export interface LocalDraft {
  id: string
  title: string
  content: JSONContent
  mergeFieldValues: Record<string, string>
  status: 'draft' | 'completed'
  templateMergeFields?: Array<{ fieldKey: string; label: string; sampleValue?: string }> | null
  chatMessages?: Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: Date | string }>
  metadata?: {
    title: string
    type: string
    tags: string[]
    riskLevel: 'low' | 'medium' | 'high'
    visibility: 'workspace' | 'private' | 'public'
  } | null
  updatedAt: string
}

const STORAGE_KEY = "lawzy_local_drafts"

/**
 * Service to manage local document drafts in LocalStorage.
 * Designed to be easily swapped with a real DB implementation later.
 */
export const DraftService = {
  /**
   * Get all local drafts
   */
  getDrafts: (): LocalDraft[] => {
    if (typeof window === "undefined") return []
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error("Failed to parse local drafts", e)
      return []
    }
  },

  /**
   * Save or update a draft
   */
  saveDraft: (draft: Omit<LocalDraft, "updatedAt">): void => {
    if (typeof window === "undefined") return
    const drafts = DraftService.getDrafts()
    const now = new Date().toISOString()
    const index = drafts.findIndex((d) => d.id === draft.id)

    if (index >= 0) {
      drafts[index] = { ...draft, updatedAt: now }
    } else {
      drafts.push({ ...draft, updatedAt: now })
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
  },

  /**
   * Delete a draft
   */
  deleteDraft: (id: string): void => {
    if (typeof window === "undefined") return
    const drafts = DraftService.getDrafts()
    const filtered = drafts.filter((d) => d.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  },

  /**
   * Get a specific draft
   */
  getDraft: (id: string): LocalDraft | undefined => {
    const drafts = DraftService.getDrafts()
    return drafts.find((d) => d.id === id)
  }
}
