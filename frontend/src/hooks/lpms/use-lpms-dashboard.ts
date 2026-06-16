import { useQuery } from "@tanstack/react-query";
import { getLpmsDashboardOverview } from "@/app/lib/lpmsApi";
import { useWorkspaceStore } from "@/stores/workspace-store";

export const useLpmsDashboard = () => {
    const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id);

    return useQuery({
        queryKey: ["lpms", "dashboard", "overview", workspaceId ?? null],
        queryFn: getLpmsDashboardOverview,
        enabled: Boolean(workspaceId),
        staleTime: 30_000,
    });
};
