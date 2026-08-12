"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import DOMPurify from "isomorphic-dompurify";
import {
  Check,
  FileText,
  GripVertical,
  Highlighter,
  PencilLine,
  Loader2,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { LawfirmMappingSummaryDto } from "@/lib/api/lawfirm/types";
import type { LawfirmDocumentNavigationDto } from "@/lib/api/lawfirm/types";
import { useLawfirmDocumentNavigation } from "@/hooks/lawfirm/use-lawfirm-workspace";
import { useFieldNavigation, type LawfirmFieldSelection } from "@/hooks/lawfirm/use-field-navigation";
import {
  analyzeDocument,
  buildDocumentPreviewFromFileId,
  cleanPlaceholderLabel,
  countOccurrences,
} from "./lawfirm-demo-document-service";
import { fieldGroupFor, guessMapping } from "./lawfirm-demo-taxonomy";
import { deleteDocumentBytes, saveDocumentBytes } from "./lawfirm-demo-storage";
import type {
  ClientProfile,
  FieldGroup,
  Locale,
  ProfileField,
  TemplateDocument,
  TemplateField,
  TemplateSet,
} from "./lawfirm-demo-types";
import { EmptyState, FieldLabel, inputClass, SectionCard, StatusBadge } from "./lawfirm-demo-ui";

const discoverySourceLabels: Record<string, string> = {
  explicit_placeholder: "Placeholder",
  content_control: "Content control",
  bookmark: "Bookmark",
  merge_field: "Merge field",
  dotted_blank: "Dòng chấm",
  blank_line: "Dòng trống",
  empty_table_cell: "Ô bảng trống",
  literal_value: "Nhãn + giá trị",
  ocr_region: "OCR",
};

const copy = {
  vi: {
    title: "Bộ hồ sơ mẫu",
    description: "Tải DOCX, DOC hoặc PDF, kiểm tra placeholder và ánh xạ từng trường với hồ sơ khách hàng.",
    saved: "Bộ hồ sơ đã lưu",
    new: "Bộ mới",
    name: "Tên bộ hồ sơ",
    namePlaceholder: "Ví dụ: Hồ sơ thành lập công ty",
    draft: "Bản nháp",
    ready: "Trong thư viện",
    complete: "Hoàn tất bộ hồ sơ",
    reopen: "Mở lại chỉnh sửa",
    delete: "Xóa bộ",
    deleteConfirm: "Xóa bộ hồ sơ và toàn bộ file đã lưu trong trình duyệt?",
    documents: "Tài liệu trong bộ",
    upload: "Kéo thả file vào đây hoặc bấm để chọn",
    uploadHint: "Hỗ trợ DOCX, DOC và PDF. Hệ thống tự quét placeholder trong tối đa 20 trang.",
    analyzing: "Đang phân tích",
    uploadError: "Không thể đọc file. Vui lòng kiểm tra định dạng rồi thử lại.",
    noDocuments: "Chưa có tài liệu",
    noDocumentsDescription: "Tải một file DOCX hoặc PDF để bắt đầu nhận diện trường thông tin.",
    markDone: "Đánh dấu hoàn tất",
    markDraft: "Chuyển về bản nháp",
    preview: "Xem trước tài liệu",
    fields: "Trường nhận diện",
    highlight: "Đánh dấu",
    edit: "Sửa nội dung xem trước",
    editHint: "Nội dung sửa tại đây chỉ dùng cho phần xem trước trong demo.",
    selectionHint: "Bôi đen một đoạn trong bản xem trước để tạo trường mới.",
    pdfHint: "PDF được dùng để nhận diện và đối chiếu. Chức năng điền trực tiếp chỉ áp dụng cho DOCX.",
    noPreview: "Không tạo được bản xem trước cho file này.",
    noFields: "Chưa nhận diện được placeholder",
    noFieldsDescription: "Bôi đen nội dung trong bản xem trước hoặc thêm trường thủ công.",
    addField: "Thêm trường",
    fieldName: "Tên trường",
    placeholder: "Placeholder",
    mapping: "Ánh xạ với hồ sơ",
    noMapping: "Chưa ánh xạ",
    occurrences: "vị trí",
    auto: "Tự nhận diện",
    manual: "Thủ công",
    highlighted: "Bôi đen",
    ai: "AI đề xuất",
    aiScanning: "AI đang quét tài liệu để tìm trường cần điền…",
    aiScanError: "Không thể quét bằng AI lúc này.",
    aiScanRetry: "Quét lại bằng AI",
    aiApproveSelected: "Phê duyệt đã chọn",
    aiDismissAll: "Bỏ qua tất cả",
    aiDismissRow: "Bỏ qua gợi ý này",
    aggregated: "Danh sách trường trong bộ hồ sơ",
    aggregatedDescription: "Mỗi thông tin chỉ cần nhập một lần dù xuất hiện trong nhiều tài liệu.",
    target: "Lưu dữ liệu vào hồ sơ",
    newProfile: "Tạo hồ sơ mới",
    newProfileName: "Tên hồ sơ mới",
    saveValues: "Lưu thông tin vào hồ sơ",
    savedValues: "Đã lưu dữ liệu vào hồ sơ.",
    needName: "Vui lòng nhập tên hồ sơ mới.",
    groups: {
      individual: "Nhà đầu tư cá nhân",
      organization: "Nhà đầu tư tổ chức",
      representative: "Người đại diện",
      other: "Thông tin khác",
    },
  },
  en: {
    title: "Template sets",
    description: "Upload DOCX or PDF files, review placeholders and map each field to a client profile.",
    saved: "Saved template sets",
    new: "New set",
    name: "Template set name",
    namePlaceholder: "Example: Company incorporation pack",
    draft: "Draft",
    ready: "In library",
    complete: "Complete template set",
    reopen: "Reopen for editing",
    delete: "Delete set",
    deleteConfirm: "Delete this template set and every browser-stored file?",
    documents: "Documents in this set",
    upload: "Drop files here or click to browse",
    uploadHint: "Supports DOCX and PDF. Placeholder detection reads up to 20 PDF pages.",
    analyzing: "Analyzing",
    uploadError: "The file could not be read. Check its format and try again.",
    noDocuments: "No documents yet",
    noDocumentsDescription: "Upload a DOCX or PDF file to start detecting information fields.",
    markDone: "Mark complete",
    markDraft: "Move to draft",
    preview: "Document preview",
    fields: "Detected fields",
    highlight: "Highlight",
    edit: "Edit preview",
    editHint: "Preview edits only affect the visual preview in this demo.",
    selectionHint: "Select text in the preview to create a new field.",
    pdfHint: "PDF is available for detection and matching. Direct filling is supported for DOCX only.",
    noPreview: "A preview could not be generated for this file.",
    noFields: "No placeholders detected",
    noFieldsDescription: "Select text in the preview or add a field manually.",
    addField: "Add field",
    fieldName: "Field name",
    placeholder: "Placeholder",
    mapping: "Map to profile",
    noMapping: "Not mapped",
    occurrences: "positions",
    auto: "Detected",
    manual: "Manual",
    highlighted: "Selected",
    ai: "AI suggested",
    aiScanning: "AI is scanning the document for fields to fill in…",
    aiScanError: "Could not run the AI scan right now.",
    aiScanRetry: "Retry AI scan",
    aiApproveSelected: "Approve selected",
    aiDismissAll: "Dismiss all",
    aiDismissRow: "Dismiss this suggestion",
    aggregated: "Fields in this template set",
    aggregatedDescription: "Enter each piece of information once even when it appears in multiple documents.",
    target: "Save data to profile",
    newProfile: "Create new profile",
    newProfileName: "New profile name",
    saveValues: "Save information to profile",
    savedValues: "Profile information saved.",
    needName: "Enter a name for the new profile.",
    groups: {
      individual: "Individual investor",
      organization: "Organization investor",
      representative: "Legal representative",
      other: "Other information",
    },
  },
} as const;

type AggregatedField = {
  key: string;
  label: string;
  group: FieldGroup;
  refs: Array<{ documentId: string; fieldId: string }>;
};

type AiSuggestion = {
  id: string;
  label: string;
  placeholder: string;
  mappedKey: string;
  checked: boolean;
};

type AiReviewState = {
  status: "idle" | "scanning" | "error" | "done";
  suggestions: AiSuggestion[];
};

function aggregateFields(template: TemplateSet): AggregatedField[] {
  const entries = new Map<string, AggregatedField>();
  template.documents.forEach((documentItem) => {
    documentItem.fields.forEach((field) => {
      const key = field.mappedKey || `custom:${field.placeholder.trim().toLowerCase()}`;
      if (!key || key === "custom:") return;
      const existing = entries.get(key) ?? {
        key,
        label: field.label || cleanPlaceholderLabel(field.placeholder),
        group: field.mappedKey ? fieldGroupFor(field.mappedKey) : "other",
        refs: [],
      };
      existing.refs.push({ documentId: documentItem.id, fieldId: field.id });
      entries.set(key, existing);
    });
  });
  return [...entries.values()];
}

export function TemplatePanel({
  locale,
  mode,
  profiles,
  templates,
  activeTemplate: activeTemplateProp,
  activeProfileId,
  onSelectTemplate,
  onSelectProfile,
  onAddTemplate,
  onDeleteTemplate,
  onUpdateTemplate,
  onReorderDocuments,
  onModeChange,
  onAddProfile,
  onUpdateProfile,
  onUpdateDocument,
  onScanDocument,
  onUploadDocument,
  onUploadDocuments,
  uploadProgress,
  mappingSummary,
  mappingSummaryLoading = false,
  onRemoveDocument,
}: {
  locale: Locale;
  mode: "library" | "editor";
  profiles: ClientProfile[];
  templates: TemplateSet[];
  activeTemplate?: TemplateSet;
  activeProfileId: string;
  onSelectTemplate: (id: string) => void;
  onSelectProfile: (id: string) => void;
  onAddTemplate: () => void | Promise<void>;
  onDeleteTemplate: (id: string) => void;
  onUpdateTemplate: (id: string, updater: (template: TemplateSet) => TemplateSet) => void | Promise<void>;
  onReorderDocuments?: (documentIds: string[]) => Promise<void>;
  onModeChange: (next: "library" | "editor") => void;
  onAddProfile: (name?: string) => ClientProfile | Promise<ClientProfile>;
  onUpdateProfile: (id: string, updater: (profile: ClientProfile) => ClientProfile) => void;
  onUpdateDocument?: (
    docId: string,
    updater: (documentItem: TemplateDocument) => TemplateDocument,
  ) => void | Promise<void>;
  onScanDocument?: (docId: string) => Promise<{
    ai: Array<{
      placeholder: string;
      mappedKey: string;
      label: string;
      confidence: number;
      source: "deterministic" | "ai";
    }>;
    summary?: {
      total: number;
      mapped: number;
      needsReview: number;
      cacheHits: number;
      geminiCalls: number;
    };
  }>;
  onUploadDocument?: (file: File) => Promise<void>;
  onUploadDocuments?: (
    files: File[],
    onProgress: (progress: { total: number; processed: number; failed: number; pending: number }) => void,
  ) => Promise<void>;
  uploadProgress?: {
    status: string;
    total: number;
    processed: number;
    failed: number;
    pending: number;
  } | null;
  mappingSummary?: LawfirmMappingSummaryDto | null;
  mappingSummaryLoading?: boolean;
  onRemoveDocument?: (docId: string) => Promise<void>;
}) {
  const t = copy[locale];
  const activeTemplate = activeTemplateProp ?? templates.find((item) => item.id === templates[0]?.id) ?? templates[0];

  const [draftName, setDraftName] = useState(activeTemplate.name);
  const draftNameRef = useRef(activeTemplate.name);
  const isNameDirtyRef = useRef(false);
  const isNameSavingRef = useRef(false);

  const [draftDescription, setDraftDescription] = useState(activeTemplate.description ?? "");
  const draftDescriptionRef = useRef(activeTemplate.description ?? "");

  const [searchQuery, setSearchQuery] = useState("");
  const [previewModalTpl, setPreviewModalTpl] = useState<TemplateSet | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [aiReviewByDocumentId, setAiReviewByDocumentId] = useState<Record<string, AiReviewState>>({});
  const aiScanPromiseByDocumentId = useRef(new Map<string, Promise<void>>());
  const serverDocumentOrderKey = activeTemplate.documents.map((documentItem) => documentItem.id).join("|");
  const [documentOrderIds, setDocumentOrderIds] = useState<string[]>(() =>
    activeTemplate.documents.map((documentItem) => documentItem.id),
  );

  useEffect(() => {
    setDocumentOrderIds(serverDocumentOrderKey ? serverDocumentOrderKey.split("|") : []);
  }, [activeTemplate.id, serverDocumentOrderKey]);

  const orderedDocuments = useMemo(() => {
    const byId = new Map(activeTemplate.documents.map((documentItem) => [documentItem.id, documentItem]));
    return [
      ...documentOrderIds
        .map((documentId) => byId.get(documentId))
        .filter((documentItem): documentItem is TemplateDocument => Boolean(documentItem)),
      ...activeTemplate.documents.filter((documentItem) => !documentOrderIds.includes(documentItem.id)),
    ];
  }, [activeTemplate.documents, documentOrderIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = documentOrderIds.indexOf(String(active.id));
      const newIndex = documentOrderIds.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const previousOrder = documentOrderIds;
      const nextOrder = arrayMove(documentOrderIds, oldIndex, newIndex);
      setDocumentOrderIds(nextOrder);
      try {
        if (onReorderDocuments) {
          await onReorderDocuments(nextOrder);
        } else {
          update((template) => ({
            ...template,
            documents: nextOrder
              .map((documentId) => template.documents.find((item) => item.id === documentId))
              .filter((item): item is TemplateDocument => Boolean(item)),
          }));
        }
      } catch (error: unknown) {
        setDocumentOrderIds(previousOrder);
        toast.error(
          error instanceof Error
            ? error.message
            : locale === "vi"
              ? "Không thể lưu thứ tự tài liệu."
              : "Could not save document order.",
        );
      }
    }
  };

  const [activeDocumentId, setActiveDocumentId] = useState(activeTemplate.documents[0]?.id ?? "");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState("");
  const [processingProgress, setProcessingProgress] = useState<{
    total: number;
    processed: number;
    failed: number;
    pending: number;
  } | null>(null);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isNameDirtyRef.current && !isNameSavingRef.current) {
      draftNameRef.current = activeTemplate.name;
      setDraftName(activeTemplate.name);
    }
    draftDescriptionRef.current = activeTemplate.description ?? "";
    setDraftDescription(activeTemplate.description ?? "");
  }, [activeTemplate.id, activeTemplate.name, activeTemplate.description]);

  const activeDocument =
    activeTemplate.documents.find((item) => item.id === activeDocumentId) ?? activeTemplate.documents[0];
  const documentNavigationQuery = useLawfirmDocumentNavigation(activeDocument?.id);
  const mappingInProgress =
    Object.values(aiReviewByDocumentId).some((review) => review.status === "scanning") ||
    mappingSummary?.latest_job?.status === "processing";

  const openManualMapping = (): void => {
    document.getElementById("lawfirm-field-review")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateAiReview = useCallback((documentId: string, updater: (current: AiReviewState) => AiReviewState): void => {
    setAiReviewByDocumentId((current) => ({
      ...current,
      [documentId]: updater(current[documentId] ?? { status: "idle", suggestions: [] }),
    }));
  }, []);

  const requestAiScan = useCallback(
    async (documentId: string): Promise<void> => {
      const running = aiScanPromiseByDocumentId.current.get(documentId);
      if (running) return running;

      const documentItem = activeTemplate.documents.find((item) => item.id === documentId);
      if (!documentItem?.plainText.trim()) {
        toast.warning(
          locale === "vi"
            ? "Tài liệu chưa có nội dung chữ để AI phân tích."
            : "No document text available for AI analysis.",
        );
        return;
      }

      updateAiReview(documentId, (current) => ({
        ...current,
        status: "scanning",
      }));
      const promise = (async () => {
        try {
          let resultAi: Array<{
            placeholder: string;
            mappedKey: string;
            label: string;
          }> = [];
          if (!onScanDocument) throw new Error("AI mapping gateway is unavailable");
          const result = await onScanDocument(documentId);
          resultAi = result.ai;

          const existing = new Set(documentItem.fields.map((field) => field.placeholder.trim()));
          const suggestions = resultAi
            .filter((item) => item.placeholder.trim() && !existing.has(item.placeholder.trim()))
            .map(
              (item, index): AiSuggestion => ({
                id: `ai-${documentId}-${index}`,
                label: item.label.trim() || cleanPlaceholderLabel(item.placeholder),
                placeholder: item.placeholder.trim(),
                mappedKey: item.mappedKey,
                checked: true,
              }),
            );
          updateAiReview(documentId, () => ({
            status: "done",
            suggestions,
          }));
          if (suggestions.length === 0) {
            const needsReview = result.summary?.needsReview ?? 0;
            const mapped = result.summary?.mapped ?? 0;
            toast.info(
              needsReview > 0
                ? locale === "vi"
                  ? `${needsReview} trường chưa đủ tin cậy; vui lòng chọn ánh xạ thủ công.`
                  : `${needsReview} fields need manual mapping review.`
                : mapped > 0
                  ? locale === "vi"
                    ? `Đã ánh xạ ${mapped} trường có độ tin cậy cao.`
                    : `Mapped ${mapped} high-confidence fields.`
                  : locale === "vi"
                    ? "AI đã quét xong, không phát hiện thêm trường mới nào."
                    : "AI scan complete, no new fields detected.",
            );
          }
        } catch {
          updateAiReview(documentId, (current) => ({
            ...current,
            status: "error",
            suggestions: [],
          }));
        } finally {
          aiScanPromiseByDocumentId.current.delete(documentId);
        }
      })();
      aiScanPromiseByDocumentId.current.set(documentId, promise);
      return promise;
    },
    [activeTemplate.documents, locale, onScanDocument, updateAiReview],
  );

  const update = (updater: (template: TemplateSet) => TemplateSet): void => {
    onUpdateTemplate(activeTemplate.id, updater);
  };

  const saveTemplateName = async (): Promise<void> => {
    if (!isNameDirtyRef.current) return;
    const nameToSave = draftNameRef.current;
    isNameDirtyRef.current = false;
    isNameSavingRef.current = true;
    try {
      await onUpdateTemplate(activeTemplate.id, (template) => ({
        ...template,
        name: nameToSave,
      }));
    } catch (error: unknown) {
      isNameDirtyRef.current = true;
      toast.error(
        error instanceof Error
          ? error.message
          : locale === "vi"
            ? "Không thể lưu tên bộ hồ sơ."
            : "Could not save template set name.",
      );
    } finally {
      isNameSavingRef.current = false;
    }
  };

  const saveTemplateDescription = async (): Promise<void> => {
    const currentDesc = draftDescriptionRef.current;
    if (currentDesc === (activeTemplate.description ?? "")) return;
    try {
      await onUpdateTemplate(activeTemplate.id, (template) => ({
        ...template,
        description: currentDesc,
      }));
    } catch {
      // Ignore
    }
  };

  const sortedTemplates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = templates;
    if (q) {
      list = templates.filter(
        (tpl) =>
          (tpl.name || "").toLowerCase().includes(q) ||
          (tpl.description || "").toLowerCase().includes(q) ||
          tpl.documents.some((d) => d.fileName.toLowerCase().includes(q)),
      );
    }
    return [...list].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [templates, searchQuery]);

  const formatTemplateDate = (dateStr?: string) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(d.getTime())) {
      const now = new Date();
      return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    }
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const updateDocument = (documentId: string, updater: (documentItem: TemplateDocument) => TemplateDocument) => {
    update((template) => ({
      ...template,
      documents: template.documents.map((item) => (item.id === documentId ? updater(item) : item)),
    }));
  };

  const addFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((file) => /\.(docx|doc|pdf)$/i.test(file.name));
    setError("");
    setProcessingProgress(null);
    if (onUploadDocuments && files.length > 0) {
      setProcessing(locale === "vi" ? `${files.length} tài liệu` : `${files.length} documents`);
      try {
        await onUploadDocuments(files, setProcessingProgress);
      } catch {
        setError(t.uploadError);
      } finally {
        setProcessing("");
        setProcessingProgress(null);
      }
      return;
    }
    for (const file of files) {
      setProcessing(file.name);
      try {
        if (onUploadDocument) {
          await onUploadDocument(file);
        } else {
          const result = await analyzeDocument(file);
          if (result.document.storageKey) {
            await saveDocumentBytes(result.document.storageKey, result.bytes);
          }
          update((template) => ({
            ...template,
            documents: [...template.documents, result.document],
          }));
          setActiveDocumentId(result.document.id);
        }
      } catch {
        setError(`${t.uploadError} (${file.name})`);
      }
    }
    setProcessing("");
  };

  const removeDocument = async (documentItem: TemplateDocument) => {
    if (onRemoveDocument) {
      await onRemoveDocument(documentItem.id);
      return;
    }
    if (documentItem.storageKey) await deleteDocumentBytes(documentItem.storageKey);
    update((template) => ({
      ...template,
      documents: template.documents.filter((item) => item.id !== documentItem.id),
    }));
  };

  const handleDeleteTemplate = async () => {
    await Promise.all(
      activeTemplate.documents.map((item) =>
        item.storageKey ? deleteDocumentBytes(item.storageKey) : Promise.resolve(),
      ),
    );
    onDeleteTemplate(activeTemplate.id);
  };

  const handleCreateTemplate = async () => {
    await onAddTemplate();
    onModeChange("editor");
  };

  if (mode === "library") {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-6 lg:px-8">
        <header className="border-b border-zinc-200 pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            {locale === "vi" ? "THƯ VIỆN MẪU HỒ SƠ" : "TEMPLATE SET LIBRARY"}
          </h1>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">
            {locale === "vi"
              ? 'Duyệt các bộ hồ sơ mẫu đã chuẩn bị sẵn. Bấm "Xem trước" để xem nội dung bên trong và hướng dẫn sử dụng trước khi dùng để điền hồ sơ.'
              : "Review prepared template sets. Use preview to see details and usage guidance before filling documents."}
          </p>
        </header>

        <div className="rounded-lg border border-zinc-200 bg-white p-5 space-y-5">
          <div className="mx-auto max-w-3xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                locale === "vi"
                  ? "Tìm theo tên bộ hồ sơ, mô tả, nguồn luật..."
                  : "Search by template set name, description, legal source..."
              }
              className={inputClass}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <button
              type="button"
              onClick={() => void handleCreateTemplate()}
              className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-6 transition hover:border-zinc-950 hover:bg-zinc-100/60 group"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-white border border-zinc-200 shadow-2xs group-hover:scale-105 transition">
                <Plus className="size-6 text-zinc-950" />
              </div>
              <div className="mt-3 text-sm font-bold text-zinc-900">
                {locale === "vi" ? "Tạo bộ hồ sơ mẫu mới" : "Create new template set"}
              </div>
              <p className="mt-1 text-xs text-zinc-500 text-center">
                {locale === "vi"
                  ? "Thêm tài liệu mẫu DOCX / PDF mới vào hệ thống"
                  : "Add new template documents to library"}
              </p>
            </button>

            {sortedTemplates.map((tpl) => {
              const title = tpl.name || (locale === "vi" ? "Bộ chưa đặt tên" : "Untitled set");
              const desc = tpl.description || (locale === "vi" ? "Chưa có mô tả." : "No description.");
              const dateFormatted = formatTemplateDate(tpl.createdAt);

              return (
                <div
                  key={tpl.id}
                  className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs hover:border-zinc-300 hover:shadow-xs transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
                      <div>
                        <span className="text-[11px] font-medium text-zinc-400">{dateFormatted}</span>
                        <h2 className="text-base font-bold text-zinc-950 mt-0.5 line-clamp-1">{title}</h2>
                      </div>
                      <span className="inline-flex shrink-0 items-center rounded-full bg-zinc-950 px-2.5 py-0.5 text-xs font-semibold text-white">
                        {tpl.documents.length} {locale === "vi" ? "tài liệu" : "docs"}
                      </span>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-zinc-600 line-clamp-3">{desc}</p>
                  </div>

                  {deletingTemplateId === tpl.id ? (
                    <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-red-200 bg-red-50/80 p-2.5 rounded-lg animate-in fade-in duration-150">
                      <span className="text-xs font-semibold text-red-700">
                        {locale === "vi" ? "Xác nhận xóa bộ mẫu này?" : "Delete this template set?"}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-zinc-600 hover:text-zinc-950"
                          onClick={() => setDeletingTemplateId(null)}
                        >
                          {locale === "vi" ? "Hủy" : "Cancel"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-3 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 shadow-2xs"
                          onClick={() => {
                            setDeletingTemplateId(null);
                            onDeleteTemplate(tpl.id);
                          }}
                        >
                          {locale === "vi" ? "Xóa ngay" : "Delete"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 flex items-center gap-2 pt-3 border-t border-zinc-100">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => {
                          onSelectTemplate(tpl.id);
                          setPreviewModalTpl(tpl);
                        }}
                      >
                        {locale === "vi" ? "Xem trước" : "Preview"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1 text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800"
                        onClick={() => {
                          onSelectTemplate(tpl.id);
                          onModeChange("editor");
                        }}
                      >
                        {locale === "vi" ? "Chỉnh sửa" : "Edit"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-zinc-200"
                        onClick={() => setDeletingTemplateId(tpl.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Dialog open={!!previewModalTpl} onOpenChange={(open) => !open && setPreviewModalTpl(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-zinc-950">
                {previewModalTpl?.name || (locale === "vi" ? "Bộ chưa đặt tên" : "Untitled set")}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Tạo ngày: {formatTemplateDate(previewModalTpl?.createdAt)} • {previewModalTpl?.documents.length || 0}{" "}
                tài liệu
              </DialogDescription>
            </DialogHeader>

            {previewModalTpl?.description && (
              <div className="rounded-md border border-zinc-200 bg-zinc-50/80 p-3 text-xs text-zinc-700 leading-relaxed">
                <span className="font-semibold text-zinc-900">Mô tả: </span>
                {previewModalTpl.description}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 mt-2">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Danh sách tài liệu:</h3>
              {previewModalTpl?.documents.length === 0 ? (
                <p className="text-xs text-zinc-500 italic p-4 text-center">Chưa có tài liệu nào trong bộ mẫu này.</p>
              ) : (
                previewModalTpl?.documents.map((doc) => (
                  <div key={doc.id} className="rounded-md border border-zinc-200 bg-white p-3.5 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-950">{doc.fileName}</span>
                      <span className="text-[11px] font-medium text-zinc-500">
                        {doc.fields.length} trường thông tin
                      </span>
                    </div>
                    {doc.fields.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {doc.fields.map((f) => (
                          <span
                            key={f.id}
                            className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-700"
                          >
                            {f.placeholder}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 mt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPreviewModalTpl(null)}>
                Đóng
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-zinc-950 text-white hover:bg-zinc-800"
                onClick={() => {
                  const tplId = previewModalTpl?.id;
                  setPreviewModalTpl(null);
                  if (tplId) {
                    onSelectTemplate(tplId);
                    onModeChange("editor");
                  }
                }}
              >
                Chỉnh sửa bộ này
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  function SortableDocumentItem({
    documentItem,
    isActive,
    isScanning,
    onSelect,
    onRemove,
    t,
  }: {
    documentItem: TemplateDocument;
    isActive: boolean;
    isScanning: boolean;
    onSelect: () => void;
    onRemove: () => void;
    t: (typeof copy)[Locale];
  }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: documentItem.id,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex items-center gap-1.5 rounded-md border p-2 bg-white transition-all",
          isActive ? "border-zinc-950 bg-zinc-50 shadow-2xs" : "border-zinc-200 hover:border-zinc-300",
          isDragging && "opacity-50 z-50 shadow-md",
        )}
      >
        <button
          type="button"
          className="touch-none cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 p-0.5"
          {...attributes}
          {...listeners}
          aria-label="Reorder document"
        >
          <GripVertical className="size-3.5" />
        </button>

        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <FileText className="size-4 shrink-0 text-zinc-500" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-zinc-900">{documentItem.fileName}</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[11px] uppercase text-zinc-500">
              {isScanning ? (
                <span className="inline-flex items-center gap-1 text-amber-700 font-medium lowercase">
                  <Loader2 className="size-3 animate-spin text-amber-600" />
                  <span>đang quét AI...</span>
                </span>
              ) : (
                <span>
                  {documentItem.fileType} · {documentItem.fields.length} {t.fields.toLowerCase()}
                </span>
              )}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onRemove}
          aria-label="Delete document"
          className="flex size-7 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-red-50 hover:text-red-600 transition"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-6 lg:px-8">
      <header className="border-b border-zinc-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-normal text-zinc-950">{t.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">{t.description}</p>
      </header>

      <SectionCard
        title={t.saved}
        action={
          <Button type="button" variant="outline" onClick={onAddTemplate}>
            <Plus className="size-4" />
            {t.new}
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2 border-b border-zinc-200 p-4">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template.id)}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-medium transition active:scale-[0.98]",
                template.id === activeTemplate.id
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-300 text-zinc-700 hover:border-zinc-950",
              )}
            >
              {template.name || (locale === "vi" ? "Bộ chưa đặt tên" : "Untitled set")}
            </button>
          ))}
        </div>
        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(280px,1fr)_auto] xl:items-end">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="template-name">{t.name}</FieldLabel>
              <input
                id="template-name"
                value={draftName}
                onChange={(event) => {
                  draftNameRef.current = event.target.value;
                  isNameDirtyRef.current = true;
                  setDraftName(event.target.value);
                }}
                onBlur={() => void saveTemplateName()}
                placeholder={t.namePlaceholder}
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel htmlFor="template-description">
                {locale === "vi" ? "Mô tả bộ hồ sơ" : "Description"}
              </FieldLabel>
              <input
                id="template-description"
                value={draftDescription}
                onChange={(event) => {
                  draftDescriptionRef.current = event.target.value;
                  setDraftDescription(event.target.value);
                }}
                onBlur={() => void saveTemplateDescription()}
                placeholder={
                  locale === "vi"
                    ? "Nhập mô tả bộ hồ sơ (ví dụ: Dùng cho hợp đồng mua bán, thành lập công ty...)"
                    : "Enter description for this template set..."
                }
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge strong={activeTemplate.status === "ready"}>
              {activeTemplate.status === "ready" ? t.ready : t.draft}
            </StatusBadge>
            <Button
              type="button"
              onClick={() =>
                update((template) => ({
                  ...template,
                  status: template.status === "ready" ? "draft" : "ready",
                }))
              }
              className="bg-zinc-950 text-white hover:bg-zinc-800"
              disabled={!activeTemplate.documents.length}
            >
              <Check className="size-4" />
              {activeTemplate.status === "ready" ? t.reopen : t.complete}
            </Button>
            <Button type="button" variant="outline" onClick={handleDeleteTemplate}>
              <Trash2 className="size-4" />
              {t.delete}
            </Button>
          </div>
        </div>
      </SectionCard>

      {activeTemplate.documents.length > 0 && (
        <section className="rounded-md border border-zinc-200 bg-white px-4 py-3" aria-live="polite">
          {mappingSummaryLoading && !mappingSummary ? (
            <div className="space-y-2 py-1">
              <div className="h-4 w-52 animate-pulse rounded bg-zinc-100" />
              <div className="h-3 w-80 max-w-full animate-pulse rounded bg-zinc-100" />
            </div>
          ) : mappingSummary ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-950">
                  {mappingInProgress
                    ? locale === "vi"
                      ? "Đang hoàn thiện ánh xạ bằng AI"
                      : "Completing mappings with AI"
                    : mappingSummary.unresolved_fields === 0
                      ? locale === "vi"
                        ? `Đã nhận diện và ánh xạ đủ ${mappingSummary.total_unique_fields} trường`
                        : `All ${mappingSummary.total_unique_fields} fields are recognized and mapped`
                      : locale === "vi"
                        ? `Đã ánh xạ ${mappingSummary.mapped_fields}/${mappingSummary.total_unique_fields} trường`
                        : `Mapped ${mappingSummary.mapped_fields}/${mappingSummary.total_unique_fields} fields`}
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  {mappingInProgress
                    ? locale === "vi"
                      ? "Bạn có thể mở tài liệu khác. Kết quả được lưu trên máy chủ và sẽ sẵn sàng khi xử lý xong."
                      : "You can open another document. The result is persisted and will be ready when processing finishes."
                    : mappingSummary.unresolved_fields === 0
                      ? locale === "vi"
                        ? `${mappingSummary.occurrences} vị trí dùng chung dữ liệu. Không cần gọi Gemini.`
                        : `${mappingSummary.occurrences} occurrences share this data. Gemini is not needed.`
                      : locale === "vi"
                        ? `${mappingSummary.unresolved_fields} trường chưa rõ · dự kiến ${mappingSummary.estimated_gemini_calls} lượt Gemini. Chỉ các trường này được gửi đi.`
                        : `${mappingSummary.unresolved_fields} unresolved fields · about ${mappingSummary.estimated_gemini_calls} Gemini call(s). Only these fields are sent.`}
                </p>
                {mappingSummary.latest_job?.status === "failed" && !mappingInProgress ? (
                  <p className="mt-1 text-xs text-red-700">
                    {locale === "vi"
                      ? "Lần phân tích trước chưa hoàn tất. Bạn có thể thử lại."
                      : "The previous analysis did not finish. You can retry."}
                  </p>
                ) : null}
              </div>

              {mappingSummary.unresolved_fields > 0 ? (
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={openManualMapping}
                    className="text-xs font-medium text-zinc-600 underline-offset-4 hover:text-zinc-950 hover:underline"
                  >
                    {locale === "vi" ? "Tự ánh xạ" : "Map manually"}
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={mappingInProgress || !activeDocument}
                    onClick={() => activeDocument && void requestAiScan(activeDocument.id)}
                    className="bg-zinc-950 px-3 text-xs text-white hover:bg-zinc-800"
                  >
                    {mappingInProgress
                      ? locale === "vi"
                        ? "Đang phân tích…"
                        : "Analyzing…"
                      : locale === "vi"
                        ? `Phân tích ${mappingSummary.unresolved_fields} trường bằng AI`
                        : `Analyze ${mappingSummary.unresolved_fields} fields with AI`}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SectionCard title={t.documents}>
          <div className="space-y-2 p-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedDocuments.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                {orderedDocuments.map((documentItem) => (
                  <SortableDocumentItem
                    key={documentItem.id}
                    documentItem={documentItem}
                    isActive={documentItem.id === activeDocument?.id}
                    isScanning={aiReviewByDocumentId[documentItem.id]?.status === "scanning"}
                    onSelect={() => setActiveDocumentId(documentItem.id)}
                    onRemove={() => void removeDocument(documentItem)}
                    t={t}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void addFiles(event.dataTransfer.files);
            }}
            className={cn(
              "m-3 mt-0 flex w-[calc(100%-1.5rem)] flex-col items-center rounded-md border border-dashed px-4 py-6 text-center transition",
              dragging ? "border-zinc-950 bg-zinc-100" : "border-zinc-300 bg-zinc-50 hover:border-zinc-950",
            )}
          >
            <UploadCloud className="size-5 text-zinc-600" />
            <span className="mt-2 text-sm font-medium text-zinc-900">{t.upload}</span>
            <span className="mt-1 text-xs leading-5 text-zinc-500">{t.uploadHint}</span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".docx,.doc,.pdf"
            multiple
            hidden
            onChange={(event) => {
              if (event.target.files) void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          {(processing || uploadProgress) && (
            <div className="mx-3 mb-3 rounded-md border border-zinc-200 bg-zinc-50 p-3" role="status">
              <div className="h-2 animate-pulse rounded bg-zinc-200" />
              <p className="mt-2 truncate text-xs text-zinc-600">
                {t.analyzing}: {processing || (locale === "vi" ? "đang khôi phục phiên quét" : "resuming scan session")}
              </p>
              {(processingProgress || uploadProgress) && (
                <p className="mt-1 text-xs text-zinc-500">
                  {(processingProgress ?? uploadProgress)!.processed}/{(processingProgress ?? uploadProgress)!.total}
                  {(processingProgress ?? uploadProgress)!.failed > 0
                    ? ` · ${(processingProgress ?? uploadProgress)!.failed} ${locale === "vi" ? "lỗi" : "failed"}`
                    : ""}
                </p>
              )}
            </div>
          )}
          {error && (
            <p className="mx-3 mb-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
        </SectionCard>

        {activeDocument ? (
          <DocumentEditor
            locale={locale}
            documentItem={activeDocument}
            profileFields={profiles.find((profile) => profile.id === activeProfileId)?.fields ?? []}
            aiReview={
              aiReviewByDocumentId[activeDocument.id] ?? {
                status: "idle",
                suggestions: [],
              }
            }
            navigation={documentNavigationQuery.data ?? null}
            onAiSuggestionsChange={(updater) =>
              updateAiReview(activeDocument.id, (current) => ({
                ...current,
                suggestions: updater(current.suggestions),
              }))
            }
            onPersist={(updater) =>
              Promise.resolve(
                onUpdateDocument
                  ? onUpdateDocument(activeDocument.id, updater)
                  : updateDocument(activeDocument.id, updater),
              )
            }
          />
        ) : (
          <SectionCard title={t.preview}>
            <EmptyState title={t.noDocuments} description={t.noDocumentsDescription} />
          </SectionCard>
        )}
      </div>

      {activeTemplate.status === "ready" && activeTemplate.documents.length > 0 && (
        <AggregatedFieldsPanel
          locale={locale}
          template={activeTemplate}
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSelectProfile={onSelectProfile}
          onAddProfile={onAddProfile}
          onUpdateProfile={onUpdateProfile}
          onUpdateTemplate={update}
        />
      )}
    </div>
  );
}

function DocumentEditor({
  locale,
  documentItem,
  profileFields,
  aiReview,
  navigation,
  onAiSuggestionsChange,
  onPersist,
}: {
  locale: Locale;
  documentItem: TemplateDocument;
  profileFields: ProfileField[];
  aiReview: AiReviewState;
  navigation: LawfirmDocumentNavigationDto | null;
  onAiSuggestionsChange: (updater: (current: AiSuggestion[]) => AiSuggestion[]) => void;
  onPersist: (updater: (documentItem: TemplateDocument) => TemplateDocument) => Promise<void>;
}) {
  const t = copy[locale];
  const [draftDocument, setDraftDocument] = useState(documentItem);
  const draftDocumentRef = useRef(documentItem);
  const isDirtyRef = useRef(false);
  const isSavingRef = useRef(false);
  const isRestoringPreviewRef = useRef(false);
  const [fieldSearch, setFieldSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState<"all" | "review" | "unmapped">("all");
  const fieldNavigation = useFieldNavigation(documentItem.id);
  const aiSuggestions = aiReview.suggestions;
  const setAiSuggestions = (next: AiSuggestion[] | ((current: AiSuggestion[]) => AiSuggestion[])): void => {
    onAiSuggestionsChange((current) => (typeof next === "function" ? next(current) : next));
  };
  const navigationByFieldId = useMemo(
    () => new Map((navigation?.fields ?? []).map((field) => [field.field_id, field])),
    [navigation],
  );
  const orderedFields = useMemo(() => {
    const originalOrder = new Map(draftDocument.fields.map((field, index) => [field.id, index]));
    return [...draftDocument.fields].sort((left, right) => {
      const leftOrder = navigationByFieldId.get(left.id)?.sort_order ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = navigationByFieldId.get(right.id)?.sort_order ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0);
    });
  }, [draftDocument.fields, navigationByFieldId]);
  const visibleFields = useMemo(() => {
    const query = fieldSearch.trim().toLocaleLowerCase(locale === "vi" ? "vi" : "en");
    return orderedFields.filter((field) => {
      const navigationField = navigationByFieldId.get(field.id);
      const status = navigationField?.mapping_status ?? (field.mappedKey ? "mapped" : "unmapped");
      if (fieldFilter === "review" && !["needs_review", "conflict"].includes(status)) return false;
      if (fieldFilter === "unmapped" && status !== "unmapped") return false;
      if (!query) return true;
      return [field.label, field.placeholder, field.mappedKey].some((value) =>
        value.toLocaleLowerCase(locale === "vi" ? "vi" : "en").includes(query),
      );
    });
  }, [fieldFilter, fieldSearch, locale, navigationByFieldId, orderedFields]);

  useEffect(() => {
    isDirtyRef.current = false;
    isSavingRef.current = false;
    isRestoringPreviewRef.current = false;
    draftDocumentRef.current = documentItem;
    setDraftDocument(documentItem);
    // Switching documents is the reset boundary; background query refreshes must not discard local edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentItem.id]);

  useEffect(() => {
    const currentDocument = draftDocumentRef.current;
    const isWord = currentDocument.fileType === "docx" || currentDocument.fileType === "doc";
    const needsDocxPreview = isWord && !currentDocument.previewHtml;
    const needsPdfPreview = currentDocument.fileType === "pdf" && !currentDocument.previewImage;
    if ((!needsDocxPreview && !needsPdfPreview) || !currentDocument.fileId || isRestoringPreviewRef.current) {
      return;
    }
    isRestoringPreviewRef.current = true;
    void (async () => {
      try {
        const restored = await buildDocumentPreviewFromFileId(currentDocument.fileId!, currentDocument.fileName);
        applyDraft(
          (documentValue) => ({
            ...documentValue,
            previewHtml: restored.previewHtml,
            previewImage: restored.previewImage,
            plainText: restored.plainText,
            fields: documentValue.fields.length > 0 ? documentValue.fields : restored.fields,
          }),
          currentDocument.fileType === "docx",
        );
      } catch (error: unknown) {
        toast.error(
          error instanceof Error
            ? error.message
            : locale === "vi"
              ? "Không thể khôi phục bản xem trước."
              : "Could not restore the preview.",
        );
      } finally {
        isRestoringPreviewRef.current = false;
      }
    })();
    // Preview restoration is keyed by persisted preview inputs. `applyDraft` is intentionally unstable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draftDocument.fileId,
    draftDocument.fileName,
    draftDocument.fileType,
    draftDocument.previewHtml,
    draftDocument.previewImage,
    locale,
  ]);

  const applyDraft = (
    updater: (documentValue: TemplateDocument) => TemplateDocument,
    saveImmediately = false,
  ): void => {
    const next = updater(draftDocumentRef.current);
    draftDocumentRef.current = next;
    isDirtyRef.current = true;
    setDraftDocument(next);
    if (saveImmediately) {
      void saveDocument(next);
    }
  };

  const saveDocument = async (documentValue: TemplateDocument = draftDocumentRef.current): Promise<void> => {
    if (!isDirtyRef.current) return;
    isDirtyRef.current = false;
    isSavingRef.current = true;
    try {
      await onPersist(() => documentValue);
    } catch (error: unknown) {
      isDirtyRef.current = true;
      toast.error(
        error instanceof Error
          ? error.message
          : locale === "vi"
            ? "Không thể lưu tài liệu."
            : "Could not save document.",
      );
    } finally {
      isSavingRef.current = false;
    }
  };

  const updateField = (id: string, patch: Partial<TemplateField>, saveImmediately = false) => {
    applyDraft(
      (documentValue) => ({
        ...documentValue,
        fields: documentValue.fields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
      }),
      saveImmediately,
    );
  };
  const addField = (placeholder = "") => {
    const normalized = placeholder.replace(/\s+/g, " ").trim();
    if (normalized && draftDocumentRef.current.fields.some((field) => field.placeholder === normalized)) return;
    const field: TemplateField = {
      id: `field-${crypto.randomUUID()}`,
      label: cleanPlaceholderLabel(normalized) || (locale === "vi" ? "Trường mới" : "New field"),
      placeholder: normalized,
      mappedKey: guessMapping(normalized),
      source: normalized ? "highlight" : "manual",
      count: normalized ? Math.max(1, countOccurrences(draftDocumentRef.current.plainText, normalized)) : 0,
    };
    applyDraft(
      (documentValue) => ({
        ...documentValue,
        fields: [field, ...documentValue.fields],
      }),
      true,
    );
  };

  const approveAiSuggestions = (): void => {
    const selected = aiSuggestions.filter((item) => item.checked);
    if (!selected.length) return;
    applyDraft(
      (documentValue) => ({
        ...documentValue,
        fields: [
          ...documentValue.fields,
          ...selected.map((item) => ({
            id: `field-${crypto.randomUUID()}`,
            label: item.label,
            placeholder: item.placeholder,
            mappedKey: item.mappedKey,
            source: "ai" as const,
            count: Math.max(1, countOccurrences(documentValue.plainText, item.placeholder)),
          })),
        ],
      }),
      true,
    );
    setAiSuggestions((current) => current.filter((item) => !item.checked));
  };

  return (
    <SectionCard
      title={documentItem.fileName}
      action={
        <Button
          type="button"
          variant={draftDocument.status === "done" ? "outline" : "default"}
          onClick={() =>
            applyDraft(
              (documentValue) => ({
                ...documentValue,
                status: documentValue.status === "done" ? "draft" : "done",
              }),
              true,
            )
          }
          className={draftDocument.status === "draft" ? "bg-zinc-950 text-white hover:bg-zinc-800" : ""}
        >
          <Check className="size-4" />
          {draftDocument.status === "done" ? t.markDraft : t.markDone}
        </Button>
      }
    >
      <div className="grid gap-0 divide-y divide-zinc-200 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)] xl:divide-x xl:divide-y-0">
        <div className="min-w-0 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">{t.preview}</h3>
              <p className="mt-1 text-xs text-zinc-500">
                {documentItem.fileType === "pdf" ? t.pdfHint : t.selectionHint}
              </p>
            </div>
            {(documentItem.fileType === "docx" || documentItem.fileType === "doc") && documentItem.previewHtml && (
              <div className="inline-flex rounded-md border border-zinc-300 p-1">
                <button
                  type="button"
                  onClick={() => applyDraft((value) => ({ ...value, previewMode: "highlight" }), true)}
                  className={cn(
                    "flex h-8 items-center gap-2 rounded px-3 text-xs font-medium",
                    draftDocument.previewMode === "highlight"
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600 hover:bg-zinc-100",
                  )}
                >
                  <Highlighter className="size-4" />
                  {t.highlight}
                </button>
                <button
                  type="button"
                  onClick={() => applyDraft((value) => ({ ...value, previewMode: "edit" }), true)}
                  className={cn(
                    "flex h-8 items-center gap-2 rounded px-3 text-xs font-medium",
                    draftDocument.previewMode === "edit" ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-100",
                  )}
                >
                  <PencilLine className="size-4" />
                  {t.edit}
                </button>
              </div>
            )}
          </div>
          {draftDocument.previewMode === "edit" && (
            <p className="mb-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-600">{t.editHint}</p>
          )}
          <PreviewPane
            locale={locale}
            documentItem={draftDocument}
            navigation={navigation}
            previewRef={fieldNavigation.previewRef}
            selection={fieldNavigation.selection}
            onActivateField={fieldNavigation.selectFromPreview}
            noPreview={t.noPreview}
            onSelectText={addField}
            onEdit={(html) =>
              applyDraft(
                (value) => ({
                  ...value,
                  previewHtml: DOMPurify.sanitize(html),
                }),
                true,
              )
            }
          />
        </div>

        <div id="lawfirm-field-review" className="min-w-0 scroll-mt-4 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">{t.fields}</h3>
              <p className="mt-1 text-xs text-zinc-500">
                {draftDocument.fields.length} {t.occurrences}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => addField()}>
                <Plus className="size-4" />
                {t.addField}
              </Button>
            </div>
          </div>
          <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              type="search"
              value={fieldSearch}
              onChange={(event) => setFieldSearch(event.target.value)}
              placeholder={locale === "vi" ? "Tìm theo tên, placeholder hoặc trường ánh xạ" : "Search fields"}
              className={cn(inputClass, "h-9 text-xs")}
            />
            <select
              value={fieldFilter}
              onChange={(event) => setFieldFilter(event.target.value as typeof fieldFilter)}
              className={cn(inputClass, "h-9 w-full text-xs sm:w-36")}
              aria-label={locale === "vi" ? "Lọc trường" : "Filter fields"}
            >
              <option value="all">{locale === "vi" ? "Tất cả" : "All"}</option>
              <option value="review">{locale === "vi" ? "Cần kiểm tra" : "Needs review"}</option>
              <option value="unmapped">{locale === "vi" ? "Chưa ánh xạ" : "Unmapped"}</option>
            </select>
          </div>
          <div ref={fieldNavigation.fieldListRef} className="max-h-[580px] space-y-3 overflow-y-auto pr-1">
            {aiSuggestions.length ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
                <div className="space-y-2">
                  {aiSuggestions.map((suggestion) => (
                    <article key={suggestion.id} className="rounded-md border border-zinc-200 bg-white p-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={suggestion.checked}
                          onChange={(event) =>
                            setAiSuggestions((current) =>
                              current.map((item) =>
                                item.id === suggestion.id ? { ...item, checked: event.target.checked } : item,
                              ),
                            )
                          }
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1 space-y-2">
                          <input
                            value={suggestion.label}
                            onChange={(event) =>
                              setAiSuggestions((current) =>
                                current.map((item) =>
                                  item.id === suggestion.id ? { ...item, label: event.target.value } : item,
                                ),
                              )
                            }
                            className={inputClass}
                          />
                          <input
                            value={suggestion.placeholder}
                            onChange={(event) =>
                              setAiSuggestions((current) =>
                                current.map((item) =>
                                  item.id === suggestion.id
                                    ? {
                                        ...item,
                                        placeholder: event.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                            className={cn(inputClass, "font-mono text-xs")}
                          />
                          <select
                            value={suggestion.mappedKey}
                            onChange={(event) =>
                              setAiSuggestions((current) =>
                                current.map((item) =>
                                  item.id === suggestion.id ? { ...item, mappedKey: event.target.value } : item,
                                ),
                              )
                            }
                            className={inputClass}
                          >
                            <option value="">{t.noMapping}</option>
                            {profileFields.map((profileField) => (
                              <option key={profileField.id} value={profileField.id}>
                                {profileField.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setAiSuggestions((current) => current.filter((item) => item.id !== suggestion.id))
                          }
                          className="flex size-8 items-center justify-center rounded-md border border-zinc-300 text-zinc-500 hover:border-zinc-950 hover:text-zinc-950"
                          aria-label={t.aiDismissRow}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-zinc-950 text-white hover:bg-zinc-800"
                    onClick={approveAiSuggestions}
                    disabled={!aiSuggestions.some((item) => item.checked)}
                  >
                    {t.aiApproveSelected}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setAiSuggestions([])}>
                    {t.aiDismissAll}
                  </Button>
                </div>
              </div>
            ) : null}
            {visibleFields.map((field) => {
              const navigationField = navigationByFieldId.get(field.id);
              const occurrences = navigationField?.occurrences ?? [];
              const mappingStatus = navigationField?.mapping_status ?? (field.mappedKey ? "mapped" : "unmapped");
              const activeOccurrenceIndex = occurrences.findIndex(
                (occurrence) => occurrence.occurrence_key === fieldNavigation.selection?.occurrenceKey,
              );
              const active = fieldNavigation.selection?.fieldId === field.id;
              const showOccurrence = (index: number) => {
                const occurrence = occurrences[index];
                fieldNavigation.selectFromPanel({
                  fieldId: field.id,
                  occurrenceKey: occurrence?.occurrence_key ?? null,
                });
              };
              return (
              <article
                key={field.id}
                data-field-card={field.id}
                tabIndex={0}
                aria-current={active ? "true" : undefined}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("input, select, textarea, button")) return;
                  showOccurrence(activeOccurrenceIndex >= 0 ? activeOccurrenceIndex : 0);
                }}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget || !["Enter", " "].includes(event.key)) return;
                  event.preventDefault();
                  showOccurrence(activeOccurrenceIndex >= 0 ? activeOccurrenceIndex : 0);
                }}
                className={cn(
                  "rounded-md border p-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500",
                  active ? "border-blue-400 bg-blue-50/50" : "border-zinc-200 bg-white",
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <FieldLabel>{t.fieldName}</FieldLabel>
                    <input
                      value={field.label}
                      onChange={(event) => updateField(field.id, { label: event.target.value })}
                      onBlur={() => void saveDocument()}
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      applyDraft(
                        (value) => ({
                          ...value,
                          fields: value.fields.filter((item) => item.id !== field.id),
                        }),
                        true,
                      )
                    }
                    className="mt-6 flex size-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-500 hover:border-zinc-950 hover:text-zinc-950"
                    aria-label="Delete field"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-3">
                  <FieldLabel>{t.placeholder}</FieldLabel>
                  <input
                    value={field.placeholder}
                    onChange={(event) =>
                      updateField(field.id, {
                        placeholder: event.target.value,
                        count: countOccurrences(draftDocument.plainText, event.target.value),
                      })
                    }
                    onBlur={() => void saveDocument()}
                    className={cn(inputClass, "font-mono text-xs")}
                  />
                </div>
                <div className="mt-3">
                  <FieldLabel>{t.mapping}</FieldLabel>
                  <select
                    value={field.mappedKey}
                    onChange={(event) => updateField(field.id, { mappedKey: event.target.value }, true)}
                    className={inputClass}
                  >
                    <option value="">{t.noMapping}</option>
                    {profileFields.map((profileField) => (
                      <option key={profileField.id} value={profileField.id}>
                        {profileField.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>
                      {field.source === "auto"
                        ? t.auto
                        : field.source === "highlight"
                          ? t.highlighted
                          : field.source === "ai"
                            ? "AI"
                            : t.manual}
                    </span>
                    {field.discovery?.occurrences[0] && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                        {discoverySourceLabels[field.discovery.occurrences[0].sourceKind] ??
                          field.discovery.occurrences[0].sourceKind}
                        {` ${Math.round(field.discovery.occurrences[0].confidence * 100)}%`}
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        mappingStatus === "mapped"
                          ? "bg-emerald-50 text-emerald-700"
                          : mappingStatus === "conflict"
                            ? "bg-red-50 text-red-700"
                            : mappingStatus === "needs_review"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-zinc-100 text-zinc-600",
                      )}
                    >
                      {mappingStatus === "mapped"
                        ? locale === "vi"
                          ? "Đã ánh xạ"
                          : "Mapped"
                        : mappingStatus === "conflict"
                          ? locale === "vi"
                            ? "Xung đột"
                            : "Conflict"
                          : mappingStatus === "needs_review"
                            ? locale === "vi"
                              ? "Cần kiểm tra"
                              : "Needs review"
                            : locale === "vi"
                              ? "Chưa ánh xạ"
                              : "Unmapped"}
                    </span>
                  </div>
                  <span>
                    {occurrences.length || field.count} {t.occurrences}
                  </span>
                </div>
                {occurrences.length > 0 ? (
                  <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => showOccurrence(activeOccurrenceIndex >= 0 ? activeOccurrenceIndex : 0)}
                      className="font-medium text-zinc-700 underline-offset-4 hover:text-zinc-950 hover:underline"
                    >
                      {locale === "vi" ? "Hiện trong tài liệu" : "Show in document"}
                    </button>
                    {occurrences.length > 1 ? (
                      <div className="flex items-center gap-2 text-zinc-500">
                        <button
                          type="button"
                          disabled={activeOccurrenceIndex <= 0}
                          onClick={() => showOccurrence(Math.max(0, activeOccurrenceIndex - 1))}
                          className="disabled:opacity-30"
                        >
                          {locale === "vi" ? "Trước" : "Previous"}
                        </button>
                        <span>{Math.max(1, activeOccurrenceIndex + 1)}/{occurrences.length}</span>
                        <button
                          type="button"
                          disabled={activeOccurrenceIndex >= occurrences.length - 1}
                          onClick={() => showOccurrence(Math.min(occurrences.length - 1, Math.max(0, activeOccurrenceIndex + 1)))}
                          className="disabled:opacity-30"
                        >
                          {locale === "vi" ? "Sau" : "Next"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            )})}
            {!visibleFields.length && <EmptyState title={t.noFields} description={t.noFieldsDescription} />}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function PreviewPane({
  locale,
  documentItem,
  navigation,
  previewRef,
  selection,
  onActivateField,
  noPreview,
  onSelectText,
  onEdit,
}: {
  locale: Locale;
  documentItem: TemplateDocument;
  navigation: LawfirmDocumentNavigationDto | null;
  previewRef: RefObject<HTMLDivElement | null>;
  selection: LawfirmFieldSelection | null;
  onActivateField: (selection: LawfirmFieldSelection) => void;
  noPreview: string;
  onSelectText: (text: string) => void;
  onEdit: (html: string) => void;
}) {
  const [html, setHtml] = useState(documentItem.previewHtml ?? "");
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (!documentItem.previewHtml) {
        setHtml("");
        return;
      }
      const sanitized = DOMPurify.sanitize(documentItem.previewHtml);
      if (documentItem.previewMode === "edit") {
        setHtml(sanitized);
        return;
      }
      const parser = new DOMParser();
      const parsed = parser.parseFromString(`<div id="root">${sanitized}</div>`, "text/html");
      const root = parsed.getElementById("root");
      if (!root) {
        setHtml(sanitized);
        return;
      }
      const navigationByFieldId = new Map(
        (navigation?.fields ?? []).map((field) => [field.field_id, field]),
      );
      const terms = documentItem.fields
        .flatMap((field) => {
          const occurrences = navigationByFieldId.get(field.id)?.occurrences ?? [];
          const occurrencesByText = new Map<string, string[]>();
          occurrences.forEach((occurrence) => {
            const candidate = (occurrence.current_value || occurrence.raw_text).trim();
            if (!candidate) return;
            const keys = occurrencesByText.get(candidate) ?? [];
            keys.push(occurrence.occurrence_key);
            occurrencesByText.set(candidate, keys);
          });
          const placeholder = field.placeholder.trim();
          if (placeholder && !occurrencesByText.has(placeholder)) {
            occurrencesByText.set(
              placeholder,
              occurrences.map((occurrence) => occurrence.occurrence_key),
            );
          }
          return [...occurrencesByText.entries()].map(([text, occurrenceKeys]) => ({
            id: field.id,
            label: field.label,
            text,
            occurrenceKeys,
          }));
        })
        .filter((term) => term.text)
        .sort((a, b) => b.text.length - a.text.length);
      const occurrenceCursor = new Map<string, number>();
      const termByIdentity = new Map(terms.map((term) => [`${term.id}\u0000${term.text}`, term]));
      const walker = parsed.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) nodes.push(node as Text);
      nodes.forEach((textNode) => {
        const value = textNode.nodeValue ?? "";
        const matches: Array<{ start: number; end: number; id: string }> = [];
        terms.forEach((term) => {
          let start = 0;
          while ((start = value.indexOf(term.text, start)) >= 0) {
            matches.push({
              start,
              end: start + term.text.length,
              id: term.id,
            });
            start += term.text.length;
          }
        });
        matches.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
        const filtered: typeof matches = [];
        matches.forEach((match) => {
          const previous = filtered.at(-1);
          if (!previous || match.start >= previous.end) filtered.push(match);
        });
        if (!filtered.length) return;
        const fragment = parsed.createDocumentFragment();
        let cursor = 0;
        filtered.forEach((match) => {
          if (match.start > cursor) fragment.append(value.slice(cursor, match.start));
          const mark = parsed.createElement("mark");
          const term = termByIdentity.get(`${match.id}\u0000${value.slice(match.start, match.end)}`);
          const cursorKey = `${match.id}\u0000${term?.text ?? ""}`;
          const occurrenceIndex = occurrenceCursor.get(cursorKey) ?? 0;
          const occurrenceKey = term?.occurrenceKeys[occurrenceIndex];
          occurrenceCursor.set(cursorKey, occurrenceIndex + 1);
          mark.className = "lawfirm-field-mark rounded-sm bg-blue-100 px-0.5 text-zinc-950";
          mark.dataset.fieldId = match.id;
          mark.dataset.occurrenceKey = occurrenceKey ?? `legacy:${match.id}:${occurrenceIndex}`;
          mark.setAttribute("role", "button");
          mark.setAttribute("tabindex", "0");
          mark.setAttribute("aria-label", `Field: ${term?.label ?? match.id}`);
          mark.textContent = value.slice(match.start, match.end);
          fragment.append(mark);
          cursor = match.end;
        });
        if (cursor < value.length) fragment.append(value.slice(cursor));
        textNode.parentNode?.replaceChild(fragment, textNode);
      });
      setHtml(root.innerHTML);
    }, 0);
    return () => window.clearTimeout(handle);
  }, [documentItem.previewHtml, documentItem.previewMode, documentItem.fields, navigation]);

  useEffect(() => {
    const marks = previewRef.current?.querySelectorAll<HTMLElement>("[data-occurrence-key]") ?? [];
    marks.forEach((mark) => {
      const active = mark.dataset.occurrenceKey === selection?.occurrenceKey;
      mark.classList.toggle("lawfirm-field-mark-active", active);
      mark.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }, [html, previewRef, selection]);

  const activateFromTarget = (target: EventTarget | null): boolean => {
    const mark = target instanceof HTMLElement ? target.closest<HTMLElement>("[data-field-id]") : null;
    const fieldId = mark?.dataset.fieldId;
    if (!fieldId) return false;
    onActivateField({ fieldId, occurrenceKey: mark.dataset.occurrenceKey ?? null });
    return true;
  };

  if (documentItem.fileType === "pdf" && documentItem.previewImage) {
    return (
      <div ref={previewRef} className="rounded-md border border-zinc-200 bg-zinc-100">
        <p className="border-b border-zinc-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {locale === "vi"
            ? "Bản PDF này chưa có tọa độ đủ tin cậy để đồng bộ vị trí. Danh sách trường vẫn giữ đúng thứ tự đã lưu."
            : "This PDF has no reliable coordinates for position sync. Persisted field order is still preserved."}
        </p>
        <div className="max-h-[540px] overflow-auto p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={documentItem.previewImage} alt={documentItem.fileName} className="mx-auto max-w-full" />
        </div>
      </div>
    );
  }
  if (!documentItem.previewHtml) {
    return (
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-12 text-center text-sm text-zinc-500">
        {noPreview}
      </div>
    );
  }
  return (
    <>
      <style>{`
        .lawfirm-field-mark {
          cursor: pointer;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
          transition: background-color 120ms ease, box-shadow 120ms ease;
        }
        .lawfirm-field-mark:hover,
        .lawfirm-field-mark:focus-visible {
          background-color: #bfdbfe;
          outline: none;
        }
        .lawfirm-field-mark-active {
          background-color: #93c5fd;
          box-shadow: 0 0 0 2px #2563eb;
        }
        .lawfirm-document-preview table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
          margin-bottom: 1rem;
          font-size: 0.75rem;
          border: 1px solid #e4e4e7;
        }
        .lawfirm-document-preview th,
        .lawfirm-document-preview td {
          border: 1px solid #d4d4d8;
          padding: 0.5rem 0.625rem;
          text-align: left;
          vertical-align: top;
        }
        .lawfirm-document-preview th {
          background-color: #f4f4f5;
          font-weight: 600;
          color: #18181b;
        }
        .lawfirm-document-preview tr:nth-child(even) td {
          background-color: #fafafa;
        }
      `}</style>
      <div
        ref={previewRef}
        className={cn(
          "lawfirm-document-preview max-h-[580px] overflow-auto rounded-md border bg-white p-6 text-sm leading-7 text-zinc-800",
          documentItem.previewMode === "edit" ? "border-zinc-950" : "border-zinc-200",
        )}
        contentEditable={documentItem.previewMode === "edit"}
        suppressContentEditableWarning
        onMouseUp={() => {
          if (documentItem.previewMode === "edit") return;
          const selected = window.getSelection()?.toString() ?? "";
          if (selected.trim()) onSelectText(selected);
        }}
        onClick={(event) => {
          if (documentItem.previewMode !== "edit") activateFromTarget(event.target);
        }}
        onKeyDown={(event) => {
          if (documentItem.previewMode === "edit" || !["Enter", " "].includes(event.key)) return;
          if (activateFromTarget(event.target)) event.preventDefault();
        }}
        onBlur={(event) => {
          if (documentItem.previewMode === "edit") onEdit(event.currentTarget.innerHTML);
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}

function AggregatedFieldsPanel({
  locale,
  template,
  profiles,
  activeProfileId,
  onSelectProfile,
  onAddProfile,
  onUpdateProfile,
  onUpdateTemplate,
}: {
  locale: Locale;
  template: TemplateSet;
  profiles: ClientProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onAddProfile: (name?: string) => ClientProfile | Promise<ClientProfile>;
  onUpdateProfile: (id: string, updater: (profile: ClientProfile) => ClientProfile) => void;
  onUpdateTemplate: (updater: (template: TemplateSet) => TemplateSet) => void;
}) {
  const t = copy[locale];
  const entries = useMemo(() => aggregateFields(template), [template]);
  const [target, setTarget] = useState(activeProfileId);
  const [newName, setNewName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const selectedProfile = profiles.find((profile) => profile.id === target);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next: Record<string, string> = {};
      entries.forEach((entry) => {
        next[entry.key] = selectedProfile?.fields.find((field) => field.id === entry.key)?.value ?? "";
      });
      setValues(next);
    }, 0);
    return () => window.clearTimeout(handle);
  }, [selectedProfile, entries]);

  const save = async () => {
    let profile = selectedProfile;
    if (target === "__new__") {
      if (!newName.trim()) {
        setMessage(t.needName);
        return;
      }
      profile = await Promise.resolve(onAddProfile(newName.trim()));
      setTarget(profile.id);
      onSelectProfile(profile.id);
    }
    if (!profile) return;
    const customMappings = new Map<string, string>();
    onUpdateProfile(profile.id, (current) => {
      const fields = [...current.fields];
      entries.forEach((entry) => {
        let field = fields.find((item) => item.id === entry.key);
        if (!field) {
          field = {
            id: `custom-${crypto.randomUUID()}`,
            group: entry.group,
            label: entry.label,
            value: "",
            aliases: entry.key.replace(/^custom:/, ""),
          };
          fields.push(field);
          customMappings.set(entry.key, field.id);
        }
        field.value = values[entry.key] ?? "";
      });
      return { ...current, fields };
    });
    if (customMappings.size) {
      onUpdateTemplate((current) => ({
        ...current,
        documents: current.documents.map((documentItem) => ({
          ...documentItem,
          fields: documentItem.fields.map((field) => {
            const key = `custom:${field.placeholder.trim().toLowerCase()}`;
            return customMappings.has(key)
              ? {
                  ...field,
                  mappedKey: customMappings.get(key) ?? field.mappedKey,
                }
              : field;
          }),
        })),
      }));
    }
    setMessage(t.savedValues);
  };

  return (
    <SectionCard title={t.aggregated} description={t.aggregatedDescription}>
      <div className="grid gap-4 border-b border-zinc-200 p-4 md:grid-cols-[260px_minmax(0,1fr)]">
        <div>
          <FieldLabel>{t.target}</FieldLabel>
          <select
            value={target}
            onChange={(event) => {
              setTarget(event.target.value);
              setMessage("");
            }}
            className={inputClass}
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name || (locale === "vi" ? "Hồ sơ chưa đặt tên" : "Untitled profile")}
              </option>
            ))}
            <option value="__new__">{t.newProfile}</option>
          </select>
        </div>
        {target === "__new__" && (
          <div>
            <FieldLabel>{t.newProfileName}</FieldLabel>
            <input value={newName} onChange={(event) => setNewName(event.target.value)} className={inputClass} />
          </div>
        )}
      </div>
      <div className="space-y-6 p-4">
        {(["individual", "organization", "representative", "other"] as FieldGroup[]).map((group) => {
          const grouped = entries.filter((entry) => entry.group === group);
          if (!grouped.length) return null;
          return (
            <section key={group}>
              <h3 className="mb-3 border-b border-zinc-200 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t.groups[group]}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {grouped.map((entry) => (
                  <div key={entry.key}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <FieldLabel>{entry.label}</FieldLabel>
                      <span className="text-xs text-zinc-500">
                        {entry.refs.length} {t.occurrences}
                      </span>
                    </div>
                    <input
                      value={values[entry.key] ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [entry.key]: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={save} className="bg-zinc-950 text-white hover:bg-zinc-800">
            <Check className="size-4" />
            {t.saveValues}
          </Button>
          {message && (
            <p className={cn("text-sm", message === t.savedValues ? "text-zinc-600" : "text-red-700")} role="status">
              {message}
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
