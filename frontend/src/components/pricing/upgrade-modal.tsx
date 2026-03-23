"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PricingSection } from "./pricing-section";
import { useT } from "@/components/i18n-provider";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlanSlug?: string | null;
  onSelectPlan?: (planId: string, slug: string) => void;
  title?: string;
  description?: string;
}

export function UpgradeModal({
  open,
  onOpenChange,
  currentPlanSlug,
  onSelectPlan,
  title,
  description,
}: UpgradeModalProps) {
  const { t } = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ?? t("upgrade_modal_title")}</DialogTitle>
          <DialogDescription>{description ?? t("upgrade_modal_desc")}</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <PricingSection
            currentPlanSlug={currentPlanSlug}
            onSelectPlan={onSelectPlan}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
