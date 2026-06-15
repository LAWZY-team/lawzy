"use client";

import { use } from "react";
import { TRView } from "@/components/lpms/tabular/TabularReviewView";

export default function MatterTabularReviewPage({
    params,
}: {
    params: Promise<{ id: string; reviewId: string }>;
}) {
    const { id, reviewId } = use(params);
    return <TRView reviewId={reviewId} projectId={id} />;
}
