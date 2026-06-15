import type { Workflow } from "../shared/types";

export function workflowDetailPath(workflow: Pick<Workflow, "id" | "type">) {
    return workflow.type === "assistant"
        ? `/lpms/workflows/assistant/${workflow.id}`
        : `/lpms/workflows/tabular-review/${workflow.id}`;
}
