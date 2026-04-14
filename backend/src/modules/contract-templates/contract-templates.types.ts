export type TemplateScope = 'system' | 'community' | 'internal';

export type MergeFieldDataType = 'string' | 'date' | 'number' | 'currency' | 'text';

export interface MergeFieldDefinition {
  fieldKey: string;
  label: string;
  dataType: MergeFieldDataType;
  required: boolean;
  sampleValue?: string;
}

export interface ContentTextNode {
  type: 'text';
  text?: string;
  marks?: { type: string }[];
}

export interface ContentFieldNode {
  type: 'field';
  attrs: {
    fieldKey: string;
    label?: string;
    fieldType?: MergeFieldDataType;
  };
}

export interface ContentParagraphNode {
  type: 'paragraph';
  attrs?: { align?: 'left' | 'center'; divider?: boolean };
  content: Array<ContentTextNode | ContentFieldNode>;
}

export interface ContentHeadingNode {
  type: 'heading';
  attrs: { level: 1 | 2 | 3; align?: 'left' | 'center' };
  content: Array<ContentTextNode | ContentFieldNode>;
}

export interface ContentListItemNode {
  type: 'listItem';
  content: Array<ContentParagraphNode>;
}

export interface ContentBulletListNode {
  type: 'bulletList';
  content: Array<ContentListItemNode>;
}

export interface ContentClauseNode {
  type: 'clause';
  attrs: {
    clauseId: string;
    riskLevel: 'low' | 'medium' | 'high';
    title: string;
    lawCitations?: string[];
  };
  content: Array<ContentParagraphNode | ContentHeadingNode | ContentBulletListNode>;
}

export type ContentNode =
  | ContentTextNode
  | ContentFieldNode
  | ContentParagraphNode
  | ContentHeadingNode
  | ContentBulletListNode
  | ContentListItemNode
  | ContentClauseNode;

export interface DocContent {
  type: 'doc';
  content: Array<ContentParagraphNode | ContentHeadingNode | ContentBulletListNode | ContentClauseNode>;
}

export interface ContractTemplateMetadata {
  workspaceId?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  legacyId?: string;
  sourceFileName?: string;
  processingStatus?: 'ready' | 'failed';
  publishStatus?: 'published' | 'hidden';
  sanitizedFieldCount?: number;
  structuredAt?: string;
}

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
  mimeType?: string | null;
  hasStructuredContent?: boolean;
  processingStatus?: string | null;
  publishStatus?: string | null;
}

export interface StructuredContractTemplate {
  id: string;
  title: string;
  description: string | null;
  scope: TemplateScope;
  contentJSON: DocContent;
  mergeFields: MergeFieldDefinition[];
  metadata: ContractTemplateMetadata | null;
}
