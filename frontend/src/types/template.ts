export type ClauseRiskLevel = 'low' | 'medium' | 'high';

export type MergeFieldDataType = 'string' | 'date' | 'number' | 'currency' | 'text';

export interface MergeFieldDefinition {
  fieldKey: string;
  label: string;
  dataType: MergeFieldDataType;
  required: boolean;
  sampleValue?: string;
}

export interface ContentFieldNode {
  type: 'field';
  attrs: {
    fieldKey: string;
    label?: string;
    fieldType?: MergeFieldDataType;
  };
}

export interface ContentClauseNode {
  type: 'clause';
  attrs: {
    clauseId: string;
    riskLevel: ClauseRiskLevel;
    lawCitations?: string[];
    title: string;
  };
  content: ContentNode[];
}

export type ContentBlockAlign = 'left' | 'center';

export interface ContentHeadingNode {
  type: 'heading';
  attrs: { level: 1 | 2 | 3; align?: ContentBlockAlign };
  content: ContentNode[];
}

export interface ContentParagraphNode {
  type: 'paragraph';
  attrs?: { align?: ContentBlockAlign; divider?: boolean };
  content: (ContentTextNode | ContentFieldNode)[];
}

export interface ContentTextNode {
  type: 'text';
  text?: string;
  marks?: { type: string }[];
}

export type ContentNode =
  | ContentHeadingNode
  | ContentParagraphNode
  | ContentClauseNode
  | ContentTextNode
  | ContentFieldNode;

export interface DocContent {
  type: 'doc';
  content: ContentNode[];
}

export interface TemplateMetadata {
  type?: string;
  industry?: string[];
  lawVersions?: string[];
  complexityTag?: string;
  useCaseTag?: string;
  [key: string]: unknown;
}

export interface Template {
  id: string;
  title: string;
  description: string | null;
  category: string;
  scope: string;
  contentJSON: DocContent | null;
  mergeFields: MergeFieldDefinition[] | null;
  metadata: TemplateMetadata | null;
  s3Key: string | null;
  createdAt: string;
  updatedAt: string;
}
