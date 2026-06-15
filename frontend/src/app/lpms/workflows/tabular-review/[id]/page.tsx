"use client";

import { use } from "react";
import { WorkflowDetailPage } from "@/components/lpms/workflows/WorkflowDetailPage";

export default function TabularWorkflowPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    return <WorkflowDetailPage id={id} workflowType="tabular" />;
}
