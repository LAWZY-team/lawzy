export type TemplateScope = 'system' | 'community' | 'internal';

export interface ContractTemplateFile {
  key: string | null;
  id: string;
  fileName: string;
  name?: string;
  description?: string;
  size: number;
  lastModified: string | null;
  scope: TemplateScope;
  workspaceId?: string | null;
  createdBy?: string | null;
}

export interface ListContractTemplatesResponse {
  scope: TemplateScope;
  files: ContractTemplateFile[];
}

const PROXY_BASE = '/api/proxy';

function getProxyUrl(path: string): string {
  if (!path.startsWith('/')) return `${PROXY_BASE}/${path}`;
  return `${PROXY_BASE}${path}`;
}

export async function listContractTemplates(scope: TemplateScope): Promise<ListContractTemplatesResponse> {
  const res = await fetch(getProxyUrl(`/contract-templates?scope=${encodeURIComponent(scope)}`), {
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

  const res = await fetch(getProxyUrl('/contract-templates/community'), {
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

export async function uploadInternalTemplate(params: {
  file: File;
  name: string;
  description?: string;
  workspaceId: string;
}): Promise<{ id: string; key: string; name?: string; description?: string }> {
  const form = new FormData();
  form.append('file', params.file);
  form.append('name', params.name);
  form.append('workspaceId', params.workspaceId);
  if (params.description) form.append('description', params.description);

  const res = await fetch(getProxyUrl('/contract-templates/internal'), {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Failed to upload internal template');
  return (await res.json()) as {
    id: string;
    key: string;
    name?: string;
    description?: string;
  };
}

export async function deleteCommunityTemplate(id: string): Promise<void> {
  const res = await fetch(
    getProxyUrl(`/contract-templates/community/${encodeURIComponent(id)}`),
    {
      method: 'DELETE',
    },
  );
  if (!res.ok) throw new Error('Failed to delete template');
}

export async function deleteInternalTemplate(id: string): Promise<void> {
  const res = await fetch(
    getProxyUrl(`/contract-templates/internal/${encodeURIComponent(id)}`),
    {
      method: 'DELETE',
    },
  );
  if (!res.ok) throw new Error('Failed to delete template');
}

export function getDownloadUrl(scope: TemplateScope, id: string): string {
  return getProxyUrl(`/contract-templates/${scope}/${encodeURIComponent(id)}/download`);
}

export function getPreviewUrl(scope: TemplateScope, id: string): string {
  // `inline=1` makes backend return Content-Disposition: inline so the browser can render PDF in iframe
  return `${getDownloadUrl(scope, id)}?inline=1`;
}

export async function saveTemplateToWorkspace(params: {
  scope: TemplateScope;
  id: string;
  workspaceId: string;
}): Promise<{ id: string; name: string; size: number; mimeType: string; s3Key: string }> {
  const res = await fetch(
    getProxyUrl(
      `/contract-templates/${params.scope}/${encodeURIComponent(params.id)}/save-to-workspace`,
    ),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: params.workspaceId }),
    },
  );
  if (!res.ok) throw new Error('Failed to save template to workspace');
  return (await res.json()) as {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    s3Key: string;
  };
}
