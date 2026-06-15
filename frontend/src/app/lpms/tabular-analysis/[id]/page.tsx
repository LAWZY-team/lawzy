"use client";

import { use } from "react";
import { TRView } from "@/components/lpms/tabular/TabularReviewView";

export default function TabularReviewDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    return (
        <div className="flex h-full flex-col bg-slate-50">
            <TRView reviewId={id} />
        </div>
    );
}
