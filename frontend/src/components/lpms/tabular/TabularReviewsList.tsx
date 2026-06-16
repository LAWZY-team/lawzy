"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Table2 } from "lucide-react";
import {
    createTabularReview,
    deleteTabularReview,
    listProjects,
    listTabularReviews,
    updateTabularReview,
} from "@/app/lib/lpmsApi";
import type { ColumnConfig, Project, TabularReview } from "@/components/lpms/shared/types";
import { AddNewTRModal } from "./AddNewTRModal";
import { PageHeader } from "@/components/lpms/shared/PageHeader";
import { useLpmsT } from "@/hooks/lpms/use-lpms-t";
import {
    TableBody,
    TableCell,
    TableEmptyState,
    TableHeaderCell,
    TableHeaderRow,
    TableRow,
    TableScrollArea,
    TableStickyCell,
} from "@/components/lpms/shared/TablePrimitive";

const formatReviewDate = (iso: string, locale: "vi" | "en") =>
    new Date(iso).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

export function TabularReviewsList() {
    const { t, locale } = useLpmsT();
    const router = useRouter();
    const [reviews, setReviews] = useState<TabularReview[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        Promise.all([listTabularReviews(), listProjects().catch(() => [])])
            .then(([r, p]) => {
                setReviews(r);
                setProjects(p);
            })
            .finally(() => setLoading(false));
    }, []);

    const filtered = reviews.filter((r) => {
        const q = search.toLowerCase();
        return !q || (r.title ?? "").toLowerCase().includes(q);
    });

    const handleCreate = async (
        title: string,
        projectId?: string,
        documentIds?: string[],
        columnsConfig?: ColumnConfig[] | null,
    ) => {
        setCreating(true);
        try {
            const review = await createTabularReview({
                title,
                document_ids: documentIds ?? [],
                columns_config: columnsConfig ?? [],
                ...(projectId ? { project_id: projectId } : {}),
            });
            router.push(
                projectId
                    ? `/lpms/matters/${projectId}/tabular-analysis/${review.id}`
                    : `/lpms/tabular-analysis/${review.id}`,
            );
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <PageHeader
                loading={loading}
                actions={[
                    {
                        type: "search",
                        value: search,
                        onChange: setSearch,
                        placeholder: t("lpms_tabular_search"),
                    },
                    {
                        type: "new",
                        onClick: () => setModalOpen(true),
                        loading: creating,
                        title: t("lpms_tabular_new"),
                    },
                ]}
            >
                <h1 className="text-2xl font-medium font-serif text-gray-900">
                    {t("lpms_tabular_title")}
                </h1>
            </PageHeader>

            <TableScrollArea>
                <TableHeaderRow>
                    <TableStickyCell header>{t("lpms_tabular_col_name")}</TableStickyCell>
                    <TableHeaderCell className="w-24">{t("lpms_tabular_col_columns")}</TableHeaderCell>
                    <TableHeaderCell className="w-24">{t("lpms_tabular_col_docs")}</TableHeaderCell>
                    <TableHeaderCell className="w-40">{t("lpms_tabular_col_matter")}</TableHeaderCell>
                    <TableHeaderCell className="w-32">{t("lpms_tabular_col_created")}</TableHeaderCell>
                </TableHeaderRow>

                {loading ? (
                    <TableBody>
                        {[1, 2, 3].map((i) => (
                            <TableRow key={i} interactive={false}>
                                <TableStickyCell hover={false}>
                                    <div className="h-3.5 w-48 animate-pulse rounded bg-gray-100" />
                                </TableStickyCell>
                            </TableRow>
                        ))}
                    </TableBody>
                ) : filtered.length === 0 ? (
                    <TableEmptyState>
                        <Table2 className="mb-4 h-8 w-8 text-gray-300" />
                        <p className="font-serif text-2xl font-medium text-gray-900">
                            Bóc tách hàng loạt
                        </p>
                        <p className="mt-1 max-w-xs text-xs text-gray-400">
                            Trích xuất dữ liệu từ nhiều hợp đồng vào bảng bằng AI.
                        </p>
                    </TableEmptyState>
                ) : (
                    <TableBody>
                        {filtered.map((review) => {
                            const project = projects.find((p) => p.id === review.project_id);
                            return (
                                <TableRow
                                    key={review.id}
                                    onClick={() =>
                                        router.push(
                                            review.project_id
                                                ? `/lpms/matters/${review.project_id}/tabular-analysis/${review.id}`
                                                : `/lpms/tabular-analysis/${review.id}`,
                                        )
                                    }
                                >
                                    <TableStickyCell>
                                        <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                                            {review.title ?? t("lpms_tabular_untitled")}
                                        </span>
                                    </TableStickyCell>
                                    <TableCell className="w-24">
                                        {review.columns_config?.length ?? 0}
                                    </TableCell>
                                    <TableCell className="w-24">
                                        {review.document_count ?? review.document_ids?.length ?? 0}
                                    </TableCell>
                                    <TableCell className="w-40">
                                        {project?.name ?? "—"}
                                    </TableCell>
                                    <TableCell className="w-32">
                                        {review.created_at ? formatReviewDate(review.created_at, locale) : "—"}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                )}
            </TableScrollArea>

            <AddNewTRModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onAdd={handleCreate}
                projects={projects}
            />
        </div>
    );
}
