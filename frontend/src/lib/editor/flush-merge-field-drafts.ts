import { useEditorStore } from '@/stores/editor-store'

/** RightPanel listens to cancel debounce timers before store merge. */
export const LAWZY_FLUSH_MERGE_FIELD_DRAFTS = 'lawzy:flush-merge-field-drafts'

export function flushMergeFieldDrafts(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LAWZY_FLUSH_MERGE_FIELD_DRAFTS))
  }
  useEditorStore.getState().flushPendingMergeFieldDrafts()
}
