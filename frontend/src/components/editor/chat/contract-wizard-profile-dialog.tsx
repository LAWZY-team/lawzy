'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useUserFieldsStore, type UserCustomField } from '@/stores/user-fields-store'
import {
  CANONICAL_KEYS_BY_GROUP,
  USER_FIELD_GROUP_LABELS,
  type UserFieldGroupId,
  DEFAULT_LABEL_BY_KEY,
} from '@/lib/editor/user-field-profile'
import {
  applyUserFieldsToWizardStep,
  hasAnyProfileValue,
} from '@/lib/editor/wizard-user-field-map'
import type { ContractTypeId } from '@/lib/editor/contract-wizard-config'
import type { WizardFormStep } from '@/lib/editor/contract-wizard-config'

function draftFromCustomFields(customFields: UserCustomField[]): Record<string, string> {
  const d: Record<string, string> = {}
  for (const f of customFields) {
    d[f.key] = typeof f.defaultValue === 'string' ? f.defaultValue : ''
  }
  return d
}

function customFieldsFromDraft(
  draft: Record<string, string>,
  labels: Record<string, string>,
): UserCustomField[] {
  return Object.entries(draft).map(([key, defaultValue]) => ({
    key,
    label: labels[key] ?? DEFAULT_LABEL_BY_KEY[key] ?? key,
    defaultValue,
  }))
}

interface WizardUserProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractTypeId: ContractTypeId
  roleId: string | null
  step: WizardFormStep
  customFields: UserCustomField[]
  onApplyToForm: (patch: Record<string, string>) => void
  addSampleFields: () => void
  updateCustomField: (key: string, updates: Partial<Omit<UserCustomField, 'key'>>) => void
  addCustomField: (field: Omit<UserCustomField, 'key'> & { key?: string }) => string
}

const GROUP_ORDER: UserFieldGroupId[] = ['basic', 'representative', 'contract_profile']

export function WizardUserProfileDialog({
  open,
  onOpenChange,
  contractTypeId,
  roleId,
  step,
  customFields,
  onApplyToForm,
  addSampleFields,
  updateCustomField,
  addCustomField,
}: WizardUserProfileDialogProps) {
  const labelByKey = useMemo(() => {
    const m: Record<string, string> = { ...DEFAULT_LABEL_BY_KEY }
    for (const f of customFields) m[f.key] = f.label
    return m
  }, [customFields])

  const allKeys = useMemo(() => {
    const ordered = [
      ...CANONICAL_KEYS_BY_GROUP.basic,
      ...CANONICAL_KEYS_BY_GROUP.representative,
      ...CANONICAL_KEYS_BY_GROUP.contract_profile,
    ] as string[]
    const set = new Set(ordered)
    for (const f of customFields) {
      if (!set.has(f.key)) {
        ordered.push(f.key)
        set.add(f.key)
      }
    }
    return ordered
  }, [customFields])

  const [draft, setDraft] = useState<Record<string, string>>({})
  const [expandedGroup, setExpandedGroup] = useState<UserFieldGroupId | null>(null)

  useEffect(() => {
    if (!open) return
    setExpandedGroup(null)
    const base = draftFromCustomFields(customFields)
    for (const k of allKeys) {
      if (base[k] === undefined) base[k] = ''
    }
    setDraft(base)
  }, [open, customFields, allKeys])

  const setDraftKey = useCallback((key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }, [])

  const keysForGroup = useCallback((gid: UserFieldGroupId): string[] => {
    const canon = CANONICAL_KEYS_BY_GROUP[gid] as readonly string[]
    return allKeys.filter((k) => canon.includes(k))
  }, [allKeys])

  const getGroupSummary = useCallback((gid: UserFieldGroupId) => {
    const keys = keysForGroup(gid)
    const filledKeys = keys.filter((k) => (draft[k] ?? '').trim())
    const firstEntry = filledKeys.length > 0
      ? { label: labelByKey[filledKeys[0]] ?? filledKeys[0], value: draft[filledKeys[0]] }
      : null
    return { filledCount: filledKeys.length, total: keys.length, firstEntry }
  }, [keysForGroup, draft, labelByKey])

  const handleSaveGroup = useCallback((gid: UserFieldGroupId) => {
    const keys = keysForGroup(gid)
    for (const key of keys) {
      const raw = draft[key] ?? ''
      const label = labelByKey[key] ?? DEFAULT_LABEL_BY_KEY[key] ?? key
      const exists = useUserFieldsStore.getState().customFields.some((f) => f.key === key)
      if (exists) {
        updateCustomField(key, { defaultValue: raw })
      } else if (raw.trim()) {
        addCustomField({ key, label, defaultValue: raw.trim() })
      }
    }
    setExpandedGroup(null)
  }, [keysForGroup, draft, labelByKey, updateCustomField, addCustomField])

  const handleApplyToForm = useCallback(() => {
    const synthetic = customFieldsFromDraft(draft, labelByKey)
    const patch = applyUserFieldsToWizardStep({
      contractTypeId,
      roleId,
      step,
      customFields: synthetic,
    })
    onApplyToForm(patch)
    onOpenChange(false)
  }, [draft, labelByKey, contractTypeId, roleId, step, onApplyToForm, onOpenChange])

  const anySaved = hasAnyProfileValue(customFields)
  const emptyHint = customFields.length === 0 || !anySaved

  const renderGroupCard = (gid: UserFieldGroupId) => {
    const keys = keysForGroup(gid)
    if (keys.length === 0) return null
    const { filledCount, total, firstEntry } = getGroupSummary(gid)
    const isExpanded = expandedGroup === gid

    return (
      <div key={gid} className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-muted/20">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">
              {USER_FIELD_GROUP_LABELS[gid]}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {firstEntry
                ? <>{firstEntry.label}: <span className="text-foreground/70">{firstEntry.value}</span></>
                : `${filledCount}/${total} trường đã điền`}
              {firstEntry && filledCount > 1 && (
                <span className="ml-1 text-muted-foreground/60">
                  +{filledCount - 1} trường khác
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            aria-label="Chỉnh sửa nhóm"
            onClick={() => setExpandedGroup(isExpanded ? null : gid)}
            className="shrink-0 p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        {isExpanded && (
          <div className="px-4 pt-4 pb-3 border-t border-border space-y-4 bg-background">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {keys.map((key) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{labelByKey[key] ?? key}</Label>
                  <Input
                    value={draft[key] ?? ''}
                    onChange={(e) => setDraftKey(key, e.target.value)}
                    placeholder={DEFAULT_LABEL_BY_KEY[key] ?? key}
                    className="text-sm h-8"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => handleSaveGroup(gid)}
              >
                Lưu thay đổi
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col gap-0 p-0 max-h-[85vh]">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-border">
          <DialogTitle>Tự động điền từ hồ sơ</DialogTitle>
          <p className="text-sm text-muted-foreground font-normal pt-1">
            {emptyHint
              ? <>Chưa có thông tin nào. Thêm bộ trường mẫu hoặc{' '}
                  <Link href="/fields" className="text-primary underline underline-offset-2">
                    quản lý tại đây
                  </Link>.</>
              : 'Nhấn "Áp dụng" để điền tất cả thông tin đã lưu vào biểu mẫu. Nhấn biểu tượng cài đặt để chỉnh sửa từng nhóm.'}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 space-y-3">
            {emptyHint && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSampleFields()}
                className="w-full"
              >
                Thêm bộ trường mẫu
              </Button>
            )}
            {GROUP_ORDER.map((gid) => renderGroupCard(gid))}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0 gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button type="button" onClick={handleApplyToForm} disabled={emptyHint}>
            Áp dụng vào biểu mẫu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
