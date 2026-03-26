import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deleteCommunityTemplate,
  deleteInternalTemplate,
  type TemplateScope,
} from '@/lib/api/contract-templates';

export function useDeleteContractTemplate(scope: Extract<TemplateScope, 'community' | 'internal'> = 'community') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      scope === 'internal' ? deleteInternalTemplate(id) : deleteCommunityTemplate(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['contract-templates'] });
    },
  });
}

