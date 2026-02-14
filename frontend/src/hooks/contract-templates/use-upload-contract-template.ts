import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadCommunityTemplate } from '@/lib/api/contract-templates';

export function useUploadContractTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { file: File; name: string; description?: string }) =>
      uploadCommunityTemplate(params),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['contract-templates'] });
    },
  });
}

