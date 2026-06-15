"use client";

import type { ReactNode } from "react";
import { ProjectWorkspaceLayout } from "@/components/lpms/matters/ProjectWorkspace";

export default function MatterLayout({
    params,
    children,
}: {
    params: Promise<{ id: string }>;
    children: ReactNode;
}) {
    return (
        <ProjectWorkspaceLayout params={params}>{children}</ProjectWorkspaceLayout>
    );
}
