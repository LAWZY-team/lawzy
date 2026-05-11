const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_DOC_WORKER_URL ??
  process.env.DOC_WORKER_URL ??
  "";

export interface BatchPayload {
  caseId: string;
  generalInfo: Record<string, unknown>;
  templateIds: string[];
  language: "vi" | "en" | "both";
  format: "docx" | "pdf" | "both";
}

export interface BatchResult {
  signedUrl: string;
  files: { templateCode: string; status: "ok" | "error"; error?: string }[];
}

export async function batchFill(payload: BatchPayload): Promise<BatchResult> {
  if (!API_URL) {
    const mockContent = [
      "Lawzy Legal mock export",
      `Case: ${payload.caseId}`,
      `Templates: ${payload.templateIds.join(", ")}`,
      `Language: ${payload.language}`,
      `Format: ${payload.format}`,
      "",
      "Configure NEXT_PUBLIC_API_URL to call the NestJS /batch endpoint.",
    ].join("\n");

    return {
      signedUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(mockContent)}`,
      files: payload.templateIds.map((templateCode) => ({ templateCode, status: "ok" })),
    };
  }

  const res = await fetch(`${API_URL}/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Batch API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function createCase(name: string, userId: string) {
  const res = await fetch(`${API_URL}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, createdBy: userId }),
  });
  if (!res.ok) throw new Error(`Failed to create case: ${res.status}`);
  return res.json();
}

export async function getCase(id: string) {
  const res = await fetch(`${API_URL}/cases/${id}`);
  if (!res.ok) throw new Error(`Failed to get case: ${res.status}`);
  return res.json();
}

export async function listTemplates() {
  const res = await fetch(`${API_URL}/templates`);
  if (!res.ok) throw new Error(`Failed to list templates: ${res.status}`);
  return res.json();
}
