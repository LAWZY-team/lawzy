"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkspaceStore } from "@/stores/workspace-store";

export type DocResult =
    | { type: "pdf"; buffer: ArrayBuffer }
    | { type: "docx" }
    | null;

export function useFetchSingleDoc(
    documentId: string | null | undefined,
    versionId?: string | null,
) {
    const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
    const workspaceId = currentWorkspace?.id;

    const [result, setResult] = useState<DocResult>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const prevKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (!documentId || !workspaceId) return;
        const requestKey = `${documentId}:${versionId ?? "current"}:${workspaceId}`;
        if (requestKey === prevKeyRef.current) return;
        prevKeyRef.current = requestKey;

        setLoading(true);
        setError(null);
        setResult(null);

        let cancelled = false;

        (async () => {
            try {
                const apiBase = "/api/proxy";
                const qs = `?workspaceId=${encodeURIComponent(workspaceId)}${versionId ? `&version_id=${encodeURIComponent(versionId)}` : ""}`;
                const response = await fetch(
                    `${apiBase}/lpms/documents/${documentId}/display${qs}`,
                    {
                        credentials: "include",
                    },
                );
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                if (cancelled) return;

                const contentType =
                    response.headers.get("content-type") ?? "";
                if (contentType.includes("application/pdf")) {
                    const buffer = await response.arrayBuffer();
                    if (!cancelled) setResult({ type: "pdf", buffer });
                } else {
                    await response.arrayBuffer().catch(() => {});
                    if (!cancelled) setResult({ type: "docx" });
                }
            } catch {
                if (!cancelled) setError("Failed to load document.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
            prevKeyRef.current = null;
        };
    }, [documentId, versionId, workspaceId]);

    return { result, loading, error };
}
