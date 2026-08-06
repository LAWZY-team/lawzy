import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspaceStore } from '@/stores/workspace-store';
import {
  lawfirmExtractionsApi,
  lawfirmFillRunsApi,
  lawfirmProfilesApi,
  lawfirmTemplateSetsApi,
} from '@/lib/api/lawfirm/lawfirm-api';
import type {
  ApproveExtractionInput,
  CreateFillRunInput,
  CreateLawfirmProfileInput,
  CreateLawfirmTemplateSetInput,
  ImportLocalWorkspaceInput,
  UpdateLawfirmTemplateDocumentInput,
  UpdateLawfirmProfileInput,
  UpdateLawfirmTemplateSetInput,
} from '@/lib/api/lawfirm/types';

const profileKey = (workspaceId?: string | null) => ['lawfirm', 'profiles', workspaceId];
const templateKey = (workspaceId?: string | null) => ['lawfirm', 'template-sets', workspaceId];
const extractionKey = (workspaceId?: string | null, profileId?: string) => [
  'lawfirm',
  'extractions',
  workspaceId,
  profileId,
];
const fillRunKey = (workspaceId?: string | null) => ['lawfirm', 'fill-runs', workspaceId];

export const useLawfirmWorkspaceId = () =>
  useWorkspaceStore((state) => state.currentWorkspace?.id ?? null);

export const useLawfirmProfiles = () => {
  const workspaceId = useLawfirmWorkspaceId();
  return useQuery({
    queryKey: profileKey(workspaceId),
    queryFn: () => lawfirmProfilesApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });
};

export const useLawfirmProfileMutations = () => {
  const workspaceId = useLawfirmWorkspaceId();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: profileKey(workspaceId) });

  return {
    createProfile: useMutation({
      mutationFn: (input: Omit<CreateLawfirmProfileInput, 'workspaceId'>) =>
        lawfirmProfilesApi.create({ ...input, workspaceId: workspaceId!, fields: input.fields ?? [] }),
      onSuccess: invalidate,
    }),
    updateProfile: useMutation({
      mutationFn: ({ id, ...input }: UpdateLawfirmProfileInput & { id: string }) =>
        lawfirmProfilesApi.update(id, input),
      onSuccess: invalidate,
    }),
    deleteProfile: useMutation({
      mutationFn: (id: string) => lawfirmProfilesApi.remove(id),
      onSuccess: invalidate,
    }),
    uploadIdentity: useMutation({
      mutationFn: ({
        profileId,
        file,
        idempotencyKey,
      }: {
        profileId: string;
        file: File;
        idempotencyKey?: string;
      }) => lawfirmProfilesApi.uploadIdentity(profileId, file, idempotencyKey),
    }),
    importLocal: useMutation({
      mutationFn: (input: Omit<ImportLocalWorkspaceInput, 'workspaceId'>) =>
        lawfirmProfilesApi.importLocal({ ...input, workspaceId: workspaceId! }),
      onSuccess: async () => {
        await invalidate();
        await queryClient.invalidateQueries({ queryKey: templateKey(workspaceId) });
      },
    }),
  };
};

export const useLawfirmTemplateSets = () => {
  const workspaceId = useLawfirmWorkspaceId();
  return useQuery({
    queryKey: templateKey(workspaceId),
    queryFn: () => lawfirmTemplateSetsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });
};

export const useLawfirmTemplateMutations = () => {
  const workspaceId = useLawfirmWorkspaceId();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: templateKey(workspaceId) });

  return {
    createTemplateSet: useMutation({
      mutationFn: (input: Omit<CreateLawfirmTemplateSetInput, 'workspaceId'>) =>
        lawfirmTemplateSetsApi.create({ ...input, workspaceId: workspaceId! }),
      onSuccess: invalidate,
    }),
    updateTemplateSet: useMutation({
      mutationFn: ({ id, ...input }: UpdateLawfirmTemplateSetInput & { id: string }) =>
        lawfirmTemplateSetsApi.update(id, input),
      onSuccess: invalidate,
    }),
    deleteTemplateSet: useMutation({
      mutationFn: (id: string) => lawfirmTemplateSetsApi.remove(id),
      onSuccess: invalidate,
    }),
    uploadDocument: useMutation({
      mutationFn: ({ templateSetId, file }: { templateSetId: string; file: File }) =>
        lawfirmTemplateSetsApi.uploadDocument(templateSetId, file),
      onSuccess: invalidate,
    }),
    updateDocument: useMutation({
      mutationFn: ({
        docId,
        ...body
      }: UpdateLawfirmTemplateDocumentInput & {
        docId: string;
      }) => lawfirmTemplateSetsApi.updateDocument(docId, body),
      onSuccess: invalidate,
    }),
    deleteDocument: useMutation({
      mutationFn: (docId: string) => lawfirmTemplateSetsApi.removeDocument(docId),
      onSuccess: invalidate,
    }),
    scanDocument: useMutation({
      mutationFn: (docId: string) => lawfirmTemplateSetsApi.scanDocument(docId),
    }),
  };
};

export const useLawfirmExtractions = (profileId?: string) => {
  const workspaceId = useLawfirmWorkspaceId();
  return useQuery({
    queryKey: extractionKey(workspaceId, profileId),
    queryFn: () => lawfirmExtractionsApi.list(workspaceId!, profileId),
    enabled: Boolean(workspaceId),
  });
};

export const useLawfirmExtractionMutations = () => {
  const workspaceId = useLawfirmWorkspaceId();
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: extractionKey(workspaceId) });
    queryClient.invalidateQueries({ queryKey: profileKey(workspaceId) });
  };

  return {
    approveExtraction: useMutation({
      mutationFn: ({ id, ...input }: ApproveExtractionInput & { id: string }) =>
        lawfirmExtractionsApi.approve(id, input),
      onSuccess: invalidate,
    }),
    rejectExtraction: useMutation({
      mutationFn: (id: string) => lawfirmExtractionsApi.reject(id),
      onSuccess: invalidate,
    }),
  };
};

export const useLawfirmFillRuns = () => {
  const workspaceId = useLawfirmWorkspaceId();
  return useQuery({
    queryKey: fillRunKey(workspaceId),
    queryFn: () => lawfirmFillRunsApi.list(workspaceId!),
    enabled: Boolean(workspaceId),
  });
};

export const useLawfirmFillRunMutations = () => {
  const workspaceId = useLawfirmWorkspaceId();
  const queryClient = useQueryClient();
  return {
    createFillRun: useMutation({
      mutationFn: (input: Omit<CreateFillRunInput, 'workspaceId'>) =>
        lawfirmFillRunsApi.create({ ...input, workspaceId: workspaceId! }),
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: fillRunKey(workspaceId) }),
    }),
  };
};
