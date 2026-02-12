/**
 * Template types — extended schema for LAWZY MVP
 * Covers: library filter, canvas editor binding, merge fields, clause metadata,
 * AI review, export ToC, semantic search, compliance.
 */

export type TemplateStatus = 'published' | 'draft' | 'deprecated';

export type TemplateComplexity = 'simple' | 'medium' | 'advanced';

export type ClauseRiskLevel = 'low' | 'medium' | 'high';

export type ReviewStatus = 'draft' | 'peer_reviewed' | 'legal_approved';

export type MergeFieldDataType = 'string' | 'date' | 'number' | 'currency' | 'text';

/** Rich merge field definition for UI binding, validation, preview */
export interface MergeFieldDefinition {
  fieldKey: string;
  label: string;
  dataType: MergeFieldDataType;
  required: boolean;
  sampleValue?: string;
}

/** Usage stats for popularity / semantic filter */
export interface TemplateUsageStats {
  usedCount: number;
  lastUsedAt: string | null;
}

/** Inline placeholder in content — typed for editor/export */
export interface ContentFieldNode {
  type: 'field';
  attrs: {
    fieldKey: string;
    label?: string;
    fieldType?: MergeFieldDataType;
  };
}

/** Clause block with metadata for AI review, ToC, export */
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

/** Alignment for contract header / legal doc layout */
export type ContentBlockAlign = 'left' | 'center';

/** Classic heading (ProseMirror-like). align: dùng cho quốc hiệu, tiêu đề HĐ (căn giữa). */
export interface ContentHeadingNode {
  type: 'heading';
  attrs: { level: 1 | 2 | 3; align?: ContentBlockAlign };
  content: ContentNode[];
}

/** Classic paragraph. align: căn trái/giữa; divider: true = gạch ngang dưới quốc hiệu. */
export interface ContentParagraphNode {
  type: 'paragraph';
  attrs?: { align?: ContentBlockAlign; divider?: boolean };
  content: (ContentTextNode | ContentFieldNode)[];
}

/** Text with optional marks */
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

export interface Template {
  templateId: string;
  slug: string;
  version: string;
  status: TemplateStatus;
  type: string;
  title: string;
  description: string;
  thumbnail: string;
  industry: string[];
  lawVersions: string[];
  primaryLaw?: string;
  secondaryLaw?: string[];
  useCaseTag?: string;
  complexityTag: TemplateComplexity;
  contentJSON: DocContent;
  mergeFields: MergeFieldDefinition[];
  popularity: number;
  usageStats: TemplateUsageStats;
  author: string;
  reviewStatus: ReviewStatus;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface TemplatesResponse {
  templates: Template[];
}
