import type { Workflow } from "../shared/types";

export const LPMS_WORKFLOWS_LIST_PATH = "/lpms/workflows" as const;

export function workflowDetailPath(workflow: Pick<Workflow, "id" | "type">) {
    return workflow.type === "assistant"
        ? `/lpms/workflows/assistant/${workflow.id}`
        : `/lpms/workflows/tabular-review/${workflow.id}`;
}
