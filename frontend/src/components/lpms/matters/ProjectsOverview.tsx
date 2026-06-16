"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, ChevronDown } from "lucide-react";
import { listProjects, updateProject, deleteProject } from "@/app/lib/lpmsApi";
import { OwnerOnlyModal } from "@/components/lpms/shared/OwnerOnlyModal";
import { useAuth } from "@/contexts/AuthContext";
import type { Project } from "@/components/lpms/shared/types";
import { NewProjectModal } from "./NewProjectModal";
import { TableToolbar } from "@/components/lpms/shared/TableToolbar";
import {
    RowActionMenuItems,
    RowActions,
} from "@/components/lpms/shared/RowActions";
import {
    TABLE_CHECKBOX_CLASS,
    TABLE_STICKY_CELL_BG,
    SkeletonDot,
    SkeletonLine,
    TableBody,
    TableCell,
    TableEmptyState,
    TableHeaderCell,
    TableHeaderRow,
    TablePrimaryCell,
    TableRow,
    TableScrollArea,
    TableStickyCell,
} from "@/components/lpms/shared/TablePrimitive";
import { PageHeader } from "@/components/lpms/shared/PageHeader";
import { useLpmsT } from "@/hooks/lpms/use-lpms-t";
import type { LpmsTranslationKey } from "@/lib/i18n/lpms";

function formatDate(iso: string, locale: "vi" | "en") {
    return new Date(iso).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function getProjectOwnerLabel(
    project: Project,
    currentUserId: string | null | undefined,
    t: (key: LpmsTranslationKey) => string,
) {
    if (project.is_owner ?? project.user_id === currentUserId) {
        return t("lpms_matters_owner_me");
    }
    return (
        project.owner_display_name?.trim() ||
        project.owner_email?.trim() ||
        t("lpms_matters_owner_shared")
    );
}

type ProjectFilter = "all" | "mine" | "shared-with-me";

export function ProjectsOverview() {
    const { t, locale } = useLpmsT();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState<ProjectFilter>("all");
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [cmEditingId, setCmEditingId] = useState<string | null>(null);
    const [cmValue, setCmValue] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [actionsOpen, setActionsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [ownerOnlyAction, setOwnerOnlyAction] = useState<string | null>(null);
    const actionsRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { user, isAuthenticated, authLoading } = useAuth();

    useEffect(() => {
        if (authLoading) {
            setLoading(true);
            return;
        }
        if (!isAuthenticated) {
            setProjects([]);
            setLoadError(null);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        listProjects()
            .then((loaded) => {
                if (!cancelled) setProjects(loaded);
            })
            .catch((err) => {
                console.error("[projects] failed to load projects", err);
                if (!cancelled) {
                    setProjects([]);
                    setLoadError(t("lpms_matters_load_error"));
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [authLoading, isAuthenticated, user?.id]);

    useEffect(() => {
        setSelectedIds([]);
    }, [activeFilter]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (
                actionsRef.current &&
                !actionsRef.current.contains(e.target as Node)
            )
                setActionsOpen(false);
        }
        if (actionsOpen) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [actionsOpen]);

    const q = search.toLowerCase();
    const filtered = (
        activeFilter === "all"
            ? projects
            : activeFilter === "mine"
              ? projects.filter((p) => p.is_owner ?? p.user_id === user?.id)
              : projects.filter((p) => !(p.is_owner ?? p.user_id === user?.id))
    ).filter(
        (p) =>
            !q ||
            p.name.toLowerCase().includes(q) ||
            (p.cm_number ?? "").toLowerCase().includes(q),
    );

    const allSelected =
        filtered.length > 0 &&
        filtered.every((p) => selectedIds.includes(p.id));
    const someSelected =
        !allSelected && filtered.some((p) => selectedIds.includes(p.id));

    function toggleAll() {
        if (allSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map((p) => p.id));
        }
    }

    function toggleOne(id: string) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    }

    const filters: { id: ProjectFilter; label: string }[] = [
        { id: "all", label: t("lpms_matters_filter_all") },
        { id: "mine", label: t("lpms_matters_filter_mine") },
        { id: "shared-with-me", label: t("lpms_matters_filter_shared") },
    ];

    async function handleRenameSubmit(projectId: string) {
        const trimmed = renameValue.trim();
        setRenamingId(null);
        if (!trimmed) return;
        setProjects((prev) =>
            prev.map((p) => (p.id === projectId ? { ...p, name: trimmed } : p)),
        );
        await updateProject(projectId, { name: trimmed });
    }

    async function handleCmSubmit(projectId: string) {
        const trimmed = cmValue.trim();
        setCmEditingId(null);
        setProjects((prev) =>
            prev.map((p) =>
                p.id === projectId ? { ...p, cm_number: trimmed || null } : p,
            ),
        );
        await updateProject(projectId, { cm_number: trimmed || undefined });
    }

    async function handleDeleteSelected() {
        const ids = [...selectedIds];
        setActionsOpen(false);
        const owned = ids.filter((id) => {
            const p = projects.find((pp) => pp.id === id);
            return !p || (p.is_owner ?? p.user_id === user?.id);
        });
        const blocked = ids.length - owned.length;
        setSelectedIds([]);
        await Promise.all(owned.map((id) => deleteProject(id).catch(() => {})));
        setProjects((prev) => prev.filter((p) => !owned.includes(p.id)));
        if (blocked > 0) {
            setOwnerOnlyAction(
                `delete ${blocked} of the selected projects — only the project owner can delete a project`,
            );
        }
    }

    const toolbarActions = (
        <>
            {selectedIds.length > 0 && (
                <div ref={actionsRef} className="relative">
                    <button
                        onClick={() => setActionsOpen((v) => !v)}
                        className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                        Actions
                        <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    {actionsOpen && (
                        <div className="absolute top-full right-0 mt-1 w-36 rounded-lg border border-gray-100 bg-white shadow-lg z-50 overflow-hidden">
                            <button
                                onClick={handleDeleteSelected}
                                className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 transition-colors"
                            >
                                {t("lpms_matters_delete_selected")}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    );

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <PageHeader
                loading={loading}
                actions={[
                    {
                        type: "search",
                        value: search,
                        onChange: setSearch,
                        placeholder: t("lpms_matters_search"),
                    },
                    {
                        type: "new",
                        onClick: () => setModalOpen(true),
                        title: t("lpms_matters_new"),
                    },
                ]}
            >
                <h1 className="text-2xl font-medium font-serif text-gray-900">
                    {t("lpms_matters_title")}
                </h1>
            </PageHeader>

            <TableToolbar
                items={filters}
                active={activeFilter}
                onChange={setActiveFilter}
                actions={toolbarActions}
            />

            <TableScrollArea>
                <TableHeaderRow>
                    <TableStickyCell header>
                        {loading ? (
                            <SkeletonDot />
                        ) : (
                            <input
                                type="checkbox"
                                checked={allSelected}
                                ref={(el) => {
                                    if (el) el.indeterminate = someSelected;
                                }}
                                onChange={toggleAll}
                                className={TABLE_CHECKBOX_CLASS}
                            />
                        )}
                        <span>{t("lpms_matters_col_name")}</span>
                    </TableStickyCell>
                    <TableHeaderCell className="ml-auto w-32">{t("lpms_matters_col_cm")}</TableHeaderCell>
                    <TableHeaderCell className="w-32">{t("lpms_matters_col_owner")}</TableHeaderCell>
                    <TableHeaderCell className="w-24">{t("lpms_matters_col_files")}</TableHeaderCell>
                    <TableHeaderCell className="w-24">{t("lpms_matters_col_chats")}</TableHeaderCell>
                    <TableHeaderCell className="w-36">
                        {t("lpms_matters_col_reviews")}
                    </TableHeaderCell>
                    <TableHeaderCell className="w-32">{t("lpms_matters_col_created")}</TableHeaderCell>
                    <TableHeaderCell className="w-8" />
                </TableHeaderRow>

                {loading ? (
                    <TableBody>
                        {[1, 2, 3].map((i) => (
                            <TableRow
                                key={i}
                                interactive={false}
                            >
                                <TableStickyCell
                                    hover={false}
                                    bgClassName="bg-transparent"
                                >
                                    <SkeletonDot />
                                    <SkeletonLine className="h-3.5 w-48" />
                                </TableStickyCell>
                                <TableCell className="ml-auto w-32">
                                    <SkeletonLine className="w-20" />
                                </TableCell>
                                <TableCell className="w-32">
                                    <SkeletonLine className="w-16" />
                                </TableCell>
                                <TableCell className="w-24">
                                    <SkeletonLine className="w-8" />
                                </TableCell>
                                <TableCell className="w-24">
                                    <SkeletonLine className="w-8" />
                                </TableCell>
                                <TableCell className="w-36">
                                    <SkeletonLine className="w-8" />
                                </TableCell>
                                <TableCell className="w-32">
                                    <SkeletonLine className="w-20" />
                                </TableCell>
                                <TableCell className="w-8" />
                            </TableRow>
                        ))}
                    </TableBody>
                ) : loadError ? (
                    <TableEmptyState>
                        <FolderOpen className="h-8 w-8 text-gray-300 mb-4" />
                        <p className="text-2xl font-medium font-serif text-gray-900">
                            {t("lpms_matters_title")}
                        </p>
                        <p className="mt-1 text-xs text-red-500 max-w-xs">
                            {loadError}
                        </p>
                    </TableEmptyState>
                ) : filtered.length === 0 ? (
                    <TableEmptyState>
                        {activeFilter === "all" || activeFilter === "mine" ? (
                            <>
                                <FolderOpen className="h-8 w-8 text-gray-300 mb-4" />
                                <p className="text-2xl font-medium font-serif text-gray-900">
                                    {t("lpms_matters_empty_title")}
                                </p>
                                <p className="mt-1 text-xs text-gray-400 max-w-xs">
                                    {t("lpms_matters_empty_desc")}
                                </p>
                                <button
                                    onClick={() => setModalOpen(true)}
                                    className="mt-4 inline-flex items-center gap-1 rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700 transition-colors shadow-md"
                                >
                                    + {t("lpms_matters_empty_cta")}
                                </button>
                            </>
                        ) : (
                            <p className="text-sm text-gray-400">
                                {t("lpms_matters_empty_shared")}
                            </p>
                        )}
                    </TableEmptyState>
                ) : (
                    <TableBody>
                        {filtered.map((project) => {
                            const rowBg = selectedIds.includes(project.id)
                                ? "bg-gray-50"
                                : TABLE_STICKY_CELL_BG;
                            return (
                            <TableRow
                                key={project.id}
                                rightClickDropdown={
                                    (project.is_owner ??
                                        project.user_id === user?.id)
                                        ? (close) => (
                                              <RowActionMenuItems
                                                  onClose={close}
                                                  onRename={() => {
                                                      setRenameValue(
                                                          project.name,
                                                      );
                                                      setRenamingId(project.id);
                                                  }}
                                                  onUpdateCmNumber={() => {
                                                      setCmValue(
                                                          project.cm_number ??
                                                              "",
                                                      );
                                                      setCmEditingId(
                                                          project.id,
                                                      );
                                                  }}
                                                  onDelete={async () => {
                                                      await deleteProject(
                                                          project.id,
                                                      );
                                                      setProjects((prev) =>
                                                          prev.filter(
                                                              (p) =>
                                                                  p.id !==
                                                                  project.id,
                                                          ),
                                                      );
                                                  }}
                                              />
                                          )
                                        : undefined
                                }
                                onClick={() => {
                                    if (renamingId === project.id) return;
                                    router.push(`/lpms/matters/${project.id}`);
                                }}
                            >
                                <TablePrimaryCell
                                    bgClassName={rowBg}
                                    selected={selectedIds.includes(project.id)}
                                    onSelectionChange={() =>
                                        toggleOne(project.id)
                                    }
                                    label={project.name}
                                    editing={renamingId === project.id}
                                    editValue={renameValue}
                                    onEditValueChange={setRenameValue}
                                    onEditCommit={() =>
                                        handleRenameSubmit(project.id)
                                    }
                                    onEditCancel={() => setRenamingId(null)}
                                />

                                <TableCell
                                    className="ml-auto w-32"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {cmEditingId === project.id ? (
                                        <input
                                            autoFocus
                                            value={cmValue}
                                            onChange={(e) =>
                                                setCmValue(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter")
                                                    handleCmSubmit(project.id);
                                                if (e.key === "Escape")
                                                    setCmEditingId(null);
                                            }}
                                            onBlur={() =>
                                                handleCmSubmit(project.id)
                                            }
                                            placeholder={t("lpms_matters_cm_placeholder")}
                                            className="w-full text-sm text-gray-800 bg-transparent outline-none"
                                        />
                                    ) : (
                                        (project.cm_number ?? (
                                            <span className="text-gray-300">
                                                —
                                            </span>
                                        ))
                                    )}
                                </TableCell>
                                <TableCell className="w-32">
                                    {getProjectOwnerLabel(project, user?.id, t)}
                                </TableCell>
                                <TableCell className="w-24">
                                    {project.document_count ?? 0}
                                </TableCell>
                                <TableCell className="w-24">
                                    {project.chat_count ?? 0}
                                </TableCell>
                                <TableCell className="w-36">
                                    {project.review_count ?? 0}
                                </TableCell>
                                <TableCell className="w-32">
                                    {formatDate(project.created_at, locale)}
                                </TableCell>

                                <div
                                    className="w-8 shrink-0 flex justify-end"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {(project.is_owner ??
                                        project.user_id === user?.id) && (
                                        <RowActions
                                            onRename={() => {
                                                setRenameValue(project.name);
                                                setRenamingId(project.id);
                                            }}
                                            onUpdateCmNumber={() => {
                                                setCmValue(
                                                    project.cm_number ?? "",
                                                );
                                                setCmEditingId(project.id);
                                            }}
                                            onDelete={async () => {
                                                await deleteProject(project.id);
                                                setProjects((prev) =>
                                                    prev.filter(
                                                        (p) =>
                                                            p.id !== project.id,
                                                    ),
                                                );
                                            }}
                                        />
                                    )}
                                </div>
                            </TableRow>
                            );
                        })}
                    </TableBody>
                )}
            </TableScrollArea>

            <NewProjectModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={(p) => {
                    setProjects((prev) => [p, ...prev]);
                    router.push(`/lpms/matters/${p.id}`);
                }}
            />

            <OwnerOnlyModal
                open={!!ownerOnlyAction}
                action={ownerOnlyAction ?? undefined}
                onClose={() => setOwnerOnlyAction(null)}
            />
        </div>
    );
}
