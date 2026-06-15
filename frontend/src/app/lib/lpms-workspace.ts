import { useWorkspaceStore } from "@/stores/workspace-store";

export class LpmsWorkspaceError extends Error {
    constructor() {
        super("Chưa chọn workspace. Vui lòng đăng nhập lại.");
        this.name = "LpmsWorkspaceError";
    }
}

/** Resolve current workspace id for LPMS API calls (client-side). */
export const getLpmsWorkspaceId = (): string => {
    const id = useWorkspaceStore.getState().currentWorkspace?.id;
    if (!id) {
        throw new LpmsWorkspaceError();
    }
    return id;
};

export const appendWorkspaceQuery = (
    path: string,
    extra?: Record<string, string | undefined>,
): string => {
    const workspaceId = getLpmsWorkspaceId();
    const params = new URLSearchParams({ workspaceId });
    if (extra) {
        Object.entries(extra).forEach(([key, value]) => {
            if (value !== undefined && value !== "") {
                params.set(key, value);
            }
        });
    }
    const sep = path.includes("?") ? "&" : "?";
    return `${path}${sep}${params.toString()}`;
};
