import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  uploadCommunityTemplate,
  uploadInternalTemplate,
  type TemplateScope,
} from '@/lib/api/contract-templates';

export function useUploadContractTemplate(scope: Extract<TemplateScope, 'community' | 'internal'> = 'community') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      file: File;
      name: string;
      description?: string;
      workspaceId?: string;
    }) =>
      scope === 'internal'
        ? uploadInternalTemplate({
            file: params.file,
            name: params.name,
            description: params.description,
            workspaceId: params.workspaceId ?? '',
          })
        : uploadCommunityTemplate({
            file: params.file,
            name: params.name,
            description: params.description,
          }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['contract-templates'] });
    },
  });
}

