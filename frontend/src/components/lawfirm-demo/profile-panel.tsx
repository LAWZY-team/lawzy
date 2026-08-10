"use client";

import React from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  Eye,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  ClientProfile,
  FieldGroup,
  InvestorType,
  Locale,
  ProfileField,
} from "./lawfirm-demo-types";
import { visibleGroups } from "./lawfirm-demo-taxonomy";
import {
  FieldLabel,
  inputClass,
  SectionCard,
  StatusBadge,
} from "./lawfirm-demo-ui";

const text = {
  vi: {
    libraryTitle: "THƯ VIỆN HỒ SƠ KHÁCH HÀNG",
    libraryDesc: "Quản lý và bóc tách thông tin định danh khách hàng. Sử dụng thông tin này để điền tự động vào các bộ hồ sơ mẫu.",
    createFirst: "Tạo hồ sơ khách hàng mới",
    aiScanFirst: "Tải lên CCCD / Giấy ĐKKD (AI OCR)",
    emptyLibrary: "Chưa có hồ sơ khách hàng nào",
    emptyLibraryDesc: "Hãy tạo hồ sơ mới hoặc tải lên ảnh CCCD/ĐKKD để AI tự động trích xuất thông tin.",
    preview: "Xem trước",
    edit: "Chỉnh sửa",
    backToLibrary: "Quay lại thư viện",
    title: "Chỉnh sửa Hồ sơ Khách hàng",
    aiScan: "Bóc tách thông tin từ Giấy tờ (AI Multimodal OCR)",
    aiScanning: "Đang phân tích giấy tờ...",
    aiReview: "Kết quả AI trích xuất - Chọn các trường muốn áp dụng:",
    aiApprove: "Áp dụng vào hồ sơ",
    aiCancel: "Hủy bỏ",
    name: "Tên hồ sơ / Tên doanh nghiệp",
    namePlaceholder: "Nhập tên hồ sơ...",
    save: "Đã tự động lưu",
    delete: "Xóa hồ sơ",
    investorType: "Loại hình thành phần",
    individual: "Cá nhân",
    organization: "Tổ chức / Doanh nghiệp",
    fields: "Các trường thông tin",
    addField: "Thêm trường tùy chỉnh",
    fieldName: "Tên trường (Nhãn)",
    value: "Giá trị dữ liệu",
    aliases: "Từ khóa placeholder khớp",
    aliasesPlaceholder: "VD: [TÊN DOANH NGHIỆP], {{ten_doanh_nghiep}}",
    groups: {
      individual: "Thông tin cá nhân",
      organization: "Thông tin doanh nghiệp / tổ chức",
      representative: "Người đại diện theo pháp luật",
      other: "Thông tin bổ sung khác",
    },
    confirm: "Bạn có chắc chắn muốn xóa hồ sơ này?",
    livePreviewTitle: "XEM TRƯỚC HỒ SƠ PHÁP LÝ (LIVE PREVIEW)",
    livePreviewSub: "Dữ liệu được cập nhật theo thời gian thực khi bạn chỉnh sửa bên trái.",
    modalPreviewTitle: "XEM TRƯỚC HỒ SƠ PHÁP LÝ KHÁCH HÀNG",
    editThisProfile: "Chỉnh sửa hồ sơ này",
  },
  en: {
    libraryTitle: "CLIENT PROFILE LIBRARY",
    libraryDesc: "Manage and extract client identity profiles. Use these fields for automated document filling.",
    createFirst: "Create new client profile",
    aiScanFirst: "Upload ID / Business License (AI OCR)",
    emptyLibrary: "No client profiles found",
    emptyLibraryDesc: "Create a new profile or upload an ID card image for AI parsing.",
    preview: "Preview",
    edit: "Edit",
    backToLibrary: "Back to library",
    title: "Edit Client Profile",
    aiScan: "Extract details from Identity Documents (AI Multimodal OCR)",
    aiScanning: "Analyzing document...",
    aiReview: "AI Extracted Fields - Select fields to apply:",
    aiApprove: "Apply to profile",
    aiCancel: "Cancel",
    name: "Profile name / Business name",
    namePlaceholder: "Enter profile name...",
    save: "Auto-saved",
    delete: "Delete profile",
    investorType: "Entity type",
    individual: "Individual",
    organization: "Organization / Company",
    fields: "Profile fields",
    addField: "Add custom field",
    fieldName: "Field label",
    value: "Data value",
    aliases: "Matching placeholder keys",
    aliasesPlaceholder: "E.g. [COMPANY NAME], {{company_name}}",
    groups: {
      individual: "Personal information",
      organization: "Business & Organization details",
      representative: "Legal representative",
      other: "Additional fields",
    },
    confirm: "Are you sure you want to delete this profile?",
    livePreviewTitle: "LEGAL PROFILE LIVE PREVIEW",
    livePreviewSub: "Data updates in real-time as you edit fields on the left.",
    modalPreviewTitle: "CLIENT LEGAL PROFILE PREVIEW",
    editThisProfile: "Edit this profile",
  },
} as const;

export function ProfilePanel({
  locale,
  mode,
  profiles,
  activeProfile,
  onSelect,
  onAdd,
  onDelete,
  onUpdate,
  onModeChange,
  onUploadIdentity,
  onApproveExtraction,
}: {
  locale: Locale;
  mode: "library" | "editor" | "preview";
  profiles: ClientProfile[];
  activeProfile: ClientProfile | undefined;
  onSelect: (id: string) => void;
  onAdd: () => void | Promise<void>;
  onDelete: (id: string) => void;
  onUpdate: (
    id: string,
    updater: (profile: ClientProfile) => ClientProfile,
  ) => void | Promise<void>;
  onModeChange: (next: "library" | "editor") => void;
  onUploadIdentity?: (file: File) => Promise<{ id: string; suggestions: Array<{ fieldKey: string; label: string; value: string; group?: string; aliases?: string }> }>;
  onApproveExtraction?: (
    extractionId: string,
    approvedFields: Array<{ fieldKey: string; label: string; value: string; group?: string; aliases?: string }>,
  ) => Promise<void>;
}) {
  const t = text[locale];
  const identityInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingIdentity, setIsUploadingIdentity] = React.useState(false);
  const [previewModalProfile, setPreviewModalProfile] = React.useState<ClientProfile | null>(null);
  const [pendingExtraction, setPendingExtraction] = React.useState<{
    id: string;
    suggestions: Array<{ fieldKey: string; label: string; value: string; group?: string; aliases?: string }>;
  } | null>(null);
  const [selectedKeys, setSelectedKeys] = React.useState<Record<string, boolean>>({});

  const currentProfile = activeProfile ?? profiles[0];
  const [draftProfile, setDraftProfile] = React.useState<ClientProfile | undefined>(currentProfile);

  React.useEffect(() => {
    setDraftProfile(currentProfile);
  }, [currentProfile]);

  const updateDraft = (
    updater: (profile: ClientProfile) => ClientProfile,
    immediateSave = false,
  ) => {
    if (!draftProfile) return;
    const next = updater(draftProfile);
    setDraftProfile(next);
    if (immediateSave && currentProfile) {
      void onUpdate(currentProfile.id, () => next);
    }
  };

  const saveProfile = () => {
    if (!draftProfile || !currentProfile) return;
    void onUpdate(currentProfile.id, () => draftProfile);
  };

  const patch = (patchData: Partial<ClientProfile>) => {
    updateDraft((profile) => ({ ...profile, ...patchData }));
  };

  const updateField = (id: string, fieldPatch: Partial<ProfileField>) => {
    updateDraft((profile) => ({
      ...profile,
      fields: profile.fields.map((field) =>
        field.id === id ? { ...field, ...fieldPatch } : field,
      ),
    }));
  };

  const deleteField = (id: string) => {
    updateDraft((profile) => ({
      ...profile,
      fields: profile.fields.filter((field) => field.id !== id),
    }), true);
  };

  const addField = () => {
    const field: ProfileField = {
      id: `custom-${crypto.randomUUID()}`,
      group: "other",
      label: locale === "vi" ? "Trường mới" : "New field",
      value: "",
      aliases: "",
    };
    updateDraft((profile) => ({
      ...profile,
      fields: [field, ...profile.fields],
    }), true);
  };

  const handleDelete = () => {
    if (!currentProfile) return;
    onDelete(currentProfile.id);
    onModeChange("library");
  };

  const [searchQuery, setSearchQuery] = React.useState("");
  const [deletingProfileId, setDeletingProfileId] = React.useState<string | null>(null);

  const handleIdentityUpload = async (file: File) => {
    if (!onUploadIdentity) return;
    setIsUploadingIdentity(true);
    try {
      const extraction = await onUploadIdentity(file);
      setPendingExtraction(extraction);
      setSelectedKeys(
        Object.fromEntries(extraction.suggestions.map((item) => [item.fieldKey, true])),
      );
    } catch {
      /* handled */
    } finally {
      setIsUploadingIdentity(false);
    }
  };

  const handleApproveExtraction = async () => {
    if (!pendingExtraction || !onApproveExtraction) return;
    const approvedFields = pendingExtraction.suggestions.filter(
      (item) => selectedKeys[item.fieldKey],
    );
    await onApproveExtraction(pendingExtraction.id, approvedFields);
    setPendingExtraction(null);
  };

  const handleCreateProfile = async () => {
    await onAdd();
    onModeChange("editor");
  };

  const sortedProfiles = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = profiles;
    if (q) {
      list = profiles.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          p.fields.some(
            (f) =>
              f.label.toLowerCase().includes(q) ||
              f.value.toLowerCase().includes(q),
          ),
      );
    }
    return [...list].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [profiles, searchQuery]);

  const formatProfileDate = (dateStr?: string) => {
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

  // --- 1. LIBRARY VIEW ---
  if (mode === "library") {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-6 lg:px-8 overflow-x-hidden">
        <header className="border-b border-zinc-200 pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            {t.libraryTitle}
          </h1>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">
            {t.libraryDesc}
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
                  ? "Tìm theo tên hồ sơ, mô tả, MST, thông tin định danh..."
                  : "Search by profile name, description, tax ID..."
              }
              className={inputClass}
            />
          </div>

          {profiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-10 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
                <Building2 className="size-5" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-zinc-950">{t.emptyLibrary}</h3>
              <p className="mt-1 max-w-sm text-xs leading-5 text-zinc-500">
                {t.emptyLibraryDesc}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button type="button" size="sm" onClick={() => void handleCreateProfile()} className="bg-zinc-950 text-white hover:bg-zinc-800">
                  <Plus className="size-4" />
                  {t.createFirst}
                </Button>
                {onUploadIdentity && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => identityInputRef.current?.click()}
                  >
                    <Sparkles className="size-4 text-amber-600" />
                    {t.aiScanFirst}
                  </Button>
                )}
              </div>
              <input
                ref={identityInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void (async () => {
                      await handleCreateProfile();
                      await handleIdentityUpload(file);
                    })();
                  }
                  event.currentTarget.value = "";
                }}
              />
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              <button
                type="button"
                onClick={() => void handleCreateProfile()}
                className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-6 transition hover:border-zinc-950 hover:bg-zinc-100/60 group"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-white border border-zinc-200 shadow-2xs group-hover:scale-105 transition">
                  <Plus className="size-6 text-zinc-950" />
                </div>
                <span className="mt-3 text-sm font-bold text-zinc-900">{t.createFirst}</span>
                <p className="mt-1 text-xs text-zinc-500 text-center">
                  Thêm cá nhân hoặc tổ chức mới vào cơ sở dữ liệu
                </p>
              </button>

              {sortedProfiles.map((profile) => {
                const filledCount = profile.fields.filter((f) => f.value.trim() !== "").length;
                const isIndividual = profile.investorType === "individual";
                const title = profile.name || (locale === "vi" ? "Hồ sơ chưa đặt tên" : "Untitled profile");
                const desc = profile.description || (locale === "vi" ? "Chưa có mô tả." : "No description.");
                const dateFormatted = formatProfileDate(profile.createdAt);

                return (
                  <div
                    key={profile.id}
                    className={cn(
                      "flex flex-col justify-between rounded-xl border bg-white p-5 shadow-2xs hover:border-zinc-300 hover:shadow-xs transition",
                      profile.id === currentProfile?.id ? "border-zinc-950 ring-1 ring-zinc-950/10" : "border-zinc-200",
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
                        <div>
                          <span className="text-[11px] font-medium text-zinc-400">
                            {dateFormatted}
                          </span>
                          <h3 className="text-base font-bold text-zinc-950 mt-0.5 line-clamp-1">{title}</h3>
                        </div>
                        <span className="inline-flex shrink-0 items-center rounded-full bg-zinc-950 px-2.5 py-0.5 text-xs font-semibold text-white">
                          {filledCount} {locale === "vi" ? "trường" : "fields"}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold",
                          isIndividual ? "bg-amber-50 text-amber-800 border border-amber-200/60" : "bg-blue-50 text-blue-800 border border-blue-200/60"
                        )}>
                          {isIndividual ? t.individual : t.organization}
                        </span>
                      </div>

                      <p className="mt-2.5 text-xs leading-relaxed text-zinc-600 line-clamp-3">
                        {desc}
                      </p>
                    </div>

                    {deletingProfileId === profile.id ? (
                      <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-red-200 bg-red-50/80 p-2.5 rounded-lg animate-in fade-in duration-150">
                        <span className="text-xs font-semibold text-red-700">
                          {locale === "vi" ? "Xác nhận xóa hồ sơ này?" : "Delete this profile?"}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-zinc-600 hover:text-zinc-950"
                            onClick={() => setDeletingProfileId(null)}
                          >
                            {locale === "vi" ? "Hủy" : "Cancel"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 px-3 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 shadow-2xs"
                            onClick={() => {
                              setDeletingProfileId(null);
                              onDelete(profile.id);
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
                          onClick={() => setPreviewModalProfile(profile)}
                        >
                          <Eye className="size-3.5" />
                          {t.preview}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1 text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800"
                          onClick={() => {
                            onSelect(profile.id);
                            onModeChange("editor");
                          }}
                        >
                          <Pencil className="size-3.5" />
                          {t.edit}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-zinc-200"
                          onClick={() => setDeletingProfileId(profile.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* --- PREVIEW MODAL DIALOG --- */}
        <Dialog open={Boolean(previewModalProfile)} onOpenChange={(open) => !open && setPreviewModalProfile(null)}>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-zinc-200 bg-white p-6 shadow-lg">
            {previewModalProfile && (
              <>
                <DialogHeader className="border-b border-zinc-200 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold",
                      previewModalProfile.investorType === "individual" ? "bg-amber-50 text-amber-800 border border-amber-200/60" : "bg-blue-50 text-blue-800 border border-blue-200/60"
                    )}>
                      {previewModalProfile.investorType === "individual" ? t.individual : t.organization}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                      Tạo ngày: {formatProfileDate(previewModalProfile.createdAt)}
                    </span>
                  </div>
                  <DialogTitle className="mt-2 text-xl font-bold text-zinc-950">
                    {previewModalProfile.name || (locale === "vi" ? "Hồ sơ chưa đặt tên" : "Untitled profile")}
                  </DialogTitle>
                </DialogHeader>

                {previewModalProfile.description && (
                  <div className="rounded-md border border-zinc-200 bg-zinc-50/80 p-3 text-xs text-zinc-700 leading-relaxed">
                    <span className="font-semibold text-zinc-900">Mô tả: </span>
                    {previewModalProfile.description}
                  </div>
                )}

                <div className="space-y-4 py-3">
                  {visibleGroups(previewModalProfile.investorType).map((group) => {
                    const fields = previewModalProfile.fields.filter((f) => f.group === group && f.value.trim() !== "");
                    if (fields.length === 0) return null;

                    return (
                      <div key={group} className="space-y-2">
                        <h4 className="border-b border-zinc-100 pb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          {t.groups[group]}
                        </h4>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {fields.map((field) => (
                            <div key={field.id} className="rounded-md border border-zinc-100 bg-zinc-50/60 p-2.5">
                              <p className="text-[10px] font-medium text-zinc-500">{field.label}</p>
                              <p className="mt-0.5 text-xs font-bold text-zinc-950 break-words">{field.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end border-t border-zinc-200 pt-3">
                  <Button
                    type="button"
                    onClick={() => {
                      onSelect(previewModalProfile.id);
                      setPreviewModalProfile(null);
                      onModeChange("editor");
                    }}
                    className="gap-2 bg-zinc-950 text-white hover:bg-zinc-800 text-xs"
                  >
                    <Pencil className="size-3.5" />
                    <span>{t.editThisProfile}</span>
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- 2. EDITOR MODE (Responsive Split-Screen) ---
  if (!draftProfile) return null;
  const isIndividual = draftProfile.investorType === "individual";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 lg:px-6 overflow-x-hidden">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onModeChange("library")}
          className="gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft className="size-3.5" />
          {t.backToLibrary}
        </Button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <Check className="size-3.5" />
            {t.save}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={handleDelete} className="h-8 text-xs text-rose-600 hover:bg-rose-50 border-zinc-200">
            <Trash2 className="size-3.5" />
            {t.delete}
          </Button>
        </div>
      </div>

      {/* AI OCR Upload Widget */}
      {onUploadIdentity && (
        <SectionCard title={t.aiScan}>
          <div className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <Sparkles className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-900">
                  {locale === "vi" ? "Tự động trích xuất thông tin bằng AI Multimodal" : "AI Multimodal OCR Parsing"}
                </p>
              </div>
            </div>

            <input
              ref={identityInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleIdentityUpload(file);
                event.currentTarget.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploadingIdentity}
              onClick={() => identityInputRef.current?.click()}
              className="h-8 text-xs"
            >
              <UploadCloud className="size-3.5 text-zinc-700" />
              {isUploadingIdentity ? t.aiScanning : t.aiScan}
            </Button>
          </div>

          {pendingExtraction ? (
            <div className="border-t border-zinc-200 bg-amber-50/30 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-amber-800">{t.aiReview}</p>
              <div className="space-y-2">
                {pendingExtraction.suggestions.map((item) => (
                  <div key={item.fieldKey} className="flex items-start gap-2.5 rounded-md border border-zinc-200 bg-white p-2.5">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedKeys[item.fieldKey])}
                      onChange={(e) => setSelectedKeys((curr) => ({ ...curr, [item.fieldKey]: e.target.checked }))}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-zinc-900">{item.label}</span>
                      <input
                        type="text"
                        value={item.value}
                        onChange={(e) =>
                          setPendingExtraction((curr) =>
                            curr
                              ? {
                                  ...curr,
                                  suggestions: curr.suggestions.map((s) => (s.fieldKey === item.fieldKey ? { ...s, value: e.target.value } : s)),
                                }
                              : curr,
                          )
                        }
                        className={cn(inputClass, "mt-1 h-8 text-xs")}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button type="button" size="sm" onClick={() => void handleApproveExtraction()} className="bg-zinc-950 text-white text-xs h-8">
                  {t.aiApprove}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setPendingExtraction(null)} className="text-xs h-8">
                  {t.aiCancel}
                </Button>
              </div>
            </div>
          ) : null}
        </SectionCard>
      )}

      {/* Split-Screen 2-Column Responsive Editor */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] grid-cols-1">
        {/* Left Column: Fields Editor */}
        <div className="space-y-5 min-w-0">
          <SectionCard
            title={t.fields}
            action={
              <Button type="button" variant="outline" size="sm" onClick={addField} className="h-8 text-xs">
                <Plus className="size-3.5" />
                {t.addField}
              </Button>
            }
          >
            <div className="border-b border-zinc-200 p-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel>{t.name}</FieldLabel>
                  <input
                    value={draftProfile.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    onBlur={saveProfile}
                    placeholder={t.namePlaceholder}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel>{locale === "vi" ? "Mô tả hồ sơ khách hàng" : "Profile Description"}</FieldLabel>
                  <input
                    value={draftProfile.description ?? ""}
                    onChange={(e) => patch({ description: e.target.value })}
                    onBlur={saveProfile}
                    placeholder={
                      locale === "vi"
                        ? "Ghi thông tin mô tả (ví dụ: MST, Người đại diện, ghi chú...)"
                        : "Enter profile description..."
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="border-b border-zinc-200 p-3">
              <FieldLabel>{t.investorType}</FieldLabel>
              <div className="inline-flex rounded-md border border-zinc-200 p-0.5 bg-zinc-50">
                {(["individual", "organization"] as InvestorType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateDraft((p) => ({ ...p, investorType: type }), true)}
                    className={cn(
                      "h-7 rounded px-2.5 text-xs font-semibold transition",
                      draftProfile.investorType === type ? "bg-zinc-950 text-white shadow-xs" : "text-zinc-600 hover:text-zinc-950",
                    )}
                  >
                    {type === "individual" ? t.individual : t.organization}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5 p-3">
              {visibleGroups(draftProfile.investorType).map((group) => (
                <FieldGroupSection
                  key={group}
                  group={group}
                  title={t.groups[group]}
                  fields={draftProfile.fields.filter((f) => f.group === group)}
                  labels={{
                    fieldName: t.fieldName,
                    value: t.value,
                    aliases: t.aliases,
                    aliasesPlaceholder: t.aliasesPlaceholder,
                  }}
                  onUpdate={updateField}
                  onSave={saveProfile}
                  onDelete={deleteField}
                />
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Right Column: Live Profile Preview Card */}
        <div className="xl:sticky xl:top-4 xl:h-fit min-w-0">
          <SectionCard title={t.livePreviewTitle} description={t.livePreviewSub}>
            <div className="p-3 space-y-3">
              <div className="rounded-md border border-zinc-200 bg-zinc-50/60 p-3">
                <div className="flex items-center gap-2">
                  <StatusBadge strong={isIndividual}>
                    {isIndividual ? t.individual : t.organization}
                  </StatusBadge>
                </div>
                <h4 className="mt-1.5 text-sm font-bold text-zinc-950 truncate">
                  {draftProfile.name || (locale === "vi" ? "Chưa đặt tên" : "Untitled")}
                </h4>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {draftProfile.fields
                  .filter((f) => f.value.trim() !== "")
                  .map((field) => (
                    <div key={field.id} className="rounded-md border border-zinc-100 bg-white p-2.5 shadow-2xs">
                      <p className="text-[10px] font-medium text-zinc-400">{field.label}</p>
                      <p className="mt-0.5 text-xs font-bold text-zinc-950 break-words">{field.value}</p>
                    </div>
                  ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function FieldGroupSection({
  title,
  fields,
  labels,
  onUpdate,
  onSave,
  onDelete,
}: {
  group: FieldGroup;
  title: string;
  fields: ProfileField[];
  labels: { fieldName: string; value: string; aliases: string; aliasesPlaceholder: string };
  onUpdate: (id: string, patch: Partial<ProfileField>) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
}) {
  if (!fields.length) return null;
  return (
    <section>
      <h3 className="mb-2 border-b border-zinc-200 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
        {title}
      </h3>
      <div className="space-y-2.5">
        {fields.map((field) => (
          <article key={field.id} className="rounded-md border border-zinc-200 bg-white p-2.5">
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1.2fr_32px]">
              <div>
                <FieldLabel>{labels.fieldName}</FieldLabel>
                <input
                  value={field.label}
                  onChange={(e) => onUpdate(field.id, { label: e.target.value })}
                  onBlur={onSave}
                  className={cn(inputClass, "h-8 text-xs")}
                />
              </div>
              <div>
                <FieldLabel>{labels.value}</FieldLabel>
                <input
                  value={field.value}
                  onChange={(e) => onUpdate(field.id, { value: e.target.value })}
                  onBlur={onSave}
                  className={cn(inputClass, "h-8 text-xs")}
                />
              </div>
              <div>
                <FieldLabel>{labels.aliases}</FieldLabel>
                <input
                  value={field.aliases}
                  placeholder={labels.aliasesPlaceholder}
                  onChange={(e) => onUpdate(field.id, { aliases: e.target.value })}
                  onBlur={onSave}
                  className={cn(inputClass, "h-8 text-xs")}
                />
              </div>
              <div className="flex items-end justify-end sm:justify-start">
                <button
                  type="button"
                  onClick={() => onDelete(field.id)}
                  aria-label="Delete field"
                  className="flex size-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
