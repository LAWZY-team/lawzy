'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronRight, Send, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useT } from '@/components/i18n-provider'
import type {
  QuestionnaireSchema,
  QuestionnaireField,
  QuestionnaireSection,
} from '@/types/questionnaire'
import type { UserCustomField } from '@/stores/user-fields-store'
import type { WorkspaceFieldItem } from '@/hooks/workspaces/use-workspace-fields'
import Image from 'next/image'

interface QuestionnaireFormProps {
  schema: QuestionnaireSchema
  mergeFieldValues: Record<string, string>
  userFields: UserCustomField[]
  workspaceFields: WorkspaceFieldItem[]
  onSubmit: (values: Record<string, string>) => void
  onSkip: () => void
  isSubmitting?: boolean
}

export function autoFillQuestionnaire(
  schema: QuestionnaireSchema,
  mergeFieldValues: Record<string, string>,
  userFields: UserCustomField[],
  workspaceFields: WorkspaceFieldItem[],
): Record<string, string> {
  const values: Record<string, string> = {}

  const knownValues = new Map<string, string>()
  for (const [k, v] of Object.entries(mergeFieldValues)) {
    if (v) knownValues.set(k, v)
  }
  for (const wf of workspaceFields) {
    if (wf.defaultValue && !knownValues.has(wf.key)) {
      knownValues.set(wf.key, wf.defaultValue)
    }
  }
  for (const uf of userFields) {
    if (uf.defaultValue && !knownValues.has(uf.key)) {
      knownValues.set(uf.key, uf.defaultValue)
    }
  }

  for (const section of schema.sections) {
    for (const field of section.fields) {
      const mfk = field.mergeFieldKey || field.key
      const resolved = knownValues.get(mfk) || knownValues.get(field.key) || ''
      if (resolved) {
        values[field.key] = resolved
      } else if (field.defaultValue) {
        values[field.key] = field.defaultValue
      }
    }
  }

  return values
}

function FieldRenderer({
  field,
  value,
  onChange,
  checkboxValues,
  onCheckboxChange,
}: {
  field: QuestionnaireField
  value: string
  onChange: (value: string) => void
  checkboxValues: string[]
  onCheckboxChange: (option: string, checked: boolean) => void
}) {
  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="min-h-[60px] text-sm"
        />
      )

    case 'number':
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          min={field.validation?.min}
          max={field.validation?.max}
        />
      )

    case 'date':
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case 'select':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={field.placeholder || field.label} />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case 'radio':
      return (
        <RadioGroup value={value} onValueChange={onChange} className="flex flex-wrap gap-3">
          {(field.options || []).map((opt) => (
            <div key={opt} className="flex items-center gap-2">
              <RadioGroupItem value={opt} id={`${field.key}-${opt}`} />
              <Label htmlFor={`${field.key}-${opt}`} className="text-sm font-normal cursor-pointer">
                {opt}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )

    case 'checkbox':
      return (
        <div className="flex flex-wrap gap-3">
          {(field.options || []).map((opt) => (
            <div key={opt} className="flex items-center gap-2">
              <Checkbox
                id={`${field.key}-${opt}`}
                checked={checkboxValues.includes(opt)}
                onCheckedChange={(checked) => onCheckboxChange(opt, !!checked)}
              />
              <Label htmlFor={`${field.key}-${opt}`} className="text-sm font-normal cursor-pointer">
                {opt}
              </Label>
            </div>
          ))}
        </div>
      )

    default:
      return (
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      )
  }
}

function SectionGroup({
  section,
  sectionIndex,
  values,
  onFieldChange,
}: {
  section: QuestionnaireSection
  sectionIndex: number
  values: Record<string, string>
  onFieldChange: (key: string, value: string) => void
}) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-left"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm font-medium">
          {sectionIndex + 1}. {section.title}
        </span>
        {section.description && (
          <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
            {section.description}
          </span>
        )}
      </button>

      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="px-4 py-3 space-y-4"
        >
          {section.fields.map((field) => {
            const fieldValue = values[field.key] || ''
            const checkboxValues = field.type === 'checkbox'
              ? (fieldValue ? fieldValue.split(',').map((s) => s.trim()) : [])
              : []

            return (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-sm">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.description && (
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                )}
                <FieldRenderer
                  field={field}
                  value={fieldValue}
                  onChange={(v) => onFieldChange(field.key, v)}
                  checkboxValues={checkboxValues}
                  onCheckboxChange={(opt, checked) => {
                    const current = fieldValue ? fieldValue.split(',').map((s) => s.trim()) : []
                    const next = checked
                      ? [...current, opt]
                      : current.filter((v) => v !== opt)
                    onFieldChange(field.key, next.join(', '))
                  }}
                />
              </div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}

export function QuestionnaireForm({
  schema,
  mergeFieldValues,
  userFields,
  workspaceFields,
  onSubmit,
  onSkip,
  isSubmitting = false,
}: QuestionnaireFormProps) {
  const { t } = useT()
  const [values, setValues] = useState<Record<string, string>>({})
  const [hasInitialized, setHasInitialized] = useState(false)

  useEffect(() => {
    if (hasInitialized) return
    const autoFilled = autoFillQuestionnaire(schema, mergeFieldValues, userFields, workspaceFields)
    
    const timeoutId = setTimeout(() => {
      setValues(autoFilled)
      setHasInitialized(true)
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [schema, mergeFieldValues, userFields, workspaceFields, hasInitialized])

  const handleFieldChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSubmit = useCallback(() => {
    const allFields = schema.sections.flatMap((s) => s.fields)
    const missingRequired = allFields.filter(
      (f) => f.required && !values[f.key]?.trim()
    )
    if (missingRequired.length > 0) {
      const labels = missingRequired.map((f) => f.label).join(', ')
      alert(t('questionnaire_missing_required').replace('{fields}', labels))
      return
    }
    onSubmit(values)
  }, [schema, values, onSubmit, t])

  const filledCount = Object.values(values).filter(Boolean).length
  const totalCount = schema.sections.reduce((acc, s) => acc + s.fields.length, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex gap-4 w-full"
    >
      <div className="shrink-0 mt-1">
        <Image
          src="/logo/lawzy-triangle.png"
          width={24}
          height={24}
          alt="Lawzy"
          className="object-contain"
        />
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-muted-foreground mb-1 px-1 block">Lawzy</span>

        <div className="rounded-2xl border border-border bg-background/50 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold">{schema.title}</h3>
            {schema.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{schema.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${totalCount > 0 ? (filledCount / totalCount) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {filledCount}/{totalCount}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
            {schema.sections.map((section, idx) => (
              <SectionGroup
                key={idx}
                section={section}
                sectionIndex={idx}
                values={values}
                onFieldChange={handleFieldChange}
              />
            ))}
          </div>

          <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-3 bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              disabled={isSubmitting}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <SkipForward className="w-3.5 h-3.5" />
              {t('questionnaire_skip')}
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? t('common_loading') : t('questionnaire_submit')}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
