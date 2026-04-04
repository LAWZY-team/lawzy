export type TemplateScope = 'system' | 'community' | 'internal';

export interface ContractTemplateFile {
  key: string | null;
  id: string; // Template.id
  fileName: string;
  name?: string;
  description?: string;
  size: number;
  lastModified: string | null;
  scope: TemplateScope;
  workspaceId?: string | null;
  createdBy?: string | null;
  creatorName?: string | null;
}
