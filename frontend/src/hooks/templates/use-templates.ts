"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Template } from "@/types/template";

export function useTemplates(scope?: string) {
  return useQuery<Template[]>({
    queryKey: ["templates", scope],
    queryFn: () =>
      api.get<Template[]>(
        `/templates${scope ? `?scope=${scope}` : ""}`
      ),
  });
}

export function useTemplate(id: string | null) {
  return useQuery<Template>({
    queryKey: ["template", id],
    queryFn: () => api.get<Template>(`/templates/${id}`),
    enabled: !!id,
  });
}
