export interface ContractParty {
  role: string
  name: string
  taxId?: string
}

export interface ContractMetadata {
  lawVersions: string[]
  tags: string[]
  riskLevel: 'low' | 'medium' | 'high'
  visibility: 'workspace' | 'private' | 'public'
  parties: ContractParty[]
}

export interface ContractVersion {
  versionId: string
  timestamp: string
  author: string
  changes: string
}

export interface AISuggestion {
  type: string
  title: string
  content: string
  relevance: number
  lawReference?: {
    law: string
    article: string
  }
}

export interface RiskAnalysis {
  clause: string
  level: 'low' | 'medium' | 'high'
  reason: string
  suggestion: string
}

export interface Contract {
  contractId: string
  title: string
  type: string
  status: 'draft' | 'active' | 'signed' | 'archived'
  contentJSON: Record<string, unknown>
  metadata: ContractMetadata
  mergeFieldValues: Record<string, string>
  versions: ContractVersion[]
  aiSuggestions: AISuggestion[]
  riskAnalysis: RiskAnalysis[]
  workspaceId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}
