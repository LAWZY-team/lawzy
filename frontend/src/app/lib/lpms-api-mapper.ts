import type {
    ColumnConfig,
    Document,
    Folder,
    Project,
    TabularCell,
    TabularReview,
    TabularReviewDetailOut,
    Workflow,
} from "@/components/lpms/shared/types";

const toIso = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (value instanceof Date) return value.toISOString();
    return "";
};

const parseJsonArray = <T>(value: unknown): T[] | null => {
    if (value == null) return null;
    if (Array.isArray(value)) return value as T[];
    return null;
};

const parseCellContent = (
    content: unknown,
): TabularCell["content"] => {
    if (content == null) return null;
    if (typeof content === "object" && !Array.isArray(content)) {
        return content as TabularCell["content"];
    }
    if (typeof content === "string") {
        try {
            return JSON.parse(content) as TabularCell["content"];
        } catch {
            return null;
        }
    }
    return null;
};

export const mapWorkflowFromServer = (raw: Record<string, unknown>): Workflow => ({
    id: String(raw.id ?? ""),
    user_id: (raw.userId as string | null) ?? (raw.user_id as string | null) ?? null,
    title: String(raw.title ?? ""),
    type: (raw.type as Workflow["type"]) ?? "assistant",
    prompt_md: (raw.promptMd as string | null) ?? (raw.prompt_md as string | null) ?? null,
    columns_config:
        parseJsonArray<ColumnConfig>(raw.columnsConfig ?? raw.columns_config) ?? null,
    is_system: Boolean(raw.isSystem ?? raw.is_system ?? false),
    practice: (raw.practice as string | null) ?? null,
    created_at: toIso(raw.createdAt ?? raw.created_at),
    allow_edit: raw.allow_edit as boolean | undefined,
    is_owner: raw.is_owner as boolean | undefined,
    shared_by_name: raw.shared_by_name as string | undefined,
});

export const mapTabularReviewFromServer = (
    raw: Record<string, unknown>,
): TabularReview => {
    const docIds = parseJsonArray<string>(raw.documentIds ?? raw.document_ids);
    const columns =
        parseJsonArray<ColumnConfig>(raw.columnsConfig ?? raw.columns_config) ?? null;
    return {
        id: String(raw.id ?? ""),
        project_id: (raw.projectId as string | null) ?? (raw.project_id as string | null) ?? null,
        user_id: String(raw.userId ?? raw.user_id ?? ""),
        title: (raw.title as string | null) ?? null,
        columns_config: columns,
        document_ids: docIds,
        workflow_id: (raw.workflowId as string | null) ?? (raw.workflow_id as string | null) ?? null,
        practice: (raw.practice as string | null) ?? null,
        shared_with: parseJsonArray<string>(raw.sharedWith ?? raw.shared_with) ?? undefined,
        is_owner: raw.is_owner as boolean | undefined,
        created_at: toIso(raw.createdAt ?? raw.created_at),
        updated_at: toIso(raw.updatedAt ?? raw.updated_at),
        document_count:
            (raw.document_count as number | undefined) ??
            (raw._count as { documents?: number } | undefined)?.documents ??
            docIds?.length,
    };
};

export const mapTabularCellFromServer = (raw: Record<string, unknown>): TabularCell => ({
    id: String(raw.id ?? ""),
    review_id: String(raw.reviewId ?? raw.review_id ?? ""),
    document_id: String(raw.documentId ?? raw.document_id ?? ""),
    column_index: Number(raw.columnIndex ?? raw.column_index ?? 0),
    content: parseCellContent(raw.content),
    status: (raw.status as TabularCell["status"]) ?? "pending",
    created_at: toIso(raw.createdAt ?? raw.created_at),
});

export const mapDocumentFromServer = (raw: Record<string, unknown>): Document => ({
    id: String(raw.id ?? ""),
    user_id: (raw.userId as string | undefined) ?? (raw.user_id as string | undefined),
    project_id: (raw.projectId as string | null) ?? (raw.project_id as string | null) ?? null,
    folder_id: (raw.folderId as string | null) ?? (raw.folder_id as string | null) ?? null,
    filename: String(raw.filename ?? raw.title ?? "Untitled"),
    file_type: (raw.file_type as string | null) ?? (raw.type as string | null) ?? null,
    storage_path: (raw.storage_path as string | null) ?? null,
    pdf_storage_path: (raw.pdf_storage_path as string | null) ?? null,
    size_bytes: (raw.size_bytes as number | null) ?? null,
    page_count: (raw.page_count as number | null) ?? null,
    structure_tree: (raw.structure_tree as Document["structure_tree"]) ?? null,
    status: (raw.status as Document["status"] | undefined) ?? "ready",
    created_at: toIso(raw.createdAt ?? raw.created_at) || null,
    updated_at: toIso(raw.updatedAt ?? raw.updated_at) || null,
    owner_email: raw.owner_email as string | null | undefined,
    owner_display_name: raw.owner_display_name as string | null | undefined,
});

export const mapFolderFromServer = (raw: Record<string, unknown>): Folder => ({
    id: String(raw.id ?? ""),
    project_id: String(raw.projectId ?? raw.project_id ?? ""),
    user_id: String(raw.userId ?? raw.user_id ?? ""),
    name: String(raw.name ?? ""),
    parent_folder_id:
        (raw.parentFolderId as string | null) ??
        (raw.parent_folder_id as string | null) ??
        null,
    created_at: toIso(raw.createdAt ?? raw.created_at),
    updated_at: toIso(raw.updatedAt ?? raw.updated_at),
});

export const mapProjectFromServer = (raw: Record<string, unknown>): Project => {
    const docs = raw.documents;
    const folders = raw.folders;
    return {
        id: String(raw.id ?? ""),
        user_id: String(raw.userId ?? raw.user_id ?? ""),
        is_owner: raw.is_owner as boolean | undefined,
        name: String(raw.name ?? ""),
        cm_number: (raw.cmNumber as string | null) ?? (raw.cm_number as string | null) ?? (raw.code as string | null) ?? null,
        shared_with: parseJsonArray<string>(raw.sharedWith ?? raw.shared_with) ?? [],
        created_at: toIso(raw.createdAt ?? raw.created_at),
        updated_at: toIso(raw.updatedAt ?? raw.updated_at),
        documents: Array.isArray(docs)
            ? docs.map((d) => mapDocumentFromServer(d as Record<string, unknown>))
            : undefined,
        folders: Array.isArray(folders)
            ? folders.map((f) => mapFolderFromServer(f as Record<string, unknown>))
            : undefined,
        document_count:
            (raw.document_count as number | undefined) ??
            (raw._count as { documents?: number } | undefined)?.documents,
        chat_count: raw.chat_count as number | undefined,
        review_count: raw.review_count as number | undefined,
    };
};

export const mapTabularReviewDetailFromServer = (
    raw: Record<string, unknown>,
): TabularReviewDetailOut => {
    const reviewRaw = (raw.review as Record<string, unknown>) ?? raw;
    const cellsRaw = raw.cells;
    const docsRaw = raw.documents;
    return {
        review: mapTabularReviewFromServer(reviewRaw),
        cells: Array.isArray(cellsRaw)
            ? cellsRaw.map((c) => mapTabularCellFromServer(c as Record<string, unknown>))
            : [],
        documents: Array.isArray(docsRaw)
            ? docsRaw.map((d) => mapDocumentFromServer(d as Record<string, unknown>))
            : [],
    };
};

export const toServerColumnsConfig = (
    columns: ColumnConfig[],
): ColumnConfig[] => columns;

export const toServerTabularReviewBody = (payload: {
    title?: string;
    document_ids: string[];
    columns_config: ColumnConfig[];
    workflow_id?: string;
    project_id?: string;
    workspaceId?: string;
}) => ({
    workspaceId: payload.workspaceId,
    title: payload.title,
    documentIds: payload.document_ids,
    columnsConfig: payload.columns_config,
    workflowId: payload.workflow_id,
    projectId: payload.project_id,
});

export const toServerTabularReviewPatch = (payload: {
    title?: string;
    columns_config?: ColumnConfig[];
    document_ids?: string[];
    project_id?: string | null;
    shared_with?: string[];
}) => ({
    ...(payload.title !== undefined && { title: payload.title }),
    ...(payload.columns_config !== undefined && {
        columnsConfig: payload.columns_config,
    }),
    ...(payload.document_ids !== undefined && { documentIds: payload.document_ids }),
    ...(payload.project_id !== undefined && { projectId: payload.project_id }),
    ...(payload.shared_with !== undefined && { sharedWith: payload.shared_with }),
});

export const toServerWorkflowBody = (payload: {
    title: string;
    type: "assistant" | "tabular";
    prompt_md?: string;
    columns_config?: ColumnConfig[];
    practice?: string | null;
    workspaceId?: string;
}) => ({
    workspaceId: payload.workspaceId,
    title: payload.title,
    type: payload.type,
    promptMd: payload.prompt_md,
    columnsConfig: payload.columns_config,
    practice: payload.practice ?? undefined,
});

export const toServerWorkflowPatch = (payload: {
    title?: string;
    prompt_md?: string;
    columns_config?: ColumnConfig[];
    practice?: string | null;
}) => ({
    ...(payload.title !== undefined && { title: payload.title }),
    ...(payload.prompt_md !== undefined && { promptMd: payload.prompt_md }),
    ...(payload.columns_config !== undefined && { columnsConfig: payload.columns_config }),
    ...(payload.practice !== undefined && { practice: payload.practice }),
});

export const toServerProjectBody = (payload: {
    name: string;
    cm_number?: string;
    shared_with?: string[];
    workspaceId: string;
}) => ({
    workspaceId: payload.workspaceId,
    name: payload.name,
    code: payload.cm_number?.trim() || `MATTER-${Date.now()}`,
    sharedWith: payload.shared_with,
});

export const toServerProjectPatch = (payload: {
    name?: string;
    cm_number?: string;
    shared_with?: string[];
}) => ({
    ...(payload.name !== undefined && { name: payload.name }),
    ...(payload.cm_number !== undefined && { code: payload.cm_number }),
    ...(payload.shared_with !== undefined && { sharedWith: payload.shared_with }),
});
