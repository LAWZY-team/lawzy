import { useQuery } from '@tanstack/react-query';
import type { TemplateScope } from '@/lib/api/contract-templates';
import { listContractTemplates } from '@/lib/api/contract-templates';

export function useContractTemplates(scope: TemplateScope) {
  return useQuery({
    queryKey: ['contract-templates', scope],
    queryFn: () => listContractTemplates(scope),
  });
}

