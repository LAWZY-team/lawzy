export type QuestionnaireFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'

export interface QuestionnaireField {
  key: string
  label: string
  type: QuestionnaireFieldType
  required?: boolean
  placeholder?: string
  defaultValue?: string
  options?: string[]
  mergeFieldKey?: string
  description?: string
  validation?: { min?: number; max?: number; pattern?: string }
}

export interface QuestionnaireSection {
  title: string
  description?: string
  fields: QuestionnaireField[]
}

export interface QuestionnaireSchema {
  title: string
  description?: string
  sections: QuestionnaireSection[]
  autoFillFromProfile?: boolean
}

export interface IntakeQuestionnaireResult {
  type: 'intake_questionnaire'
  message: string
  questionnaire: QuestionnaireSchema
}
