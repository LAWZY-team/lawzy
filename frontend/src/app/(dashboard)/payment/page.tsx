"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlans, filterPlansForDisplay } from "@/hooks/plans/use-plans";
import { usePayments, useCreatePayment } from "@/hooks/payments/use-payments";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useT } from "@/components/i18n-provider";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PricingCard } from "@/components/pricing/pricing-card";
import type { Plan } from "@/types/plan";

export default function PaymentPage() {
  const { t } = useT();
  const router = useRouter();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [billingYearly, setBillingYearly] = useState(false);
  const { data: plans } = usePlans();
  const displayedPlans = useMemo(
    () => (plans ? filterPlansForDisplay(plans, billingYearly) : []),
    [plans, billingYearly]
  );
  const { data: paymentsData } = usePayments(1, 10);
  const createPayment = useCreatePayment();

  const defaultPlan = plans?.find((p) => p.price === 0);
  const currentPlanSlug =
    currentWorkspace?.plan ?? defaultPlan?.slug ?? plans?.[0]?.slug ?? "";

  const handleSelectPlan = async (planId: string, _slug: string, plan: Plan) => {
    if (plan.contactSales) {
      toast.info(t("payment_toast_enterprise"));
      return;
    }
    setLoadingPlanId(planId);
    try {
      const result = await createPayment.mutateAsync({
        planId,
        workspaceId: currentWorkspace?.id,
      });
      if (result.checkoutUrl) {
        router.push(result.checkoutUrl);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("payment_toast_error"));
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col h-full min-h-0">
      <div className="flex flex-col min-h-0 px-6">
        <div className="flex flex-col gap-2 pt-6 pb-2 shrink-0">
          <h2 className="text-3xl font-bold tracking-tight">{t("payment_title")}</h2>
          <p className="text-muted-foreground">{t("payment_subtitle")}</p>
        </div>

        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          <Tabs defaultValue="plans" className="w-full pb-8">
        <TabsList>
          <TabsTrigger value="plans">{t("payment_tab_current_plan")}</TabsTrigger>
          <TabsTrigger value="history">{t("payment_history_title")}</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="mt-6">
          <div className="mb-6 flex items-center justify-center gap-3">
            <span
              className={`text-sm font-medium ${!billingYearly ? "text-foreground" : "text-muted-foreground"}`}
            >
              {t("payment_billing_monthly")}
            </span>
            <Switch
              checked={billingYearly}
              onCheckedChange={setBillingYearly}
            />
            <span
              className={`text-sm font-medium ${billingYearly ? "text-foreground" : "text-muted-foreground"}`}
            >
              {t("payment_billing_yearly")}
            </span>
          </div>
          {displayedPlans.length ? (
            <div className="grid gap-6 md:grid-cols-3">
              {displayedPlans.map((plan) => (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  currentPlanSlug={currentPlanSlug}
                  loading={loadingPlanId === plan.id}
                  onSelect={handleSelectPlan}
                  allPlans={plans ?? []}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-96 rounded-lg" />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          {paymentsData?.items && paymentsData.items.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left">{t("payment_history_plan")}</th>
                    <th className="px-4 py-2 text-left">{t("payment_history_amount")}</th>
                    <th className="px-4 py-2 text-left">{t("payment_history_status")}</th>
                    <th className="px-4 py-2 text-left">{t("payment_history_date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsData.items.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-2">{p.plan.name}</td>
                      <td className="px-4 py-2">{p.amount.toLocaleString("vi-VN")} ₫</td>
                      <td className="px-4 py-2">
                        <Badge
                          variant={
                            p.status === "paid"
                              ? "default"
                              : p.status === "failed" || p.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {p.status === "paid"
                            ? t("payment_status_success")
                            : p.status === "pending"
                            ? t("payment_status_pending")
                            : p.status === "cancelled"
                            ? t("payment_status_cancelled")
                            : t("payment_status_failed")}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground py-8 text-center">
              {t("payment_history_empty")}
            </p>
          )}
        </TabsContent>
      </Tabs>
        </ScrollArea>
      </div>
    </div>
  );
}
