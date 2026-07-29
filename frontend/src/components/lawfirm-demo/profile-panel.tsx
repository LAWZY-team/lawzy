"use client";

import { Plus, Save, Trash2 } from "lucide-react";
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
  textareaClass,
} from "./lawfirm-demo-ui";

const text = {
  vi: {
    eyebrow: "Tự động lưu trong trình duyệt",
    title: "Hồ sơ khách hàng",
    description: "Nhập dữ liệu một lần để dùng lại cho mọi tài liệu trong cùng bộ hồ sơ.",
    saved: "Hồ sơ đã lưu",
    new: "Hồ sơ mới",
    name: "Tên hồ sơ",
    namePlaceholder: "Ví dụ: Công ty TNHH An Phú",
    save: "Đã tự động lưu",
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
    eyebrow: "Saved automatically in this browser",
    title: "Client profiles",
    description: "Enter data once and reuse it across every document in a template set.",
    saved: "Saved profiles",
    new: "New profile",
    name: "Profile name",
    namePlaceholder: "Example: An Phu Company Limited",
    save: "Saved automatically",
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
  profiles,
  activeProfile,
  onSelect,
  onAdd,
  onDelete,
  onUpdate,
}: {
  locale: Locale;
  profiles: ClientProfile[];
  activeProfile: ClientProfile;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updater: (profile: ClientProfile) => ClientProfile) => void;
}) {
  const t = text[locale];

  const patch = (patchValue: Partial<ClientProfile>) => {
    onUpdate(activeProfile.id, (profile) => ({ ...profile, ...patchValue }));
  };

  const updateField = (id: string, fieldPatch: Partial<ProfileField>) => {
    onUpdate(activeProfile.id, (profile) => ({
      ...profile,
      fields: profile.fields.map((field) =>
        field.id === id ? { ...field, ...fieldPatch } : field,
      ),
    }));
  };

  const deleteField = (id: string) => {
    onUpdate(activeProfile.id, (profile) => ({
      ...profile,
      fields: profile.fields.filter((field) => field.id !== id),
    }));
  };

  const addField = () => {
    const field: ProfileField = {
      id: `custom-${crypto.randomUUID()}`,
      group: "other",
      label: locale === "vi" ? "Trường mới" : "New field",
      value: "",
      aliases: "",
    };
    onUpdate(activeProfile.id, (profile) => ({
      ...profile,
      fields: [...profile.fields, field],
    }));
  };

  const handleDelete = () => {
    if (window.confirm(t.confirm)) onDelete(activeProfile.id);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-6 lg:px-8">
      <header className="border-b border-zinc-200 pb-6">
        <p className="text-sm font-medium text-zinc-500">{t.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">{t.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">{t.description}</p>
      </header>

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
              value={activeProfile.name}
              onChange={(event) => patch({ name: event.target.value })}
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
                onClick={() => patch({ investorType: type })}
                className={cn(
                  "h-8 rounded px-3 text-sm transition active:scale-[0.98]",
                  activeProfile.investorType === type
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
          {visibleGroups(activeProfile.investorType).map((group) => (
            <FieldGroupSection
              key={group}
              group={group}
              title={t.groups[group]}
              fields={activeProfile.fields.filter((field) => field.group === group)}
              labels={{
                fieldName: t.fieldName,
                value: t.value,
                aliases: t.aliases,
                aliasHelp: t.aliasHelp,
              }}
              onUpdate={updateField}
              onDelete={deleteField}
            />
          ))}
          {activeProfile.fields.length === 0 && (
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
  onDelete,
}: {
  group: FieldGroup;
  title: string;
  fields: ProfileField[];
  labels: { fieldName: string; value: string; aliases: string; aliasHelp: string };
  onUpdate: (id: string, patch: Partial<ProfileField>) => void;
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
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>{labels.value}</FieldLabel>
                <input
                  value={field.value}
                  onChange={(event) => onUpdate(field.id, { value: event.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>{labels.aliases}</FieldLabel>
                <textarea
                  value={field.aliases}
                  onChange={(event) => onUpdate(field.id, { aliases: event.target.value })}
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

