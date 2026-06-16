"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
    ArrowRight,
    Database,
    FolderKanban,
    Library,
    Loader2,
    Sparkles,
    TableProperties,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LpmsRecentActivity } from "@/app/lib/lpmsApi";
import { useLpmsDashboard } from "@/hooks/lpms/use-lpms-dashboard";
import { useLpmsT } from "@/hooks/lpms/use-lpms-t";
import { getLpmsDateFnsLocale } from "@/lib/i18n/lpms";
import { formatBytes } from "@/lib/sources/source-detail-format";

const getActivityHref = (item: LpmsRecentActivity): string => {
    if (item.type === "tabular") {
        return `/lpms/tabular-analysis/${item.id}`;
    }
    if (item.type === "ai") {
        return item.project_id
            ? `/lpms/matters/${item.project_id}/assistant/chat/${item.id}`
            : `/lpms/assistant/chat/${item.id}`;
    }
    return `/lpms/matters/${item.id}`;
};

const getActivityIcon = (type: LpmsRecentActivity["type"]) => {
    if (type === "tabular") {
        return <TableProperties className="h-4 w-4 text-blue-500" />;
    }
    if (type === "ai") {
        return <Sparkles className="h-4 w-4 text-emerald-500" />;
    }
    return <FolderKanban className="h-4 w-4 text-orange-500" />;
};

export default function LPMSDashboardPage() {
    const { t, locale } = useLpmsT();
    const { data, isLoading, isError, refetch } = useLpmsDashboard();
    const dateLocale = getLpmsDateFnsLocale(locale);
    const numberLocale = locale === "vi" ? "vi-VN" : "en-US";

    const pendingItems =
        (data?.pending_tabular_cells ?? 0) + (data?.processing_documents ?? 0);
    const storageLimit = data?.storage_limit_bytes ?? 0;
    const storageUsed = data?.storage_used_bytes ?? 0;
    const storageSubtitle =
        storageLimit > 0
            ? t("lpms_dashboard_stat_storage_hint", {
                  limit: formatBytes(storageLimit),
              })
            : t("lpms_dashboard_stat_storage_used");

    return (
        <div className="flex flex-1 flex-col h-full min-h-0">
            <div className="flex flex-col min-h-0 px-4 sm:px-6">
                <div className="flex items-center gap-3 sm:gap-4 px-0 pt-6 pb-2 shrink-0 flex-wrap">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight shrink-0">
                        {t("lpms_dashboard_title")}
                    </h2>
                </div>

                <ScrollArea className="flex-1 min-h-0 -mx-4 sm:-mx-6 px-4 sm:px-6">
                    <div className="space-y-4 pt-4 pb-8 transition-all duration-300 ease-in-out opacity-100 translate-y-0">
                        <div className="bg-black rounded-lg p-6 text-white shadow-md">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                                        {t("lpms_dashboard_cta_title")}
                                    </h3>
                                    <p className="text-sm text-gray-300 mb-4 max-w-xl">
                                        {t("lpms_dashboard_cta_desc")}
                                    </p>
                                    <div className="flex justify-left gap-3">
                                        <Button
                                            className="bg-white text-black hover:bg-gray-100 shadow-sm"
                                            asChild
                                        >
                                            <Link href="/lpms/tabular-analysis">
                                                <TableProperties className="mr-2 h-4 w-4" />
                                                {t("lpms_dashboard_cta_tabular")}
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="bg-white text-black hover:bg-gray-100 shadow-sm"
                                            asChild
                                        >
                                            <Link href="/lpms/assistant">
                                                {t("lpms_dashboard_cta_chat")}
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isError ? (
                            <Card>
                                <CardContent className="flex items-center justify-between gap-4 py-6">
                                    <p className="text-sm text-muted-foreground">
                                        {t("lpms_dashboard_load_error")}
                                    </p>
                                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                                        {t("lpms_dashboard_retry")}
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : null}

                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
                            <StatCard
                                title={t("lpms_dashboard_stat_matters")}
                                value={data?.total_matters}
                                subtitle={t("lpms_dashboard_stat_matters_hint")}
                                icon={<FolderKanban className="h-4 w-4 text-muted-foreground" />}
                                loading={isLoading}
                                numberLocale={numberLocale}
                            />
                            <StatCard
                                title={t("lpms_dashboard_stat_tabular")}
                                value={data?.total_tabular_reviews}
                                subtitle={t("lpms_dashboard_stat_tabular_hint")}
                                icon={<TableProperties className="h-4 w-4 text-muted-foreground" />}
                                loading={isLoading}
                                numberLocale={numberLocale}
                            />
                            <StatCard
                                title={t("lpms_dashboard_stat_workflows")}
                                value={data?.total_workflows}
                                subtitle={t("lpms_dashboard_stat_workflows_hint")}
                                icon={<Library className="h-4 w-4 text-muted-foreground" />}
                                loading={isLoading}
                                numberLocale={numberLocale}
                            />
                            <StatCard
                                title={t("lpms_dashboard_stat_ai")}
                                value={data?.ai_chat_messages_this_month}
                                subtitle={t("lpms_dashboard_stat_ai_hint")}
                                icon={<Sparkles className="h-4 w-4 text-muted-foreground" />}
                                loading={isLoading}
                                numberLocale={numberLocale}
                            />
                            <StatCard
                                title={t("lpms_dashboard_stat_storage")}
                                value={
                                    isLoading ? undefined : formatBytes(storageUsed)
                                }
                                subtitle={storageSubtitle}
                                icon={<Database className="h-4 w-4 text-muted-foreground" />}
                                loading={isLoading}
                                rawValue
                                numberLocale={numberLocale}
                            />
                        </div>

                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
                            <Card className="col-span-1 lg:col-span-4 hover:shadow-md transition-shadow flex flex-col">
                                <CardHeader>
                                    <CardTitle className="text-sm">
                                        {t("lpms_dashboard_recent")}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-10 text-muted-foreground">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        </div>
                                    ) : (data?.recent_activity.length ?? 0) === 0 ? (
                                        <p className="text-sm text-muted-foreground py-6">
                                            {t("lpms_dashboard_recent_empty")}
                                        </p>
                                    ) : (
                                        <div className="space-y-4">
                                            {data?.recent_activity.map((item) => (
                                                <Link
                                                    key={`${item.type}-${item.id}`}
                                                    href={getActivityHref(item)}
                                                    className="flex items-center gap-4 rounded-lg p-1 -mx-1 transition-colors hover:bg-muted/50"
                                                >
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                        {getActivityIcon(item.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">
                                                            {item.title}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatDistanceToNow(
                                                                new Date(item.occurred_at),
                                                                {
                                                                    addSuffix: true,
                                                                    locale: dateLocale,
                                                                },
                                                            )}
                                                        </p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="col-span-1 lg:col-span-3 hover:shadow-md transition-shadow flex flex-col justify-between">
                                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                    <CardTitle className="text-sm font-semibold">
                                        {t("lpms_dashboard_pending")}
                                    </CardTitle>
                                    <TableProperties className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent className="pb-4 pt-0 flex-1 flex flex-col justify-between gap-4">
                                    <div className="space-y-3 mt-2">
                                        {isLoading ? (
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        ) : (
                                            <>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-4xl font-bold">
                                                        {pendingItems}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground">
                                                        {t("lpms_dashboard_pending_count")}
                                                    </span>
                                                </div>
                                                <div className="space-y-1 text-xs text-muted-foreground">
                                                    <p>
                                                        {t("lpms_dashboard_pending_cells", {
                                                            n: data?.pending_tabular_cells ?? 0,
                                                        })}
                                                    </p>
                                                    <p>
                                                        {t("lpms_dashboard_pending_docs", {
                                                            n: data?.processing_documents ?? 0,
                                                        })}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        className="w-full text-xs hover:bg-secondary/5 justify-between group border-border/30 rounded-xl mt-4"
                                    >
                                        <Link href="/lpms/tabular-analysis">
                                            <span>{t("lpms_dashboard_go_tabular")}</span>
                                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

type StatCardProps = {
    title: string;
    value?: number | string;
    subtitle: string;
    icon: ReactNode;
    loading: boolean;
    rawValue?: boolean;
    numberLocale: string;
};

const StatCard = ({
    title,
    value,
    subtitle,
    icon,
    loading,
    rawValue = false,
    numberLocale,
}: StatCardProps) => (
    <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
                <>
                    <div className="text-2xl font-bold">
                        {rawValue
                            ? value
                            : (value ?? 0).toLocaleString(numberLocale)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                </>
            )}
        </CardContent>
    </Card>
);
