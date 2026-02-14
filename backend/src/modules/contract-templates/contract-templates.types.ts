export type TemplateScope = 'system' | 'community';

export interface ContractTemplateFile {
  key: string;
  id: string; // filename within scope, e.g. uuid.pdf
  fileName: string; // same as id for now
  /** Optional display name (stored in R2 object metadata for community uploads) */
  name?: string;
  /** Optional description (stored in R2 object metadata for community uploads) */
  description?: string;
  size: number;
  lastModified: string | null;
}

