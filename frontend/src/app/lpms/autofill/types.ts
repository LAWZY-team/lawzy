export interface AutofillFieldMapping {
  id: string
  label: string
  placeholder: string
  mappedKey: string
  source: 'auto' | 'highlight'
  count: number
}

export interface AutofillTemplateDoc {
  id: string
  fileName: string
  fileType: 'docx' | 'pdf'
  status: 'draft' | 'done'
  fields: AutofillFieldMapping[]
  previewHtml?: string | null
  plainText?: string
  /** Transient in-memory buffer for immediate client filling / preview before save */
  _fileBuffer?: ArrayBuffer | null
  /** Base64 if small enough for localStorage persistence */
  _base64?: string
  _fileBase64?: string
}

export interface AutofillTemplateBundle {
  id: string
  name: string
  description?: string
  category?: string
  scope: 'user' | 'workspace'
  documents: AutofillTemplateDoc[]
  createdAt: string
  updatedAt: string
}
