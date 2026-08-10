"use client";

import { useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Sparkles,
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
    title: "TIẾN TRÌNH ĐIỀN HỒ SƠ TỰ ĐỘNG",
    description: "Điền dữ liệu từ hồ sơ khách hàng vào bộ tài liệu mẫu DOCX và xuất file kết quả hàng loạt.",
    step1: "1. Chọn Nguồn dữ liệu",
    step2: "2. Đối chiếu & Hiệu chỉnh",
    step3: "3. Thực thi & Tải về",
    selectProfile: "Chọn Hồ sơ khách hàng",
    selectTemplate: "Chọn Bộ hồ sơ mẫu (DOCX)",
    noProfileSelected: "Chưa chọn hồ sơ",
    noTemplateSelected: "Chưa chọn bộ hồ sơ mẫu",
    matchingRate: "Tỷ lệ khớp trường dữ liệu",
    nextToReview: "Tiếp tục: Kiểm tra đối chiếu",
    backToStep1: "Quay lại chọn nguồn",
    runFill: "Bắt đầu Điền hồ sơ tự động",
    processing: "Đang xử lý bóc tách & điền file DOCX...",
    step3Title: "Kết quả Điền Hồ sơ Hàng loạt",
    downloadZip: "Tải toàn bộ file kết quả (ZIP)",
    downloadSingle: "Tải file DOCX",
    backToStep2: "Điền lại / Chỉnh sửa thêm",
    emptyProfiles: "Chưa có Hồ sơ khách hàng nào trong thư viện.",
    emptyTemplates: "Chưa có Bộ hồ sơ mẫu nào được tải lên.",
    createProfileFirst: "Tạo hồ sơ khách hàng ở tab 'Hồ sơ khách hàng' trước.",
    createTemplateFirst: "Tải bộ mẫu DOCX ở tab 'Bộ hồ sơ mẫu' trước.",
  },
  en: {
    title: "AUTOMATED DOCUMENT FILLING WIZARD",
    description: "Merge client profile data into DOCX template sets and export batch files.",
    step1: "1. Select Sources",
    step2: "2. Mapping Review",
    step3: "3. Execute & Export",
    selectProfile: "Select Client Profile",
    selectTemplate: "Select Template Set (DOCX)",
    noProfileSelected: "No profile selected",
    noTemplateSelected: "No template set selected",
    matchingRate: "Field Matching Rate",
    nextToReview: "Continue: Review Mapping",
    backToStep1: "Back to selection",
    runFill: "Start Auto-Filling Documents",
    processing: "Merging data into DOCX files...",
    step3Title: "Generated Document Batch",
    downloadZip: "Download All as ZIP Archive",
    downloadSingle: "Download DOCX",
    backToStep2: "Re-fill / Edit Mapping",
    emptyProfiles: "No Client Profiles found in library.",
    emptyTemplates: "No Template Sets found in library.",
    createProfileFirst: "Create a profile in 'Client profiles' tab first.",
    createTemplateFirst: "Upload DOCX templates in 'Template sets' tab first.",
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [results, setResults] = useState<FillResult[]>([]);
  const [isFilling, setIsFilling] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const selectedProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  const selectedTemplate = templates.find((t) => t.id === activeTemplateId) ?? templates[0];

  // Editable fields copy for Step 2
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});

  const populatedFields = useMemo(() => {
    if (!selectedProfile) return [];
    return selectedProfile.fields.map((f) => ({
      ...f,
      value: editedFields[f.id] !== undefined ? editedFields[f.id] : f.value,
    }));
  }, [selectedProfile, editedFields]);

  const mappedFields = useMemo(() => {
    if (!selectedTemplate) return [];
    return selectedTemplate.documents.flatMap((doc) => doc.fields).filter((f) => f.mappedKey);
  }, [selectedTemplate]);

  const matchedFields = useMemo(() => {
    return mappedFields.filter((field) =>
      populatedFields.some((pf) => pf.id === field.mappedKey && pf.value.trim() !== ""),
    );
  }, [mappedFields, populatedFields]);

  const matchPercent = mappedFields.length > 0
    ? Math.round((matchedFields.length / mappedFields.length) * 100)
    : 0;

  const handleFieldChange = (fieldId: string, value: string) => {
    setEditedFields((prev) => ({ ...prev, [fieldId]: value }));
  };

  const executeFill = async () => {
    if (!selectedProfile || !selectedTemplate) return;
    setIsFilling(true);
    setErrorMsg("");

    try {
      if (onRunServerFill) {
        const run = await onRunServerFill(selectedProfile.id, selectedTemplate.id);
        if (getDownloadUrl) {
          window.open(getDownloadUrl(run.id), "_blank");
        }
        setResults([
          {
            id: run.id,
            name: `${selectedTemplate.name || "bo_ho_so"}.zip`,
            count: selectedTemplate.documents.length,
            state: "success",
          },
        ]);
        setStep(3);
        setIsFilling(false);
        return;
      }

      // Client-side DOCX filling
      const nextResults: FillResult[] = [];
      const valuesMap = Object.fromEntries(populatedFields.map((f) => [f.id, f.value]));

      for (const doc of selectedTemplate.documents) {
        const bytes = await getDocumentBytes(doc.id);
        if (!bytes) {
          nextResults.push({
            id: doc.id,
            name: doc.fileName,
            count: 0,
            state: "error",
            error: locale === "vi" ? "Không tìm thấy dữ liệu file" : "File bytes not found",
          });
          continue;
        }

        try {
          const replacements = doc.fields.map((field) => {
            const profileField = populatedFields.find((pf) => pf.id === field.mappedKey);
            const aliases = field.placeholder ? [field.placeholder] : [];
            if (profileField?.aliases) {
              aliases.push(...profileField.aliases.split(",").map((s) => s.trim()));
            }
            return {
              aliases,
              value: profileField?.value ?? "",
            };
          });

          const filled = await fillDocx(bytes, replacements);
          nextResults.push({
            id: doc.id,
            name: doc.fileName.replace(/\.docx$/i, "") + "_filled.docx",
            count: filled.count,
            blob: filled.blob,
            state: "success",
          });
        } catch {
          nextResults.push({
            id: doc.id,
            name: doc.fileName,
            count: 0,
            state: "error",
          });
        }
      }

      setResults(nextResults);
      setStep(3);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi thực thi điền hồ sơ");
    } finally {
      setIsFilling(false);
    }
  };

  const handleDownloadZip = async () => {
    const validResults = results.filter((r) => r.blob).map((r) => ({ name: r.name, blob: r.blob }));
    if (validResults.length > 0) {
      const zipBlob = await createResultsZip(validResults);
      downloadBlob(zipBlob, "ho_so_phap_ly_lawzy.zip");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-6 lg:px-8">
      {/* Notion Style Header */}
      <header className="border-b border-zinc-200 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-zinc-950">{t.title}</h1>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{t.description}</p>
      </header>

      {/* Step Indicator */}
      <div className="grid grid-cols-3 gap-2 rounded-lg border border-zinc-200 bg-zinc-100/70 p-1.5">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-md py-2.5 text-xs font-bold transition",
            step === 1
              ? "bg-zinc-950 text-white shadow-xs"
              : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-950",
          )}
        >
          <span>{t.step1}</span>
        </button>
        <button
          type="button"
          disabled={!selectedProfile || !selectedTemplate}
          onClick={() => setStep(2)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-md py-2.5 text-xs font-bold transition disabled:opacity-40",
            step === 2
              ? "bg-zinc-950 text-white shadow-xs"
              : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-950",
          )}
        >
          <span>{t.step2}</span>
        </button>
        <button
          type="button"
          disabled={results.length === 0}
          onClick={() => setStep(3)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-md py-2.5 text-xs font-bold transition disabled:opacity-40",
            step === 3
              ? "bg-zinc-950 text-white shadow-xs"
              : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-950",
          )}
        >
          <span>{t.step3}</span>
        </button>
      </div>

      {/* STEP 1: SELECT SOURCES */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Select Profile Card */}
            <SectionCard title={t.selectProfile}>
              <div className="p-4 space-y-3">
                {profiles.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500">
                    <p>{t.emptyProfiles}</p>
                    <p className="mt-1 text-zinc-400">{t.createProfileFirst}</p>
                  </div>
                ) : (
                  profiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectProfile(p.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md border p-3 text-left transition",
                        p.id === selectedProfile?.id
                          ? "border-zinc-950 bg-zinc-50 ring-1 ring-zinc-950/10"
                          : "border-zinc-200 bg-white hover:border-zinc-300",
                      )}
                    >
                      <div>
                        <p className="text-xs font-bold text-zinc-950">
                          {p.name || (locale === "vi" ? "Chưa đặt tên" : "Untitled")}
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-500">
                          {p.investorType === "individual" ? "Cá nhân" : "Tổ chức"} • {p.fields.filter((f) => f.value.trim() !== "").length} trường có dữ liệu
                        </p>
                      </div>
                      {p.id === selectedProfile?.id && <CheckCircle2 className="size-4 text-emerald-600" />}
                    </button>
                  ))
                )}
              </div>
            </SectionCard>

            {/* Select Template Card */}
            <SectionCard title={t.selectTemplate}>
              <div className="p-4 space-y-3">
                {templates.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500">
                    <p>{t.emptyTemplates}</p>
                    <p className="mt-1 text-zinc-400">{t.createTemplateFirst}</p>
                  </div>
                ) : (
                  templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => onSelectTemplate(tpl.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md border p-3 text-left transition",
                        tpl.id === selectedTemplate?.id
                          ? "border-zinc-950 bg-zinc-50 ring-1 ring-zinc-950/10"
                          : "border-zinc-200 bg-white hover:border-zinc-300",
                      )}
                    >
                      <div>
                        <p className="text-xs font-bold text-zinc-950">
                          {tpl.name || (locale === "vi" ? "Bộ mẫu chưa đặt tên" : "Untitled template set")}
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-500">
                          {tpl.documents.length} tài liệu DOCX
                        </p>
                      </div>
                      {tpl.id === selectedTemplate?.id && <CheckCircle2 className="size-4 text-emerald-600" />}
                    </button>
                  ))
                )}
              </div>
            </SectionCard>
          </div>

          {/* Matching Summary Footer */}
          {selectedProfile && selectedTemplate && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-2xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-900">{t.matchingRate}:</span>
                  <StatusBadge strong={matchPercent > 50}>
                    {matchPercent}% Khớp ({matchedFields.length}/{mappedFields.length} trường)
                  </StatusBadge>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={mappedFields.length === 0}
                className="gap-2 bg-zinc-950 text-white hover:bg-zinc-800"
              >
                <span>{t.nextToReview}</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: REVIEW & EDIT MAPPING */}
      {step === 2 && selectedProfile && selectedTemplate && (
        <div className="space-y-6">
          <SectionCard
            title={locale === "vi" ? "Kiểm tra & Hiệu chỉnh dữ liệu đối chiếu" : "Field Mapping & Value Review"}
            description={locale === "vi" ? "Bạn có thể chỉnh sửa trực tiếp các giá trị bên dưới trước khi tiến hành xuất file DOCX." : "Edit values directly before running automated batch generation."}
          >
            <div className="p-4 space-y-4">
              <div className="overflow-x-auto rounded-md border border-zinc-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Placeholder trong DOCX</th>
                      <th className="p-3">Trường Hồ sơ tương ứng</th>
                      <th className="p-3">Giá trị sẽ điền vào file</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {mappedFields.map((field) => {
                      const profileField = populatedFields.find((pf) => pf.id === field.mappedKey);
                      const val = profileField?.value ?? "";

                      return (
                        <tr key={field.id} className="hover:bg-zinc-50/50">
                          <td className="p-3 font-mono font-medium text-zinc-900">{field.placeholder}</td>
                          <td className="p-3 text-zinc-600">{field.label}</td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => profileField && handleFieldChange(profileField.id, e.target.value)}
                              placeholder={locale === "vi" ? "Nhập giá trị điền..." : "Enter value..."}
                              className={cn(inputClass, "h-8 text-xs")}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>

          <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="size-4" />
              <span>{t.backToStep1}</span>
            </Button>

            <Button type="button" onClick={executeFill} disabled={isFilling} className="gap-2 bg-zinc-950 text-white hover:bg-zinc-800">
              <span>{isFilling ? t.processing : t.runFill}</span>
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: RESULTS & DOWNLOAD */}
      {step === 3 && (
        <div className="space-y-6">
          <SectionCard title={t.step3Title}>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                <p className="text-xs font-medium text-zinc-600">
                  {locale === "vi" ? `Đã hoàn tất điền ${results.length} tài liệu thành công.` : `Successfully filled ${results.length} documents.`}
                </p>

                <Button type="button" onClick={handleDownloadZip} className="gap-2">
                  <Archive className="size-4" />
                  <span>{t.downloadZip}</span>
                </Button>
              </div>

              <div className="space-y-3">
                {results.map((res) => (
                  <div key={res.id} className="flex items-center justify-between rounded-md border border-zinc-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                        <FileCheck2 className="size-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-950">{res.name}</p>
                        <p className="text-[11px] text-zinc-500">
                          {res.count} {locale === "vi" ? "vị trí đã điền" : "positions filled"}
                        </p>
                      </div>
                    </div>

                    {res.blob && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => downloadBlob(res.blob!, res.name)}
                        className="gap-2 text-xs"
                      >
                        <Download className="size-3.5" />
                        <span>{t.downloadSingle}</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <div className="flex justify-start border-t border-zinc-200 pt-4">
            <Button type="button" variant="outline" onClick={() => setStep(2)} className="gap-2">
              <ArrowLeft className="size-4" />
              <span>{t.backToStep2}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
