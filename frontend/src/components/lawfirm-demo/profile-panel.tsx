"use client";

import React from "react";
import { HelpCircle, Plus, Save, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { visibleGroups } from "./lawfirm-demo-taxonomy";
import type {
  ClientProfile,
  FieldGroup,
  InvestorType,
  Locale,
  ProfileField,
} from "./lawfirm-demo-types";
import {
  EmptyState,
  FieldLabel,
  inputClass,
  SectionCard,
  StatusBadge,
  textareaClass,
} from "./lawfirm-demo-ui";

const text = {
  vi: {
    eyebrow: "Đồng bộ theo workspace",
    title: "Hồ sơ khách hàng",
    description: "Nhập dữ liệu một lần để dùng lại cho mọi tài liệu trong cùng bộ hồ sơ.",
    saved: "Hồ sơ đã lưu",
    new: "Hồ sơ mới",
    name: "Tên hồ sơ",
    namePlaceholder: "Ví dụ: Hồ sơ khách hàng mới",
    save: "Đã tự động lưu",
    aiScan: "Quét CCCD / ĐKKD",
    aiScanning: "Đang phân tích giấy tờ…",
    aiScanFailed: "Không thể tải hoặc phân tích giấy tờ. Vui lòng kiểm tra backend và thử lại.",
    aiReview: "Phê duyệt dữ liệu AI",
    aiApprove: "Lưu các trường đã chọn",
    aiCancel: "Bỏ qua",
    aiValue: "Giá trị nhận diện",
    delete: "Xóa hồ sơ",
    confirm: "Xóa hồ sơ này? Dữ liệu đã lưu trong trình duyệt sẽ bị xóa.",
    fields: "Thông tin cần điền",
    addField: "Thêm trường",
    investorType: "Loại nhà đầu tư",
    individual: "Cá nhân",
    organization: "Tổ chức",
    fieldName: "Tên trường",
    value: "Giá trị",
    aliases: "Placeholder cần tìm",
    aliasHelp: "Có thể nhập nhiều cách viết, phân tách bằng dấu phẩy.",
    empty: "Chưa có trường thông tin",
    emptyDescription: "Thêm một trường mới để bắt đầu lưu dữ liệu dùng chung.",
    groups: {
      individual: "Nhà đầu tư cá nhân",
      organization: "Nhà đầu tư tổ chức",
      representative: "Người đại diện theo pháp luật",
      other: "Thông tin khác",
    },
  },
  en: {
    eyebrow: "Synced to your workspace",
    title: "Client profiles",
    description: "Enter data once and reuse it across every document in a template set.",
    saved: "Saved profiles",
    new: "New profile",
    name: "Profile name",
    namePlaceholder: "Example: New client profile",
    save: "Saved automatically",
    aiScan: "Scan ID / business registration",
    aiScanning: "Analyzing document…",
    aiScanFailed: "Could not upload or analyze the document. Check the backend and try again.",
    aiReview: "Review AI suggestions",
    aiApprove: "Save selected fields",
    aiCancel: "Dismiss",
    aiValue: "Detected value",
    delete: "Delete profile",
    confirm: "Delete this profile? Its browser data will be removed.",
    fields: "Information to fill",
    addField: "Add field",
    investorType: "Investor type",
    individual: "Individual",
    organization: "Organization",
    fieldName: "Field name",
    value: "Value",
    aliases: "Placeholders to find",
    aliasHelp: "Enter multiple variants separated by commas.",
    empty: "No information fields",
    emptyDescription: "Add a field to start storing reusable data.",
    groups: {
      individual: "Individual investor",
      organization: "Organization investor",
      representative: "Legal representative",
      other: "Other information",
    },
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
  mode: "library" | "editor";
  profiles: ClientProfile[];
  activeProfile: ClientProfile;
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
  const [draftProfile, setDraftProfile] = React.useState<ClientProfile>(activeProfile);
  const draftProfileRef = React.useRef<ClientProfile>(activeProfile);
  const dirtyProfilesRef = React.useRef<Set<string>>(new Set());
  const pendingSavesRef = React.useRef<Set<string>>(new Set());
  const [pendingExtraction, setPendingExtraction] = React.useState<{
    id: string;
    suggestions: Array<{ fieldKey: string; label: string; value: string; group?: string; aliases?: string }>;
  } | null>(null);
  const [selectedKeys, setSelectedKeys] = React.useState<Record<string, boolean>>({});
  const [isUploadingIdentity, setIsUploadingIdentity] = React.useState(false);
  const identityInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (
      !dirtyProfilesRef.current.has(activeProfile.id) &&
      !pendingSavesRef.current.has(activeProfile.id)
    ) {
      draftProfileRef.current = activeProfile;
      setDraftProfile(activeProfile);
    }
  }, [activeProfile]);

  const saveProfile = async (
    profile: ClientProfile = draftProfileRef.current,
  ): Promise<void> => {
    if (!dirtyProfilesRef.current.has(profile.id)) return;
    dirtyProfilesRef.current.delete(profile.id);
    pendingSavesRef.current.add(profile.id);
    try {
      await onUpdate(profile.id, () => profile);
    } catch (error: unknown) {
      dirtyProfilesRef.current.add(profile.id);
      const message =
        error instanceof Error
          ? error.message
          : locale === "vi"
            ? "Không thể lưu hồ sơ."
            : "Could not save profile.";
      toast.error(message);
    } finally {
      pendingSavesRef.current.delete(profile.id);
    }
  };

  const updateDraft = (
    updater: (profile: ClientProfile) => ClientProfile,
    saveImmediately = false,
  ) => {
    const current =
      draftProfileRef.current.id === activeProfile.id
        ? draftProfileRef.current
        : activeProfile;
    const next = updater(current);
    draftProfileRef.current = next;
    dirtyProfilesRef.current.add(next.id);
    setDraftProfile(next);
    if (saveImmediately) void saveProfile(next);
  };

  const patch = (patchValue: Partial<ClientProfile>) => {
    updateDraft((profile) => ({ ...profile, ...patchValue }));
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
      fields: [...profile.fields, field],
    }), true);
  };

  const handleDelete = () => {
    if (!window.confirm(t.confirm)) return;
    dirtyProfilesRef.current.delete(activeProfile.id);
    onDelete(activeProfile.id);
  };

  const handleIdentityUpload = async (file: File) => {
    if (!onUploadIdentity) return;
    setIsUploadingIdentity(true);
    try {
      const extraction = await onUploadIdentity(file);
      setPendingExtraction(extraction);
      setSelectedKeys(
        Object.fromEntries(extraction.suggestions.map((item) => [item.fieldKey, true])),
      );
    } catch (error: unknown) {
      const message = error instanceof Error && error.message ? error.message : t.aiScanFailed;
      toast.error(message);
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

  if (mode === "library") {
    const filledCount = draftProfile.fields.filter((field) => field.value.trim() !== "").length;
    const totalCount = 6; // Matches the HTML demo screenshot's progress pill.
    const isIndividual = draftProfile.investorType === "individual";
    const progressText = `${filledCount}/${totalCount} trường`;
    const title = draftProfile.name || (locale === "vi" ? "Chưa đặt tên" : "Untitled");
    const subtitle =
      title === "Chưa đặt tên"
        ? locale === "vi"
          ? "Chưa có thông tin người đại diện."
          : "No representative information yet."
        : "";
    const showMissingInfoBadge = filledCount === 0;

    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-6 lg:px-8">
        <header className="border-b border-zinc-200 pb-6">
          <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
            {locale === "vi" ? "THƯ VIỆN HỒ SƠ KHÁCH HÀNG" : "CLIENT PROFILE LIBRARY"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
            {locale === "vi"
              ? 'Duyệt các hồ sơ khách hàng đã lưu. Bấm "Xem trước" để xem nhanh thông tin bên trong trước khi dùng để điền hồ sơ.'
              : 'Review saved client profiles. Use "Preview" to quickly see details before filling documents.'}
          </p>
        </header>

        <div className="rounded-md border border-zinc-200 bg-white p-4">
          <div className="mx-auto mb-4 max-w-3xl">
            <input
              type="text"
              placeholder={locale === "vi" ? "Tìm theo tên hồ sơ, người đại diện..." : "Search by profile name, representative..."}
              className={inputClass}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
            <button
              type="button"
              onClick={() => void handleCreateProfile()}
              className="flex min-h-[220px] flex-col items-center justify-center rounded-md border border-dashed border-zinc-300 bg-white transition hover:border-zinc-950"
            >
              <Plus className="size-8 text-zinc-950" />
              <div className="mt-3 text-sm font-medium text-zinc-700">
                {locale === "vi" ? "Tạo hồ sơ khách hàng mới" : "Create new client profile"}
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
                  {progressText}
                </div>
              </div>

              <h2 className="mt-4 text-lg font-semibold text-zinc-950">{title}</h2>
              {subtitle ? <p className="mt-1 text-sm text-zinc-600">{subtitle}</p> : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge strong={isIndividual}>{isIndividual ? "CÁ NHÂN" : "TỔ CHỨC"}</StatusBadge>
                {showMissingInfoBadge ? (
                  <StatusBadge>{locale === "vi" ? "THIẾU THÔNG TIN" : "MISSING INFO"}</StatusBadge>
                ) : null}
              </div>

              <div className="mt-5 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => onModeChange("editor")}>
                  {locale === "vi" ? "Xem trước" : "Preview"}
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => onModeChange("editor")}>
                  {locale === "vi" ? "Chỉnh sửa" : "Edit"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-6 lg:px-8">
      <header className="border-b border-zinc-200 pb-6">
        <p className="text-sm font-medium text-zinc-500">{t.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">{t.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">{t.description}</p>
      </header>

      {onUploadIdentity ? (
        <SectionCard title={t.aiScan}>
          <div className="flex flex-wrap items-center gap-3 p-4">
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
              disabled={isUploadingIdentity}
              onClick={() => identityInputRef.current?.click()}
            >
              <UploadCloud className="size-4" />
              {isUploadingIdentity ? t.aiScanning : t.aiScan}
            </Button>
          </div>
          {pendingExtraction ? (
            <div className="border-t border-zinc-200 p-4">
              <p className="mb-3 text-sm font-medium text-zinc-800">{t.aiReview}</p>
              <div className="space-y-2">
                {pendingExtraction.suggestions.map((item) => (
                  <div
                    key={item.fieldKey}
                    className="flex items-start gap-3 rounded-md border border-zinc-200 p-3"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(selectedKeys[item.fieldKey])}
                      onChange={(event) =>
                        setSelectedKeys((current) => ({
                          ...current,
                          [item.fieldKey]: event.target.checked,
                        }))
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-zinc-900">{item.label}</span>
                      <label className="mt-2 block text-xs font-medium text-zinc-500">
                        {t.aiValue}
                      </label>
                      <input
                        type="text"
                        value={item.value}
                        onChange={(event) =>
                          setPendingExtraction((current) =>
                            current
                              ? {
                                  ...current,
                                  suggestions: current.suggestions.map((suggestion) =>
                                    suggestion.fieldKey === item.fieldKey
                                      ? { ...suggestion, value: event.target.value }
                                      : suggestion,
                                  ),
                                }
                              : current,
                          )
                        }
                        className={cn(inputClass, "mt-1")}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Button type="button" onClick={() => void handleApproveExtraction()}>
                  {t.aiApprove}
                </Button>
                <Button type="button" variant="outline" onClick={() => setPendingExtraction(null)}>
                  {t.aiCancel}
                </Button>
              </div>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard
        title={t.saved}
        action={
          <Button type="button" variant="outline" onClick={onAdd}>
            <Plus className="size-4" />
            {t.new}
          </Button>
        }
      >
        <div className="flex flex-wrap gap-2 border-b border-zinc-200 p-4">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => onSelect(profile.id)}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-medium transition active:scale-[0.98]",
                profile.id === activeProfile.id
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-950",
              )}
            >
              {profile.name || (locale === "vi" ? "Hồ sơ chưa đặt tên" : "Untitled profile")}
            </button>
          ))}
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <FieldLabel htmlFor="profile-name">{t.name}</FieldLabel>
            <input
              id="profile-name"
              value={draftProfile.name}
              onChange={(event) => patch({ name: event.target.value })}
              onBlur={() => void saveProfile()}
              placeholder={t.namePlaceholder}
              className={inputClass}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex h-9 items-center gap-2 px-2 text-xs text-zinc-500">
              <Save className="size-4" />
              {t.save}
            </span>
            <Button type="button" variant="outline" onClick={handleDelete}>
              <Trash2 className="size-4" />
              {t.delete}
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t.fields}
        action={
          <Button type="button" variant="outline" onClick={addField}>
            <Plus className="size-4" />
            {t.addField}
          </Button>
        }
      >
        <div className="border-b border-zinc-200 p-4">
          <FieldLabel>{t.investorType}</FieldLabel>
          <div className="inline-flex rounded-md border border-zinc-300 p-1">
            {(["individual", "organization"] as InvestorType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  updateDraft(
                    (profile) => ({ ...profile, investorType: type }),
                    true,
                  )
                }
                className={cn(
                  "h-8 rounded px-3 text-sm transition active:scale-[0.98]",
                  draftProfile.investorType === type
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:bg-zinc-100",
                )}
              >
                {type === "individual" ? t.individual : t.organization}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 p-4">
          {visibleGroups(draftProfile.investorType).map((group) => (
            <FieldGroupSection
              key={group}
              group={group}
              title={t.groups[group]}
              fields={draftProfile.fields.filter((field) => field.group === group)}
              labels={{
                fieldName: t.fieldName,
                value: t.value,
                aliases: t.aliases,
                aliasHelp: t.aliasHelp,
              }}
              onUpdate={updateField}
              onSave={() => void saveProfile()}
              onDelete={deleteField}
            />
          ))}
          {draftProfile.fields.length === 0 && (
            <EmptyState title={t.empty} description={t.emptyDescription} />
          )}
        </div>
      </SectionCard>
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
  labels: { fieldName: string; value: string; aliases: string; aliasHelp: string };
  onUpdate: (id: string, patch: Partial<ProfileField>) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
}) {
  if (!fields.length) return null;
  return (
    <section>
      <h3 className="mb-3 border-b border-zinc-200 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h3>
      <div className="space-y-3">
        {fields.map((field) => (
          <article key={field.id} className="rounded-md border border-zinc-200 p-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(180px,.7fr)_minmax(220px,1fr)_minmax(260px,1.3fr)_36px]">
              <div>
                <FieldLabel>{labels.fieldName}</FieldLabel>
                <input
                  value={field.label}
                  onChange={(event) => onUpdate(field.id, { label: event.target.value })}
                  onBlur={onSave}
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>{labels.value}</FieldLabel>
                <input
                  value={field.value}
                  onChange={(event) => onUpdate(field.id, { value: event.target.value })}
                  onBlur={onSave}
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>{labels.aliases}</FieldLabel>
                <textarea
                  value={field.aliases}
                  onChange={(event) => onUpdate(field.id, { aliases: event.target.value })}
                  onBlur={onSave}
                  aria-describedby={`alias-help-${field.id}`}
                  className={cn(textareaClass, "min-h-9 py-2")}
                />
                <p id={`alias-help-${field.id}`} className="mt-1 text-xs text-zinc-500">
                  {labels.aliasHelp}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(field.id)}
                aria-label="Delete field"
                className="mt-6 flex size-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-500 transition hover:border-zinc-950 hover:text-zinc-950 active:scale-[0.98]"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

