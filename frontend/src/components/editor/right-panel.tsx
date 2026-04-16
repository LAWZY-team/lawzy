"use client"

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import type { Editor } from '@tiptap/react'
import { FileText, Info, Plus, X, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

import { LAWZY_FLUSH_MERGE_FIELD_DRAFTS } from '@/lib/editor/flush-merge-field-drafts'
import { useEditorStore } from '@/stores/editor-store'
import { useUserFieldsStore } from '@/stores/user-fields-store'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceFields } from '@/hooks/workspaces/use-workspace-fields'
import { api } from '@/lib/api/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useT } from '@/components/i18n-provider'

interface RightPanelProps {
  editor: Editor | null
  onAuthRequired?: () => boolean | void
  workspaceId?: string
}

type MergeFieldSource = 'template' | 'workspace' | 'user' | 'document'
type MergeFieldItem = { key: string; label: string; value: string; source: MergeFieldSource }

export function RightPanel({ editor, onAuthRequired, workspaceId }: RightPanelProps) {
  const { t, locale } = useT()
  const [activeTab, setActiveTab] = useState('fields')
  const {
    currentDocumentId,
    metadata,
    templateMergeFields,
    mergeFieldValues,
    pendingMergeFieldDrafts,
    updateMergeFieldValue,
    setMergeFieldValues,
    setTemplateMergeFields,
    setPendingMergeFieldDraft,
    clearPendingMergeFieldKey,
    clearPendingMergeFieldDrafts,
    updateMetadata,
  } = useEditorStore()
  const { customFields, addCustomField, removeCustomField } = useUserFieldsStore()
  const { isAuthenticated, user: currentUser } = useAuthStore()
  const { data: workspaceFields = [] } = useWorkspaceFields(workspaceId ?? null)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldDefault, setNewFieldDefault] = useState('')
  const [versions, setVersions] = useState<
    Array<{ id: string; label: string | null; createdAt: string; createdBy: string }>
  >([])
  const [restoring, setRestoring] = useState<string | null>(null)
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const loadVersions = useCallback(() => {
    if (!isAuthenticated || !currentDocumentId) {
      setVersions([])
      return
    }
    api
      .get<Array<{ id: string; label: string | null; createdAt: string; createdBy: string }>>(
        `/documents/${currentDocumentId}/versions`
      )
      .then((data) => setVersions(Array.isArray(data) ? data : []))
      .catch(() => setVersions([]))
  }, [isAuthenticated, currentDocumentId])

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  useEffect(() => {
    const handler = () => loadVersions()
    window.addEventListener('lawzy:refresh-versions', handler)
    return () => window.removeEventListener('lawzy:refresh-versions', handler)
  }, [loadVersions])

  useEffect(() => {
    const clearDebounceTimers = () => {
      for (const k of Object.keys(debounceTimers.current)) {
        clearTimeout(debounceTimers.current[k])
      }
      debounceTimers.current = {}
    }
    window.addEventListener(LAWZY_FLUSH_MERGE_FIELD_DRAFTS, clearDebounceTimers)
    return () => window.removeEventListener(LAWZY_FLUSH_MERGE_FIELD_DRAFTS, clearDebounceTimers)
  }, [])

  useEffect(() => {
    return () => {
      for (const k of Object.keys(debounceTimers.current)) {
        clearTimeout(debounceTimers.current[k])
      }
      debounceTimers.current = {}
    }
  }, [])

  const humanizeFieldKey = useCallback((key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase()
  }, [])

  const baseMergeFields: MergeFieldItem[] = (templateMergeFields ?? []).map((f) => ({
    key: f.fieldKey,
    label: (f.label || f.fieldKey).toUpperCase(),
    value: mergeFieldValues[f.fieldKey] ?? f.sampleValue ?? '',
    source: 'template'
  }))

  const mergeFields: MergeFieldItem[] = useMemo(() => {
    const list: MergeFieldItem[] = [...baseMergeFields]
    const existing = new Set(list.map((f) => f.key))
    for (const wf of workspaceFields) {
      if (existing.has(wf.key) || wf.isHidden) continue
      list.push({
        key: wf.key,
        label: wf.label.toUpperCase(),
        value: mergeFieldValues[wf.key] ?? wf.defaultValue ?? '',
        source: 'workspace'
      })
      existing.add(wf.key)
    }
    for (const cf of customFields) {
      if (existing.has(cf.key)) continue
      list.push({
        key: cf.key,
        label: cf.label.toUpperCase(),
        value: mergeFieldValues[cf.key] ?? cf.defaultValue ?? '',
        source: 'user'
      })
      existing.add(cf.key)
    }
    for (const key of Object.keys(mergeFieldValues)) {
      if (existing.has(key)) continue
      list.push({
        key,
        label: humanizeFieldKey(key),
        value: mergeFieldValues[key] ?? '',
        source: 'document'
      })
      existing.add(key)
    }
    const currentOrder: string[] = []
    if (editor && !editor.isDestroyed && editor.state) {
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'mergeField') {
          const k = node.attrs.fieldKey
          if (k && !currentOrder.includes(k)) currentOrder.push(k)
        }
      })
    }
    const getOrderWeight = (key: string) => {
      const idx = currentOrder.indexOf(key)
      return idx === -1 ? 9999 : idx
    }

    const docFields = list.filter(f => f.source === 'document').sort((a, b) => getOrderWeight(a.key) - getOrderWeight(b.key))
    const tplFields = list.filter(f => f.source === 'template').sort((a, b) => getOrderWeight(a.key) - getOrderWeight(b.key))
    const wsFields = list.filter(f => f.source === 'workspace').sort((a, b) => getOrderWeight(a.key) - getOrderWeight(b.key))
    const userFields = list.filter(f => f.source === 'user').sort((a, b) => getOrderWeight(a.key) - getOrderWeight(b.key))
    return [...docFields, ...tplFields, ...wsFields, ...userFields]
  }, [baseMergeFields, workspaceFields, customFields, mergeFieldValues, humanizeFieldKey, editor])

  // Khi nhấn vào merge field trong canvas → smooth scroll + focus input tương ứng
  useEffect(() => {
    const handleFocusField = (e: Event) => {
      const customEvent = e as CustomEvent<{ fieldKey: string }>;
      const fieldKey = customEvent.detail?.fieldKey;
      if (fieldKey) {
        setActiveTab('fields');
        setTimeout(() => {
          const el = document.getElementById(`field-card-${fieldKey}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const input = el.querySelector('input');
            if (input) {
              input.focus();
              input.classList.add('ring-2', 'ring-primary', 'transition-all');
              setTimeout(() => input.classList.remove('ring-2', 'ring-primary'), 1500);
            }
          }
        }, 50);
      }
    };
    window.addEventListener('lawzy:focus-field', handleFocusField);
    return () => window.removeEventListener('lawzy:focus-field', handleFocusField);
  }, []);

  const insertField = (field: MergeFieldItem) => {
    // Check auth for guest users
    if (!isAuthenticated && onAuthRequired) {
      const authRequired = onAuthRequired()
      if (authRequired) return
    }
    
    editor?.chain().focus().insertContent({
      type: 'mergeField',
      attrs: {
        fieldKey: field.key,
        label: field.label,
        value: field.value,
      },
    }).run()
  }

  const handleAddCustomField = () => {
    // Check auth for guest users
    if (!isAuthenticated && onAuthRequired) {
      const authRequired = onAuthRequired()
      if (authRequired) return
    }

    const label = newFieldLabel.trim().toUpperCase()
    if (!label) {
      toast.error(t('toast_field_name_required'))
      return
    }
    const defaultValue = newFieldDefault
    const key = addCustomField({ label, defaultValue })
    updateMergeFieldValue(key, defaultValue ?? '')
    setNewFieldLabel('')
    setNewFieldDefault('')
    toast.success(t('toast_field_added'))
  }

  const commitFieldValue = (fieldKey: string, value: string) => {
    // Check auth for guest users when updating field values
    if (!isAuthenticated && onAuthRequired) {
      const authRequired = onAuthRequired()
      if (authRequired) return
    }
    updateMergeFieldValue(fieldKey, value)
    clearPendingMergeFieldKey(fieldKey)
  }

  // Cập nhật draft + debounce commit vào store để tránh canvas re-render từng phím
  const handleDraftChange = (fieldKey: string, value: string) => {
    setPendingMergeFieldDraft(fieldKey, value)

    if (debounceTimers.current[fieldKey]) {
      clearTimeout(debounceTimers.current[fieldKey])
    }

    debounceTimers.current[fieldKey] = setTimeout(() => {
      commitFieldValue(fieldKey, value)
    }, 250)
  }

  const handleRestoreVersion = async (versionId: string) => {
    if (!isAuthenticated || !currentDocumentId) return
    if (!editor) return

    setRestoring(versionId)
    try {
      const version = await api.get<{
        contentJSON?: Record<string, unknown>
        mergeFieldValues?: Record<string, unknown>
        chatCursorAt?: string | null
      }>(`/documents/${currentDocumentId}/versions/${versionId}`)

      const content = version?.contentJSON
      if (content) {
        editor.commands.setContent(content as unknown as JSONContent)
      }

      const mfv = (version?.mergeFieldValues ?? {}) as Record<string, unknown>
      setMergeFieldValues(
        Object.fromEntries(Object.entries(mfv).map(([k, v]) => [k, typeof v === 'string' ? v : String(v ?? '')]))
      )
      clearPendingMergeFieldDrafts()

      if (version?.chatCursorAt) {
        const msgs = await api.get<Array<{ id: string; role: string; content: string; createdAt: string }>>(
          `/documents/${currentDocumentId}/chat-messages?to=${encodeURIComponent(version.chatCursorAt)}`
        )
        window.dispatchEvent(new CustomEvent('lawzy:restore-chat', { detail: { messages: msgs } }))
      }

      toast.success(t('toast_version_restored'))
    } catch (e) {
      console.error(e)
      toast.error(t('toast_version_restore_failed'))
    } finally {
      setRestoring(null)
    }
  }

  const handleUpdateVersionLabel = async (versionId: string) => {
    if (!isAuthenticated || !currentDocumentId || !editingLabel.trim()) {
      setEditingVersionId(null)
      return
    }

    try {
      await api.patch(`/documents/${currentDocumentId}/versions/${versionId}`, {
        label: editingLabel.trim(),
      })
      setVersions((prev) =>
        prev.map((v) => (v.id === versionId ? { ...v, label: editingLabel.trim() } : v))
      )
      toast.success(t('toast_saved'))
    } catch (e) {
      console.error(e)
      toast.error(t('toast_save_failed'))
    } finally {
      setEditingVersionId(null)
    }
  }
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const allInputs = document.querySelectorAll('.field-value-input')
      const nextInput = allInputs[index + 1] as HTMLInputElement
      if (nextInput) {
        nextInput.focus()
        // Sync canvas view to show the next field
        const nextField = mergeFields[index + 1]
        if (nextField) {
          window.dispatchEvent(new CustomEvent('lawzy:canvas-show-field', { 
            detail: { fieldKey: nextField.key } 
          }))
        }
      } else {
        // Maybe blur if it's the last one
        ;(e.target as HTMLInputElement).blur()
      }
    }
  }

  const handleDeleteField = (key: string) => {
    removeCustomField(key)
    clearPendingMergeFieldKey(key)

    const newValues = { ...mergeFieldValues }
    delete newValues[key]
    setMergeFieldValues(newValues)

    if (templateMergeFields) {
      setTemplateMergeFields(templateMergeFields.filter((f) => f.fieldKey !== key))
    }

    toast.success(t('toast_field_deleted'))
  }

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 bg-background text-foreground border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-background">
        <h3 className="font-semibold text-sm">{t("panel_tools")}</h3>
      </div>

      {/* Tabs — min-h-0 để flex con không tràn */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 px-3 pt-2">
          <TabsList className="w-full bg-background border border-border">
            <TabsTrigger value="fields" className="flex-1 text-xs data-[state=active]:bg-accent data-[state=active]:text-foreground">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              {t("panel_fields_tab")}
            </TabsTrigger>
            <TabsTrigger value="metadata" className="flex-1 text-xs data-[state=active]:bg-accent data-[state=active]:text-foreground">
              <Info className="w-3.5 h-3.5 mr-1.5" />
              {t("panel_metadata_tab")}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Dữ liệu — danh sách trường dữ liệu */}
        <TabsContent value="fields" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden data-[state=inactive]:hidden">
          <ScrollArea className="flex-1 min-h-0 px-3 py-2">
            <div className="space-y-2 min-w-0 pr-1">
              <div className="space-y-0.5">
                <h4 className="text-sm font-medium text-black uppercase">{t("panel_fields_title")}</h4>
                <p className="text-sm text-gray-500">{t("panel_fields_desc")}</p>
              </div>

              <div className="grid gap-4">
                {(['document', 'template', 'workspace', 'user'] as MergeFieldSource[]).map((sourceType) => {
                  const items = mergeFields.filter(f => f.source === sourceType)
                  if (items.length === 0) return null
                  
                  const sectionTitles: Record<MergeFieldSource, string> = {
                    template: "panel_source_template",
                    workspace: "panel_source_workspace",
                    user: "panel_source_user",
                    document: "panel_source_document"
                  }
                  
                  const isCollapsed = collapsedSections[sourceType]
                  const toggleCollapse = () => setCollapsedSections(prev => ({ ...prev, [sourceType]: !prev[sourceType] }))
                  
                  return (
                    <div key={sourceType} className="space-y-3 pt-2 first:pt-0">
                      <div 
                        className="flex items-center gap-2 cursor-pointer group select-none"
                        onClick={toggleCollapse}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                        <h5 className="text-sm text-gray-500 font-medium uppercase tracking-wider">{t(sectionTitles[sourceType]) || sectionTitles[sourceType]}</h5>
                        <div className="h-px flex-1 bg-border"></div>
                      </div>
                      {!isCollapsed && (
                        <div className="grid gap-1.5 max-h-[320px] overflow-y-auto p-1.5 rounded-lg border border-border/80 bg-muted/40 shadow-inner [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-black/5 dark:[&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-track]:my-1 [&::-webkit-scrollbar-thumb]:bg-black/20 dark:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-black/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/30">
                        {items.map((field) => {
                          const index = mergeFields.findIndex(f => f.key === field.key)
                          return (
                            <Card
                              key={field.key}
                              id={`field-card-${field.key}`}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('application/lawzy-merge-field', JSON.stringify({
                                  id: field.key,
                                  label: field.label,
                                  value: mergeFieldValues[field.key] ?? field.value
                                }))
                                e.dataTransfer.effectAllowed = 'copy'
                              }}
                              className="p-3 min-w-0 bg-background border-border hover:border-primary/40 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group flex flex-col gap-2 rounded-md shadow-sm"
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="text-xs font-medium text-blue-500 group-hover:text-blue-700 cursor-pointer truncate flex-1 min-w-0"
                                  onClick={() => insertField(field)}
                                  title={t("panel_insert_tooltip")}
                                >
                                  {field.label || field.key}
                                </span>
                                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-white hover:bg-destructive"
                                    onClick={() => handleDeleteField(field.key)}
                                    title={t("panel_delete_field")}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-accent"
                                    onClick={() => insertField(field)}
                                    title={t("panel_insert_field")}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-[10px] text-muted-foreground/70 font-mono truncate" title={`Key: {{${field.key}}}`}>
                                Key: {`{{${field.key}}}`}
                              </p>
                              <Input
                                value={
                                  pendingMergeFieldDrafts[field.key] ??
                                  mergeFieldValues[field.key] ??
                                  field.value
                                }
                                onChange={(e) => handleDraftChange(field.key, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                onClick={() => {
                                  // Check auth when clicking on input
                                  if (!isAuthenticated && onAuthRequired) {
                                    onAuthRequired()
                                  }
                                }}
                                className="field-value-input h-7 bg-background border-border text-foreground text-xs placeholder:text-muted-foreground"
                                placeholder={t("panel_field_value")}
                                readOnly={!isAuthenticated}
                              />
                            </Card>
                          )
                        })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <Separator className="bg-border my-2" />

              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("panel_add_field_title")}</h4>
                <div className="space-y-2">
                  <Input
                    placeholder={t("panel_add_field_label")}
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    className="bg-background border-border text-sm h-9"
                  />
                  <Input
                    placeholder={t("panel_add_field_default")}
                    value={newFieldDefault}
                    onChange={(e) => setNewFieldDefault(e.target.value)}
                    className="bg-background border-border text-sm h-9"
                  />
                  <Button
                    size="sm"
                    type="button"
                    onClick={handleAddCustomField}
                    className="w-full"
                  >
                    {t("panel_add_field_btn")}
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata" className="flex-1 flex flex-col min-h-0 m-0 overflow-hidden data-[state=inactive]:hidden">
          <ScrollArea className="flex-1 min-h-0 p-3">
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-black uppercase">{t("panel_metadata_title")}</h4>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("panel_meta_name")}</Label>
                  <Input 
                    value={metadata.title || ""} 
                    onChange={(e) => updateMetadata({ title: e.target.value })}
                    placeholder={t("panel_meta_name_placeholder")}
                    className="bg-background border-border" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("panel_meta_status")}</Label>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2 py-1 rounded text-xs border capitalize',
                        metadata.status === 'completed'
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : metadata.status === 'review'
                          ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                      )}
                    >
                      {metadata.status === 'completed' 
                        ? t("status_completed")
                        : metadata.status === 'review' 
                        ? t("status_review")
                        : t("status_draft")}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("panel_meta_creator")}</Label>
                  <div className="flex items-center gap-2">
                    {metadata.creator?.avatar || currentUser?.avatar ? (
                      <Image
                        src={metadata.creator?.avatar || currentUser?.avatar || ""}
                        alt="Avatar"
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.srcset = ""
                          e.currentTarget.src = "/logo/lawzy-triangle.png"
                        }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white uppercase">
                        {(metadata.creator?.name || currentUser?.name || (locale === 'en' ? 'G' : 'K')).charAt(0)}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-foreground truncate">
                        {metadata.creator?.name || currentUser?.name || (locale === 'en' ? 'Guest' : 'Khách')}
                      </span>
                      {(metadata.creator?.email || currentUser?.email) && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          {metadata.creator?.email || currentUser?.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-border" />

              <div className="space-y-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("panel_history_title")}</h4>
                {!isAuthenticated ? (
                  <div className="text-sm text-muted-foreground">
                    {t("panel_history_login")}
                  </div>
                ) : !currentDocumentId ? (
                  <div className="text-sm text-muted-foreground">
                    {t("panel_history_empty")}
                  </div>
                ) : versions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {t("panel_history_no_versions")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {versions.map((v, idx) => (
                      <Card
                        key={v.id}
                        className="p-3 bg-background border-border flex items-start justify-between gap-2 group/version"
                      >
                        <div className="min-w-0 flex-1">
                          {editingVersionId === v.id ? (
                            <div className="flex flex-col gap-1.5 pb-1">
                              <Input
                                autoFocus
                                value={editingLabel}
                                onChange={(e) => setEditingLabel(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateVersionLabel(v.id)
                                  if (e.key === 'Escape') setEditingVersionId(null)
                                }}
                                onBlur={() => handleUpdateVersionLabel(v.id)}
                                className="h-7 text-sm px-2 bg-muted/50 border-primary/30 focus-visible:ring-primary/20"
                              />
                            </div>
                          ) : (
                            <div 
                              className="text-sm font-medium truncate cursor-pointer hover:text-primary transition-colors pr-6 relative flex items-center gap-1.5"
                              onClick={() => {
                                setEditingVersionId(v.id)
                                setEditingLabel(v.label || t('panel_version_n', { n: versions.length - idx }))
                              }}
                            >
                              <span>{v.label || t('panel_version_n', { n: versions.length - idx })}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 opacity-0 group-hover/version:opacity-100 transition-opacity hover:bg-transparent"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="text-muted-foreground"
                                >
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                  <path d="m15 5 4 4" />
                                </svg>
                              </Button>
                            </div>
                          )}
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(v.createdAt).toLocaleString('vi-VN')}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="shrink-0 h-8"
                          disabled={restoring === v.id || editingVersionId === v.id}
                          onClick={() => handleRestoreVersion(v.id)}
                          title={t("panel_restore_btn")}
                        >
                          {restoring === v.id ? t("panel_restoring") : t("panel_restore_btn")}
                        </Button>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
