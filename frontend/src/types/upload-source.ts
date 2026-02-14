/**
 * User Upload Sources — nguồn pháp lý do workspace upload.
 * Dùng cho tham chiếu/trích dẫn khi AI soạn hợp đồng; khác với Thư viện mẫu hợp đồng (template).
 */

export type UploadSourceStatus = 'pending' | 'processing' | 'ready' | 'error';

export interface UploadSource {
  sourceId: string;
  workspaceId: string;
  fileName: string;
  title: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  status: UploadSourceStatus;
  errorMessage?: string;
  pageCount?: number;
  chunkCount?: number;
  tags: string[];
  createdAt: string;
  createdBy: string;
  processedAt?: string;
  /** Nội dung text đã extract để xem trước (dùng trong UI preview) */
  previewText?: string;
}

export interface SourceChunk {
  chunkId: string;
  sourceId: string;
  workspaceId: string;
  pageNumber: number;
  sectionTitle?: string;
  text: string;
  startOffset: number;
  endOffset: number;
  embeddingId?: string;
}

/** Citation từ nguồn upload trong output AI */
export interface SourceCitation {
  sourceId: string;
  fileName: string;
  pageNumber: number;
  excerpt: string;
  usedInClause: string;
}
