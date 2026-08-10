"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import {
  Check,
  FileText,
  Highlighter,
  PencilLine,
  HelpCircle,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  analyzeDocument,
  buildDocumentPreviewFromFileId,
  cleanPlaceholderLabel,
  countOccurrences,
} from "./lawfirm-demo-document-service";
import { fieldGroupFor, guessMapping } from "./lawfirm-demo-taxonomy";
import {
  deleteDocumentBytes,
  saveDocumentBytes,
} from "./lawfirm-demo-storage";
import type {
  ClientProfile,
  FieldGroup,
  Locale,
  ProfileField,
  TemplateDocument,
  TemplateField,
  TemplateSet,
} from "./lawfirm-demo-types";
import {
  EmptyState,
  FieldLabel,
  inputClass,
  SectionCard,
  StatusBadge,
} from "./lawfirm-demo-ui";

const copy = {
  vi: {
    title: "Bộ hồ sơ mẫu",
    description: "Tải DOCX hoặc PDF, kiểm tra placeholder và ánh xạ từng trường với hồ sơ khách hàng.",
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
    uploadHint: "Hỗ trợ DOCX và PDF. Hệ thống tự quét placeholder trong tối đa 20 trang PDF.",
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
  activeTemplate,
  activeProfileId,
  onSelectTemplate,
  onSelectProfile,
  onAddTemplate,
  onDeleteTemplate,
  onUpdateTemplate,
  onModeChange,
  onAddProfile,
  onUpdateProfile,
  onUpdateDocument,
  onScanDocument,
  onUploadDocument,
  onRemoveDocument,
}: {
  locale: Locale;
  mode: "library" | "editor";
  profiles: ClientProfile[];
  templates: TemplateSet[];
  activeTemplate: TemplateSet;
  activeProfileId: string;
  onSelectTemplate: (id: string) => void;
  onSelectProfile: (id: string) => void;
  onAddTemplate: () => void | Promise<void>;
  onDeleteTemplate: (id: string) => void;
  onUpdateTemplate: (
    id: string,
    updater: (template: TemplateSet) => TemplateSet,
  ) => void | Promise<void>;
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
  }>;
  onUploadDocument?: (file: File) => Promise<void>;
  onRemoveDocument?: (docId: string) => Promise<void>;
}) {
  const t = copy[locale];
  const [draftName, setDraftName] = useState(activeTemplate.name);
  const draftNameRef = useRef(activeTemplate.name);
  const isNameDirtyRef = useRef(false);
  const isNameSavingRef = useRef(false);
  const [activeDocumentId, setActiveDocumentId] = useState(
    activeTemplate.documents[0]?.id ?? "",
  );
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isNameDirtyRef.current && !isNameSavingRef.current) {
      draftNameRef.current = activeTemplate.name;
      setDraftName(activeTemplate.name);
    }
  }, [activeTemplate.id, activeTemplate.name]);

  const activeDocument =
    activeTemplate.documents.find((item) => item.id === activeDocumentId) ??
    activeTemplate.documents[0];

  const update = (updater: (template: TemplateSet) => TemplateSet): void => {
    void Promise.resolve(onUpdateTemplate(activeTemplate.id, updater)).catch(
      (error: unknown) => {
        toast.error(
          error instanceof Error
            ? error.message
            : locale === "vi"
              ? "Không thể lưu bộ hồ sơ."
              : "Could not save template set.",
        );
      },
    );
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

  const updateDocument = (
    documentId: string,
    updater: (documentItem: TemplateDocument) => TemplateDocument,
  ) => {
    update((template) => ({
      ...template,
      documents: template.documents.map((item) =>
        item.id === documentId ? updater(item) : item,
      ),
    }));
  };

  const addFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((file) => /\.(docx|pdf)$/i.test(file.name));
    setError("");
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
    if (!window.confirm(t.deleteConfirm)) return;
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
    const docCount = activeTemplate.documents.length;
    const title = activeTemplate.name || (locale === "vi" ? "Chưa đặt tên" : "Untitled set");
    const isDraft = activeTemplate.status === "draft";
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-6 lg:px-8">
        <header className="border-b border-zinc-200 pb-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
              {locale === "vi" ? "THƯ VIỆN MẪU HỒ SƠ" : "TEMPLATE SET LIBRARY"}
            </h1>
            <Button type="button" onClick={() => void handleCreateTemplate()}>
              <Plus className="size-4" />
              {t.new}
            </Button>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
            {locale === "vi"
              ? 'Duyệt các bộ hồ sơ mẫu đã chuẩn bị sẵn. Bấm "Xem trước" để xem nội dung bên trong và hướng dẫn sử dụng trước khi dùng để điền hồ sơ.'
              : "Review prepared template sets. Use preview to see details and usage guidance before filling documents."}
          </p>
        </header>

        <div className="rounded-md border border-zinc-200 bg-white p-4">
          <div className="mx-auto mb-4 max-w-3xl">
            <input
              type="text"
              placeholder={
                locale === "vi"
                  ? "Tìm theo tên bộ hồ sơ, mô tả, nguồn luật..."
                  : "Search by template set name, description, legal source..."
              }
              className={inputClass}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
            <button
              type="button"
              onClick={() => void handleCreateTemplate()}
              className="flex min-h-[220px] flex-col items-center justify-center rounded-md border border-dashed border-zinc-300 bg-white transition hover:border-zinc-950"
            >
              <Plus className="size-8 text-zinc-950" />
              <div className="mt-3 text-sm font-medium text-zinc-700">
                {locale === "vi" ? "Tạo bộ hồ sơ mẫu mới" : "Create new template set"}
              </div>
            </button>

            <div className="rounded-md border border-zinc-200 bg-white p-5">
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-zinc-100">
                    <HelpCircle className="size-5 text-zinc-700" />
                  </div>
                </div>
                <div className="rounded-full bg-zinc-950 px-2 py-1 text-xs font-medium text-white">
                  {docCount} tài liệu
                </div>
              </div>

              <h2 className="mt-4 text-lg font-semibold text-zinc-950">{title}</h2>
              <p className="mt-1 text-sm text-zinc-600">
                {locale === "vi" ? "Chưa có hướng dẫn sử dụng." : "No usage guidance yet."}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge strong={isDraft}>{isDraft ? "DANG SOAN" : "HOAN TAT"}</StatusBadge>
                <StatusBadge>{locale === "vi" ? "CON HIEU LUC" : "EFFECTIVE"}</StatusBadge>
                <StatusBadge>{locale === "vi" ? "RIENG TU" : "UNIQUE"}</StatusBadge>
              </div>

              <div className="mt-5 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => onModeChange("editor")}>
                  {locale === "vi" ? "Xem trước" : "Preview"}
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => onModeChange("editor")}>
                  {locale === "vi" ? "Chỉnh sửa" : "Edit"}
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleDeleteTemplate()}>
                  <Trash2 className="size-4" />
                  {locale === "vi" ? "Xóa" : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        </div>
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

      <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SectionCard title={t.documents}>
          <div className="space-y-2 p-3">
            {activeTemplate.documents.map((documentItem) => (
              <div
                key={documentItem.id}
                className={cn(
                  "flex items-center gap-2 rounded-md border p-2",
                  documentItem.id === activeDocument?.id
                    ? "border-zinc-950 bg-zinc-50"
                    : "border-zinc-200",
                )}
              >
                <button
                  type="button"
                  onClick={() => setActiveDocumentId(documentItem.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <FileText className="size-4 shrink-0 text-zinc-500" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{documentItem.fileName}</span>
                    <span className="mt-0.5 block text-xs uppercase text-zinc-500">
                      {documentItem.fileType} · {documentItem.fields.length} {t.fields.toLowerCase()}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void removeDocument(documentItem)}
                  aria-label="Delete document"
                  className="flex size-8 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
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
              dragging
                ? "border-zinc-950 bg-zinc-100"
                : "border-zinc-300 bg-zinc-50 hover:border-zinc-950",
            )}
          >
            <UploadCloud className="size-5 text-zinc-600" />
            <span className="mt-2 text-sm font-medium text-zinc-900">{t.upload}</span>
            <span className="mt-1 text-xs leading-5 text-zinc-500">{t.uploadHint}</span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".docx,.pdf"
            multiple
            hidden
            onChange={(event) => {
              if (event.target.files) void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          {processing && (
            <div className="mx-3 mb-3 rounded-md border border-zinc-200 bg-zinc-50 p-3" role="status">
              <div className="h-2 animate-pulse rounded bg-zinc-200" />
              <p className="mt-2 truncate text-xs text-zinc-600">
                {t.analyzing}: {processing}
              </p>
            </div>
          )}
          {error && <p className="mx-3 mb-3 text-sm text-red-700" role="alert">{error}</p>}
        </SectionCard>

        {activeDocument ? (
          <DocumentEditor
            locale={locale}
            documentItem={activeDocument}
            profileFields={
              profiles.find((profile) => profile.id === activeProfileId)?.fields ?? []
            }
            onPersist={(updater) =>
              Promise.resolve(
                onUpdateDocument
                  ? onUpdateDocument(activeDocument.id, updater)
                  : updateDocument(activeDocument.id, updater),
              )
            }
            onScanDocument={
              onScanDocument ? () => onScanDocument(activeDocument.id) : undefined
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
  onPersist,
  onScanDocument,
}: {
  locale: Locale;
  documentItem: TemplateDocument;
  profileFields: ProfileField[];
  onPersist: (updater: (documentItem: TemplateDocument) => TemplateDocument) => Promise<void>;
  onScanDocument?: () => Promise<{
    ai: Array<{
      placeholder: string;
      mappedKey: string;
      label: string;
      confidence: number;
      source: "deterministic" | "ai";
    }>;
  }>;
}) {
  const t = copy[locale];
  const [draftDocument, setDraftDocument] = useState(documentItem);
  const draftDocumentRef = useRef(documentItem);
  const isDirtyRef = useRef(false);
  const isSavingRef = useRef(false);
  const isRestoringPreviewRef = useRef(false);
  const [aiStatus, setAiStatus] = useState<"idle" | "scanning" | "error" | "done">("idle");
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);

  useEffect(() => {
    isDirtyRef.current = false;
    isSavingRef.current = false;
    isRestoringPreviewRef.current = false;
    draftDocumentRef.current = documentItem;
    setDraftDocument(documentItem);
    setAiStatus("idle");
    setAiSuggestions([]);
  }, [documentItem.id]);

  useEffect(() => {
    const currentDocument = draftDocumentRef.current;
    const needsDocxPreview = currentDocument.fileType === "docx" && !currentDocument.previewHtml;
    const needsPdfPreview = currentDocument.fileType === "pdf" && !currentDocument.previewImage;
    if ((!needsDocxPreview && !needsPdfPreview) || !currentDocument.fileId || isRestoringPreviewRef.current) {
      return;
    }
    isRestoringPreviewRef.current = true;
    void (async () => {
      try {
        const restored = await buildDocumentPreviewFromFileId(
          currentDocument.fileId!,
          currentDocument.fileName,
        );
        applyDraft(
          (documentValue) => ({
            ...documentValue,
            previewHtml: restored.previewHtml,
            previewImage: restored.previewImage,
            plainText: restored.plainText,
            fields:
              documentValue.fields.length > 0
                ? documentValue.fields
                : restored.fields,
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
  }, [draftDocument.fileId, draftDocument.fileName, draftDocument.fileType, draftDocument.previewHtml, draftDocument.previewImage, locale]);

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
        fields: documentValue.fields.map((field) =>
          field.id === id ? { ...field, ...patch } : field,
        ),
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

  const runAiScan = async (): Promise<void> => {
    if (!draftDocumentRef.current.plainText || draftDocumentRef.current.plainText.trim().length === 0) {
      toast.warning(locale === "vi" ? "Tài liệu chưa có nội dung chữ để AI phân tích." : "No document text available for AI analysis.");
      setAiStatus("idle");
      return;
    }
    setAiStatus("scanning");
    try {
      let resultAi: Array<{ placeholder: string; mappedKey: string; label: string }> = [];
      if (onScanDocument) {
        const res = await onScanDocument();
        resultAi = res.ai;
      } else {
        const res = await fetch("/api/ai/scan-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: draftDocumentRef.current.plainText }),
        });
        if (res.ok) {
          const data = await res.json();
          resultAi = data.ai || [];
        }
      }

      const existing = new Set(
        draftDocumentRef.current.fields.map((field) => field.placeholder.trim()),
      );
      const suggestions = resultAi
        .filter((item) => item.placeholder.trim() && !existing.has(item.placeholder.trim()))
        .map(
          (item): AiSuggestion => ({
            id: `ai-${crypto.randomUUID()}`,
            label: item.label.trim() || cleanPlaceholderLabel(item.placeholder),
            placeholder: item.placeholder.trim(),
            mappedKey: item.mappedKey,
            checked: true,
          }),
        );
      setAiSuggestions(suggestions);
      setAiStatus("done");
      if (suggestions.length === 0) {
        toast.info(locale === "vi" ? "AI đã quét xong, không phát hiện thêm trường mới nào." : "AI scan complete, no new fields detected.");
      }
    } catch {
      setAiStatus("error");
      setAiSuggestions([]);
    }
  };

  useEffect(() => {
    if (!onScanDocument || draftDocument.fileType !== "docx") return;
    if (draftDocument.fields.length > 0 || aiStatus !== "idle") return;
    void runAiScan();
  }, [draftDocument.fileType, draftDocument.fields.length, aiStatus, onScanDocument]);

  const approveAiSuggestions = (): void => {
    const selected = aiSuggestions.filter((item) => item.checked);
    if (!selected.length) return;
    applyDraft(
      (documentValue) => ({
        ...documentValue,
        fields: [
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
            applyDraft((documentValue) => ({
              ...documentValue,
              status: documentValue.status === "done" ? "draft" : "done",
            }), true)
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
            {documentItem.fileType === "docx" && documentItem.previewHtml && (
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
                    draftDocument.previewMode === "edit"
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600 hover:bg-zinc-100",
                  )}
                >
                  <PencilLine className="size-4" />
                  {t.edit}
                </button>
              </div>
            )}
          </div>
          {draftDocument.previewMode === "edit" && (
            <p className="mb-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-600">
              {t.editHint}
            </p>
          )}
          <PreviewPane
            documentItem={draftDocument}
            noPreview={t.noPreview}
            onSelectText={addField}
            onEdit={(html) =>
              applyDraft((value) => ({ ...value, previewHtml: DOMPurify.sanitize(html) }), true)
            }
          />
        </div>

        <div className="min-w-0 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">{t.fields}</h3>
              <p className="mt-1 text-xs text-zinc-500">
                {draftDocument.fields.length} {t.occurrences}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={aiStatus === "scanning"}
                onClick={() => void runAiScan()}
                className="border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-50 text-xs font-medium"
              >
                <span>{aiStatus === "scanning" ? (locale === "vi" ? "Đang quét AI..." : "Scanning AI...") : (locale === "vi" ? "Quét AI" : "AI Scan")}</span>
              </Button>

              <Button type="button" variant="outline" size="sm" onClick={() => addField()}>
                <Plus className="size-4" />
                {t.addField}
              </Button>
            </div>
          </div>
          <div className="max-h-[580px] space-y-3 overflow-y-auto pr-1">
            {aiStatus === "scanning" ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-zinc-800">
                {t.aiScanning}
              </div>
            ) : null}
            {aiStatus === "error" ? (
              <div className="rounded-md border border-zinc-300 bg-zinc-50 p-3">
                <p className="text-sm text-zinc-700">{t.aiScanError}</p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void runAiScan()}>
                  {t.aiScanRetry}
                </Button>
              </div>
            ) : null}
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
                                item.id === suggestion.id
                                  ? { ...item, checked: event.target.checked }
                                  : item,
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
                                  item.id === suggestion.id
                                    ? { ...item, label: event.target.value }
                                    : item,
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
                                    ? { ...item, placeholder: event.target.value }
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
                                  item.id === suggestion.id
                                    ? { ...item, mappedKey: event.target.value }
                                    : item,
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
                            setAiSuggestions((current) =>
                              current.filter((item) => item.id !== suggestion.id),
                            )
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAiSuggestions([])}
                  >
                    {t.aiDismissAll}
                  </Button>
                </div>
              </div>
            ) : null}
            {draftDocument.fields.map((field) => (
              <article key={field.id} className="rounded-md border border-zinc-200 p-3">
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
                      applyDraft((value) => ({
                        ...value,
                        fields: value.fields.filter((item) => item.id !== field.id),
                      }), true)
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
                  <span>
                    {field.source === "auto"
                      ? t.auto
                      : field.source === "highlight"
                        ? t.highlighted
                        : field.source === "ai"
                          ? "AI"
                          : t.manual}
                  </span>
                  <span>{field.count} {t.occurrences}</span>
                </div>
              </article>
            ))}
            {!draftDocument.fields.length && (
              <EmptyState title={t.noFields} description={t.noFieldsDescription} />
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function PreviewPane({
  documentItem,
  noPreview,
  onSelectText,
  onEdit,
}: {
  documentItem: TemplateDocument;
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
      const terms = [...documentItem.fields]
        .filter((field) => field.placeholder.trim())
        .sort((a, b) => b.placeholder.length - a.placeholder.length);
      const walker = parsed.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) nodes.push(node as Text);
      nodes.forEach((textNode) => {
        const value = textNode.nodeValue ?? "";
        const matches: Array<{ start: number; end: number; id: string }> = [];
        terms.forEach((term) => {
          let start = 0;
          while ((start = value.indexOf(term.placeholder, start)) >= 0) {
            matches.push({ start, end: start + term.placeholder.length, id: term.id });
            start += term.placeholder.length;
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
          mark.className = "rounded-sm bg-amber-200 px-0.5 text-zinc-950";
          mark.dataset.fieldId = match.id;
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
  }, [documentItem.previewHtml, documentItem.previewMode, documentItem.fields]);

  if (documentItem.fileType === "pdf" && documentItem.previewImage) {
    return (
      <div className="max-h-[580px] overflow-auto rounded-md border border-zinc-200 bg-zinc-100 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={documentItem.previewImage} alt={documentItem.fileName} className="mx-auto max-w-full" />
      </div>
    );
  }
  if (!documentItem.previewHtml) {
    return <div className="rounded-md border border-zinc-200 bg-zinc-50 p-12 text-center text-sm text-zinc-500">{noPreview}</div>;
  }
  return (
    <div
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
      onBlur={(event) => {
        if (documentItem.previewMode === "edit") onEdit(event.currentTarget.innerHTML);
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
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
        next[entry.key] =
          selectedProfile?.fields.find((field) => field.id === entry.key)?.value ?? "";
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
              ? { ...field, mappedKey: customMappings.get(key) ?? field.mappedKey }
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
                      <span className="text-xs text-zinc-500">{entry.refs.length} {t.occurrences}</span>
                    </div>
                    <input
                      value={values[entry.key] ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [entry.key]: event.target.value }))
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
