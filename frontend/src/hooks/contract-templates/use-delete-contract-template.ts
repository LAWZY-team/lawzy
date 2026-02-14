import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteCommunityTemplate } from '@/lib/api/contract-templates';

export function useDeleteContractTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCommunityTemplate(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['contract-templates'] });
    },
  });
}

