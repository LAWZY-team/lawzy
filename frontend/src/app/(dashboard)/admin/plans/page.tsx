"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlansAdmin } from "@/hooks/plans/use-plans";
import { useT } from "@/components/i18n-provider";
import { formatStorageDisplay, formatQuotaDisplay } from "@/types/plan";

export default function AdminPlansPage() {
  const { t } = useT();
  const { data: plans, isLoading } = usePlansAdmin();

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          {t("admin_plans_title")}
        </h2>
        <p className="text-muted-foreground">{t("admin_plans_desc")}</p>
      </div>

      {isLoading ? (
        <div className="rounded-lg border">
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      ) : !plans?.length ? (
        <p className="text-muted-foreground py-8">{t("admin_plans_empty")}</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin_plans_name")}</TableHead>
                <TableHead>{t("admin_plans_slug")}</TableHead>
                <TableHead>{t("admin_plans_price")}</TableHead>
                <TableHead>{t("admin_plans_quota")}</TableHead>
                <TableHead>{t("admin_plans_storage")}</TableHead>
                <TableHead>{t("admin_plans_status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {plan.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    {plan.contactSales
                      ? t("admin_plans_contact")
                      : plan.price === 0
                      ? t("admin_plans_free")
                      : `${plan.price.toLocaleString("vi-VN")} ₫`}
                  </TableCell>
                  <TableCell>
                    {formatQuotaDisplay(plan.quotaLimits?.dailyAiQuota, t)}
                  </TableCell>
                  <TableCell>
                    {formatStorageDisplay(plan.quotaLimits?.storageBytes, t)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? "default" : "secondary"}>
                      {plan.isActive ? t("admin_plans_visible") : t("admin_plans_hidden")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
