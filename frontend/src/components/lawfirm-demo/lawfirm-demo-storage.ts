import type { PersistedWorkspace } from "./lawfirm-demo-types";

const WORKSPACE_KEY = "lawzy.lawfirm.demo.workspace.v1";
const DB_NAME = "lawzy-lawfirm-demo";
const STORE_NAME = "documents";

export function loadWorkspace(): PersistedWorkspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedWorkspace;
    if (parsed && Array.isArray(parsed.profiles)) {
      const cleanProfiles = parsed.profiles.filter(
        (p) => !p.name.includes("An Phú") && !p.name.includes("An Phu") && !p.name.includes("Hồ sơ khách hàng mẫu")
      );
      const cleanTemplates = (parsed.templates ?? []).filter(
        (t) => !t.name.includes("An Phú") && !t.name.includes("An Phu")
      );
      const sanitized: PersistedWorkspace = {
        ...parsed,
        profiles: cleanProfiles,
        templates: cleanTemplates,
        activeProfileId: cleanProfiles.some((p) => p.id === parsed.activeProfileId) ? parsed.activeProfileId : (cleanProfiles[0]?.id ?? ""),
        activeTemplateId: cleanTemplates.some((t) => t.id === parsed.activeTemplateId) ? parsed.activeTemplateId : (cleanTemplates[0]?.id ?? ""),
      };
      window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(sanitized));
      return sanitized;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveWorkspace(workspace: PersistedWorkspace): void {
  window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDocumentBytes(key: string, bytes: ArrayBuffer): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(bytes, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

export async function getDocumentBytes(key: string): Promise<ArrayBuffer | null> {
  const db = await openDatabase();
  const result = await new Promise<ArrayBuffer | null>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve((request.result as ArrayBuffer | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}

export async function deleteDocumentBytes(key: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

