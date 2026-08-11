"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  buildDocumentPreviewFromBytes,
} from "@/components/lawfirm-demo/lawfirm-demo-document-service";
import { createProfile } from "@/components/lawfirm-demo/lawfirm-demo-taxonomy";
import { loadWorkspace } from "@/components/lawfirm-demo/lawfirm-demo-storage";
import type { ClientProfile, Locale, TemplateSet } from "@/components/lawfirm-demo/lawfirm-demo-types";
import { lawfirmTemplateUploadSessionsApi } from "@/lib/api/lawfirm/lawfirm-api";
import {
  mapDocumentToUpdate,
  mapExtractionSuggestions,
  mapTemplateDocumentDto,
  mapProfileDto,
  mapProfileToUpdate,
  mapTemplateSetDto,
  mapTemplateSetToUpdate,
} from "@/hooks/lawfirm/lawfirm-mappers";
import {
  useLawfirmExtractionMutations,
  useLawfirmFillRunMutations,
  useLawfirmProfileMutations,
  useLawfirmProfiles,
  useLawfirmTemplateMutations,
  useLawfirmTemplateSets,
  useLawfirmWorkspaceId,
} from "@/hooks/lawfirm/use-lawfirm-workspace";

const LOCALE_KEY = "lawfirm.demo.locale";
const UPLOAD_SESSION_POLL_MS = 750;
const UPLOAD_SESSION_MAX_POLLS = 240;
const uploadSessionStorageKey = (templateSetId: string) =>
  `lawfirm.template-upload-session.${templateSetId}`;

export function useLawfirmShellWorkspace() {
  const workspaceId = useLawfirmWorkspaceId();
  const profilesQuery = useLawfirmProfiles();
  const templatesQuery = useLawfirmTemplateSets();
  const refetchTemplates = templatesQuery.refetch;
  const profileMutations = useLawfirmProfileMutations();
  const templateMutations = useLawfirmTemplateMutations();
  const extractionMutations = useLawfirmExtractionMutations();
  const fillRunMutations = useLawfirmFillRunMutations();

  const [locale, setLocaleState] = useState<Locale>("vi");
  const [activeProfileId, setActiveProfileId] = useState<string>("");
  const [activeTemplateId, setActiveTemplateId] = useState<string>("");
  const [importAttempted, setImportAttempted] = useState(false);
  const [autoSeedDone, setAutoSeedDone] = useState(false);
  const [dedupeDone, setDedupeDone] = useState(false);
  const [resumedUploadProgress, setResumedUploadProgress] = useState<{
    status: string;
    total: number;
    processed: number;
    failed: number;
    pending: number;
  } | null>(null);
  const profileRevisionRef = useRef<Map<string, number>>(new Map());
  const profileSnapshotRef = useRef<Map<string, ClientProfile>>(new Map());
  const profileUpdateQueueRef = useRef<Map<string, Promise<void>>>(new Map());
  const templateRevisionRef = useRef<Map<string, number>>(new Map());
  const templateSnapshotRef = useRef<Map<string, TemplateSet>>(new Map());
  const templateUpdateQueueRef = useRef<Map<string, Promise<void>>>(new Map());

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved === "vi" || saved === "en") setLocaleState(saved);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_KEY, next);
  }, []);

  const profiles = useMemo(
    () => (profilesQuery.data ?? []).map(mapProfileDto),
    [profilesQuery.data],
  );
  const templates = useMemo(
    () => (templatesQuery.data ?? []).map(mapTemplateSetDto),
    [templatesQuery.data],
  );

  useEffect(() => {
    if (!profiles.length) return;
    if (!profiles.some((profile) => profile.id === activeProfileId)) {
      setActiveProfileId(profiles[0].id);
    }
  }, [profiles, activeProfileId]);

  useEffect(() => {
    if (!activeTemplateId) return;
    const storageKey = uploadSessionStorageKey(activeTemplateId);
    const sessionId = localStorage.getItem(storageKey);
    if (!sessionId) {
      setResumedUploadProgress(null);
      return;
    }
    let cancelled = false;
    let timeoutId: number | undefined;
    const poll = async () => {
      try {
        const session =
          await lawfirmTemplateUploadSessionsApi.getStatus(sessionId);
        if (cancelled) return;
        if (session.progress) {
          setResumedUploadProgress({
            status: session.status,
            ...session.progress,
          });
        }
        if (
          session.status === "review_ready" ||
          session.status === "partial_failed" ||
          session.status === "failed"
        ) {
          localStorage.removeItem(storageKey);
          setResumedUploadProgress(null);
          await refetchTemplates();
          return;
        }
      } catch {
        if (cancelled) return;
      }
      timeoutId = window.setTimeout(poll, UPLOAD_SESSION_POLL_MS);
    };
    void poll();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [activeTemplateId, refetchTemplates]);

  useEffect(() => {
    if (!templates.length) return;
    if (!templates.some((template) => template.id === activeTemplateId)) {
      setActiveTemplateId(templates[0].id);
    }
  }, [templates, activeTemplateId]);

  useEffect(() => {
    if (!workspaceId || importAttempted || profilesQuery.isLoading) return;
    if (profiles.length > 0) {
      setImportAttempted(true);
      return;
    }
    const local = loadWorkspace();
    if (!local?.profiles?.length && !local?.templates?.length) {
      setImportAttempted(true);
      return;
    }

    // If local demo storage contains multiple identical sample entries,
    // importing them will clutter the UI. Collapse to a single sample.
    const profilesToImport = (() => {
      if (!local?.profiles?.length) return [];
      if (local.profiles.length <= 1) return local.profiles;
      const [first] = local.profiles;
      const firstName = first.name;
      const firstIsSample = first.fields.every((field) => field.value.trim() === "");
      if (!firstIsSample) return local.profiles;
      const allAreSameSample = local.profiles.every(
        (profile) =>
          profile.name === firstName &&
          profile.fields.length === first.fields.length &&
          profile.fields.every((field) => field.value.trim() === ""),
      );
      return allAreSameSample ? [first] : local.profiles;
    })();

    const templatesToImport = (() => {
      if (!local?.templates?.length) return [];
      if (local.templates.length <= 1) return local.templates;
      const [first] = local.templates;
      const firstIsEmptyDraft =
        first.name.trim() === "" && first.status === "draft" && first.documents.length === 0;
      if (!firstIsEmptyDraft) return local.templates;
      const allAreSameEmptyDraft = local.templates.every(
        (template) =>
          template.name === first.name &&
          template.status === first.status &&
          template.documents.length === 0,
      );
      return allAreSameEmptyDraft ? [first] : local.templates;
    })();

    setImportAttempted(true);
    profileMutations.importLocal.mutate({
      hash: `lawfirm-import-${workspaceId}`,
      data: {
        profiles: profilesToImport as unknown as Array<Record<string, unknown>>,
        templates: templatesToImport as unknown as Array<Record<string, unknown>>,
      },
    });
  }, [
    workspaceId,
    importAttempted,
    profiles.length,
    profilesQuery.isLoading,
    profileMutations.importLocal,
  ]);

  const profileRevisions = useMemo(() => {
    const map = new Map<string, number>();
    (profilesQuery.data ?? []).forEach((profile) => map.set(profile.id, profile.revision));
    return map;
  }, [profilesQuery.data]);

  useEffect(() => {
    (profilesQuery.data ?? []).forEach((profile) => {
      const currentRevision = profileRevisionRef.current.get(profile.id) ?? 0;
      if (profile.revision >= currentRevision) {
        profileRevisionRef.current.set(profile.id, profile.revision);
        profileSnapshotRef.current.set(profile.id, mapProfileDto(profile));
      }
    });
  }, [profilesQuery.data]);

  const templateRevisions = useMemo(() => {
    const map = new Map<string, number>();
    (templatesQuery.data ?? []).forEach((template) => map.set(template.id, template.revision));
    return map;
  }, [templatesQuery.data]);

  useEffect(() => {
    (templatesQuery.data ?? []).forEach((template) => {
      const currentRevision = templateRevisionRef.current.get(template.id) ?? 0;
      if (template.revision >= currentRevision) {
        templateRevisionRef.current.set(template.id, template.revision);
        templateSnapshotRef.current.set(template.id, mapTemplateSetDto(template));
      }
    });
  }, [templatesQuery.data]);

  const activeProfile =
    profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];
  const activeTemplate =
    templates.find((template) => template.id === activeTemplateId) ?? templates[0];

  const queriesReady =
    Boolean(workspaceId) &&
    profilesQuery.isSuccess &&
    templatesQuery.isSuccess;

  const ready =
    queriesReady &&
    profiles.length > 0;

  const addProfileWithName = useCallback(
    async (name: string) => {
      const created = await profileMutations.createProfile.mutateAsync({
        name,
        investorType: "organization",
        fields: [],
      });
      setActiveProfileId(created.id);
      return mapProfileDto(created);
    },
    [profileMutations.createProfile],
  );

  const addProfile = useCallback(async () => {
    const seedName = locale === "vi" ? "Hồ sơ khách hàng mẫu" : "Sample client profile";
    const draft = createProfile(locale, seedName);
    const created = await profileMutations.createProfile.mutateAsync({
      name: draft.name,
      investorType: draft.investorType,
      fields: draft.fields.map((field, index) => ({
        fieldKey: field.id,
        group: field.group,
        label: field.label,
        value: field.value,
        aliases: field.aliases,
        sortOrder: index,
      })),
    });
    setActiveProfileId(created.id);
  }, [locale, profileMutations.createProfile]);

  const updateProfile = useCallback(
    async (id: string, updater: (profile: ClientProfile) => ClientProfile) => {
      if (!workspaceId) return;
      const previousUpdate =
        profileUpdateQueueRef.current.get(id) ?? Promise.resolve();
      const nextUpdate = previousUpdate
        .catch(() => undefined)
        .then(async () => {
          const current =
            profileSnapshotRef.current.get(id) ??
            profiles.find((profile) => profile.id === id);
          if (!current) return;
          const next = updater(current);
          const revision =
            profileRevisionRef.current.get(id) ??
            profileRevisions.get(id) ??
            1;
          const updated = await profileMutations.updateProfile.mutateAsync({
            id,
            ...mapProfileToUpdate(next, revision),
          });
          profileRevisionRef.current.set(id, updated.revision);
          profileSnapshotRef.current.set(id, mapProfileDto(updated));
        });
      profileUpdateQueueRef.current.set(id, nextUpdate);
      try {
        await nextUpdate;
      } finally {
        if (profileUpdateQueueRef.current.get(id) === nextUpdate) {
          profileUpdateQueueRef.current.delete(id);
        }
      }
    },
    [profiles, workspaceId, profileRevisions, profileMutations.updateProfile],
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      await profileMutations.deleteProfile.mutateAsync(id);
    },
    [profileMutations.deleteProfile],
  );

  const addTemplate = useCallback(async () => {
    const created = await templateMutations.createTemplateSet.mutateAsync({
      name: locale === "vi" ? "Bộ hồ sơ mới" : "New template set",
    });
    setActiveTemplateId(created.id);
  }, [locale, templateMutations.createTemplateSet]);

  // Ensure the demo UI is never blank: if a workspace has no persisted data yet,
  // seed one default profile + one template set (structure matches the original HTML demo).
  useEffect(() => {
    if (autoSeedDone) return;
    if (!queriesReady) return;
    if (!importAttempted) return;
    if (profileMutations.importLocal.isPending) return;
    if (profiles.length > 0 && templates.length > 0) {
      setAutoSeedDone(true);
      return;
    }

    // Mark as done immediately to prevent the effect from running multiple times
    // while the backend mutations are still in-flight (which can duplicate samples).
    setAutoSeedDone(true);

    void (async () => {
      if (profiles.length === 0) {
        await addProfile();
      }
      if (templates.length === 0) {
        await addTemplate();
      }
    })();
  }, [
    autoSeedDone,
    queriesReady,
    importAttempted,
    profiles.length,
    templates.length,
    addProfile,
    addTemplate,
    profileMutations.importLocal.isPending,
  ]);

  // If an earlier demo run accidentally created multiple empty sample profiles,
  // collapse them to match the original HTML demo behavior (typically only 1 new profile).
  useEffect(() => {
    if (dedupeDone) return;
    if (!queriesReady) return;
    if (profiles.length <= 1) {
      setDedupeDone(true);
      return;
    }

    const expectedProfileName = locale === "vi" ? "Hồ sơ khách hàng mẫu" : "Sample client profile";
    const allProfilesAreEmptySample = profiles.every(
      (profile) =>
        profile.name.trim() === expectedProfileName &&
        profile.fields.every((field) => field.value.trim() === ""),
    );
    if (!allProfilesAreEmptySample) {
      setDedupeDone(true);
      return;
    }

    const expectedTemplateName = locale === "vi" ? "Bộ hồ sơ mới" : "New template set";
    const allTemplatesAreEmptyDraftSample =
      templates.length > 1
        ? templates.every(
            (template) =>
              template.name === expectedTemplateName &&
              template.status === "draft" &&
              template.documents.length === 0,
          )
        : true;

    setDedupeDone(true);

    void (async () => {
      for (const profile of profiles.slice(1)) {
        await profileMutations.deleteProfile.mutateAsync(profile.id);
      }
      if (allTemplatesAreEmptyDraftSample && templates.length > 1) {
        for (const template of templates.slice(1)) {
          await templateMutations.deleteTemplateSet.mutateAsync(template.id);
        }
      }
    })();
  }, [
    dedupeDone,
    queriesReady,
    profiles,
    templates,
    locale,
    profileMutations.deleteProfile,
    templateMutations.deleteTemplateSet,
  ]);

  const updateTemplate = useCallback(
    async (id: string, updater: (template: TemplateSet) => TemplateSet) => {
      if (!workspaceId) return;
      const previousUpdate =
        templateUpdateQueueRef.current.get(id) ?? Promise.resolve();
      const nextUpdate = previousUpdate
        .catch(() => undefined)
        .then(async () => {
          const current =
            templateSnapshotRef.current.get(id) ??
            templates.find((template) => template.id === id);
          if (!current) return;
          const next = updater(current);
          const revision =
            templateRevisionRef.current.get(id) ??
            templateRevisions.get(id) ??
            1;
          const updated = await templateMutations.updateTemplateSet.mutateAsync({
            id,
            ...mapTemplateSetToUpdate(next, revision),
          });
          templateRevisionRef.current.set(id, updated.revision);
          templateSnapshotRef.current.set(id, mapTemplateSetDto(updated));
        });
      templateUpdateQueueRef.current.set(id, nextUpdate);
      try {
        await nextUpdate;
      } finally {
        if (templateUpdateQueueRef.current.get(id) === nextUpdate) {
          templateUpdateQueueRef.current.delete(id);
        }
      }
    },
    [templates, workspaceId, templateRevisions, templateMutations.updateTemplateSet],
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      await templateMutations.deleteTemplateSet.mutateAsync(id);
    },
    [templateMutations.deleteTemplateSet],
  );

  const reorderDocuments = useCallback(
    async (templateId: string, documentIds: string[]) => {
      if (!workspaceId) return;
      const previousUpdate =
        templateUpdateQueueRef.current.get(templateId) ?? Promise.resolve();
      const nextUpdate = previousUpdate
        .catch(() => undefined)
        .then(async () => {
          const revision =
            templateRevisionRef.current.get(templateId) ??
            templateRevisions.get(templateId) ??
            1;
          const updated =
            await templateMutations.reorderDocuments.mutateAsync({
              id: templateId,
              revision,
              documentIds,
            });
          const mapped = mapTemplateSetDto(updated);
          templateRevisionRef.current.set(templateId, updated.revision);
          templateSnapshotRef.current.set(templateId, mapped);
        });
      templateUpdateQueueRef.current.set(templateId, nextUpdate);
      try {
        await nextUpdate;
      } finally {
        if (templateUpdateQueueRef.current.get(templateId) === nextUpdate) {
          templateUpdateQueueRef.current.delete(templateId);
        }
      }
    },
    [
      templateMutations.reorderDocuments,
      templateRevisions,
      workspaceId,
    ],
  );

  const deleteDocument = useCallback(
    async (docId: string) => {
      await templateMutations.deleteDocument.mutateAsync(docId);
    },
    [templateMutations.deleteDocument],
  );

  const updateDocument = useCallback(
    async (
      templateId: string,
      docId: string,
      updater: (documentValue: TemplateSet["documents"][number]) => TemplateSet["documents"][number],
      baseDocument?: TemplateSet["documents"][number],
    ) => {
      if (!workspaceId) return;
      const previousUpdate =
        templateUpdateQueueRef.current.get(templateId) ?? Promise.resolve();
      const nextUpdate = previousUpdate
        .catch(() => undefined)
        .then(async () => {
          const currentTemplate =
            templateSnapshotRef.current.get(templateId) ??
            templates.find((template) => template.id === templateId);
          if (!currentTemplate) return;
          const currentDocument =
            currentTemplate.documents.find((documentValue) => documentValue.id === docId) ??
            baseDocument;
          if (!currentDocument) return;
          const nextDocument = updater(currentDocument);
          const updated = await templateMutations.updateDocument.mutateAsync({
            docId,
            ...mapDocumentToUpdate(nextDocument),
          });
          const updatedDocument = mapTemplateDocumentDto(updated);
          const nextTemplate = {
            ...currentTemplate,
            documents: currentTemplate.documents.some((documentValue) => documentValue.id === docId)
              ? currentTemplate.documents.map((documentValue) =>
                  documentValue.id === docId ? updatedDocument : documentValue,
                )
              : [...currentTemplate.documents, updatedDocument],
          };
          templateSnapshotRef.current.set(templateId, nextTemplate);
        });
      templateUpdateQueueRef.current.set(templateId, nextUpdate);
      try {
        await nextUpdate;
      } finally {
        if (templateUpdateQueueRef.current.get(templateId) === nextUpdate) {
          templateUpdateQueueRef.current.delete(templateId);
        }
      }
    },
    [templates, workspaceId, templateMutations.updateDocument, templateRevisions],
  );

  const uploadTemplateDocument = useCallback(
    async (templateSetId: string, file: File) => {
      const uploaded = await templateMutations.uploadDocument.mutateAsync({
        templateSetId,
        file,
      });
      const preview = await buildDocumentPreviewFromBytes(file.name, await file.arrayBuffer());
      const uploadedDocument = mapTemplateDocumentDto(uploaded);
      await updateDocument(templateSetId, uploaded.id, () => ({
        ...uploadedDocument,
        previewMode: "highlight",
        previewHtml: preview.previewHtml,
        previewImage: preview.previewImage,
        plainText: uploadedDocument.plainText || preview.plainText,
        // The backend is the authoritative scanner. The browser builds only
        // presentation data and must not replace persisted field identities or
        // mappings with a second, independently ordered scan result.
        fields: uploadedDocument.fields,
        fileId: uploaded.file_id ?? undefined,
        storageKey: uploaded.file_id ?? uploaded.id,
      }), uploadedDocument);
    },
    [templateMutations.uploadDocument, updateDocument],
  );

  const uploadTemplateDocuments = useCallback(
    async (
      templateSetId: string,
      files: File[],
      onProgress?: (progress: {
        total: number;
        processed: number;
        failed: number;
        pending: number;
      }) => void,
    ) => {
      if (!files.length) return;
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${files.length}`;
      const session = await templateMutations.createUploadSession.mutateAsync({
        templateSetId,
        idempotencyKey,
      });
      localStorage.setItem(
        uploadSessionStorageKey(templateSetId),
        session.session_id,
      );
      let batch: Awaited<
        ReturnType<typeof templateMutations.uploadSessionDocuments.mutateAsync>
      >;
      try {
        batch = await templateMutations.uploadSessionDocuments.mutateAsync({
          sessionId: session.session_id,
          files,
        });
        await templateMutations.finalizeUploadSession.mutateAsync(
          session.session_id,
        );
      } catch (error: unknown) {
        localStorage.removeItem(uploadSessionStorageKey(templateSetId));
        throw error;
      }

      let finalStatus: "review_ready" | "partial_failed" | "failed" | null =
        null;
      for (let attempt = 0; attempt < UPLOAD_SESSION_MAX_POLLS; attempt += 1) {
        const status =
          await templateMutations.getUploadSessionStatus.mutateAsync(
            session.session_id,
          );
        if (status.progress) onProgress?.(status.progress);
        if (
          status.status === "review_ready" ||
          status.status === "partial_failed" ||
          status.status === "failed"
        ) {
          finalStatus = status.status;
          break;
        }
        await new Promise((resolve) =>
          window.setTimeout(resolve, UPLOAD_SESSION_POLL_MS),
        );
      }
      if (!finalStatus) throw new Error("Template upload session timed out");
      if (finalStatus === "failed") {
        localStorage.removeItem(uploadSessionStorageKey(templateSetId));
        throw new Error("Template upload session failed");
      }

      for (const [index, uploaded] of batch.documents.entries()) {
        if (!uploaded.document_id || !files[index]) continue;
        const preview = await buildDocumentPreviewFromBytes(
          files[index].name,
          await files[index].arrayBuffer(),
        );
        await templateMutations.updateDocument.mutateAsync({
          docId: uploaded.document_id,
          previewMode: "highlight",
          previewHtml: preview.previewHtml,
        });
      }
      await refetchTemplates();
      localStorage.removeItem(uploadSessionStorageKey(templateSetId));
      if (finalStatus === "partial_failed") {
        toast.warning(
          locale === "vi"
            ? "Một số tài liệu không quét được; các tài liệu còn lại đã sẵn sàng."
            : "Some documents failed to scan; the remaining documents are ready.",
        );
      }
    },
    [locale, refetchTemplates, templateMutations],
  );

  const runFill = useCallback(
    async (profileId: string, templateSetId: string) => {
      return fillRunMutations.createFillRun.mutateAsync({ profileId, templateSetId });
    },
    [fillRunMutations.createFillRun],
  );

  const uploadIdentity = useCallback(
    async (profileId: string, file: File) => {
      const extraction = await profileMutations.uploadIdentity.mutateAsync({
        profileId,
        file,
        idempotencyKey: `${profileId}-${file.name}-${file.size}`,
      });
      return {
        id: extraction.id,
        suggestions: mapExtractionSuggestions(extraction.suggestions),
      };
    },
    [profileMutations.uploadIdentity],
  );

  const approveExtraction = useCallback(
    async (
      extractionId: string,
      approvedFields: Array<{
        fieldKey: string;
        label: string;
        value: string;
        group?: string;
        aliases?: string;
      }>,
    ) => {
      await extractionMutations.approveExtraction.mutateAsync({
        id: extractionId,
      approvedFields: approvedFields.map((field) => ({
        fieldKey: field.fieldKey,
        label: field.label,
        value: field.value,
        group: field.group as
          | 'individual'
          | 'organization'
          | 'representative'
          | 'other'
          | undefined,
        aliases: field.aliases,
      })),
      });
      toast.success(locale === "vi" ? "Đã lưu dữ liệu AI" : "AI data saved");
    },
    [extractionMutations.approveExtraction, locale],
  );

  const scanTemplateDocument = useCallback(
    async (docId: string) => {
      return templateMutations.scanDocument.mutateAsync(docId);
    },
    [templateMutations.scanDocument],
  );

  return {
    ready,
    loading: profilesQuery.isLoading || templatesQuery.isLoading,
    error: profilesQuery.error || templatesQuery.error,
    locale,
    setLocale,
    profiles,
    templates,
    activeProfile,
    activeTemplate,
    activeProfileId,
    activeTemplateId,
    setActiveProfileId,
    setActiveTemplateId,
    addProfile,
    addProfileWithName,
    updateProfile,
    deleteProfile,
    addTemplate,
    updateTemplate,
    updateDocument,
    deleteTemplate,
    reorderDocuments,
    uploadTemplateDocument,
    uploadTemplateDocuments,
    templateUploadProgress: resumedUploadProgress,
    deleteDocument,
    scanTemplateDocument,
    uploadIdentity,
    approveExtraction,
    runFill,
    refetch: () => {
      profilesQuery.refetch();
      templatesQuery.refetch();
    },
  };
}
