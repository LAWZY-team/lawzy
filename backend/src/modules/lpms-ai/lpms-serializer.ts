/** Serialize Prisma LPMS entities to Mike-compatible snake_case JSON. */

const toIso = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : String(d);
};

export const serializeWorkflow = (wf: Record<string, unknown>) => ({
  id: wf.id,
  user_id: wf.userId ?? null,
  title: wf.title,
  type: wf.type,
  prompt_md: wf.promptMd ?? null,
  columns_config: wf.columnsConfig ?? null,
  practice: wf.practice ?? null,
  is_system: wf.isSystem ?? false,
  created_at: toIso(wf.createdAt as Date),
});

export const serializeTabularReview = (
  review: Record<string, unknown>,
  extras?: { document_count?: number },
) => ({
  id: review.id,
  project_id: review.projectId ?? null,
  user_id: review.userId,
  workspace_id: review.workspaceId,
  title: review.title ?? null,
  columns_config: review.columnsConfig ?? null,
  document_ids: review.documentIds ?? null,
  workflow_id: review.workflowId ?? null,
  practice: review.practice ?? null,
  shared_with: review.sharedWith ?? null,
  created_at: toIso(review.createdAt as Date),
  updated_at: toIso(review.updatedAt as Date),
  document_count:
    extras?.document_count ??
    (Array.isArray(review.documentIds) ? review.documentIds.length : 0),
});

export const serializeTabularCell = (cell: Record<string, unknown>) => {
  let content = cell.content;
  if (typeof content === 'string') {
    try {
      content = JSON.parse(content);
    } catch {
      /* keep string */
    }
  }
  return {
    id: cell.id,
    review_id: cell.reviewId,
    document_id: cell.documentId,
    column_index: cell.columnIndex,
    content,
    citations: cell.citations ?? null,
    status: cell.status,
    created_at: toIso(cell.createdAt as Date),
  };
};

export const serializeDocument = (doc: Record<string, unknown>) => ({
  id: doc.id,
  project_id: doc.projectId ?? null,
  folder_id: doc.folderId ?? null,
  filename: doc.title ?? doc.filename ?? 'Untitled',
  file_type: doc.type ?? doc.file_type ?? null,
  status: doc.status ?? 'active',
  created_at: toIso(doc.createdAt as Date),
  updated_at: toIso(doc.updatedAt as Date),
});

export const serializeProject = (project: Record<string, unknown>) => ({
  id: project.id,
  user_id: project.userId ?? project.createdBy ?? null,
  name: project.name,
  cm_number: project.cmNumber ?? project.code ?? null,
  shared_with: project.sharedWith ?? [],
  created_at: toIso(project.createdAt as Date),
  updated_at: toIso(project.updatedAt as Date),
  document_count:
    (project._count as { documents?: number } | undefined)?.documents ??
    project.document_count,
  chat_count: project.chat_count,
  review_count: project.review_count,
  documents: Array.isArray(project.documents)
    ? project.documents.map((d) => serializeDocument(d as Record<string, unknown>))
    : undefined,
  folders: project.folders,
});

export const serializeLpmsChat = (chat: Record<string, unknown>) => ({
  id: chat.id,
  user_id: chat.userId,
  project_id: chat.projectId ?? null,
  title: chat.title ?? null,
  created_at: toIso(chat.createdAt as Date),
  updated_at: toIso(chat.updatedAt as Date),
});
