"use client";

import { use } from "react";
import { ProjectDocumentsView } from "@/components/lpms/matters/ProjectDocumentsView";

interface Props {
    params: Promise<{ id: string }>;
}

export default function MatterDocumentsPage({ params }: Props) {
    const { id } = use(params);
    return <ProjectDocumentsView projectId={id} />;
}
