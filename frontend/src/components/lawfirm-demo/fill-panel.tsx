"use client";

import { useMemo, useRef, useState } from "react";
import {
  Archive,
  Check,
  Download,
  FileText,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createResultsZip,
  downloadBlob,
  fillDocx,
} from "./lawfirm-demo-document-service";
import { getDocumentBytes } from "./lawfirm-demo-storage";
import type {
  ClientProfile,
  FillResult,
  FillSourceFile,
  Locale,
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
    eyebrow: "Điền nhiều tài liệu trong một lần",
    title: "Điền hồ sơ",
    description: "Chọn bộ tài liệu và hồ sơ khách hàng, kiểm tra mức độ khớp rồi tạo toàn bộ file DOCX.",
    summaryTemplate: "Bộ hồ sơ mẫu",
    summaryProfile: "Hồ sơ khách hàng",
    noTemplate: "Chưa chọn bộ hồ sơ",
    noProfile: "Chưa chọn hồ sơ",
    documents: "tài liệu",
    completed: "đã hoàn tất",
    valuedFields: "trường có dữ liệu",
    source: "Chọn nguồn từ thư viện",
    sourceDescription: "Chỉ các bộ hồ sơ đã hoàn tất mới xuất hiện trong danh sách.",
    select: "Chọn",
    libraryEmpty: "Chưa có bộ hồ sơ trong thư viện. Hoàn tất một bộ ở màn hình Bộ hồ sơ mẫu trước.",
    matching: "Đối chiếu trường thông tin",
    matchSummary: "trường đã có dữ liệu trên tổng số trường được ánh xạ",
    noMappedFields: "Bộ hồ sơ này chưa có trường được ánh xạ với hồ sơ khách hàng.",
    uploadTitle: "Tải file khác",
    uploadDescription: "Tùy chọn. File tải tại đây không cần nằm trong thư viện.",
    upload: "Kéo thả DOCX vào đây hoặc bấm để chọn",
    uploadHint: "Có thể chọn nhiều file. Mỗi file sẽ dùng danh sách placeholder của hồ sơ hiện tại.",
    clear: "Xóa danh sách",
    fill: "Điền tự động vào tất cả",
    processing: "Đang xử lý",
    needData: "Cần ít nhất một trường có dữ liệu và một nguồn DOCX để bắt đầu.",
    results: "Kết quả",
    downloadAll: "Tải tất cả ZIP",
    download: "Tải file",
    success: "Đã điền",
    noMatch: "Không khớp",
    unsupported: "PDF chỉ xem",
    error: "Lỗi xử lý",
    positions: "vị trí đã điền",
    noResults: "Chưa có kết quả",
    noResultsDescription: "Kết quả sẽ xuất hiện sau khi bạn chạy chức năng điền tự động.",
  },
  en: {
    eyebrow: "Fill multiple documents at once",
    title: "Fill documents",
    description: "Choose a template set and client profile, review field matching, then generate every DOCX file.",
    summaryTemplate: "Template set",
    summaryProfile: "Client profile",
    noTemplate: "No template set selected",
    noProfile: "No profile selected",
    documents: "documents",
    completed: "complete",
    valuedFields: "fields with values",
    source: "Choose from the library",
    sourceDescription: "Only completed template sets are available here.",
    select: "Select",
    libraryEmpty: "No template sets are in the library. Complete one in the Template sets screen first.",
    matching: "Field matching",
    matchSummary: "fields have values out of all mapped fields",
    noMappedFields: "This template set has no fields mapped to the client profile.",
    uploadTitle: "Upload other files",
    uploadDescription: "Optional. Files uploaded here do not need to be in the library.",
    upload: "Drop DOCX files here or click to browse",
    uploadHint: "Multiple files are supported. Each file uses the active profile's placeholder list.",
    clear: "Clear list",
    fill: "Auto-fill all",
    processing: "Processing",
    needData: "At least one populated field and one DOCX source are required.",
    results: "Results",
    downloadAll: "Download all as ZIP",
    download: "Download",
    success: "Filled",
    noMatch: "No match",
    unsupported: "PDF preview only",
    error: "Processing error",
    positions: "positions filled",
    noResults: "No results yet",
    noResultsDescription: "Results appear after you run auto-fill.",
  },
} as const;

export function FillPanel({
  locale,
  profiles,
  templates,
  activeProfileId,
  activeTemplateId,
  onSelectProfile,
  onSelectTemplate,
  onRunServerFill,
  getDownloadUrl,
}: {
  locale: Locale;
  profiles: ClientProfile[];
  templates: TemplateSet[];
  activeProfileId: string;
  activeTemplateId: string;
  onSelectProfile: (id: string) => void;
  onSelectTemplate: (id: string) => void;
  onRunServerFill?: (profileId: string, templateSetId: string) => Promise<{ id: string }>;
  getDownloadUrl?: (runId: string) => string;
}) {
  const t = copy[locale];
  const readyTemplates = templates.filter((template) => template.status === "ready");
  const profile = profiles.find((item) => item.id === activeProfileId);
  const selectedTemplate = readyTemplates.find((item) => item.id === activeTemplateId);
  const [files, setFiles] = useState<FillSourceFile[]>([]);
  const [results, setResults] = useState<FillResult[]>([]);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const populatedFields = profile?.fields.filter((field) => field.value.trim()) ?? [];
  const mappedFields = useMemo(
    () => selectedTemplate?.documents.flatMap((documentItem) => documentItem.fields).filter((field) => field.mappedKey) ?? [],
    [selectedTemplate],
  );
  const matchedFields = mappedFields.filter((field) =>
    populatedFields.some((profileField) => profileField.id === field.mappedKey),
  );
  const hasSource = Boolean(selectedTemplate?.documents.length || files.length);
  const canFill = Boolean(populatedFields.length && hasSource && !progress);

  const addFiles = (fileList: FileList | File[]) => {
    const next = Array.from(fileList)
      .filter((file) => /\.docx$/i.test(file.name))
      .map((file) => ({
        id: `source-${crypto.randomUUID()}`,
        name: file.name,
        file,
      }));
    setFiles((current) => [...current, ...next]);
    setResults([]);
  };

  const fillAll = async () => {
    if (!profile || !canFill) {
      setError(t.needData);
      return;
    }
    setError("");
    setResults([]);

    if (onRunServerFill && selectedTemplate) {
      try {
        setProgress(t.processing);
        const run = await onRunServerFill(profile.id, selectedTemplate.id);
        setProgress("");
        if (getDownloadUrl) {
          window.open(getDownloadUrl(run.id), "_blank");
        }
        setResults([
          {
            id: run.id,
            name: "ho_so_da_dien.zip",
            count: selectedTemplate.documents.length,
            state: "success",
          },
        ]);
        return;
      } catch {
        setProgress("");
        setError(t.error);
        return;
      }
    }

    const nextResults: FillResult[] = [];

    if (selectedTemplate) {
      for (let index = 0; index < selectedTemplate.documents.length; index += 1) {
        const documentItem = selectedTemplate.documents[index];
        setProgress(`${t.processing} (${index + 1}/${selectedTemplate.documents.length}): ${documentItem.fileName}`);
        if (documentItem.fileType === "pdf") {
          nextResults.push({
            id: `result-${crypto.randomUUID()}`,
            name: documentItem.fileName,
            count: 0,
            state: "unsupported",
          });
          continue;
        }
        try {
          const bytes = documentItem.storageKey
            ? await getDocumentBytes(documentItem.storageKey)
            : null;
          if (!bytes) throw new Error("missing bytes");
          const replacements = documentItem.fields
            .map((field) => {
              const profileField = profile.fields.find((item) => item.id === field.mappedKey);
              return {
                aliases: [field.placeholder],
                value: profileField?.value.trim() ?? "",
              };
            })
            .filter((item) => item.value);
          const output = await fillDocx(bytes, replacements);
          nextResults.push({
            id: `result-${crypto.randomUUID()}`,
            name: documentItem.fileName,
            blob: output.blob,
            count: output.count,
            state: output.count > 0 ? "success" : "no_match",
          });
        } catch {
          nextResults.push({
            id: `result-${crypto.randomUUID()}`,
            name: documentItem.fileName,
            count: 0,
            state: "error",
          });
        }
      }
    }

    for (let index = 0; index < files.length; index += 1) {
      const source = files[index];
      setProgress(`${t.processing} (${index + 1}/${files.length}): ${source.name}`);
      try {
        const replacements = populatedFields
          .map((field) => ({
            value: field.value.trim(),
            aliases: field.aliases.split(",").map((item) => item.trim()).filter(Boolean),
          }))
          .filter((item) => item.aliases.length);
        const output = await fillDocx(await source.file.arrayBuffer(), replacements);
        nextResults.push({
          id: `result-${crypto.randomUUID()}`,
          name: source.name,
          blob: output.blob,
          count: output.count,
          state: output.count > 0 ? "success" : "no_match",
        });
      } catch {
        nextResults.push({
          id: `result-${crypto.randomUUID()}`,
          name: source.name,
          count: 0,
          state: "error",
        });
      }
    }
    setResults(nextResults);
    setProgress("");
  };

  const downloadAll = async () => {
    const blob = await createResultsZip(results);
    downloadBlob(blob, "ho_so_da_dien.zip");
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-6 lg:px-8">
      <header className="border-b border-zinc-200 pb-6">
        <p className="text-sm font-medium text-zinc-500">{t.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">{t.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">{t.description}</p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <SummaryBlock
          label={t.summaryTemplate}
          name={selectedTemplate?.name || t.noTemplate}
          detail={
            selectedTemplate
              ? `${selectedTemplate.documents.length} ${t.documents}, ${selectedTemplate.documents.filter((item) => item.status === "done").length} ${t.completed}`
              : ""
          }
        />
        <SummaryBlock
          label={t.summaryProfile}
          name={profile?.name || t.noProfile}
          detail={profile ? `${populatedFields.length} / ${profile.fields.length} ${t.valuedFields}` : ""}
        />
      </div>

      <SectionCard title={t.source} description={t.sourceDescription}>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <FieldLabel>{t.summaryTemplate}</FieldLabel>
            <select
              value={selectedTemplate?.id ?? ""}
              onChange={(event) => onSelectTemplate(event.target.value)}
              className={inputClass}
            >
              <option value="">{t.select}</option>
              {readyTemplates.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>{t.summaryProfile}</FieldLabel>
            <select
              value={profile?.id ?? ""}
              onChange={(event) => onSelectProfile(event.target.value)}
              className={inputClass}
            >
              <option value="">{t.select}</option>
              {profiles.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
        </div>
        {!readyTemplates.length && (
          <p className="mx-4 mb-4 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm leading-6 text-zinc-600">
            {t.libraryEmpty}
          </p>
        )}
      </SectionCard>

      {selectedTemplate && profile && (
        <SectionCard title={t.matching}>
          <div className="p-4">
            {mappedFields.length ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-3xl font-semibold tabular-nums">
                  {matchedFields.length}/{mappedFields.length}
                </span>
                <p className="text-sm text-zinc-600">{t.matchSummary}</p>
              </div>
            ) : (
              <p className="text-sm text-zinc-600">{t.noMappedFields}</p>
            )}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title={t.uploadTitle}
        description={t.uploadDescription}
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFiles([]);
              setResults([]);
            }}
            disabled={!files.length}
          >
            <Trash2 className="size-4" />
            {t.clear}
          </Button>
        }
      >
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
            addFiles(event.dataTransfer.files);
          }}
          className={cn(
            "m-4 flex w-[calc(100%-2rem)] flex-col items-center rounded-md border border-dashed px-5 py-8 text-center transition",
            dragging
              ? "border-zinc-950 bg-zinc-100"
              : "border-zinc-300 bg-zinc-50 hover:border-zinc-950",
          )}
        >
          <UploadCloud className="size-6 text-zinc-600" />
          <span className="mt-2 text-sm font-medium text-zinc-900">{t.upload}</span>
          <span className="mt-1 text-xs leading-5 text-zinc-500">{t.uploadHint}</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".docx"
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = "";
          }}
        />
        {files.length > 0 && (
          <div className="divide-y divide-zinc-200 border-t border-zinc-200">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="size-4 shrink-0 text-zinc-500" />
                  <span className="truncate text-sm font-medium">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))}
                  className="flex size-8 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                  aria-label="Remove file"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => void fillAll()}
          disabled={!canFill}
          className="bg-zinc-950 text-white hover:bg-zinc-800"
        >
          <Check className="size-4" />
          {t.fill}
        </Button>
        {progress && <p className="text-sm text-zinc-600" role="status">{progress}</p>}
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        {!canFill && !progress && !error && (
          <p className="text-sm text-zinc-500">{t.needData}</p>
        )}
      </div>

      <SectionCard
        title={t.results}
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => void downloadAll()}
            disabled={!results.some((result) => result.blob)}
          >
            <Archive className="size-4" />
            {t.downloadAll}
          </Button>
        }
      >
        {results.length ? (
          <div className="divide-y divide-zinc-200">
            {results.map((result) => (
              <div key={result.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="size-4 shrink-0 text-zinc-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{result.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{result.count} {t.positions}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge strong={result.state === "success"}>
                    {result.state === "success"
                      ? t.success
                      : result.state === "no_match"
                        ? t.noMatch
                        : result.state === "unsupported"
                          ? t.unsupported
                          : t.error}
                  </StatusBadge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!result.blob}
                    onClick={() => {
                      if (result.blob) downloadBlob(result.blob, `DA_DIEN_${result.name}`);
                    }}
                  >
                    <Download className="size-4" />
                    {t.download}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={t.noResults} description={t.noResultsDescription} />
        )}
      </SectionCard>
    </div>
  );
}

function SummaryBlock({
  label,
  name,
  detail,
}: {
  label: string;
  name: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold text-zinc-950">{name}</p>
      {detail && <p className="mt-1 text-sm text-zinc-500">{detail}</p>}
    </div>
  );
}

