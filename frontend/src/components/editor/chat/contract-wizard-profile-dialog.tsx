'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
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

  useEffect(() => {
    if (!open) return
    const base = draftFromCustomFields(customFields)
    for (const k of allKeys) {
      if (base[k] === undefined) base[k] = ''
    }
    setDraft(base)
  }, [open, customFields, allKeys])

  const setDraftKey = useCallback((key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSaveProfile = useCallback(() => {
    for (const key of allKeys) {
      const raw = draft[key] ?? ''
      const val = raw.trim()
      const label = labelByKey[key] ?? DEFAULT_LABEL_BY_KEY[key] ?? key
      const exists = useUserFieldsStore.getState().customFields.some((f) => f.key === key)
      if (exists) {
        updateCustomField(key, { defaultValue: raw })
      } else if (val) {
        addCustomField({ key, label, defaultValue: val })
      }
    }
    onOpenChange(false)
  }, [allKeys, draft, labelByKey, updateCustomField, addCustomField, onOpenChange])

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

  const keysByGroup = (gid: UserFieldGroupId) => {
    const canon = CANONICAL_KEYS_BY_GROUP[gid] as readonly string[]
    return allKeys.filter((k) => canon.includes(k))
  }

  const renderGroup = (gid: UserFieldGroupId) => {
    const keys = keysByGroup(gid)
    if (keys.length === 0) return null
    return (
      <div key={gid} className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">
          {USER_FIELD_GROUP_LABELS[gid]}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {keys.map((key) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs">{labelByKey[key] ?? key}</Label>
              <Input
                value={draft[key] ?? ''}
                onChange={(e) => setDraftKey(key, e.target.value)}
                placeholder={DEFAULT_LABEL_BY_KEY[key] ?? key}
                className="text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>Tự động điền từ hồ sơ</DialogTitle>
          {emptyHint && (
            <p className="text-sm text-muted-foreground font-normal pt-1">
              Hãy điền các thông tin hiện có để lưu cho lần sau. Bạn cũng có thể thêm bộ trường mẫu hoặc quản lý tại{' '}
              <Link href="/fields" className="text-primary underline underline-offset-2">
                Trường thông tin
              </Link>
              .
            </p>
          )}
        </DialogHeader>
        <ScrollArea className="max-h-[50vh] px-6">
          <div className="space-y-6 pr-3 pb-2">
            {emptyHint && (
              <Button type="button" variant="secondary" size="sm" onClick={() => addSampleFields()}>
                Thêm bộ trường mẫu
              </Button>
            )}
            {renderGroup('basic')}
            {renderGroup('representative')}
            {renderGroup('contract_profile')}
          </div>
        </ScrollArea>
        <DialogFooter className="px-6 py-4 border-t border-border shrink-0 flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button type="button" variant="secondary" onClick={handleSaveProfile}>
            Lưu vào hồ sơ
          </Button>
          <Button type="button" onClick={handleApplyToForm}>
            Áp dụng vào biểu mẫu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
