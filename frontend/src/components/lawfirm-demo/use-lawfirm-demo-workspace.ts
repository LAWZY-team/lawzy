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

function createBlankProfile(locale: Locale): ClientProfile {
  return createProfile(locale, "");
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
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [templates, setTemplates] = useState<TemplateSet[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>("");
  const [activeTemplateId, setActiveTemplateId] = useState<string>("");
  const [locale, setLocale] = useState<Locale>("vi");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const saved = loadWorkspace();
      // Filter out any stale seed data containing "An Phú" or sample defaults
      const cleanProfiles = (saved?.profiles ?? []).filter(
        (p) => !p.name.includes("An Phú") && !p.name.includes("An Phu") && !p.name.includes("Hồ sơ khách hàng mẫu")
      );
      const cleanTemplates = (saved?.templates ?? []).filter(
        (t) => !t.name.includes("An Phú") && !t.name.includes("An Phu")
      );

      setProfiles(cleanProfiles);
      if (cleanProfiles.length > 0) {
        setActiveProfileId(
          cleanProfiles.some((item) => item.id === saved?.activeProfileId)
            ? saved!.activeProfileId
            : cleanProfiles[0].id,
        );
      } else {
        setActiveProfileId("");
      }

      setTemplates(cleanTemplates);
      if (cleanTemplates.length > 0) {
        setActiveTemplateId(
          cleanTemplates.some((item) => item.id === saved?.activeTemplateId)
            ? saved!.activeTemplateId
            : cleanTemplates[0].id,
        );
      } else {
        setActiveTemplateId("");
      }

      if (saved?.locale) {
        setLocale(saved.locale);
      }

      // Immediately save clean workspace back to localStorage
      saveWorkspace({
        profiles: cleanProfiles,
        templates: cleanTemplates,
        activeProfileId: cleanProfiles[0]?.id ?? "",
        activeTemplateId: cleanTemplates[0]?.id ?? "",
        locale: saved?.locale ?? "vi",
      });

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
    setProfiles([]);
    setTemplates([]);
    setActiveProfileId("");
    setActiveTemplateId("");
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
