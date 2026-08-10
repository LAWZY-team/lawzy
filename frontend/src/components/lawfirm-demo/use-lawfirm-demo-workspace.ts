"use client";

import { useEffect, useMemo, useState } from "react";
import { createProfile } from "./lawfirm-demo-taxonomy";
import { loadWorkspace, saveWorkspace } from "./lawfirm-demo-storage";
import type {
  ClientProfile,
  Locale,
  PersistedWorkspace,
  TemplateSet,
} from "./lawfirm-demo-types";

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function seedProfile(): ClientProfile {
  const profile = createProfile("vi", "Hồ sơ khách hàng mẫu");
  profile.investorType = "organization";
  const values: Record<string, string> = {
    f_to_ten: "",
    f_to_loaihinh: "",
    f_to_mst: "",
    f_to_ngaycap: "",
    f_to_noicap: "",
    f_to_diachi: "",
    f_to_dienthoai: "",
    f_to_email: "",
    f_to_website: "",
    f_to_vondl: "",
    f_dd_hoten: "",
    f_dd_chucdanh: "",
    f_dd_madinhdanh: "",
  };
  profile.fields = profile.fields.map((field) => ({
    ...field,
    value: values[field.id] ?? field.value,
  }));
  return profile;
}

function createTemplateSet(): TemplateSet {
  return {
    id: uid("template"),
    name: "",
    status: "draft",
    documents: [],
  };
}

export function useLawfirmDemoWorkspace() {
  const seededProfile = useMemo(() => seedProfile(), []);
  const seededTemplate = useMemo(() => createTemplateSet(), []);
  const [profiles, setProfiles] = useState<ClientProfile[]>([seededProfile]);
  const [templates, setTemplates] = useState<TemplateSet[]>([seededTemplate]);
  const [activeProfileId, setActiveProfileId] = useState(seededProfile.id);
  const [activeTemplateId, setActiveTemplateId] = useState(seededTemplate.id);
  const [locale, setLocale] = useState<Locale>("vi");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const saved = loadWorkspace();
      if (saved?.profiles.length && saved.templates.length) {
        setProfiles(saved.profiles);
        setTemplates(saved.templates);
        setActiveProfileId(
          saved.profiles.some((item) => item.id === saved.activeProfileId)
            ? saved.activeProfileId
            : saved.profiles[0].id,
        );
        setActiveTemplateId(
          saved.templates.some((item) => item.id === saved.activeTemplateId)
            ? saved.activeTemplateId
            : saved.templates[0].id,
        );
        setLocale(saved.locale ?? "vi");
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const workspace: PersistedWorkspace = {
      profiles,
      templates,
      activeProfileId,
      activeTemplateId,
      locale,
    };
    saveWorkspace(workspace);
  }, [profiles, templates, activeProfileId, activeTemplateId, locale, ready]);

  const activeProfile =
    profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];
  const activeTemplate =
    templates.find((template) => template.id === activeTemplateId) ?? templates[0];

  const updateProfile = (
    id: string,
    updater: (profile: ClientProfile) => ClientProfile,
  ) => {
    setProfiles((current) =>
      current.map((profile) => (profile.id === id ? updater(profile) : profile)),
    );
  };

  const updateTemplate = (
    id: string,
    updater: (template: TemplateSet) => TemplateSet,
  ) => {
    setTemplates((current) =>
      current.map((template) => (template.id === id ? updater(template) : template)),
    );
  };

  const addProfile = (name = "") => {
    const profile = createProfile(locale, name);
    setProfiles((current) => [...current, profile]);
    setActiveProfileId(profile.id);
    return profile;
  };

  const deleteProfile = (id: string) => {
    setProfiles((current) => {
      const remaining = current.filter((profile) => profile.id !== id);
      const next = remaining.length ? remaining : [createProfile(locale)];
      setActiveProfileId(next[0].id);
      return next;
    });
  };

  const addTemplate = () => {
    const template = createTemplateSet();
    setTemplates((current) => [...current, template]);
    setActiveTemplateId(template.id);
    return template;
  };

  const deleteTemplate = (id: string) => {
    setTemplates((current) => {
      const remaining = current.filter((template) => template.id !== id);
      const next = remaining.length ? remaining : [createTemplateSet()];
      setActiveTemplateId(next[0].id);
      return next;
    });
  };

  const uploadIdentity = async (profileId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/ai/scan-identity", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || "Lỗi quét ảnh giấy tờ bằng AI");
    }

    return {
      id: `extraction-${crypto.randomUUID()}`,
      investorType: data.investorType || "individual",
      suggestions: (data.suggestions || []).map((s: { fieldKey: string; label: string; value: string; group?: string }) => ({
        fieldKey: s.fieldKey,
        label: s.label,
        value: s.value,
        group: s.group || (s.fieldKey.startsWith("f_to_") ? "organization" : s.fieldKey.startsWith("f_dd_") ? "representative" : "individual"),
      })),
    };
  };

  const approveExtraction = async (
    _extractionId: string,
    approvedFields: Array<{ fieldKey: string; label: string; value: string; group?: string; aliases?: string }>,
  ) => {
    if (!activeProfileId) return;

    setProfiles((current) =>
      current.map((profile) => {
        if (profile.id !== activeProfileId) return profile;

        const updatedFields = [...profile.fields];
        let hasOrganizationField = false;
        let hasIndividualField = false;

        for (const approved of approvedFields) {
          if (approved.fieldKey.startsWith("f_to_") || approved.fieldKey.startsWith("f_dd_")) {
            hasOrganizationField = true;
          }
          if (approved.fieldKey.startsWith("f_cn_")) {
            hasIndividualField = true;
          }

          const existingIndex = updatedFields.findIndex(
            (f) => f.id === approved.fieldKey,
          );

          if (existingIndex >= 0) {
            updatedFields[existingIndex] = {
              ...updatedFields[existingIndex],
              value: approved.value,
            };
          } else {
            updatedFields.push({
              id: approved.fieldKey,
              group: (approved.group as any) || (approved.fieldKey.startsWith("f_to_") ? "organization" : approved.fieldKey.startsWith("f_dd_") ? "representative" : "individual"),
              label: approved.label,
              value: approved.value,
              aliases: approved.aliases || "",
            });
          }
        }

        let nextInvestorType = profile.investorType;
        if (hasOrganizationField && !hasIndividualField) {
          nextInvestorType = "organization";
        } else if (hasIndividualField && !hasOrganizationField) {
          nextInvestorType = "individual";
        }

        return {
          ...profile,
          investorType: nextInvestorType,
          fields: updatedFields,
        };
      }),
    );
  };

  const reset = () => {
    const profile = seedProfile();
    const template = createTemplateSet();
    setProfiles([profile]);
    setTemplates([template]);
    setActiveProfileId(profile.id);
    setActiveTemplateId(template.id);
    setLocale("vi");
  };

  return {
    profiles,
    templates,
    activeProfile,
    activeTemplate,
    activeProfileId,
    activeTemplateId,
    locale,
    ready,
    setLocale,
    setActiveProfileId,
    setActiveTemplateId,
    updateProfile,
    updateTemplate,
    addProfile,
    deleteProfile,
    addTemplate,
    deleteTemplate,
    uploadIdentity,
    approveExtraction,
    reset,
  };
}
