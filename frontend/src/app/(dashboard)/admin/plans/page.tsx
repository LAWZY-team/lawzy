"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreVertical, Pencil, Plus, Trash2, Users } from "lucide-react";
import {
  usePlansAdmin,
  useCreatePlan,
  useUpdatePlan,
  useDeletePlan,
  usePlanWorkspaces,
} from "@/hooks/plans/use-plans";
import { useT } from "@/components/i18n-provider";
import { formatStorageDisplay, formatQuotaDisplay } from "@/types/plan";
import type { Plan, QuotaLimits } from "@/types/plan";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { toast } from "sonner";

const BILLING_CYCLES = ["monthly", "yearly"] as const;

interface PlanFormData {
  slug: string;
  name: string;
  nameEn: string;
  price: number;
  billingCycle: string;
  isActive: boolean;
  contactSales: boolean;
  quotaLimits: {
    storageBytes?: number;
    dailyAiQuota?: number | "unlimited";
    workspacesPerUser?: number | "unlimited";
    workspaceMembers?: number | "unlimited";
    templates?: number | "unlimited";
    aiAssistant?: boolean;
    monthlyEquivalentSlug?: string;
  };
}

function toFormData(plan: Plan | null): PlanFormData {
  const q = plan?.quotaLimits as QuotaLimits | null | undefined;
  const emptyQuota = {
    storageBytes: undefined,
    dailyAiQuota: undefined,
    workspacesPerUser: undefined,
    workspaceMembers: undefined,
    templates: undefined,
    aiAssistant: false,
    monthlyEquivalentSlug: "",
  };
  if (!plan) {
    return {
      slug: "",
      name: "",
      nameEn: "",
      price: 0,
      billingCycle: "monthly",
      isActive: true,
      contactSales: false,
      quotaLimits: emptyQuota,
    };
  }
  return {
    slug: plan.slug ?? "",
    name: plan.name ?? "",
    nameEn: plan.nameEn ?? "",
    price: plan.price ?? 0,
    billingCycle: plan.billingCycle ?? "monthly",
    isActive: plan.isActive ?? true,
    contactSales: plan.contactSales ?? false,
    quotaLimits: {
      storageBytes: q?.storageBytes,
      dailyAiQuota: q?.dailyAiQuota,
      workspacesPerUser: q?.workspacesPerUser,
      workspaceMembers: q?.workspaceMembers,
      templates: q?.templates,
      aiAssistant: q?.aiAssistant ?? false,
      monthlyEquivalentSlug: (q as { monthlyEquivalentSlug?: string })?.monthlyEquivalentSlug ?? "",
    },
  };
}

function quotaToApi(ql: PlanFormData["quotaLimits"]): QuotaLimits | undefined {
  const entries: [string, unknown][] = [];
  if (ql.storageBytes != null) entries.push(["storageBytes", ql.storageBytes]);
  if (ql.dailyAiQuota != null) entries.push(["dailyAiQuota", ql.dailyAiQuota]);
  if (ql.workspacesPerUser != null) entries.push(["workspacesPerUser", ql.workspacesPerUser]);
  if (ql.workspaceMembers != null) entries.push(["workspaceMembers", ql.workspaceMembers]);
  if (ql.templates != null) entries.push(["templates", ql.templates]);
  if (ql.aiAssistant != null) entries.push(["aiAssistant", ql.aiAssistant]);
  if (ql.monthlyEquivalentSlug?.trim())
    entries.push(["monthlyEquivalentSlug", ql.monthlyEquivalentSlug.trim()]);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as QuotaLimits;
}

export default function AdminPlansPage() {
  const { t } = useT();
  const [createOpen, setCreateOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [deletePlan, setDeletePlan] = useState<Plan | null>(null);
  const [usersPlan, setUsersPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(toFormData(null));

  const { data: plans, isLoading } = usePlansAdmin();
  const { data: planWorkspaces, isLoading: workspacesLoading } = usePlanWorkspaces(usersPlan?.id ?? null);
  const createMutation = useCreatePlan();
  const updateMutation = useUpdatePlan(editPlan?.id ?? "");
  const deleteMutation = useDeletePlan();

  const handleOpenCreate = () => {
    setFormData(toFormData(null));
    setCreateOpen(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditPlan(plan);
    setFormData(toFormData(plan));
  };

  const handleCreate = async () => {
    if (!formData.slug.trim() || !formData.name.trim()) {
      toast.error(t("admin_workspaces_name_required"));
      return;
    }
    try {
      await createMutation.mutateAsync({
        slug: formData.slug.trim(),
        name: formData.name.trim(),
        nameEn: formData.nameEn.trim() || undefined,
        price: formData.price,
        billingCycle: formData.billingCycle,
        isActive: formData.isActive,
        contactSales: formData.contactSales,
        quotaLimits: quotaToApi(formData.quotaLimits),
      });
      toast.success(t("admin_plans_created_msg"));
      setCreateOpen(false);
    } catch (e) {
      toast.error((e as Error).message || t("admin_plans_create_failed"));
    }
  };

  const handleUpdate = async () => {
    if (!editPlan || !formData.slug.trim() || !formData.name.trim()) return;
    try {
      await updateMutation.mutateAsync({
        slug: formData.slug.trim(),
        name: formData.name.trim(),
        nameEn: formData.nameEn.trim() || undefined,
        price: formData.price,
        billingCycle: formData.billingCycle,
        isActive: formData.isActive,
        contactSales: formData.contactSales,
        quotaLimits: quotaToApi(formData.quotaLimits),
      });
      toast.success(t("admin_plans_updated_msg"));
      setEditPlan(null);
    } catch (e) {
      toast.error((e as Error).message || t("admin_plans_update_failed"));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletePlan) return;
    try {
      await deleteMutation.mutateAsync(deletePlan.id);
      toast.success(t("admin_plans_deleted_msg"));
      setDeletePlan(null);
    } catch {
      toast.error(t("admin_plans_delete_failed"));
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {t("admin_plans_title")}
          </h2>
          <p className="text-muted-foreground">{t("admin_plans_desc")}</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("admin_plans_create")}
        </Button>
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
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          {t("admin_plans_empty")}
        </div>
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
                <TableHead>{t("admin_plans_workspaces_col")}</TableHead>
                <TableHead>{t("admin_plans_status")}</TableHead>
                <TableHead className="w-12" />
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto py-1 font-normal"
                      onClick={() => setUsersPlan(plan)}
                      disabled={(plan.workspaceCount ?? 0) === 0}
                    >
                      <Users className="mr-1.5 h-3.5 w-3.5" />
                      {plan.workspaceCount ?? 0}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? "default" : "secondary"}>
                      {plan.isActive
                        ? t("admin_plans_visible")
                        : t("admin_plans_hidden")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleOpenEdit(plan)}
                          className="gap-2"
                        >
                          <Pencil className="h-4 w-4" />
                          {t("admin_plans_edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletePlan(plan)}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("admin_plans_delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin_plans_create")}</DialogTitle>
          </DialogHeader>
          <PlanForm formData={formData} setFormData={setFormData} t={t} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common_cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "..." : t("admin_plans_create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editPlan} onOpenChange={(open) => !open && setEditPlan(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin_plans_edit")}</DialogTitle>
          </DialogHeader>
          <PlanForm formData={formData} setFormData={setFormData} t={t} editMode />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlan(null)}>
              {t("common_cancel")}
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "..." : t("admin_plans_edit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletePlan}
        onOpenChange={(open) => !open && setDeletePlan(null)}
        onConfirm={handleDeleteConfirm}
        title={t("admin_plans_delete_confirm_title")}
        desc={
          deletePlan
            ? t("admin_plans_delete_confirm_desc", { name: deletePlan.name })
            : ""
        }
        confirmText={t("admin_plans_delete")}
        destructive
        isLoading={deleteMutation.isPending}
      />

      <Dialog open={!!usersPlan} onOpenChange={(open) => !open && setUsersPlan(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("admin_plans_workspaces_modal_title")} &quot;{usersPlan?.name}&quot;
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {workspacesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !planWorkspaces?.length ? (
              <p className="text-sm text-muted-foreground">{t("admin_plans_workspaces_empty")}</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin_plans_workspace_name")}</TableHead>
                      <TableHead>{t("admin_plans_workspace_members")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planWorkspaces.map((ws) => (
                      <TableRow key={ws.id}>
                        <TableCell className="font-medium">{ws.name}</TableCell>
                        <TableCell className="text-muted-foreground">{ws.membersCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanForm({
  formData,
  setFormData,
  t,
  editMode = false,
}: {
  formData: PlanFormData;
  setFormData: React.Dispatch<React.SetStateAction<PlanFormData>>;
  t: (k: string) => string;
  editMode?: boolean;
}) {
  return (
    <div className="space-y-6 py-2">
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">{t("admin_plans_form_section_basic")}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("admin_plans_form_slug")}</Label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData((d) => ({ ...d, slug: e.target.value }))}
              placeholder={t("admin_plans_form_slug_placeholder")}
              disabled={editMode}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("admin_plans_form_name")}</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
              placeholder={t("admin_plans_form_name_placeholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("admin_plans_form_name_en")}</Label>
            <Input
              value={formData.nameEn}
              onChange={(e) => setFormData((d) => ({ ...d, nameEn: e.target.value }))}
              placeholder={t("admin_plans_form_name_en_placeholder")}
            />
          </div>
        </div>
      </div>

      {/* Giá & Tùy chọn */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">{t("admin_plans_form_section_price")}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("admin_plans_form_price")}</Label>
            <Input
              type="number"
              min={0}
              value={formData.price || ""}
              onChange={(e) =>
                setFormData((d) => ({
                  ...d,
                  price: parseInt(e.target.value, 10) || 0,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t("admin_plans_form_billing_cycle")}</Label>
            <Select
              value={formData.billingCycle}
              onValueChange={(v) =>
                setFormData((d) => ({ ...d, billingCycle: v }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILLING_CYCLES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === "monthly" ? t("payment_billing_monthly") : t("payment_billing_yearly")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between sm:col-span-2 py-2">
            <Label htmlFor="plan-is-active">{t("admin_plans_form_is_active")}</Label>
            <Switch
              id="plan-is-active"
              checked={formData.isActive}
              onCheckedChange={(v) =>
                setFormData((d) => ({ ...d, isActive: v }))
              }
            />
          </div>
          <div className="flex items-center justify-between sm:col-span-2 py-2">
            <Label htmlFor="plan-contact-sales">{t("admin_plans_form_contact_sales")}</Label>
            <Switch
              id="plan-contact-sales"
              checked={formData.contactSales}
              onCheckedChange={(v) =>
                setFormData((d) => ({ ...d, contactSales: v }))
              }
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">{t("admin_plans_quota")}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("admin_plans_form_storage_gb")}</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={
                formData.quotaLimits.storageBytes != null
                  ? formData.quotaLimits.storageBytes / (1024 * 1024 * 1024)
                  : ""
              }
              onChange={(e) => {
                const gb = parseFloat(e.target.value);
                setFormData((d) => ({
                  ...d,
                  quotaLimits: {
                    ...d.quotaLimits,
                    storageBytes: !Number.isNaN(gb) && gb >= 0 ? Math.round(gb * 1024 * 1024 * 1024) : undefined,
                  },
                }));
              }}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("admin_plans_form_ai_quota")}</Label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.quotaLimits.dailyAiQuota === "unlimited"}
                  onChange={(e) =>
                    setFormData((d) => ({
                      ...d,
                      quotaLimits: {
                        ...d.quotaLimits,
                        dailyAiQuota: e.target.checked ? "unlimited" : 100,
                      },
                    }))
                  }
                />
                {t("admin_plans_form_ai_unlimited")}
              </label>
            </div>
            <Input
              type="number"
              min={0}
              value={
                formData.quotaLimits.dailyAiQuota === "unlimited" ||
                formData.quotaLimits.dailyAiQuota == null
                  ? ""
                  : formData.quotaLimits.dailyAiQuota
              }
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setFormData((d) => ({
                  ...d,
                  quotaLimits: {
                    ...d.quotaLimits,
                    dailyAiQuota: !Number.isNaN(n) && n >= 0 ? n : undefined,
                  },
                }));
              }}
              disabled={formData.quotaLimits.dailyAiQuota === "unlimited"}
              placeholder="100"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("admin_plans_form_workspaces_per_user")}</Label>
            <Input
              type="text"
              value={
                formData.quotaLimits.workspacesPerUser === "unlimited"
                  ? "unlimited"
                  : String(formData.quotaLimits.workspacesPerUser ?? "")
              }
              onChange={(e) => {
                const v = e.target.value;
                setFormData((d) => ({
                  ...d,
                  quotaLimits: {
                    ...d.quotaLimits,
                    workspacesPerUser:
                      v === "unlimited"
                        ? "unlimited"
                        : v.trim() === ""
                          ? undefined
                          : (() => {
                              const n = parseInt(v, 10);
                              return !Number.isNaN(n) && n >= 0 ? n : undefined;
                            })(),
                  },
                }));
              }}
              placeholder="1"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("admin_plans_form_workspace_members")}</Label>
            <Input
              type="text"
              value={
                formData.quotaLimits.workspaceMembers === "unlimited"
                  ? "unlimited"
                  : String(formData.quotaLimits.workspaceMembers ?? "")
              }
              onChange={(e) => {
                const v = e.target.value;
                setFormData((d) => ({
                  ...d,
                  quotaLimits: {
                    ...d.quotaLimits,
                    workspaceMembers:
                      v === "unlimited"
                        ? "unlimited"
                        : v.trim() === ""
                          ? undefined
                          : (() => {
                              const n = parseInt(v, 10);
                              return !Number.isNaN(n) && n >= 0 ? n : undefined;
                            })(),
                  },
                }));
              }}
              placeholder="5"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("admin_plans_form_templates")}</Label>
            <Input
              type="text"
              value={
                formData.quotaLimits.templates === "unlimited"
                  ? "unlimited"
                  : String(formData.quotaLimits.templates ?? "")
              }
              onChange={(e) => {
                const v = e.target.value;
                setFormData((d) => ({
                  ...d,
                  quotaLimits: {
                    ...d.quotaLimits,
                    templates:
                      v === "unlimited"
                        ? "unlimited"
                        : v.trim() === ""
                          ? undefined
                          : (() => {
                              const n = parseInt(v, 10);
                              return !Number.isNaN(n) && n >= 0 ? n : undefined;
                            })(),
                  },
                }));
              }}
              placeholder="10"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("admin_plans_form_monthly_equivalent")}</Label>
            <Input
              value={formData.quotaLimits.monthlyEquivalentSlug ?? ""}
              onChange={(e) =>
                setFormData((d) => ({
                  ...d,
                  quotaLimits: {
                    ...d.quotaLimits,
                    monthlyEquivalentSlug: e.target.value,
                  },
                }))
              }
              placeholder="pro-monthly"
            />
          </div>
          <div className="flex items-center justify-between sm:col-span-2 py-2">
            <Label htmlFor="plan-ai-assistant">{t("admin_plans_form_ai_assistant")}</Label>
            <Switch
              id="plan-ai-assistant"
              checked={formData.quotaLimits.aiAssistant ?? false}
              onCheckedChange={(v) =>
                setFormData((d) => ({
                  ...d,
                  quotaLimits: { ...d.quotaLimits, aiAssistant: v },
                }))
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
