'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Info,
  Pencil,
  Briefcase,
  Shield,
  Package,
  Building2,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  findWizardConfig,
  type ContractTypeId,
  type WizardField,
  type WizardFormStep,
  type ContractWizardConfig,
} from '@/lib/editor/contract-wizard-config'

// ─── Icon & Color maps ────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Briefcase,
  FileText,
  Shield,
  Package,
  Building2,
}

const ICON_BG: Record<string, string> = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  green: 'bg-emerald-500',
  orange: 'bg-orange-500',
  violet: 'bg-violet-500',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContractWizardProps {
  contractTypeId: ContractTypeId
  onBack: () => void
  onSubmit: (
    contractTypeId: ContractTypeId,
    roleId: string | null,
    values: Record<string, string>,
    steps: WizardFormStep[],
  ) => void
  isSubmitting?: boolean
}

type WizardPhase = 'role' | 'form' | 'review'

// ─── Field Input ──────────────────────────────────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
  hasError,
}: {
  field: WizardField
  value: string
  onChange: (v: string) => void
  hasError?: boolean
}) {
  if (field.type === 'toggle') {
    const isOn = value === 'true'
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        onClick={() => onChange(isOn ? 'false' : 'true')}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
          'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isOn ? 'bg-primary' : 'bg-input',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
            isOn ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    )
  }
  if (field.type === 'select' && field.options) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(hasError && 'border-destructive')}>
          <SelectValue placeholder={field.placeholder ?? '-- Chọn --'} />
        </SelectTrigger>
        <SelectContent>
          {field.options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  if (field.type === 'textarea') {
    return (
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={cn('min-h-[80px] resize-none', hasError && 'border-destructive')}
      />
    )
  }
  const inputType = field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'
  return (
    <div className="relative">
      <Input
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={cn(field.unit && 'pr-14', hasError && 'border-destructive')}
      />
      {field.unit && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {field.unit}
        </span>
      )}
    </div>
  )
}

// ─── Wizard Icon ──────────────────────────────────────────────────────────────

function WizardIcon({
  config,
  size = 'md',
}: {
  config: ContractWizardConfig
  size?: 'sm' | 'md' | 'lg'
}) {
  const Icon = ICON_MAP[config.icon]
  const bg = ICON_BG[config.color] ?? 'bg-slate-500'
  const sizeClass = size === 'lg' ? 'w-20 h-20 rounded-3xl' : size === 'sm' ? 'w-10 h-10 rounded-xl' : 'w-12 h-12 rounded-2xl'
  const iconSize = size === 'lg' ? 'w-10 h-10' : size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
  return (
    <div className={cn('shrink-0 flex items-center justify-center shadow-sm', sizeClass, bg)}>
      {Icon && <Icon className={cn('text-white', iconSize)} />}
    </div>
  )
}

// ─── Role Screen ──────────────────────────────────────────────────────────────

function RoleScreen({
  config,
  onBack,
  onSelectRole,
}: {
  config: ContractWizardConfig
  onBack: () => void
  onSelectRole: (roleId: string) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 px-6 pt-5 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại chọn loại hợp đồng
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 pb-6 gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <WizardIcon config={config} size="lg" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">{config.title}</h1>
            <p className="mt-1.5 text-muted-foreground">{config.roleQuestion}</p>
          </div>
        </div>

        <div className="w-full max-w-lg space-y-3">
          {(config.roles ?? []).map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelected(role.id)}
              className={cn(
                'w-full text-left px-6 py-5 rounded-2xl border-2 transition-all duration-150',
                selected === role.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-foreground/20',
              )}
            >
              <p className="text-lg font-bold text-foreground">{role.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{role.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-6 pb-8">
        <div className="w-full max-w-lg mx-auto">
          <Button
            className="w-full h-12 text-base"
            disabled={!selected}
            onClick={() => { if (selected) onSelectRole(selected) }}
          >
            {selected ? (
              <>
                Tiếp tục
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            ) : (
              'Vui lòng chọn vai trò'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Form Step Screen ─────────────────────────────────────────────────────────

function FormStepScreen({
  config,
  step,
  stepIndex,
  totalSteps,
  values,
  onFieldChange,
  onBack,
  onNext,
}: {
  config: ContractWizardConfig
  step: WizardFormStep
  stepIndex: number
  totalSteps: number
  values: Record<string, string>
  onFieldChange: (key: string, value: string) => void
  onBack: () => void
  onNext: () => void
}) {
  const [errors, setErrors] = useState<Set<string>>(new Set())
  const progress = Math.round(((stepIndex) / totalSteps) * 100)

  const handleNext = useCallback(() => {
    const missing = new Set<string>()
    for (const field of step.fields) {
      if (field.required && field.type !== 'toggle' && !values[field.key]?.trim()) {
        missing.add(field.key)
      }
    }
    setErrors(missing)
    if (missing.size === 0) onNext()
  }, [step.fields, values, onNext])

  const toggleFields = step.fields.filter((f) => f.type === 'toggle')
  const regularFields = step.fields.filter((f) => f.type !== 'toggle')

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Sticky header */}
      <div className="shrink-0 bg-background border-b border-border">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <WizardIcon config={config} size="sm" />
            <div>
              <h2 className="text-sm font-semibold text-foreground leading-tight">{config.title}</h2>
              <p className="text-xs text-muted-foreground">
                Bước {stepIndex + 1} / {totalSteps}
              </p>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted w-full">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 max-w-2xl mx-auto space-y-6">
          {/* Step card */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {/* Card header */}
            <div className="px-6 pt-6 pb-4 border-b border-border/60">
              <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
              {step.description && (
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              )}
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Tip banner */}
              {step.tip && (
                <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl px-4 py-3">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">{step.tip}</p>
                </div>
              )}

              {/* Regular fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {regularFields.map((field) => {
                  const hasError = errors.has(field.key)
                  return (
                    <div
                      key={field.key}
                      className={cn('space-y-1.5', field.fullWidth && 'sm:col-span-2')}
                    >
                      <Label className={cn('text-sm font-medium', hasError && 'text-destructive')}>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <FieldInput
                        field={field}
                        value={values[field.key] ?? field.defaultValue ?? ''}
                        onChange={(v) => {
                          onFieldChange(field.key, v)
                          if (errors.has(field.key)) {
                            setErrors((prev) => {
                              const next = new Set(prev)
                              next.delete(field.key)
                              return next
                            })
                          }
                        }}
                        hasError={hasError}
                      />
                      {field.hint && !hasError && (
                        <p className="text-xs text-muted-foreground flex items-start gap-1">
                          <span>💡</span>
                          <span>{field.hint}</span>
                        </p>
                      )}
                      {hasError && (
                        <p className="text-xs text-destructive">Trường này là bắt buộc</p>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Toggle fields */}
              {toggleFields.length > 0 && (
                <div className="space-y-3 pt-1">
                  {toggleFields.map((field) => {
                    const isOn = (values[field.key] ?? field.defaultValue ?? 'false') === 'true'
                    return (
                      <div
                        key={field.key}
                        className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{field.label}</p>
                          {field.hint && (
                            <p className="text-xs text-muted-foreground mt-0.5">{field.hint}</p>
                          )}
                        </div>
                        <FieldInput
                          field={field}
                          value={values[field.key] ?? field.defaultValue ?? 'false'}
                          onChange={(v) => onFieldChange(field.key, v)}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom nav */}
      <div className="shrink-0 border-t border-border bg-background px-6 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button variant="outline" onClick={onBack} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </Button>
          <Button className="flex-1 gap-1.5" onClick={handleNext}>
            {stepIndex === totalSteps - 1 ? 'Xem lại thông tin' : 'Tiếp tục'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Review Screen ────────────────────────────────────────────────────────────

function ReviewScreen({
  config,
  roleId,
  steps,
  values,
  onBack,
  onGoToStep,
  onSubmit,
  isSubmitting,
}: {
  config: ContractWizardConfig
  roleId: string | null
  steps: WizardFormStep[]
  values: Record<string, string>
  onBack: () => void
  onGoToStep: (stepIndex: number) => void
  onSubmit: () => void
  isSubmitting: boolean
}) {
  const roleLabel = roleId ? config.roles?.find((r) => r.id === roleId)?.title : null

  const getDisplayValue = (field: WizardField): string => {
    const raw = values[field.key] ?? field.defaultValue ?? ''
    if (field.type === 'toggle') return raw === 'true' ? 'Có' : 'Không'
    return raw || '—'
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Back link */}
      <div className="shrink-0 px-6 pt-5 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại chỉnh sửa
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pb-8 max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <WizardIcon config={config} size="md" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Xem xét hợp đồng</h1>
              <p className="text-sm text-muted-foreground">
                {config.title}
                {roleLabel && <> • {roleLabel}</>}
              </p>
            </div>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-3 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/30 px-5 py-4">
            <FileText className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Kiểm tra kỹ thông tin trước khi hoàn tất
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5 leading-relaxed">
                Bạn có thể chỉnh sửa bất kỳ thông tin nào bằng cách nhấp vào biểu tượng bút chì bên cạnh.
                Sau khi xác nhận, hợp đồng sẽ được tạo dưới dạng tài liệu có thể chỉnh sửa.
              </p>
            </div>
          </div>

          {/* Step sections */}
          {steps.map((step, stepIdx) => {
            const toggleFields = step.fields.filter((f) => f.type === 'toggle')
            const regularFields = step.fields.filter((f) => f.type !== 'toggle')
            return (
              <div key={step.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                {/* Section header */}
                <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-border/60">
                  <div>
                    <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                    {step.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onGoToStep(stepIdx)}
                    className="shrink-0 ml-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Chỉnh sửa bước này"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {/* Regular fields grid */}
                  {regularFields.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {regularFields.map((field) => {
                        const val = getDisplayValue(field)
                        return (
                          <div
                            key={field.key}
                            className={cn('space-y-1', field.fullWidth && 'sm:col-span-2')}
                          >
                            <p className="text-xs text-muted-foreground font-medium">{field.label}</p>
                            <div className="rounded-lg bg-muted/50 border border-border/50 px-3 py-2">
                              <p className={cn('text-sm', !values[field.key] && 'text-muted-foreground italic')}>
                                {val}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Toggle fields */}
                  {toggleFields.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {toggleFields.map((field) => {
                        const isOn = (values[field.key] ?? field.defaultValue ?? 'false') === 'true'
                        return (
                          <div
                            key={field.key}
                            className={cn(
                              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border',
                              isOn
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : 'bg-muted text-muted-foreground border-border',
                            )}
                          >
                            <CheckCircle2 className={cn('w-3.5 h-3.5', !isOn && 'opacity-30')} />
                            {field.label}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Submit button */}
          <Button
            className="w-full h-12 text-base gap-2"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang tạo hợp đồng...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Xác nhận và tạo hợp đồng
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function ContractWizard({
  contractTypeId,
  onBack,
  onSubmit,
  isSubmitting = false,
}: ContractWizardProps) {
  const config = findWizardConfig(contractTypeId)
  const [phase, setPhase] = useState<WizardPhase>(
    config?.roles ? 'role' : 'form',
  )
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [formStep, setFormStep] = useState(0)
  const [editingFromReview, setEditingFromReview] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})

  if (!config) return null

  const steps = config.getSteps(selectedRole)
  const totalSteps = steps.length

  const handleFieldChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId)
    setPhase('form')
    setFormStep(0)
  }

  const handleFormBack = () => {
    if (formStep === 0) {
      if (config.roles) {
        setPhase('role')
      } else {
        onBack()
      }
    } else {
      setFormStep((s) => s - 1)
      setEditingFromReview(false)
    }
  }

  const handleFormNext = () => {
    if (editingFromReview) {
      setPhase('review')
      setEditingFromReview(false)
    } else if (formStep === totalSteps - 1) {
      setPhase('review')
    } else {
      setFormStep((s) => s + 1)
    }
  }

  const handleGoToStep = (stepIdx: number) => {
    setFormStep(stepIdx)
    setEditingFromReview(true)
    setPhase('form')
  }

  const handleSubmit = () => {
    onSubmit(contractTypeId, selectedRole, values, steps)
  }

  const slideVariants = {
    enter: { opacity: 0, x: 24 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
  }

  return (
    <div className="h-full w-full bg-muted/20 overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {phase === 'role' && (
          <motion.div
            key="role"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="h-full"
          >
            <RoleScreen config={config} onBack={onBack} onSelectRole={handleRoleSelect} />
          </motion.div>
        )}

        {phase === 'form' && steps[formStep] && (
          <motion.div
            key={`form-${formStep}`}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="h-full"
          >
            <FormStepScreen
              config={config}
              step={steps[formStep]}
              stepIndex={formStep}
              totalSteps={totalSteps}
              values={values}
              onFieldChange={handleFieldChange}
              onBack={handleFormBack}
              onNext={handleFormNext}
            />
          </motion.div>
        )}

        {phase === 'review' && (
          <motion.div
            key="review"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="h-full"
          >
            <ReviewScreen
              config={config}
              roleId={selectedRole}
              steps={steps}
              values={values}
              onBack={() => {
                setFormStep(totalSteps - 1)
                setPhase('form')
              }}
              onGoToStep={handleGoToStep}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
