export type TemplateScope = 'system' | 'community';

export interface ContractTemplateFile {
  key: string;
  id: string; // uuid.pdf
  fileName: string;
  name?: string;
  description?: string;
  size: number;
  lastModified: string | null;
}

export interface ListContractTemplatesResponse {
  scope: TemplateScope;
  files: ContractTemplateFile[];
}

function getBackendBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? 'http://localhost:5000';
}

export async function listContractTemplates(scope: TemplateScope): Promise<ListContractTemplatesResponse> {
  const res = await fetch(`${getBackendBaseUrl()}/contract-templates?scope=${scope}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-store',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error('Failed to list templates');
  return (await res.json()) as ListContractTemplatesResponse;
}

export async function uploadCommunityTemplate(params: {
  file: File;
  name: string;
  description?: string;
}): Promise<{ id: string; key: string; name?: string; description?: string }> {
  const form = new FormData();
  form.append('file', params.file);
  form.append('name', params.name);
  if (params.description) form.append('description', params.description);

  const res = await fetch(`${getBackendBaseUrl()}/contract-templates/community`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Failed to upload template');
  const data = (await res.json()) as {
    id: string;
    key: string;
    name?: string;
    description?: string;
  };
  return data;
}

export async function deleteCommunityTemplate(id: string): Promise<void> {
  const res = await fetch(
    `${getBackendBaseUrl()}/contract-templates/community/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
  );
  if (!res.ok) throw new Error('Failed to delete template');
}

export function getDownloadUrl(scope: TemplateScope, id: string): string {
  return `${getBackendBaseUrl()}/contract-templates/${scope}/${encodeURIComponent(id)}/download`;
}

export function getPreviewUrl(scope: TemplateScope, id: string): string {
  // `inline=1` makes backend return Content-Disposition: inline so the browser can render PDF in iframe
  return `${getDownloadUrl(scope, id)}?inline=1`;
}
